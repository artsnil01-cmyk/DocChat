import "server-only";

import type { ObjectId } from "mongodb";

import {
  chatsCollection,
  chunksCollection,
  documentsCollection,
} from "@/lib/db/collections";
import { deleteBlob } from "@/lib/documents/storage";
import type { Document } from "@/models/document";

export async function hasDocumentChatReferences(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<boolean> {
  const chats = await chatsCollection();
  const chat = await chats.findOne(
    {
      workspaceId: params.workspaceId,
      documentIds: params.documentId,
    },
    {
      projection: {
        _id: 1,
      },
    },
  );

  return Boolean(chat);
}

export async function deleteDocumentData(document: Document): Promise<void> {
  const chunks = await chunksCollection();
  await chunks.deleteMany({ documentId: document._id });

  if (document.blobPathname) {
    await deleteBlob(document.blobPathname).catch(() => undefined);
  }

  const documents = await documentsCollection();
  await documents.deleteOne({
    _id: document._id,
    workspaceId: document.workspaceId,
  });
}

export async function deletePendingUpload(params: {
  documentId: ObjectId;
  workspaceId: string;
  pathname: string;
}): Promise<void> {
  await deleteBlob(params.pathname).catch(() => undefined);

  const documents = await documentsCollection();
  await documents.deleteOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
    status: "pending_upload",
  });
}
