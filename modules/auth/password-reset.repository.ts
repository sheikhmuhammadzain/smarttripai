import crypto from "crypto";
import { getMongoClientPromise } from "@/lib/db/mongodb-client";

const COLLECTION = "password_reset_tokens";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TokenDoc {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const client = await getMongoClientPromise();
  const col = client.db().collection<TokenDoc>(COLLECTION);

  // Invalidate previous tokens for this email
  await col.updateMany(
    { email: email.toLowerCase() },
    { $set: { used: true } },
  );

  const rawToken = generateRawToken();
  await col.insertOne({
    email: email.toLowerCase(),
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    used: false,
    createdAt: new Date(),
  });

  return rawToken;
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ email: string } | null> {
  const client = await getMongoClientPromise();
  const col = client.db().collection<TokenDoc>(COLLECTION);

  const tokenHash = hashToken(rawToken);
  const doc = await col.findOne({ tokenHash, used: false });

  if (!doc) return null;
  if (doc.expiresAt < new Date()) return null;

  await col.updateOne({ tokenHash }, { $set: { used: true } });

  return { email: doc.email };
}
