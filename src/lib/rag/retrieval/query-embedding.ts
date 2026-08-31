import "server-only";

import type { RagStrategy } from "@/config/rag";
import { embedSearchQuery } from "@/lib/rag/embeddings";

export async function embedRetrievalQuery(params: {
  query: string;
  strategy: RagStrategy;
}): Promise<number[]> {
  const embedding = await embedSearchQuery({
    text: params.query,
    strategy: params.strategy,
  });

  if (embedding.length !== params.strategy.embedding.dimensions) {
    throw new Error("Retrieval query embedding dimensions do not match strategy.");
  }

  return embedding;
}
