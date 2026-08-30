import "server-only";

import type { ObjectId } from "mongodb";

import {
  markDocumentFailed,
  markDocumentProcessing,
} from "@/lib/documents/service/lifecycle";
import { releaseDocumentProcessingLock } from "@/lib/documents/service/locks";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import type { DocumentStage } from "@/models/document";

export type RunDocumentIngestionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not_found" | "missing_blob" | "not_implemented";
    };

export async function runDocumentIngestion(params: {
  workspaceId: string;
  documentId: ObjectId;
  lockToken: string;
}): Promise<RunDocumentIngestionResult> {
  try {
    const document = await getWorkspaceDocumentRecord(params);

    if (!document) {
      return { ok: false, reason: "not_found" };
    }

    if (!document.blobPathname) {
      await failDocument(params, "reading", "missing_blob", "Document Blob is missing.");
      return { ok: false, reason: "missing_blob" };
    }

    await markDocumentProcessing({
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      stage: "reading",
      progress: 5,
    });

    await failDocument(
      params,
      "reading",
      "rag_ingestion_not_implemented",
      "Document ingestion is not implemented yet.",
    );

    return { ok: false, reason: "not_implemented" };
  } finally {
    await releaseDocumentProcessingLock({
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      token: params.lockToken,
    });
  }
}

async function failDocument(
  params: {
    workspaceId: string;
    documentId: ObjectId;
  },
  stage: DocumentStage,
  code: string,
  message: string,
): Promise<void> {
  await markDocumentFailed({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    stage,
    error: {
      code,
      message,
    },
  });
}
