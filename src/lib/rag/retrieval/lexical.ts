import "server-only";

import type { ObjectId } from "mongodb";

import { getRagStrategy, type RagStrategy } from "@/config/rag";
import { chunksCollection } from "@/lib/db/collections";
import { atlasSearchIndexNames } from "@/lib/db/search-indexes";
import { serverEnv } from "@/lib/env/server";
import type { LexicalRetrievalCandidate } from "@/lib/rag/retrieval/types";
import type { ChunkLanguage } from "@/models/chunk";

type LexicalRetrievalRow = {
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
  lexicalScore: number;
};

export async function retrieveLexicalCandidates(params: {
  retrievalQuery: string;
  documentIds: ObjectId[];
  strategy?: RagStrategy;
}): Promise<LexicalRetrievalCandidate[]> {
  if (params.documentIds.length === 0) {
    return [];
  }

  const strategy = params.strategy ?? getRagStrategy(serverEnv.ragStrategyVersion);
  const chunks = await chunksCollection();
  const rows = await chunks
    .aggregate<LexicalRetrievalRow>([
      {
        $search: {
          index: atlasSearchIndexNames.chunksText,
          compound: {
            must: [
              {
                text: {
                  query: params.retrievalQuery,
                  path: [
                    "text",
                    {
                      value: "text",
                      multi: "french",
                    },
                    {
                      value: "text",
                      multi: "arabic",
                    },
                  ],
                },
              },
            ],
            filter: [
              {
                in: {
                  path: "documentId",
                  value: params.documentIds,
                },
              },
              {
                equals: {
                  path: "strategyVersion",
                  value: serverEnv.ragStrategyVersion,
                },
              },
              {
                equals: {
                  path: "kind",
                  value: "child",
                },
              },
            ],
          },
        },
      },
      {
        $limit: strategy.retrieval.lexicalLimit,
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
          lexicalScore: {
            $meta: "searchScore",
          },
        },
      },
    ])
    .toArray();

  return rows
    .filter(isCompleteLexicalRetrievalRow)
    .map((row): LexicalRetrievalCandidate => ({
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
      lexicalScore: row.lexicalScore,
    }));
}

function isCompleteLexicalRetrievalRow(
  row: LexicalRetrievalRow,
): row is LexicalRetrievalRow & {
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
