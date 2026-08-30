import "server-only";

import type { ObjectId } from "mongodb";

import { getRagStrategy } from "@/config/rag";
import {
  createLockedDocumentLifecycle,
} from "@/lib/documents/service/lifecycle";
import { releaseDocumentProcessingLock } from "@/lib/documents/service/locks";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import { serverEnv } from "@/lib/env/server";

export type RunDocumentIngestionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not_found" | "missing_blob" | "not_implemented" | "lock_lost";
    };

export async function runDocumentIngestion(params: {
  workspaceId: string;
  documentId: ObjectId;
  lockToken: string;
}): Promise<RunDocumentIngestionResult> {
  const strategy = getRagStrategy(serverEnv.ragStrategyVersion);
  const lifecycle = createLockedDocumentLifecycle(params);

  try {
    const document = await getWorkspaceDocumentRecord(params);

    if (!document) {
      return { ok: false, reason: "not_found" };
    }

    if (!document.blobPathname) {
      const failedDocument = await lifecycle.markFailed({
        stage: "reading",
        error: {
          code: "missing_blob",
          message: "Document Blob is missing.",
        },
      });

      if (!failedDocument) {
        return { ok: false, reason: "lock_lost" };
      }

      return { ok: false, reason: "missing_blob" };
    }

    const processingDocument = await lifecycle.markProcessing({
      stage: "reading",
      progress: strategy.progress.reading,
    });

    if (!processingDocument) {
      return { ok: false, reason: "lock_lost" };
    }

    const failedDocument = await lifecycle.markFailed({
      stage: "reading",
      error: {
        code: "rag_ingestion_not_implemented",
        message: `Document ingestion is not implemented yet for ${serverEnv.ragStrategyVersion}.`,
      },
    });

    if (!failedDocument) {
      return { ok: false, reason: "lock_lost" };
    }

    return { ok: false, reason: "not_implemented" };
  } finally {
    await releaseDocumentProcessingLock({
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      token: params.lockToken,
    });
  }
}
