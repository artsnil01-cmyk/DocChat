import "server-only";

import type { ObjectId } from "mongodb";

import type { RagStrategy } from "@/config/rag";
import { listParentChunksByIds } from "@/lib/rag/retrieval/chunks";
import type { RetrievalScopeResult } from "@/lib/rag/retrieval/scope";
import type { FusedRetrievalCandidate } from "@/lib/rag/retrieval/types";
import type { Chunk } from "@/models/chunk";
import type { Document } from "@/models/document";

export type AnswerEvidenceBlock = {
  citationId: string;
  parentChunkId: string;
  matchedChildChunkIds: string[];
  relevance: AnswerEvidenceRelevance;
  documentId: string;
  documentName: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
  text: string;
};

export type AnswerEvidenceRelevance = {
  bestChildChunkId: string;
  fusedScore: number;
  denseScore?: number;
  denseRank?: number;
  lexicalScore?: number;
  lexicalRank?: number;
};

export type AnswerContext = {
  evidence: AnswerEvidenceBlock[];
  totalEvidenceTokens: number;
};

type ParentEvidenceCandidate = {
  parentId: ObjectId;
  documentId: string;
  matchedChildChunkIds: string[];
  relevance: AnswerEvidenceRelevance;
};

export async function buildAnswerContext(params: {
  scope: Extract<RetrievalScopeResult, { ok: true }>;
  fusedCandidates: FusedRetrievalCandidate[];
  strategy: RagStrategy;
}): Promise<AnswerContext> {
  const documentsById = indexDocumentsById(params.scope.documents);
  const parentCandidates = selectParentEvidenceCandidates(params.fusedCandidates);
  const parentChunks = await listParentChunksByIds({
    parentIds: parentCandidates.map((candidate) => candidate.parentId),
  });
  const parentChunksById = indexParentChunksById(parentChunks);
  const evidence: AnswerEvidenceBlock[] = [];
  let totalEvidenceTokens = 0;

  for (const candidate of parentCandidates) {
    const parent = parentChunksById.get(candidate.parentId.toHexString());

    if (!parent) {
      continue;
    }

    const nextTotal = totalEvidenceTokens + parent.tokenCount;

    if (nextTotal > params.strategy.context.maxEvidenceTokens) {
      break;
    }

    const document = documentsById.get(candidate.documentId);

    if (!document) {
      continue;
    }

    evidence.push({
      citationId: `S${evidence.length + 1}`,
      parentChunkId: parent._id.toHexString(),
      matchedChildChunkIds: candidate.matchedChildChunkIds,
      relevance: candidate.relevance,
      documentId: candidate.documentId,
      documentName: document.name,
      pageStart: parent.pageStart,
      pageEnd: parent.pageEnd,
      tokenCount: parent.tokenCount,
      text: parent.text,
    });
    totalEvidenceTokens = nextTotal;
  }

  return {
    evidence,
    totalEvidenceTokens,
  };
}

function indexDocumentsById(documents: Document[]): Map<string, Document> {
  return new Map(
    documents.map((document) => [document._id.toHexString(), document]),
  );
}

function selectParentEvidenceCandidates(
  fusedCandidates: FusedRetrievalCandidate[],
): ParentEvidenceCandidate[] {
  const candidatesByParentId = new Map<string, ParentEvidenceCandidate>();

  for (const candidate of fusedCandidates) {
    const parentId = candidate.parentId.toHexString();
    const existing = candidatesByParentId.get(parentId);

    if (existing) {
      existing.matchedChildChunkIds.push(candidate.chunkId.toHexString());

      if (candidate.fusedScore > existing.relevance.fusedScore) {
        existing.relevance = getEvidenceRelevance(candidate);
      }

      continue;
    }

    candidatesByParentId.set(parentId, {
      parentId: candidate.parentId,
      documentId: candidate.documentId.toHexString(),
      matchedChildChunkIds: [candidate.chunkId.toHexString()],
      relevance: getEvidenceRelevance(candidate),
    });
  }

  return [...candidatesByParentId.values()].sort(
    (left, right) => right.relevance.fusedScore - left.relevance.fusedScore,
  );
}

function indexParentChunksById(chunks: Chunk[]): Map<string, Chunk> {
  return new Map(chunks.map((chunk) => [chunk._id.toHexString(), chunk]));
}

function getEvidenceRelevance(
  candidate: FusedRetrievalCandidate,
): AnswerEvidenceRelevance {
  return {
    bestChildChunkId: candidate.chunkId.toHexString(),
    fusedScore: candidate.fusedScore,
    denseScore: candidate.denseScore,
    denseRank: candidate.denseRank,
    lexicalScore: candidate.lexicalScore,
    lexicalRank: candidate.lexicalRank,
  };
}
