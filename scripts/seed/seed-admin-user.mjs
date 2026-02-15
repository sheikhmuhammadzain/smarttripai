import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function run() {
  const localEnv = loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));
  const MONGODB_URI = process.env.MONGODB_URI ?? localEnv.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Set it in .env.local or env vars.");
  }

  const email = "admin@gmail.com";
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db("travel_planner");
    const users = db.collection("users");

    const result = await users.updateOne(
      { email },
      {
        $set: {
          name: "Admin",
          email,
          passwordHash,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          emailVerified: null,
          image: null,
        },
      },
      { upsert: true },
    );

    console.log("Admin user ready:", {
      email,
      upsertedId: result.upsertedId ?? null,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
