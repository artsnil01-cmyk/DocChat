import { createRequire } from "node:module";

import { MongoClient } from "mongodb";

import { collectionNames } from "../src/lib/db/collection-names";
import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  await client.connect();

  const database = client.db(env.mongodbDatabase);

  await Promise.all([
    database
      .collection(collectionNames.accounts)
      .createIndex({ email: 1 }, { unique: true, name: "email_unique" }),

    database.collection(collectionNames.sessions).createIndex(
      { tokenHash: 1 },
      {
        unique: true,
        name: "token_hash_unique",
      },
    ),

    database.collection(collectionNames.sessions).createIndex(
      { expiresAt: 1 },
      {
        expireAfterSeconds: 0,
        name: "expires_at_ttl",
      },
    ),

    database.collection(collectionNames.documents).createIndex(
      { workspaceId: 1, contentHash: 1 },
      {
        unique: true,
        name: "workspace_content_hash_unique",
      },
    ),

    database
      .collection(collectionNames.chunks)
      .createIndex({ documentId: 1 }, { name: "document_id" }),

    database.collection(collectionNames.chunks).createIndex(
      { documentId: 1, strategyVersion: 1, kind: 1 },
      {
        name: "document_strategy_kind",
      },
    ),

    database.collection(collectionNames.chats).createIndex(
      { workspaceId: 1, updatedAt: -1 },
      {
        name: "workspace_updated_at_desc",
      },
    ),

    database.collection(collectionNames.messages).createIndex(
      { chatId: 1, createdAt: 1 },
      {
        name: "chat_created_at",
      },
    ),
  ]);

  console.log("MongoDB base indexes are ready.");
} catch (error) {
  console.error("MongoDB index creation failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}
