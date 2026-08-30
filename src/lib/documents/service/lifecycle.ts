import "server-only";

import { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
import { replaceChatDocumentReference } from "@/lib/documents/service/attachments";
import { deletePendingUpload } from "@/lib/documents/service/cleanup";
import {
  findWorkspaceDocumentByContentHash,
  getWorkspaceDocumentRecord,
} from "@/lib/documents/service/queries";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import {
  buildDocumentBlobPathname,
  calculateBlobSha256Hex,
  type BlobMetadata,
} from "@/lib/documents/storage";
import type {
  Document,
  DocumentError,
  DocumentStage,
} from "@/models/document";
import type { DocumentUploadTokenPayload } from "@/lib/documents/service/upload";

export type CompleteDocumentUploadResult =
  | {
      ok: true;
      document: DocumentView;
      duplicate: boolean;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "invalid_state"
        | "pathname_mismatch"
        | "blob_mismatch"
        | "content_hash_mismatch";
    };

export async function completeDocumentBlobUpload(params: {
  tokenPayload: DocumentUploadTokenPayload;
  blob: BlobMetadata;
}): Promise<CompleteDocumentUploadResult> {
  const document = await getWorkspaceDocumentRecord({
    documentId: new ObjectId(params.tokenPayload.documentId),
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

  const verifiedContentHash = await calculateBlobSha256Hex(expectedPathname);

  if (verifiedContentHash !== document.contentHash) {
    await deletePendingUpload({
      documentId: document._id,
      workspaceId: document.workspaceId,
      pathname: expectedPathname,
    });

    return { ok: false, reason: "content_hash_mismatch" };
  }

  const existingDocument = await findWorkspaceDocumentByContentHash({
    workspaceId: document.workspaceId,
    contentHash: verifiedContentHash,
  });

  if (existingDocument && !existingDocument._id.equals(document._id)) {
    await replaceChatDocumentReference({
      workspaceId: document.workspaceId,
      chatId: new ObjectId(params.tokenPayload.chatId),
      currentDocumentId: document._id,
      replacementDocumentId: existingDocument._id,
    });
    await deletePendingUpload({
      documentId: document._id,
      workspaceId: document.workspaceId,
      pathname: expectedPathname,
    });

    return {
      ok: true,
      document: toDocumentView(existingDocument),
      duplicate: true,
    };
  }

  const now = new Date();
  const documents = await documentsCollection();
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
    duplicate: false,
  };
}

export async function markDocumentProcessing(params: {
  workspaceId: string;
  documentId: ObjectId;
  stage: DocumentStage;
  progress: number;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
    },
    {
      $set: {
        status: "processing",
        stage: params.stage,
        progress: params.progress,
        updatedAt: new Date(),
      },
      $unset: {
        error: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export async function markDocumentFailed(params: {
  workspaceId: string;
  documentId: ObjectId;
  stage: DocumentStage;
  error: DocumentError;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
    },
    {
      $set: {
        status: "failed",
        stage: params.stage,
        error: params.error,
        updatedAt: new Date(),
      },
      $unset: {
        processingLock: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export async function markDocumentReady(params: {
  workspaceId: string;
  documentId: ObjectId;
  pageCount: number;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
    },
    {
      $set: {
        status: "ready",
        progress: 100,
        pageCount: params.pageCount,
        updatedAt: new Date(),
      },
      $unset: {
        stage: "",
        error: "",
        processingLock: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export function getInitialProcessingStage(document: Document): DocumentStage {
  return document.stage ?? "reading";
}
