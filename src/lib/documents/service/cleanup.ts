import "server-only";

import type { ObjectId } from "mongodb";

import {
  chatsCollection,
  chunksCollection,
  documentsCollection,
} from "@/lib/db/collections";
import { deleteBlob } from "@/lib/documents/storage";
import type { Document } from "@/models/document";

export type DeleteWorkspaceDocumentResult =
  | "deleted"
  | "not_found"
  | "processing";

export async function deleteWorkspaceDocument(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<DeleteWorkspaceDocumentResult> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
  });

  if (!document) {
    return "not_found";
  }

  if (hasActiveProcessingLock(document)) {
    return "processing";
  }

  const chats = await chatsCollection();
  await chats.updateMany(
    {
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

  await deleteDocumentData(document);
  return "deleted";
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

function hasActiveProcessingLock(document: Document): boolean {
  return Boolean(
    document.processingLock && document.processingLock.expiresAt > new Date(),
  );
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
