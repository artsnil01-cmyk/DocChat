import "server-only";

import type { ObjectId } from "mongodb";

import { chatsCollection, documentsCollection } from "@/lib/db/collections";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import type { Document } from "@/models/document";

export async function listWorkspaceDocuments(
  workspaceId: string,
): Promise<DocumentView[]> {
  const documents = await documentsCollection();
  const workspaceDocuments = await documents
    .find({ workspaceId })
    .sort({ updatedAt: -1 })
    .toArray();

  return workspaceDocuments.map(toDocumentView);
}

export async function listChatDocuments(params: {
  workspaceId: string;
  chatId: ObjectId;
}): Promise<DocumentView[] | null> {
  const chats = await chatsCollection();
  const chat = await chats.findOne({
    _id: params.chatId,
    workspaceId: params.workspaceId,
  });

  if (!chat) {
    return null;
  }

  if (chat.documentIds.length === 0) {
    return [];
  }

  const documents = await documentsCollection();
  const chatDocuments = await documents
    .find({
      _id: { $in: chat.documentIds },
      workspaceId: params.workspaceId,
    })
    .toArray();
  const documentById = new Map(
    chatDocuments.map((document) => [document._id.toHexString(), document]),
  );

  return chat.documentIds
    .map((documentId) => documentById.get(documentId.toHexString()))
    .filter((document): document is Document => Boolean(document))
    .map(toDocumentView);
}

export async function getWorkspaceDocument(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
  });

  return document ? toDocumentView(document) : null;
}
