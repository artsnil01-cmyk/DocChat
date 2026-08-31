import "server-only";

import type { RagStrategy } from "@/config/rag";
import type {
  DenseRetrievalCandidate,
  FusedRetrievalCandidate,
  LexicalRetrievalCandidate,
  RetrievalCandidateBase,
} from "@/lib/rag/retrieval/types";

const RECIPROCAL_RANK_OFFSET = 60;

type MutableFusedCandidate = RetrievalCandidateBase & {
  denseScore?: number;
  denseRank?: number;
  lexicalScore?: number;
  lexicalRank?: number;
  fusedScore: number;
};

export function fuseRetrievalCandidates(params: {
  denseCandidates: DenseRetrievalCandidate[];
  lexicalCandidates: LexicalRetrievalCandidate[];
  strategy: RagStrategy;
}): FusedRetrievalCandidate[] {
  const candidatesByChunkId = new Map<string, MutableFusedCandidate>();

  mergeDenseCandidates(candidatesByChunkId, params.denseCandidates);
  mergeLexicalCandidates(candidatesByChunkId, params.lexicalCandidates);

  return [...candidatesByChunkId.values()]
    .map((candidate): FusedRetrievalCandidate => ({
      ...candidate,
      fusedScore: calculateFusedScore(candidate),
    }))
    .sort(compareFusedCandidates)
    .slice(0, params.strategy.retrieval.fusedLimit);
}

function mergeDenseCandidates(
  candidatesByChunkId: Map<string, MutableFusedCandidate>,
  candidates: DenseRetrievalCandidate[],
): void {
  candidates.forEach((candidate, index) => {
    const chunkId = candidate.chunkId.toHexString();
    const fusedCandidate =
      candidatesByChunkId.get(chunkId) ?? createMutableFusedCandidate(candidate);

    fusedCandidate.denseScore = candidate.denseScore;
    fusedCandidate.denseRank = index + 1;
    candidatesByChunkId.set(chunkId, fusedCandidate);
  });
}

function mergeLexicalCandidates(
  candidatesByChunkId: Map<string, MutableFusedCandidate>,
  candidates: LexicalRetrievalCandidate[],
): void {
  candidates.forEach((candidate, index) => {
    const chunkId = candidate.chunkId.toHexString();
    const fusedCandidate =
      candidatesByChunkId.get(chunkId) ?? createMutableFusedCandidate(candidate);

    fusedCandidate.lexicalScore = candidate.lexicalScore;
    fusedCandidate.lexicalRank = index + 1;
    candidatesByChunkId.set(chunkId, fusedCandidate);
  });
}

function createMutableFusedCandidate(
  candidate: RetrievalCandidateBase,
): MutableFusedCandidate {
  return {
    chunkId: candidate.chunkId,
    documentId: candidate.documentId,
    parentId: candidate.parentId,
    text: candidate.text,
    tokenCount: candidate.tokenCount,
    pageStart: candidate.pageStart,
    pageEnd: candidate.pageEnd,
    startOffset: candidate.startOffset,
    endOffset: candidate.endOffset,
    language: candidate.language,
    fusedScore: 0,
  };
}

function calculateFusedScore(candidate: MutableFusedCandidate): number {
  return (
    reciprocalRankScore(candidate.denseRank) +
    reciprocalRankScore(candidate.lexicalRank)
  );
}

function reciprocalRankScore(rank: number | undefined): number {
  if (rank === undefined) {
    return 0;
  }

  return 1 / (RECIPROCAL_RANK_OFFSET + rank);
}

function compareFusedCandidates(
  left: FusedRetrievalCandidate,
  right: FusedRetrievalCandidate,
): number {
  if (right.fusedScore !== left.fusedScore) {
    return right.fusedScore - left.fusedScore;
  }

  return left.chunkId.toHexString().localeCompare(right.chunkId.toHexString());
}
