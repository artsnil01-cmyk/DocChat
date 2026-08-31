import "server-only";

import { CohereClientV2 } from "cohere-ai";

import type { RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";

export type CohereRerankResult = {
  index: number;
  relevanceScore: number;
};

const cohere = new CohereClientV2({
  token: serverEnv.cohereApiKey,
});

export async function rerankTextsWithCohere(params: {
  query: string;
  texts: string[];
  strategy: RagStrategy;
}): Promise<CohereRerankResult[]> {
  if (params.texts.length === 0) {
    return [];
  }

  const response = await cohere.rerank({
    model: params.strategy.reranker.model,
    topN: Math.min(params.strategy.retrieval.rerankLimit, params.texts.length),
    query: params.query,
    documents: params.texts,
  });

  return response.results.map((result) => ({
    index: result.index,
    relevanceScore: result.relevanceScore,
  }));
}
