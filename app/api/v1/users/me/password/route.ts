import { z } from "zod";
import { requireUserId } from "@/modules/auth/guards";
import { fromUnknownError, fromZodError, ApiError } from "@/modules/shared/problem";
import { userPasswordPatchSchema } from "@/modules/shared/schemas";
import { ok, problemResponse } from "@/modules/shared/response";
import { changeUserPasswordService } from "@/modules/users/user.service";

export async function PATCH(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const userId = await requireUserId();
    const payload = userPasswordPatchSchema.parse(await request.json());

    if (payload.newPassword !== payload.confirmPassword) {
      throw new ApiError(400, "PASSWORD_MISMATCH", "New password and confirmation do not match");
    }

    await changeUserPasswordService(userId, payload.currentPassword, payload.newPassword);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
