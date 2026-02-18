import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { FeedbackModel } from "@/modules/feedback/feedback.model";
import { decodeCursor, encodeCursor } from "@/modules/shared/pagination";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";

export async function createFeedback(input: {
  userId?: string;
  email?: string;
  category: "ux" | "itinerary" | "assistant" | "realtime" | "other";
  message: string;
  rating?: number;
}) {
  await connectToDatabase();

  const doc = await FeedbackModel.create({
    userId: input.userId ? toMongoUserId(input.userId) : undefined,
    email: input.email,
    category: input.category,
    message: input.message,
    rating: input.rating,
    status: "new",
  });

  return doc.toObject();
}

export async function listFeedback(cursor: string | undefined, limit: number) {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  const decoded = decodeCursor(cursor);
  if (decoded?.id && Types.ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new Types.ObjectId(decoded.id) };
  }

  const docs = await FeedbackModel.find(query).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function countFeedback() {
  await connectToDatabase();
  return FeedbackModel.countDocuments();
}

export async function updateFeedbackById(
  feedbackId: string,
  patch: { status?: "new" | "reviewed"; message?: string; rating?: number },
) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(feedbackId)) {
    return null;
  }

  const updated = await FeedbackModel.findOneAndUpdate(
    { _id: new Types.ObjectId(feedbackId) },
    {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.message !== undefined ? { message: patch.message } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
    },
    { returnDocument: "after" },
  ).lean();

  return updated;
}

export async function deleteFeedbackById(feedbackId: string) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(feedbackId)) {
    return false;
  }

  const deleted = await FeedbackModel.findOneAndDelete({ _id: new Types.ObjectId(feedbackId) }).lean();
  return Boolean(deleted);
}
