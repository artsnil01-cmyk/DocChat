import "server-only";

import type { ObjectId } from "mongodb";

import { getDocumentNextAction } from "@/lib/documents/service/actions";
import {
  getInitialProcessingStage,
  markDocumentProcessing,
} from "@/lib/documents/service/lifecycle";
import {
  acquireDocumentProcessingLock,
  releaseDocumentProcessingLock,
} from "@/lib/documents/service/locks";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import type { Document } from "@/models/document";

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
  const document = await getWorkspaceDocumentRecord(params);

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  const stableResult = getStableProcessResult(document);

  if (stableResult) {
    return stableResult;
  }

  const lockResult = await acquireDocumentProcessingLock(params);

  if (!lockResult.ok) {
    if (lockResult.reason === "locked") {
      return {
        ok: true,
        state: "already_processing",
        document: toDocumentView(document),
      };
    }

    const freshDocument = await getWorkspaceDocumentRecord(params);

    if (!freshDocument) {
      return { ok: false, reason: "not_found" };
    }

    const freshStableResult = getStableProcessResult(freshDocument);

    if (freshStableResult) {
      return freshStableResult;
    }

    return {
      ok: false,
      reason: lockResult.reason,
      document: toDocumentView(freshDocument),
    };
  }

  const processingDocument = await markDocumentProcessing({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    stage: getInitialProcessingStage(lockResult.lock.document),
    progress: 0,
  });

  await releaseDocumentProcessingLock({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    token: lockResult.lock.token,
  });

  if (!processingDocument) {
    return {
      ok: false,
      reason: "not_found",
    };
  }

  return {
    ok: true,
    state: "processing_started",
    document: processingDocument,
  };
}

function getStableProcessResult(document: Document): ProcessDocumentResult | null {
  const nextAction = getDocumentNextAction(document);

  if (nextAction.type === "upload") {
    return {
      ok: true,
      state: "upload_required",
      document: toDocumentView(document),
    };
  }

  if (nextAction.type === "none") {
    return {
      ok: true,
      state: "ready",
      document: toDocumentView(document),
    };
  }

  return null;
}
