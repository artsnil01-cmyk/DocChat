import "server-only";

import { CohereClientV2 } from "cohere-ai";

import type { RagStrategy } from "@/config/rag";
import { serverEnv } from "@/lib/env/server";

type CohereEmbeddingInputType = "search_document" | "search_query";

const cohere = new CohereClientV2({
  token: serverEnv.cohereApiKey,
});

export async function embedDocumentTexts(params: {
  texts: string[];
  strategy: RagStrategy;
}): Promise<number[][]> {
  if (params.texts.length === 0) {
    return [];
  }

  return embedTexts({
    texts: params.texts,
    strategy: params.strategy,
    inputType: "search_document",
  });
}

export async function embedSearchQuery(params: {
  text: string;
  strategy: RagStrategy;
}): Promise<number[]> {
  const [embedding] = await embedTexts({
    texts: [params.text],
    strategy: params.strategy,
    inputType: "search_query",
  });

  if (!embedding) {
    throw new Error("Cohere did not return a search query embedding.");
  }

  return embedding;
}

async function embedTexts(params: {
  texts: string[];
  strategy: RagStrategy;
  inputType: CohereEmbeddingInputType;
}): Promise<number[][]> {
  const response = await cohere.embed({
    model: params.strategy.embedding.model,
    texts: params.texts,
    inputType: params.inputType,
    embeddingTypes: ["float"],
    outputDimension: params.strategy.embedding.dimensions,
  });

  const embeddings = response.embeddings.float;

  if (!embeddings) {
    throw new Error("Cohere did not return float embeddings.");
  }

  return embeddings;
}
