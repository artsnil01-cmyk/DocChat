import "server-only";

import { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
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
  documentId: string;
  workspaceId: string;
  pathname: string;
  sizeBytes: number;
  contentHash: string;
};

export async function preflightDocumentUpload(params: {
  workspaceId: string;
  name: string;
  contentHash: string;
  sizeBytes: number;
}): Promise<UploadPreflightResult> {
  const existingDocument = await findWorkspaceDocumentByContentHash({
    workspaceId: params.workspaceId,
    contentHash: params.contentHash,
  });

  if (existingDocument) {
    return resolveExistingDocumentPreflight(existingDocument);
  }

  const document = await createPendingDocument(params);

  return {
    document: toDocumentView(document),
    duplicate: false,
    requiresUpload: true,
    upload: getUploadInstructions(document._id),
  };
}

export async function authorizeDocumentBlobUpload(params: {
  workspaceId: string;
  documentId: ObjectId;
  pathname: string;
}): Promise<DocumentUploadAuthorizationResult> {
  const document = await getWorkspaceDocumentRecord({
    documentId: params.documentId,
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

async function resolveExistingDocumentPreflight(
  document: Document,
): Promise<UploadPreflightResult> {
  if (document.status === "pending_upload") {
    return existingDocumentUploadResult(document);
  }

  if (document.status === "failed" && !document.blobPathname) {
    const resetDocument = await resetFailedDocumentToPendingUpload(document);
    return existingDocumentUploadResult(resetDocument);
  }

  return {
    document: toDocumentView(document),
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
