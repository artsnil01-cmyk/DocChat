import "server-only";

import type { ObjectId } from "mongodb";

import { acquireDocumentProcessingLock } from "@/lib/documents/service/locks";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import { runDocumentIngestion } from "@/lib/rag/ingestion";

export type ProcessDocumentResult =
  | {
      ok: true;
      state: "processing_started" | "upload_required" | "already_processing" | "ready";
      document: DocumentView;
    }
  | {
      ok: false;
      reason: "not_found" | "not_processable";
      document?: DocumentView;
    };

export async function processDocument(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<ProcessDocumentResult> {
  const lockResult = await acquireDocumentProcessingLock(params);

  if (!lockResult.ok) {
    if (lockResult.reason === "not_found") {
      return { ok: false, reason: "not_found" };
    }

    if (lockResult.reason === "upload_required") {
      return {
        ok: true,
        state: "upload_required",
        document: toDocumentView(lockResult.document),
      };
    }

    if (lockResult.reason === "ready") {
      return {
        ok: true,
        state: "ready",
        document: toDocumentView(lockResult.document),
      };
    }

    if (lockResult.reason === "locked") {
      return {
        ok: true,
        state: "already_processing",
        document: toDocumentView(lockResult.document),
      };
    }

    return {
      ok: false,
      reason: lockResult.reason,
    };
  }

  await runDocumentIngestion({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    lockToken: lockResult.lock.token,
  });

  return {
    ok: true,
    state: "processing_started",
    document: toDocumentView(lockResult.lock.document),
  };
}
