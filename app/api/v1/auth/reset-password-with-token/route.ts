import { hashSync } from "bcryptjs";
import { z } from "zod";
import { getMongoClientPromise } from "@/lib/db/mongodb-client";
import { consumePasswordResetToken } from "@/modules/auth/password-reset.repository";
import {
  ApiError,
  fromUnknownError,
  fromZodError,
} from "@/modules/shared/problem";
import { ok, problemResponse } from "@/modules/shared/response";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const { token, newPassword } = schema.parse(await request.json());

    const result = await consumePasswordResetToken(token);

    if (!result) {
      throw new ApiError(
        400,
        "INVALID_OR_EXPIRED_TOKEN",
        "This reset link is invalid or has expired. Please request a new one.",
      );
    }

    const client = await getMongoClientPromise();
    const users = client.db().collection("users");

    const updateResult = await users.updateOne(
      { email: result.email },
      {
        $set: {
          passwordHash: hashSync(newPassword, 10),
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      throw new ApiError(404, "USER_NOT_FOUND", "User account not found.");
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
