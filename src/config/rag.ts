import { aiModels } from "@/config/ai";

export const ragConfig = {
  strategyVersion: "parent-child-v1",
  parentChunkTargetTokens: 900,
  childChunkTargetTokens: 300,
  childChunkOverlapTokens: 60,
  maxEvidenceTokens: 3500,
  models: {
    embedding: aiModels.cohere.embedding,
    reranking: aiModels.cohere.reranking,
    generation: aiModels.openai.generation,
  },
} as const;

export type RagConfig = typeof ragConfig;
