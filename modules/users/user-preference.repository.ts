import { connectToDatabase } from "@/lib/db/mongoose";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";
import { UserPreferenceModel } from "@/modules/users/user-preference.model";

interface PreferencesPatchInput {
  preferredBudget?: "budget" | "standard" | "luxury";
  preferredCities?: string[];
  preferredInterests?: string[];
  savedMap?: {
    centerLat: number;
    centerLon: number;
    zoom: number;
    highlightedCities: string[];
  };
}

export async function getUserPreferences(userId: string) {
  await connectToDatabase();

  const doc = await UserPreferenceModel.findOne({
    userId: toMongoUserId(userId),
  }).lean();

  return doc;
}

export async function upsertUserPreferences(userId: string, patch: PreferencesPatchInput) {
  await connectToDatabase();

  const updated = await UserPreferenceModel.findOneAndUpdate(
    { userId: toMongoUserId(userId) },
    {
      ...(patch.preferredBudget !== undefined ? { preferredBudget: patch.preferredBudget } : {}),
      ...(patch.preferredCities !== undefined ? { preferredCities: patch.preferredCities } : {}),
      ...(patch.preferredInterests !== undefined ? { preferredInterests: patch.preferredInterests } : {}),
      ...(patch.savedMap !== undefined ? { savedMap: patch.savedMap } : {}),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();

  return updated;
}
