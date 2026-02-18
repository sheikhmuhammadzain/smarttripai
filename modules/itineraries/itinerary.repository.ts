import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ItineraryModel } from "@/modules/itineraries/itinerary.model";
import { ApiError } from "@/modules/shared/problem";
import { decodeCursor, encodeCursor } from "@/modules/shared/pagination";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";

export async function listUserItineraries(userId: string, cursor: string | undefined, limit: number) {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    userId: toMongoUserId(userId),
  };

  const decoded = decodeCursor(cursor);
  if (decoded?.id && Types.ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new Types.ObjectId(decoded.id) };
  }

  const docs = await ItineraryModel.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function listAllItineraries(cursor: string | undefined, limit: number) {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  const decoded = decodeCursor(cursor);
  if (decoded?.id && Types.ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new Types.ObjectId(decoded.id) };
  }

  const docs = await ItineraryModel.find(query).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function createUserItinerary(params: {
  userId: string;
  requestSnapshot: unknown;
  generatedPlan: unknown;
  notes?: string;
  status?: "draft" | "saved" | "archived";
}) {
  await connectToDatabase();

  const created = await ItineraryModel.create({
    userId: toMongoUserId(params.userId),
    requestSnapshot: params.requestSnapshot,
    generatedPlan: params.generatedPlan,
    notes: params.notes,
    status: params.status ?? "saved",
    version: 1,
  });

  return created.toObject();
}

export async function getUserItineraryById(userId: string, itineraryId: string) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(itineraryId)) {
    throw new ApiError(400, "INVALID_ITINERARY_ID", "Invalid itinerary id format");
  }

  const doc = await ItineraryModel.findOne({
    _id: new Types.ObjectId(itineraryId),
    userId: toMongoUserId(userId),
  }).lean();

  if (!doc) {
    throw new ApiError(404, "ITINERARY_NOT_FOUND", "Itinerary not found");
  }

  return doc;
}

export async function updateUserItineraryById(params: {
  userId: string;
  itineraryId: string;
  notes?: string;
  status?: "draft" | "saved" | "archived";
}) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(params.itineraryId)) {
    throw new ApiError(400, "INVALID_ITINERARY_ID", "Invalid itinerary id format");
  }

  const updated = await ItineraryModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(params.itineraryId),
      userId: toMongoUserId(params.userId),
    },
    {
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.status ? { status: params.status } : {}),
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new ApiError(404, "ITINERARY_NOT_FOUND", "Itinerary not found");
  }

  return updated;
}

export async function deleteUserItineraryById(userId: string, itineraryId: string) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(itineraryId)) {
    throw new ApiError(400, "INVALID_ITINERARY_ID", "Invalid itinerary id format");
  }

  const deleted = await ItineraryModel.findOneAndDelete({
    _id: new Types.ObjectId(itineraryId),
    userId: toMongoUserId(userId),
  }).lean();

  if (!deleted) {
    throw new ApiError(404, "ITINERARY_NOT_FOUND", "Itinerary not found");
  }
}

export async function updateAnyItineraryById(params: {
  itineraryId: string;
  notes?: string;
  status?: "draft" | "saved" | "archived";
}) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(params.itineraryId)) {
    throw new ApiError(400, "INVALID_ITINERARY_ID", "Invalid itinerary id format");
  }

  const updated = await ItineraryModel.findOneAndUpdate(
    { _id: new Types.ObjectId(params.itineraryId) },
    {
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.status ? { status: params.status } : {}),
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new ApiError(404, "ITINERARY_NOT_FOUND", "Itinerary not found");
  }

  return updated;
}

export async function deleteAnyItineraryById(itineraryId: string) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(itineraryId)) {
    throw new ApiError(400, "INVALID_ITINERARY_ID", "Invalid itinerary id format");
  }

  const deleted = await ItineraryModel.findOneAndDelete({
    _id: new Types.ObjectId(itineraryId),
  }).lean();

  if (!deleted) {
    throw new ApiError(404, "ITINERARY_NOT_FOUND", "Itinerary not found");
  }
}
