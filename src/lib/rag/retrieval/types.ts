import type { ObjectId } from "mongodb";

import type { ChunkLanguage } from "@/models/chunk";

export type RetrievalCandidateBase = {
  chunkId: ObjectId;
  documentId: ObjectId;
  parentId: ObjectId;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  startOffset: number;
  endOffset: number;
  language: ChunkLanguage;
};

export type DenseRetrievalCandidate = RetrievalCandidateBase & {
  denseScore: number;
};

export type LexicalRetrievalCandidate = RetrievalCandidateBase & {
  lexicalScore: number;
};

export type FusedRetrievalCandidate = RetrievalCandidateBase & {
  denseScore?: number;
  denseRank?: number;
  lexicalScore?: number;
  lexicalRank?: number;
  fusedScore: number;
};

export type RerankedRetrievalCandidate = FusedRetrievalCandidate & {
  rerankScore: number;
  rerankRank: number;
};
