import "server-only";

import type { ObjectId } from "mongodb";

import { getRagStrategy, type RagStrategy } from "@/config/rag";
import { isDocumentProcessingCancelRequested } from "@/lib/documents/service/cancellation";
import { createLockedDocumentLifecycle } from "@/lib/documents/service/lifecycle";
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
import type {
  Document,
  DocumentError,
  DocumentStage,
} from "@/models/document";

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
        | "page_count_missing"
        | "cancelled"
        | "lock_lost";
    };

type IngestionFailure = Exclude<RunDocumentIngestionResult, { ok: true }>;
type IngestionFailureReason = IngestionFailure["reason"];
type LockedDocumentLifecycle = ReturnType<typeof createLockedDocumentLifecycle>;

type StageContext = {
  lifecycle: LockedDocumentLifecycle;
  workspaceId: string;
  documentId: ObjectId;
};

type StageWorkResult<TOutput> =
  | {
      ok: true;
      output: TOutput;
    }
  | {
      ok: false;
      reason: IngestionFailureReason;
      error: DocumentError;
    };

type StageRunResult<TOutput> =
  | {
      ok: true;
      output: TOutput;
    }
  | IngestionFailure;

type ReadingStageOutput = {
  pageCount: number;
};

const orderedDocumentStages = [
  "reading",
  "embedding",
  "indexing",
] as const satisfies readonly DocumentStage[];

export async function runDocumentIngestion(params: {
  workspaceId: string;
  documentId: ObjectId;
  lockToken: string;
}): Promise<RunDocumentIngestionResult> {
  const strategy = getRagStrategy(serverEnv.ragStrategyVersion);
  const lifecycle = createLockedDocumentLifecycle(params);
  const context = {
    lifecycle,
    workspaceId: params.workspaceId,
    documentId: params.documentId,
  } satisfies StageContext;

  try {
    const document = await getWorkspaceDocumentRecord(params);

    if (!document) {
      return { ok: false, reason: "not_found" };
    }

    const stages = getStagesToRun(document.stage);
    let pageCount = document.pageCount;

    if (stages.includes("reading")) {
      const readingResult = await runStage({
        context,
        stage: "reading",
        progress: strategy.progress.reading,
        work: () =>
          runReadingStage({
            document,
            lifecycle,
            strategy,
          }),
      });

      if (!readingResult.ok) {
        return readingResult;
      }

      pageCount = readingResult.output.pageCount;
    }

    if (stages.includes("embedding")) {
      const embeddingResult = await runStage({
        context,
        stage: "embedding",
        progress: strategy.progress.embedding,
        work: () =>
          runEmbeddingStage({
            document,
            strategy,
          }),
      });

      if (!embeddingResult.ok) {
        return embeddingResult;
      }
    }

    if (stages.includes("indexing")) {
      const indexingResult = await runStage({
        context,
        stage: "indexing",
        progress: strategy.progress.indexing,
        checkCancellationAfter: false,
        work: () =>
          runIndexingStage({
            context,
            lifecycle,
            pageCount,
          }),
      });

      if (!indexingResult.ok) {
        return indexingResult;
      }
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

function getStagesToRun(stage: Document["stage"]): readonly DocumentStage[] {
  const stageIndex = orderedDocumentStages.findIndex(
    (orderedStage) => orderedStage === (stage ?? "reading"),
  );

  if (stageIndex < 0) {
    return orderedDocumentStages;
  }

  return orderedDocumentStages.slice(stageIndex);
}

async function runStage<TOutput>(params: {
  context: StageContext;
  stage: DocumentStage;
  progress: number;
  checkCancellationAfter?: boolean;
  work: () => Promise<StageWorkResult<TOutput>>;
}): Promise<StageRunResult<TOutput>> {
  const stageMarked = await params.context.lifecycle.markProcessing({
    stage: params.stage,
    progress: params.progress,
  });

  if (!stageMarked) {
    return { ok: false, reason: "lock_lost" };
  }

  const beforeWorkCancellation = await stopIfCancellationRequested(
    params.context,
    params.stage,
  );

  if (beforeWorkCancellation) {
    return beforeWorkCancellation;
  }

  const workResult = await params.work();

  if (!workResult.ok) {
    if (workResult.reason === "lock_lost") {
      return { ok: false, reason: "lock_lost" };
    }

    return failDocument(params.context.lifecycle, {
      stage: params.stage,
      reason: workResult.reason,
      error: workResult.error,
    });
  }

  if (params.checkCancellationAfter !== false) {
    const afterWorkCancellation = await stopIfCancellationRequested(
      params.context,
      params.stage,
    );

    if (afterWorkCancellation) {
      return afterWorkCancellation;
    }
  }

  return workResult;
}

async function runReadingStage(params: {
  document: Document;
  lifecycle: LockedDocumentLifecycle;
  strategy: RagStrategy;
}): Promise<StageWorkResult<ReadingStageOutput>> {
  if (!params.document.blobPathname) {
    return stageFailure({
      reason: "missing_blob",
      code: "missing_blob",
      message: "Document Blob is missing.",
    });
  }

  const blobBytesResult = await readVerifiedBlobBytes({
    pathname: params.document.blobPathname,
    expectedHash: params.document.contentHash,
  });

  if (!blobBytesResult.ok) {
    return blobBytesResult;
  }

  const extractionResult = await extractPdfText(blobBytesResult.output.bytes);

  if (!extractionResult.ok) {
    return stageFailure({
      reason: "pdf_extraction_failed",
      code: extractionResult.code.toLowerCase(),
      message: extractionResult.message,
    });
  }

  const normalizationResult = normalizePdfText(extractionResult.document);

  if (!normalizationResult.ok) {
    return stageFailure({
      reason: "pdf_normalization_failed",
      code: normalizationResult.code.toLowerCase(),
      message: normalizationResult.message,
    });
  }

  const chunkingResult = buildPageAwareChunks({
    document: normalizationResult.document,
    strategy: params.strategy,
  });

  if (!chunkingResult.ok) {
    return stageFailure({
      reason: "chunking_failed",
      code: chunkingResult.code.toLowerCase(),
      message: chunkingResult.message,
    });
  }

  try {
    await persistChunkDrafts({
      documentId: params.document._id,
      strategyVersion: serverEnv.ragStrategyVersion,
      parents: chunkingResult.parents,
      children: chunkingResult.children,
    });
  } catch {
    return stageFailure({
      reason: "chunk_persistence_failed",
      code: "chunk_persistence_failed",
      message: "Document chunks could not be persisted.",
    });
  }

  const pageCountDocument = await params.lifecycle.markPageCount({
    pageCount: extractionResult.document.pageCount,
  });

  if (!pageCountDocument) {
    return {
      ok: false,
      reason: "lock_lost",
      error: {
        code: "lock_lost",
        message: "Document processing lock was lost.",
      },
    };
  }

  return {
    ok: true,
    output: {
      pageCount: extractionResult.document.pageCount,
    },
  };
}

async function runEmbeddingStage(params: {
  document: Document;
  strategy: RagStrategy;
}): Promise<StageWorkResult<undefined>> {
  try {
    await embedDocumentChunks({
      documentId: params.document._id,
      strategyVersion: serverEnv.ragStrategyVersion,
      strategy: params.strategy,
    });
  } catch {
    return stageFailure({
      reason: "embedding_failed",
      code: "embedding_failed",
      message: "Document chunk embeddings could not be generated.",
    });
  }

  return {
    ok: true,
    output: undefined,
  };
}

async function runIndexingStage(params: {
  context: StageContext;
  lifecycle: LockedDocumentLifecycle;
  pageCount?: number;
}): Promise<StageWorkResult<undefined>> {
  const pageCount = params.pageCount ?? (await getPersistedPageCount(params.context));

  if (!pageCount) {
    return stageFailure({
      reason: "page_count_missing",
      code: "page_count_missing",
      message: "Document page count is missing.",
    });
  }

  const readyDocument = await params.lifecycle.markReady({
    pageCount,
  });

  if (!readyDocument) {
    return {
      ok: false,
      reason: "lock_lost",
      error: {
        code: "lock_lost",
        message: "Document processing lock was lost.",
      },
    };
  }

  return {
    ok: true,
    output: undefined,
  };
}

async function getPersistedPageCount(
  context: StageContext,
): Promise<number | undefined> {
  const document = await getWorkspaceDocumentRecord({
    workspaceId: context.workspaceId,
    documentId: context.documentId,
  });

  return document?.pageCount;
}

async function stopIfCancellationRequested(
  context: StageContext,
  stage: DocumentStage,
): Promise<IngestionFailure | null> {
  const cancelRequested = await isDocumentProcessingCancelRequested({
    workspaceId: context.workspaceId,
    documentId: context.documentId,
  });

  if (!cancelRequested) {
    return null;
  }

  const cancelledDocument = await context.lifecycle.markCancelled({ stage });

  if (!cancelledDocument) {
    return { ok: false, reason: "lock_lost" };
  }

  return { ok: false, reason: "cancelled" };
}

async function readVerifiedBlobBytes(params: {
  pathname: string;
  expectedHash: string;
}): Promise<
  StageWorkResult<{
    bytes: Uint8Array;
  }>
> {
  let bytes: Uint8Array;

  try {
    bytes = await readDocumentBlobBytes(params.pathname);
  } catch {
    return stageFailure({
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
    return stageFailure({
      reason: "content_hash_mismatch",
      code: "content_hash_mismatch",
      message: "Document Blob hash does not match the expected content hash.",
    });
  }

  return {
    ok: true,
    output: {
      bytes,
    },
  };
}

function stageFailure(params: {
  reason: IngestionFailureReason;
  code: string;
  message: string;
}): StageWorkResult<never> {
  return {
    ok: false,
    reason: params.reason,
    error: {
      code: params.code,
      message: params.message,
    },
  };
}

async function failDocument(
  lifecycle: LockedDocumentLifecycle,
  params: {
    stage: DocumentStage;
    reason: IngestionFailureReason;
    error: DocumentError;
  },
): Promise<IngestionFailure> {
  const failedDocument = await lifecycle.markFailed({
    stage: params.stage,
    error: params.error,
  });

  if (!failedDocument) {
    return { ok: false, reason: "lock_lost" };
  }

  return { ok: false, reason: params.reason };
}
