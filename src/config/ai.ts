export const aiModels = {
  openai: {
    auxiliary: "gpt-5.6-luna",
    generation: "gpt-5-mini",
  },
  cohere: {
    embedding: "embed-v4.0",
    reranking: "rerank-v4.0-pro",
  },
} as const;

export type AiModels = typeof aiModels;
