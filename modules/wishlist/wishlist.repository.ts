import { connectToDatabase } from "@/lib/db/mongoose";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";
import { WishlistModel } from "@/modules/wishlist/wishlist.model";

export async function getWishlistByUser(userId: string) {
  await connectToDatabase();
  const doc = await WishlistModel.findOne({ userId: toMongoUserId(userId) }).lean();
  return doc;
}

export async function toggleWishlistProduct(userId: string, productId: string) {
  await connectToDatabase();

  const existing = await WishlistModel.findOne({ userId: toMongoUserId(userId) }).lean();
  const current = existing?.productIds ?? [];
  const hasProduct = current.includes(productId);

  const next = hasProduct
    ? current.filter((id: string) => id !== productId)
    : [...current, productId];

  const updated = await WishlistModel.findOneAndUpdate(
    { userId: toMongoUserId(userId) },
    { $set: { productIds: next } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();

  return {
    productIds: updated?.productIds ?? [],
    isWishlisted: !hasProduct,
  };
}

export async function removeWishlistProduct(userId: string, productId: string) {
  await connectToDatabase();
  const updated = await WishlistModel.findOneAndUpdate(
    { userId: toMongoUserId(userId) },
    { $pull: { productIds: productId } },
    { returnDocument: "after" },
  ).lean();

  return updated?.productIds ?? [];
}
