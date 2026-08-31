import "server-only";

import { getRagStrategy, type RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";
import { retrieveDenseCandidates } from "@/lib/rag/retrieval/dense";
import { fuseRetrievalCandidates } from "@/lib/rag/retrieval/fusion";
import { retrieveLexicalCandidates } from "@/lib/rag/retrieval/lexical";
import type { RetrievalScopeResult } from "@/lib/rag/retrieval/scope";
import type {
  DenseRetrievalCandidate,
  FusedRetrievalCandidate,
  LexicalRetrievalCandidate,
} from "@/lib/rag/retrieval/types";

export type RetrieveDocumentEvidenceResult = {
  retrievalQuery: string;
  denseCandidates: DenseRetrievalCandidate[];
  lexicalCandidates: LexicalRetrievalCandidate[];
  fusedCandidates: FusedRetrievalCandidate[];
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

  return {
    retrievalQuery: params.retrievalQuery,
    denseCandidates,
    lexicalCandidates,
    fusedCandidates: fuseRetrievalCandidates({
      denseCandidates,
      lexicalCandidates,
      strategy,
    }),
  };
}
