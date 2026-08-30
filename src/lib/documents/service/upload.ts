import "server-only";

import { ObjectId } from "mongodb";

import { chatsCollection, documentsCollection } from "@/lib/db/collections";
import { attachDocumentToChat } from "@/lib/documents/service/attachments";
import { resolveWorkspaceDocumentName } from "@/lib/documents/service/naming";
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
  handleUploadUrl: "/api/upload/blob";
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

  const documents = await documentsCollection();
  const existingDocument = await documents.findOne({
    workspaceId: params.workspaceId,
    contentHash: params.contentHash,
  });

  if (existingDocument) {
    await attachDocumentToChat({
      workspaceId: params.workspaceId,
      chatId: params.chatId,
      documentId: existingDocument._id,
    });

    return {
      document: toDocumentView(existingDocument),
      duplicate: true,
      requiresUpload: false,
    };
  }

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

  await documents.insertOne(document);
  await attachDocumentToChat({
    workspaceId: params.workspaceId,
    chatId: params.chatId,
    documentId: document._id,
  });

  return {
    document: toDocumentView(document),
    duplicate: false,
    requiresUpload: true,
    upload: {
      pathname: buildDocumentBlobPathname(document._id.toHexString()),
      handleUploadUrl: "/api/upload/blob",
    },
  };
}

export async function authorizeDocumentBlobUpload(params: {
  workspaceId: string;
  documentId: ObjectId;
  pathname: string;
}): Promise<DocumentUploadAuthorizationResult> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
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
      documentId: document._id.toHexString(),
      workspaceId: document.workspaceId,
      pathname,
      sizeBytes: document.sizeBytes,
      contentHash: document.contentHash,
    },
  };
}
