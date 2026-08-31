import "server-only";

import { CohereEmbeddings } from "@langchain/cohere";

import type { RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";

type CohereEmbeddingInputType = "search_document" | "search_query";

function createCohereEmbeddings(params: {
  strategy: RagStrategy;
  inputType: CohereEmbeddingInputType;
}): CohereEmbeddings {
  return new CohereEmbeddings({
    apiKey: serverEnv.cohereApiKey,
    model: params.strategy.embedding.model,
    batchSize: params.strategy.embedding.batchSize,
    inputType: params.inputType,
    embeddingTypes: ["float"],
  });
}

export async function embedDocumentTexts(params: {
  texts: string[];
  strategy: RagStrategy;
}): Promise<number[][]> {
  if (params.texts.length === 0) {
    return [];
  }

  return createCohereEmbeddings({
    strategy: params.strategy,
    inputType: "search_document",
  }).embedDocuments(params.texts);
}

export async function embedSearchQuery(params: {
  text: string;
  strategy: RagStrategy;
}): Promise<number[]> {
  return createCohereEmbeddings({
    strategy: params.strategy,
    inputType: "search_query",
  }).embedQuery(params.text);
}
