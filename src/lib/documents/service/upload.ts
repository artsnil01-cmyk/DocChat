import "server-only";

import { ObjectId } from "mongodb";

import { chatsCollection, documentsCollection } from "@/lib/db/collections";
import { attachDocumentToChat } from "@/lib/documents/service/attachments";
import { resolveWorkspaceDocumentName } from "@/lib/documents/service/naming";
import {
  findWorkspaceDocumentByContentHash,
  getWorkspaceDocumentRecord,
} from "@/lib/documents/service/queries";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import {
  buildDocumentBlobPathname,
  getPrivatePdfUploadConstraints,
  type DocumentBlobUploadConstraints,
} from "@/lib/documents/storage";
import type { Document } from "@/models/document";

export type UploadPreflightResult = {
  document: DocumentView;
  duplicate: boolean;
  requiresUpload: boolean;
  upload?: DocumentUploadInstructions;
};

export type DocumentUploadInstructions = {
  pathname: string;
  handleUploadUrl: "/api/documents/blob";
};

export type DocumentUploadAuthorizationResult =
  | {
      ok: true;
      authorization: DocumentBlobUploadConstraints;
      tokenPayload: DocumentUploadTokenPayload;
    }
  | {
      ok: false;
      reason: "not_found" | "invalid_state" | "pathname_mismatch";
    };

export type DocumentUploadTokenPayload = {
  chatId: string;
  documentId: string;
  workspaceId: string;
  pathname: string;
  sizeBytes: number;
  contentHash: string;
};

export async function preflightDocumentUpload(params: {
  workspaceId: string;
  chatId: ObjectId;
  name: string;
  contentHash: string;
  sizeBytes: number;
}): Promise<UploadPreflightResult | null> {
  const chats = await chatsCollection();
  const chat = await chats.findOne({
    _id: params.chatId,
    workspaceId: params.workspaceId,
  });

  if (!chat) {
    return null;
  }

  const existingDocument = await findWorkspaceDocumentByContentHash({
    workspaceId: params.workspaceId,
    contentHash: params.contentHash,
  });

  if (existingDocument) {
    return resolveExistingDocumentPreflight({
      document: existingDocument,
      chatId: params.chatId,
    });
  }

  const document = await createPendingDocument(params);
  await attachDocumentToChat({
    workspaceId: params.workspaceId,
    chatId: params.chatId,
    documentId: document._id,
  });

  return {
    document: toDocumentView(document),
    duplicate: false,
    requiresUpload: true,
    upload: getUploadInstructions(document._id),
  };
}

export async function authorizeDocumentBlobUpload(params: {
  workspaceId: string;
  chatId: ObjectId;
  documentId: ObjectId;
  pathname: string;
}): Promise<DocumentUploadAuthorizationResult> {
  const chats = await chatsCollection();
  const chat = await chats.findOne({
    _id: params.chatId,
    workspaceId: params.workspaceId,
    documentIds: params.documentId,
  });

  if (!chat) {
    return { ok: false, reason: "not_found" };
  }

  const document = await getWorkspaceDocumentRecord({
    documentId: params.documentId,
    workspaceId: chat.workspaceId,
  });

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  if (document.status !== "pending_upload" || document.blobPathname) {
    return { ok: false, reason: "invalid_state" };
  }

  const pathname = buildDocumentBlobPathname(document._id.toHexString());

  if (params.pathname !== pathname) {
    return { ok: false, reason: "pathname_mismatch" };
  }

  return {
    ok: true,
    authorization: getPrivatePdfUploadConstraints({ pathname }),
    tokenPayload: {
      chatId: chat._id.toHexString(),
      documentId: document._id.toHexString(),
      workspaceId: document.workspaceId,
      pathname,
      sizeBytes: document.sizeBytes,
      contentHash: document.contentHash,
    },
  };
}

async function resolveExistingDocumentPreflight(params: {
  document: Document;
  chatId: ObjectId;
}): Promise<UploadPreflightResult> {
  await attachDocumentToChat({
    workspaceId: params.document.workspaceId,
    chatId: params.chatId,
    documentId: params.document._id,
  });

  if (params.document.status === "pending_upload") {
    return existingDocumentUploadResult(params.document);
  }

  if (params.document.status === "failed" && !params.document.blobPathname) {
    const document = await resetFailedDocumentToPendingUpload(params.document);
    return existingDocumentUploadResult(document);
  }

  return {
    document: toDocumentView(params.document),
    duplicate: true,
    requiresUpload: false,
  };
}

function existingDocumentUploadResult(document: Document): UploadPreflightResult {
  return {
    document: toDocumentView(document),
    duplicate: true,
    requiresUpload: true,
    upload: getUploadInstructions(document._id),
  };
}

async function createPendingDocument(params: {
  workspaceId: string;
  name: string;
  contentHash: string;
  sizeBytes: number;
}): Promise<Document> {
  const now = new Date();
  const document: Document = {
    _id: new ObjectId(),
    workspaceId: params.workspaceId,
    name: await resolveWorkspaceDocumentName(params.workspaceId, params.name),
    contentHash: params.contentHash,
    sizeBytes: params.sizeBytes,
    status: "pending_upload",
    createdAt: now,
    updatedAt: now,
  };

  const documents = await documentsCollection();
  await documents.insertOne(document);

  return document;
}

async function resetFailedDocumentToPendingUpload(
  document: Document,
): Promise<Document> {
  const documents = await documentsCollection();
  const result = await documents.findOneAndUpdate(
    {
      _id: document._id,
      workspaceId: document.workspaceId,
      status: "failed",
      blobPathname: { $exists: false },
    },
    {
      $set: {
        status: "pending_upload",
        updatedAt: new Date(),
      },
      $unset: {
        stage: "",
        progress: "",
        error: "",
        pageCount: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return result ?? document;
}

function getUploadInstructions(documentId: ObjectId): DocumentUploadInstructions {
  return {
    pathname: buildDocumentBlobPathname(documentId.toHexString()),
    handleUploadUrl: "/api/documents/blob",
  };
}
