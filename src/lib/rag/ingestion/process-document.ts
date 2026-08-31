import "server-only";

import type { ObjectId } from "mongodb";

import { getRagStrategy } from "@/config/rag";
import { isDocumentProcessingCancelRequested } from "@/lib/documents/service/cancellation";
import {
  createLockedDocumentLifecycle,
} from "@/lib/documents/service/lifecycle";
import { releaseDocumentProcessingLock } from "@/lib/documents/service/locks";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import {
  readDocumentBlobBytes,
  verifyDocumentBlobHash,
} from "@/lib/documents/storage";
import { serverEnv } from "@/lib/env/server";
import {
  buildPageAwareChunks,
  persistChunkDrafts,
} from "@/lib/rag/chunking";
import { embedDocumentChunks } from "@/lib/rag/embeddings";
import { extractPdfText } from "@/lib/rag/extraction";
import { normalizePdfText } from "@/lib/rag/normalization";
import type { DocumentError, DocumentStage } from "@/models/document";

export type RunDocumentIngestionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "missing_blob"
        | "blob_read_failed"
        | "content_hash_mismatch"
        | "pdf_extraction_failed"
        | "pdf_normalization_failed"
        | "chunking_failed"
        | "chunk_persistence_failed"
        | "embedding_failed"
        | "cancelled"
        | "lock_lost";
    };

type LockedDocumentLifecycle = ReturnType<typeof createLockedDocumentLifecycle>;

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
      return failAtReading(lifecycle, {
        reason: "missing_blob",
        code: "missing_blob",
        message: "Document Blob is missing.",
      });
    }

    const readingStarted = await markStage(lifecycle, {
      stage: "reading",
      progress: strategy.progress.reading,
    });

    if (!readingStarted.ok) {
      return readingStarted;
    }

    const initialCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "reading",
    );

    if (initialCancellation) {
      return initialCancellation;
    }

    const blobBytesResult = await readVerifiedBlobBytes({
      lifecycle,
      pathname: document.blobPathname,
      expectedHash: document.contentHash,
    });

    if (!blobBytesResult.ok) {
      return { ok: false, reason: blobBytesResult.reason };
    }

    const extractionResult = await extractPdfText(blobBytesResult.bytes);

    if (!extractionResult.ok) {
      return failAtReading(lifecycle, {
        reason: "pdf_extraction_failed",
        code: extractionResult.code.toLowerCase(),
        message: extractionResult.message,
      });
    }

    const readingCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "reading",
    );

    if (readingCancellation) {
      return readingCancellation;
    }

    const normalizingStarted = await markStage(lifecycle, {
      stage: "normalizing",
      progress: strategy.progress.normalizing,
    });

    if (!normalizingStarted.ok) {
      return normalizingStarted;
    }

    const normalizationResult = normalizePdfText(extractionResult.document);

    if (!normalizationResult.ok) {
      return failDocument(lifecycle, {
        stage: "normalizing",
        reason: "pdf_normalization_failed",
        error: {
          code: normalizationResult.code.toLowerCase(),
          message: normalizationResult.message,
        },
      });
    }

    const normalizingCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "normalizing",
    );

    if (normalizingCancellation) {
      return normalizingCancellation;
    }

    const chunkingStarted = await markStage(lifecycle, {
      stage: "chunking",
      progress: strategy.progress.chunking,
    });

    if (!chunkingStarted.ok) {
      return chunkingStarted;
    }

    const chunkingResult = buildPageAwareChunks({
      document: normalizationResult.document,
      strategy,
    });

    if (!chunkingResult.ok) {
      return failDocument(lifecycle, {
        stage: "chunking",
        reason: "chunking_failed",
        error: {
          code: chunkingResult.code.toLowerCase(),
          message: chunkingResult.message,
        },
      });
    }

    try {
      await persistChunkDrafts({
        documentId: document._id,
        strategyVersion: serverEnv.ragStrategyVersion,
        parents: chunkingResult.parents,
        children: chunkingResult.children,
      });
    } catch {
      return failDocument(lifecycle, {
        stage: "chunking",
        reason: "chunk_persistence_failed",
        error: {
          code: "chunk_persistence_failed",
          message: "Document chunks could not be persisted.",
        },
      });
    }

    const chunkingCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "chunking",
    );

    if (chunkingCancellation) {
      return chunkingCancellation;
    }

    const embeddingStarted = await markStage(lifecycle, {
      stage: "embedding",
      progress: strategy.progress.embedding,
    });

    if (!embeddingStarted.ok) {
      return embeddingStarted;
    }

    try {
      await embedDocumentChunks({
        documentId: document._id,
        strategyVersion: serverEnv.ragStrategyVersion,
        strategy,
      });
    } catch {
      return failDocument(lifecycle, {
        stage: "embedding",
        reason: "embedding_failed",
        error: {
          code: "embedding_failed",
          message: "Document chunk embeddings could not be generated.",
        },
      });
    }

    const embeddingCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "embedding",
    );

    if (embeddingCancellation) {
      return embeddingCancellation;
    }

    const indexingStarted = await markStage(lifecycle, {
      stage: "indexing",
      progress: strategy.progress.indexing,
    });

    if (!indexingStarted.ok) {
      return indexingStarted;
    }

    const indexingCancellation = await stopIfCancellationRequested(
      lifecycle,
      params,
      "indexing",
    );

    if (indexingCancellation) {
      return indexingCancellation;
    }

    const readyDocument = await lifecycle.markReady({
      pageCount: extractionResult.document.pageCount,
    });

    if (!readyDocument) {
      return { ok: false, reason: "lock_lost" };
    }

    return { ok: true };
  } finally {
    await releaseDocumentProcessingLock({
      workspaceId: params.workspaceId,
      documentId: params.documentId,
      token: params.lockToken,
    });
  }
}

async function markStage(
  lifecycle: LockedDocumentLifecycle,
  params: {
    stage: DocumentStage;
    progress: number;
  },
): Promise<{ ok: true } | { ok: false; reason: "lock_lost" }> {
  const document = await lifecycle.markProcessing(params);

  return document ? { ok: true } : { ok: false, reason: "lock_lost" };
}

async function stopIfCancellationRequested(
  lifecycle: LockedDocumentLifecycle,
  params: {
    workspaceId: string;
    documentId: ObjectId;
  },
  stage: DocumentStage,
): Promise<RunDocumentIngestionResult | null> {
  const cancelRequested = await isDocumentProcessingCancelRequested(params);

  if (!cancelRequested) {
    return null;
  }

  const cancelledDocument = await lifecycle.markCancelled({ stage });

  if (!cancelledDocument) {
    return { ok: false, reason: "lock_lost" };
  }

  return { ok: false, reason: "cancelled" };
}

async function readVerifiedBlobBytes(params: {
  lifecycle: LockedDocumentLifecycle;
  pathname: string;
  expectedHash: string;
}): Promise<
  | {
      ok: true;
      bytes: Uint8Array;
    }
  | {
      ok: false;
      reason: "blob_read_failed" | "content_hash_mismatch" | "lock_lost";
    }
> {
  let bytes: Uint8Array;

  try {
    bytes = await readDocumentBlobBytes(params.pathname);
  } catch {
    return failAtReading(params.lifecycle, {
      reason: "blob_read_failed",
      code: "blob_read_failed",
      message: "Document Blob could not be read.",
    });
  }

  if (
    !verifyDocumentBlobHash({
      bytes,
      expectedHash: params.expectedHash,
    })
  ) {
    return failAtReading(params.lifecycle, {
      reason: "content_hash_mismatch",
      code: "content_hash_mismatch",
      message: "Document Blob hash does not match the expected content hash.",
    });
  }

  return {
    ok: true,
    bytes,
  };
}

function failAtReading<
  Reason extends Exclude<RunDocumentIngestionResult, { ok: true }>["reason"],
>(
  lifecycle: LockedDocumentLifecycle,
  failure: {
    reason: Reason;
    code: string;
    message: string;
  },
): Promise<{ ok: false; reason: Reason | "lock_lost" }> {
  return failDocument(lifecycle, {
    stage: "reading",
    reason: failure.reason,
    error: {
      code: failure.code,
      message: failure.message,
    },
  });
}

async function failDocument<
  Reason extends Exclude<RunDocumentIngestionResult, { ok: true }>["reason"],
>(
  lifecycle: LockedDocumentLifecycle,
  params: {
    stage: DocumentStage;
    reason: Reason;
    error: DocumentError;
  },
): Promise<{ ok: false; reason: Reason | "lock_lost" }> {
  const failedDocument = await lifecycle.markFailed({
    stage: params.stage,
    error: params.error,
  });

  if (!failedDocument) {
    return { ok: false, reason: "lock_lost" };
  }

  return { ok: false, reason: params.reason };
}
