import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compareSync, hashSync } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getMongoClientPromise } from "@/lib/db/mongodb-client";
import { getServerEnv } from "@/lib/env/server";
import { checkRateLimit } from "@/lib/rate-limit/memory-rate-limit";

function ensureDevAuthEnv(env: ReturnType<typeof getServerEnv>) {
  if (env.NODE_ENV === "production") {
    return;
  }

  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  }

  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = "dev-only-nextauth-secret-change-in-production";
  }
}

function buildProviders(): NonNullable<NextAuthOptions["providers"]> {
  const providers: NonNullable<NextAuthOptions["providers"]> = [];

  function getClientIp(request: unknown) {
    if (!request || typeof request !== "object") {
      return "anonymous";
    }

    const headerBag = (request as { headers?: unknown }).headers;
    if (!headerBag) {
      return "anonymous";
    }

    if (headerBag instanceof Headers) {
      return (headerBag.get("x-forwarded-for") ?? "anonymous").split(",")[0]?.trim() || "anonymous";
    }

    if (typeof headerBag === "object") {
      const forwardedFor = (headerBag as Record<string, unknown>)["x-forwarded-for"];
      if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() || "anonymous";
      }
      if (Array.isArray(forwardedFor) && typeof forwardedFor[0] === "string") {
        return forwardedFor[0].split(",")[0]?.trim() || "anonymous";
      }
    }

    return "anonymous";
  }

  function hasStrongPassword(value: string) {
    return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
  }

  providers.push(
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        intent: { label: "Intent", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials, req) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";
        const intent =
          typeof credentials?.intent === "string"
            ? credentials.intent
            : "signin";

        if (!email || !password) {
          return null;
        }
        const clientIp = getClientIp(req);
        const rateLimit = checkRateLimit({
          key: `auth:${intent}:${clientIp}:${email}`,
          limit: intent === "signup" ? 8 : 20,
          windowMs: 1000 * 60 * 15,
        });
        if (!rateLimit.allowed) {
          return null;
        }

        const client = await getMongoClientPromise();
        const db = client.db();
        const users = db.collection("users");
        const existing = await users.findOne<{
          _id: { toString(): string };
          email: string;
          name?: string | null;
          passwordHash?: string;
        }>({ email });

        if (intent === "signup") {
          if (existing) {
            return null;
          }
          if (password.length < 8 || !hasStrongPassword(password)) {
            return null;
          }

          const name =
            typeof credentials?.name === "string" && credentials.name.trim()
              ? credentials.name.trim()
              : "Traveler";

          const created = await users.insertOne({
            email,
            name,
            passwordHash: hashSync(password, 10),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          return {
            id: created.insertedId.toString(),
            email,
            name,
          };
        }

        if (!existing?.passwordHash) {
          return null;
        }

        const valid = compareSync(password, existing.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: existing._id.toString(),
          email: existing.email,
          name: existing.name ?? "Traveler",
        };
      },
    }),
  );

  return providers;
}

export function getAuthOptions(): NextAuthOptions {
  const env = getServerEnv();
  ensureDevAuthEnv(env);
  const providers = buildProviders();
  const usesCredentialsFallback =
    providers.length === 1 && providers[0]?.id === "credentials";
  const hasMongo = Boolean(env.MONGODB_URI);
  const enableDatabaseAuth = hasMongo && !usesCredentialsFallback;

  return {
    ...(enableDatabaseAuth ? { adapter: MongoDBAdapter(getMongoClientPromise()) } : {}),
    providers,
    secret: process.env.NEXTAUTH_SECRET ?? env.NEXTAUTH_SECRET,
    session: {
      strategy: enableDatabaseAuth ? "database" : "jwt",
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/signin",
      verifyRequest: "/auth/signin",
      newUser: "/dashboard",
    },
    callbacks: {
      async session({ session, user, token }) {
        if (session.user) {
          session.user.id = user?.id ?? (token.sub ?? "");
        }
        return session;
      },
    },
  };
}
