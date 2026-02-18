import { ApiError } from "@/modules/shared/problem";
import { compareSync, hashSync } from "bcryptjs";
import {
  deleteUserById,
  getUserById,
  listUsers,
  updateUserAccountById,
  updateUserById,
  updateUserPasswordById,
} from "@/modules/users/user.repository";

export async function listUsersService(cursor: string | undefined, limit: number) {
  const page = await listUsers(cursor, limit);
  return {
    data: page.data.map((item) => ({
      id: item._id.toString(),
      name: item.name ?? "Unknown",
      email: item.email ?? "",
      image: item.image ?? null,
      emailVerified: item.emailVerified ?? null,
    })),
    nextCursor: page.nextCursor,
  };
}

export async function updateUserService(userId: string, patch: { name?: string; email?: string }) {
  const updated = await updateUserById(userId, patch);
  if (!updated) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: updated._id.toString(),
    name: updated.name ?? "Unknown",
    email: updated.email ?? "",
    image: updated.image ?? null,
    emailVerified: updated.emailVerified ?? null,
  };
}

export async function getUserService(userId: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user._id.toString(),
    name: user.name ?? "Unknown",
    email: user.email ?? "",
    phone: user.phone ?? null,
    image: user.image ?? null,
    emailVerified: user.emailVerified ?? null,
  };
}

export async function updateUserAccountService(userId: string, patch: { name?: string; phone?: string | null }) {
  const updated = await updateUserAccountById(userId, patch);
  if (!updated) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: updated._id.toString(),
    name: updated.name ?? "Unknown",
    email: updated.email ?? "",
    phone: updated.phone ?? null,
    image: updated.image ?? null,
    emailVerified: updated.emailVerified ?? null,
  };
}

export async function changeUserPasswordService(userId: string, currentPassword: string, newPassword: string) {
  const user = await getUserById(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (!user.passwordHash) {
    throw new ApiError(400, "PASSWORD_UNAVAILABLE", "Password cannot be changed for this account");
  }

  const currentValid = compareSync(currentPassword, user.passwordHash);
  if (!currentValid) {
    throw new ApiError(400, "INVALID_PASSWORD", "Current password is incorrect");
  }

  const updated = await updateUserPasswordById(userId, hashSync(newPassword, 10));
  if (!updated) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
}

export async function deleteUserService(userId: string) {
  const deleted = await deleteUserById(userId);
  if (!deleted) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
}
