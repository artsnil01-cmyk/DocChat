import "server-only";

import { ObjectId } from "mongodb";

import { chatsCollection, documentsCollection } from "@/lib/db/collections";
import {
  buildDocumentBlobPathname,
  getPrivatePdfUploadConstraints,
  type BlobMetadata,
  type DocumentBlobUploadConstraints,
} from "@/lib/documents/storage";
import type { Document } from "@/models/document";

export type DocumentView = {
  id: string;
  workspaceId: string;
  name: string;
  contentHash: string;
  blobPathname?: string;
  sizeBytes: number;
  pageCount?: number;
  status: Document["status"];
  stage?: Document["stage"];
  progress?: number;
  error?: Document["error"];
  createdAt: string;
  updatedAt: string;
};

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

export type CompleteDocumentUploadResult =
  | {
      ok: true;
      document: DocumentView;
    }
  | {
      ok: false;
      reason: "not_found" | "invalid_state" | "pathname_mismatch" | "blob_mismatch";
    };

export type DocumentUploadTokenPayload = {
  documentId: string;
  workspaceId: string;
  pathname: string;
  sizeBytes: number;
  contentHash: string;
};

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

export async function completeDocumentBlobUpload(params: {
  tokenPayload: DocumentUploadTokenPayload;
  blob: BlobMetadata;
}): Promise<CompleteDocumentUploadResult> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: new ObjectId(params.tokenPayload.documentId),
    workspaceId: params.tokenPayload.workspaceId,
  });

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  if (document.status !== "pending_upload" || document.blobPathname) {
    return { ok: false, reason: "invalid_state" };
  }

  const expectedPathname = buildDocumentBlobPathname(document._id.toHexString());

  if (
    params.tokenPayload.pathname !== expectedPathname ||
    params.blob.pathname !== expectedPathname
  ) {
    return { ok: false, reason: "pathname_mismatch" };
  }

  if (
    params.tokenPayload.sizeBytes !== document.sizeBytes ||
    params.tokenPayload.contentHash !== document.contentHash ||
    params.blob.size !== document.sizeBytes ||
    params.blob.contentType !== "application/pdf"
  ) {
    return { ok: false, reason: "blob_mismatch" };
  }

  const now = new Date();
  const result = await documents.findOneAndUpdate(
    {
      _id: document._id,
      workspaceId: params.tokenPayload.workspaceId,
      status: "pending_upload",
      blobPathname: { $exists: false },
    },
    {
      $set: {
        blobPathname: expectedPathname,
        status: "processing",
        stage: "reading",
        progress: 0,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!result) {
    return { ok: false, reason: "invalid_state" };
  }

  return {
    ok: true,
    document: toDocumentView(result),
  };
}

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

async function resolveWorkspaceDocumentName(
  workspaceId: string,
  requestedName: string,
): Promise<string> {
  const documents = await documentsCollection();
  const existingNames = new Set(
    (
      await documents
        .find({ workspaceId }, { projection: { name: 1 } })
        .toArray()
    ).map((document) => document.name),
  );

  if (!existingNames.has(requestedName)) {
    return requestedName;
  }

  const { stem, extension } = splitFilename(requestedName);
  let candidateIndex = 1;
  let candidate = `${stem} (${candidateIndex})${extension}`;

  while (existingNames.has(candidate)) {
    candidateIndex += 1;
    candidate = `${stem} (${candidateIndex})${extension}`;
  }

  return candidate;
}

function splitFilename(filename: string): { stem: string; extension: string } {
  const extensionStart = filename.lastIndexOf(".");

  if (extensionStart <= 0 || extensionStart === filename.length - 1) {
    return {
      stem: filename,
      extension: "",
    };
  }

  return {
    stem: filename.slice(0, extensionStart),
    extension: filename.slice(extensionStart),
  };
}

function toDocumentView(document: Document): DocumentView {
  return {
    id: document._id.toHexString(),
    workspaceId: document.workspaceId,
    name: document.name,
    contentHash: document.contentHash,
    blobPathname: document.blobPathname,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    status: document.status,
    stage: document.stage,
    progress: document.progress,
    error: document.error,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
