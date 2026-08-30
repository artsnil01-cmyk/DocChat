import "server-only";

import type { ObjectId } from "mongodb";

import { chatsCollection, documentsCollection } from "@/lib/db/collections";
import {
  deleteDocumentData,
  hasDocumentChatReferences,
} from "@/lib/documents/service/cleanup";

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

export async function replaceChatDocumentReference(params: {
  workspaceId: string;
  chatId: ObjectId;
  currentDocumentId: ObjectId;
  replacementDocumentId: ObjectId;
}): Promise<boolean> {
  const chats = await chatsCollection();
  const result = await chats.updateOne(
    {
      _id: params.chatId,
      workspaceId: params.workspaceId,
      documentIds: params.currentDocumentId,
    },
    [
      {
        $set: {
          documentIds: {
            $setUnion: [
              {
                $filter: {
                  input: "$documentIds",
                  as: "documentId",
                  cond: {
                    $ne: ["$$documentId", params.currentDocumentId],
                  },
                },
              },
              [params.replacementDocumentId],
            ],
          },
          updatedAt: new Date(),
        },
      },
    ],
  );

  return result.matchedCount === 1;
}

export async function removeDocumentFromChat(params: {
  workspaceId: string;
  chatId: ObjectId;
  documentId: ObjectId;
}): Promise<"removed" | "removed_and_deleted" | "not_found"> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
  });

  if (!document) {
    return "not_found";
  }

  const removed = await removeChatDocumentReference(params);

  if (!removed) {
    return "not_found";
  }

  const stillReferenced = await hasDocumentChatReferences({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
  });

  if (stillReferenced) {
    return "removed";
  }

  await deleteDocumentData(document);
  return "removed_and_deleted";
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
