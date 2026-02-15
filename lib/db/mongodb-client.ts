import { MongoClient } from "mongodb";
import { getServerEnv } from "@/lib/env/server";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise() {
  if (globalThis.mongoClientPromise) {
    return globalThis.mongoClientPromise;
  }

  const { MONGODB_URI } = getServerEnv();
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required for auth adapter");
  }

  const parsed = new URL(MONGODB_URI);
  const hasDbName = parsed.pathname && parsed.pathname !== "/";
  if (!hasDbName) {
    parsed.pathname = "/travel_planner";
  }

  const client = new MongoClient(parsed.toString());
  globalThis.mongoClientPromise = client.connect();
  return globalThis.mongoClientPromise;
}
