import "server-only";

import type { ObjectId } from "mongodb";

import { chatsCollection } from "@/lib/db/collections";

export async function attachDocumentToChat(params: {
  workspaceId: string;
  chatId: ObjectId;
  documentId: ObjectId;
}): Promise<boolean> {
  const chats = await chatsCollection();
  const result = await chats.updateOne(
    {
      _id: params.chatId,
      workspaceId: params.workspaceId,
    },
    {
      $addToSet: {
        documentIds: params.documentId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount === 1;
}
