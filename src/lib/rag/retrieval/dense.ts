import "server-only";

import type { ObjectId } from "mongodb";

import { getRagStrategy, type RagStrategy } from "@/config/rag";
import { chunksCollection } from "@/lib/db/collections";
import { atlasSearchIndexNames } from "@/lib/db/search-indexes";
import { serverEnv } from "@/lib/env/server";
import { embedRetrievalQuery } from "@/lib/rag/retrieval/query-embedding";
import type { DenseRetrievalCandidate } from "@/lib/rag/retrieval/types";
import type { ChunkLanguage } from "@/models/chunk";

type DenseRetrievalRow = {
  _id: ObjectId;
  documentId: ObjectId;
  parentId?: ObjectId;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  startOffset?: number;
  endOffset?: number;
  language: ChunkLanguage;
  denseScore: number;
};

export async function retrieveDenseCandidates(params: {
  retrievalQuery: string;
  documentIds: ObjectId[];
  strategy?: RagStrategy;
}): Promise<DenseRetrievalCandidate[]> {
  if (params.documentIds.length === 0) {
    return [];
  }

  const strategy = params.strategy ?? getRagStrategy(serverEnv.ragStrategyVersion);
  const queryVector = await embedRetrievalQuery({
    query: params.retrievalQuery,
    strategy,
  });
  const chunks = await chunksCollection();
  const rows = await chunks
    .aggregate<DenseRetrievalRow>([
      {
        $vectorSearch: {
          index: atlasSearchIndexNames.chunksVector,
          path: "embedding",
          queryVector,
          numCandidates: strategy.retrieval.vectorCandidates,
          limit: strategy.retrieval.vectorLimit,
          filter: {
            documentId: {
              $in: params.documentIds,
            },
            strategyVersion: serverEnv.ragStrategyVersion,
            kind: "child",
          },
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          parentId: 1,
          text: 1,
          tokenCount: 1,
          pageStart: 1,
          pageEnd: 1,
          startOffset: 1,
          endOffset: 1,
          language: 1,
          denseScore: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ])
    .toArray();

  return rows
    .filter(isCompleteDenseRetrievalRow)
    .map((row): DenseRetrievalCandidate => ({
      chunkId: row._id,
      documentId: row.documentId,
      parentId: row.parentId,
      text: row.text,
      tokenCount: row.tokenCount,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      startOffset: row.startOffset,
      endOffset: row.endOffset,
      language: row.language,
      denseScore: row.denseScore,
    }));
}

function isCompleteDenseRetrievalRow(
  row: DenseRetrievalRow,
): row is DenseRetrievalRow & {
  parentId: ObjectId;
  startOffset: number;
  endOffset: number;
} {
  return (
    row.parentId !== undefined &&
    row.startOffset !== undefined &&
    row.endOffset !== undefined
  );
}
