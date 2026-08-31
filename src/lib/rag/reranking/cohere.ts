import "server-only";

import { CohereRerank } from "@langchain/cohere";

import type { RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";

export type CohereRerankResult = {
  index: number;
  relevanceScore: number;
};

export async function rerankTextsWithCohere(params: {
  query: string;
  texts: string[];
  strategy: RagStrategy;
}): Promise<CohereRerankResult[]> {
  if (params.texts.length === 0) {
    return [];
  }

  const reranker = new CohereRerank({
    apiKey: serverEnv.cohereApiKey,
    model: params.strategy.reranker.model,
    topN: Math.min(params.strategy.retrieval.rerankLimit, params.texts.length),
  });

  return reranker.rerank(params.texts, params.query);
}
