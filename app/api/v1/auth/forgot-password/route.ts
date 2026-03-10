import { z } from "zod";
import { getMongoClientPromise } from "@/lib/db/mongodb-client";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env/server";
import { createPasswordResetToken } from "@/modules/auth/password-reset.repository";
import { fromUnknownError, fromZodError } from "@/modules/shared/problem";
import { ok, problemResponse } from "@/modules/shared/response";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const { email } = schema.parse(await request.json());
    const normalizedEmail = email.trim().toLowerCase();

    // Check if the user exists — but always return success to prevent email enumeration
    const client = await getMongoClientPromise();
    const users = client
      .db()
      .collection<{ email?: string; name?: string }>("users");
    const user = await users.findOne({ email: normalizedEmail });

    if (user) {
      const rawToken = await createPasswordResetToken(normalizedEmail);

      const env = getServerEnv();
      const baseUrl = env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

      // Fire-and-forget — don't fail the request if email send fails in dev
      sendPasswordResetEmail({
        to: normalizedEmail,
        name: user.name ?? undefined,
        resetUrl,
      }).catch((err) =>
        console.error("[forgot-password] email send failed:", err),
      );
    }

    // Always return success to prevent email enumeration
    return ok({
      success: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
