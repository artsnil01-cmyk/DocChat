import "server-only";

import { getRagStrategy, type RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";
import { rerankFusedCandidates } from "@/lib/rag/reranking";
import { retrieveDenseCandidates } from "@/lib/rag/retrieval/dense";
import { fuseRetrievalCandidates } from "@/lib/rag/retrieval/fusion";
import { retrieveLexicalCandidates } from "@/lib/rag/retrieval/lexical";
import type { RetrievalScopeResult } from "@/lib/rag/retrieval/scope";
import type {
  DenseRetrievalCandidate,
  FusedRetrievalCandidate,
  LexicalRetrievalCandidate,
  RerankedRetrievalCandidate,
} from "@/lib/rag/retrieval/types";

export type RetrieveDocumentEvidenceResult = {
  retrievalQuery: string;
  denseCandidates: DenseRetrievalCandidate[];
  lexicalCandidates: LexicalRetrievalCandidate[];
  fusedCandidates: FusedRetrievalCandidate[];
  rerankedCandidates: RerankedRetrievalCandidate[];
};

export async function retrieveDocumentEvidence(params: {
  scope: Extract<RetrievalScopeResult, { ok: true }>;
  retrievalQuery: string;
  strategy?: RagStrategy;
}): Promise<RetrieveDocumentEvidenceResult> {
  const strategy = params.strategy ?? getRagStrategy(serverEnv.ragStrategyVersion);
  const [denseCandidates, lexicalCandidates] = await Promise.all([
    retrieveDenseCandidates({
      retrievalQuery: params.retrievalQuery,
      documentIds: params.scope.documentIds,
      strategy,
    }),
    retrieveLexicalCandidates({
      retrievalQuery: params.retrievalQuery,
      documentIds: params.scope.documentIds,
      strategy,
    }),
  ]);

  const fusedCandidates = fuseRetrievalCandidates({
    denseCandidates,
    lexicalCandidates,
    strategy,
  });
  const rerankedCandidates = await rerankFusedCandidates({
    query: params.retrievalQuery,
    candidates: fusedCandidates,
    strategy,
  });

  return {
    retrievalQuery: params.retrievalQuery,
    denseCandidates,
    lexicalCandidates,
    fusedCandidates,
    rerankedCandidates,
  };
}
