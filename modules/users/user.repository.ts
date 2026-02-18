import { ObjectId } from "mongodb";
import { getMongoClientPromise } from "@/lib/db/mongodb-client";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ChatSessionModel } from "@/modules/ai/chat-session.model";
import { FeedbackModel } from "@/modules/feedback/feedback.model";
import { ItineraryModel } from "@/modules/itineraries/itinerary.model";
import { OrderModel } from "@/modules/orders/order.model";
import { decodeCursor, encodeCursor } from "@/modules/shared/pagination";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";
import { UserPreferenceModel } from "@/modules/users/user-preference.model";

interface UserCollectionRow {
  _id: ObjectId;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  passwordHash?: string;
}

export async function listUsers(cursor: string | undefined, limit: number) {
  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");

  const query: Record<string, unknown> = {};
  const decoded = decodeCursor(cursor);
  if (decoded?.id && ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new ObjectId(decoded.id) };
  }

  const docs = await collection.find(query).sort({ _id: -1 }).limit(limit + 1).toArray();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function countUsers() {
  const client = await getMongoClientPromise();
  const db = client.db();
  return db.collection("users").countDocuments();
}

export async function updateUserById(userId: string, patch: { name?: string; email?: string }) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");

  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.toLowerCase() } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return updated;
}

export async function getUserById(userId: string) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");
  return collection.findOne({ _id: new ObjectId(userId) });
}

export async function updateUserAccountById(userId: string, patch: { name?: string; email?: string; phone?: string | null }) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");

  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.toLowerCase() } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return updated;
}

export async function updateUserPasswordById(userId: string, passwordHash: string) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");

  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return updated;
}

export async function deleteUserById(userId: string) {
  if (!ObjectId.isValid(userId)) {
    return false;
  }

  const client = await getMongoClientPromise();
  const db = client.db();
  const collection = db.collection<UserCollectionRow>("users");

  const deleted = await collection.deleteOne({ _id: new ObjectId(userId) });

  await connectToDatabase();
  const mongoUserId = toMongoUserId(userId);
  await Promise.all([
    ItineraryModel.deleteMany({ userId: mongoUserId }),
    OrderModel.deleteMany({ userId: mongoUserId }),
    UserPreferenceModel.deleteMany({ userId: mongoUserId }),
    ChatSessionModel.deleteMany({ userId: mongoUserId }),
    FeedbackModel.deleteMany({ userId: mongoUserId }),
  ]);

  return deleted.deletedCount > 0;
}
