import { connectToDatabase } from "@/lib/db/mongoose";
import { RealtimeCacheModel } from "@/modules/realtime/realtime-cache.model";

export async function getCachedPayload<T>(source: string, key: string): Promise<T | null> {
  await connectToDatabase();

  const row = await RealtimeCacheModel.findOne({
    source,
    key,
    expiresAt: { $gt: new Date() },
  }).lean();

  return (row?.payload as T | undefined) ?? null;
}

export async function setCachedPayload<T>(source: string, key: string, payload: T, ttlMs: number) {
  await connectToDatabase();

  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMs);

  await RealtimeCacheModel.findOneAndUpdate(
    { source, key },
    {
      $set: {
        payload,
        fetchedAt: now,
        expiresAt,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}
