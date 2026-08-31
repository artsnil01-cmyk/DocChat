import "server-only";

import type { RagStrategy } from "@/config/rag";
import { rerankTextsWithCohere } from "@/lib/rag/reranking/cohere";
import type {
  FusedRetrievalCandidate,
  RerankedRetrievalCandidate,
} from "@/lib/rag/retrieval/types";

export async function rerankFusedCandidates(params: {
  query: string;
  candidates: FusedRetrievalCandidate[];
  strategy: RagStrategy;
}): Promise<RerankedRetrievalCandidate[]> {
  if (params.candidates.length === 0) {
    return [];
  }

  const results = await rerankTextsWithCohere({
    query: params.query,
    texts: params.candidates.map((candidate) => candidate.text),
    strategy: params.strategy,
  });

  return results
    .filter((result) => params.candidates[result.index] !== undefined)
    .map((result, index): RerankedRetrievalCandidate => ({
      ...params.candidates[result.index],
      rerankScore: result.relevanceScore,
      rerankRank: index + 1,
    }));
}
