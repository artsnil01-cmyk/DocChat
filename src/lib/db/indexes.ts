import type { Db } from "mongodb";

import { collectionNames } from "@/lib/db/collection-names";

export async function createMongoIndexes(database: Db): Promise<void> {
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
}
