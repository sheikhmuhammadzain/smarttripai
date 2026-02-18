import { z } from "zod";
import { requireUserId } from "@/modules/auth/guards";
import { fromUnknownError, fromZodError } from "@/modules/shared/problem";
import { userAccountPatchSchema } from "@/modules/shared/schemas";
import { ok, problemResponse } from "@/modules/shared/response";
import { getUserService, updateUserAccountService } from "@/modules/users/user.service";

export async function GET(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const userId = await requireUserId();
    const user = await getUserService(userId);
    return ok(user);
  } catch (error) {
    return problemResponse(fromUnknownError(error, instance));
  }
}

export async function PATCH(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const userId = await requireUserId();
    const patch = userAccountPatchSchema.parse(await request.json());
    const updated = await updateUserAccountService(userId, {
      name: patch.name,
      phone: patch.phone === "" ? null : patch.phone,
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
