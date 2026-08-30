import "server-only";

import type { ObjectId } from "mongodb";

import { chatsCollection } from "@/lib/db/collections";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";

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

export async function removeDocumentFromChat(params: {
  workspaceId: string;
  chatId: ObjectId;
  documentId: ObjectId;
}): Promise<"removed" | "not_found"> {
  const document = await getWorkspaceDocumentRecord(params);

  if (!document) {
    return "not_found";
  }

  const removed = await removeChatDocumentReference(params);

  if (!removed) {
    return "not_found";
  }

  return "removed";
}

async function removeChatDocumentReference(params: {
  workspaceId: string;
  chatId: ObjectId;
  documentId: ObjectId;
}): Promise<boolean> {
  const chats = await chatsCollection();
  const result = await chats.updateOne(
    {
      _id: params.chatId,
      workspaceId: params.workspaceId,
      documentIds: params.documentId,
    },
    {
      $pull: {
        documentIds: params.documentId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );

  return result.modifiedCount === 1;
}
