import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
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

type DocumentWriteGuard = {
  type: "processing-lock";
  token: string;
};

type DocumentLifecycleTarget = {
  workspaceId: string;
  documentId: ObjectId;
  guard?: DocumentWriteGuard;
};

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
  guard?: DocumentWriteGuard;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    buildDocumentLifecycleFilter(params),
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
  guard?: DocumentWriteGuard;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    buildDocumentLifecycleFilter(params),
    {
      $set: {
        status: "failed",
        stage: params.stage,
        error: params.error,
        updatedAt: new Date(),
      },
      $unset: {
        processingLock: "",
        cancelRequestedAt: "",
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
  guard?: DocumentWriteGuard;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    buildDocumentLifecycleFilter(params),
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
        cancelRequestedAt: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export async function markDocumentPageCount(params: {
  workspaceId: string;
  documentId: ObjectId;
  pageCount: number;
  guard?: DocumentWriteGuard;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    buildDocumentLifecycleFilter(params),
    {
      $set: {
        pageCount: params.pageCount,
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export async function markDocumentCancelled(params: {
  workspaceId: string;
  documentId: ObjectId;
  stage: DocumentStage;
  guard?: DocumentWriteGuard;
}): Promise<DocumentView | null> {
  const documents = await documentsCollection();
  const document = await documents.findOneAndUpdate(
    buildDocumentLifecycleFilter(params),
    {
      $set: {
        status: "cancelled",
        stage: params.stage,
        updatedAt: new Date(),
      },
      $unset: {
        error: "",
        processingLock: "",
        cancelRequestedAt: "",
      },
    },
    {
      returnDocument: "after",
    },
  );

  return document ? toDocumentView(document) : null;
}

export function createLockedDocumentLifecycle(params: {
  workspaceId: string;
  documentId: ObjectId;
  lockToken: string;
}) {
  const target = {
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    guard: {
      type: "processing-lock",
      token: params.lockToken,
    } satisfies DocumentWriteGuard,
  };

  return {
    markProcessing(input: {
      stage: DocumentStage;
      progress: number;
    }): Promise<DocumentView | null> {
      return markDocumentProcessing({
        ...target,
        ...input,
      });
    },
    markFailed(input: {
      stage: DocumentStage;
      error: DocumentError;
    }): Promise<DocumentView | null> {
      return markDocumentFailed({
        ...target,
        ...input,
      });
    },
    markReady(input: {
      pageCount: number;
    }): Promise<DocumentView | null> {
      return markDocumentReady({
        ...target,
        ...input,
      });
    },
    markPageCount(input: {
      pageCount: number;
    }): Promise<DocumentView | null> {
      return markDocumentPageCount({
        ...target,
        ...input,
      });
    },
    markCancelled(input: {
      stage: DocumentStage;
    }): Promise<DocumentView | null> {
      return markDocumentCancelled({
        ...target,
        ...input,
      });
    },
  };
}

export function getInitialProcessingStage(document: Document): DocumentStage {
  return document.stage ?? "reading";
}

function buildDocumentLifecycleFilter(
  params: DocumentLifecycleTarget,
): Filter<Document> {
  if (params.guard?.type === "processing-lock") {
    return {
      _id: params.documentId,
      workspaceId: params.workspaceId,
      "processingLock.token": params.guard.token,
    };
  }

  return {
    _id: params.documentId,
    workspaceId: params.workspaceId,
  };
}
