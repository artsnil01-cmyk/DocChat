import { aiModels } from "@/config/ai";
import type { DocumentStage } from "@/models/document";

export const ragStrategyVersions = ["page-parent-child-v1"] as const;

export type RagStrategyVersion = (typeof ragStrategyVersions)[number];

export const defaultRagStrategyVersion = "page-parent-child-v1" satisfies RagStrategyVersion;

export const RAG_STRATEGIES = {
  "page-parent-child-v1": {
    progress: {
      reading: 10,
      normalizing: 30,
      chunking: 50,
      embedding: 80,
      indexing: 95,
    },
    parent: {
      targetTokens: 1600,
      maxTokens: 2200,
      minTokens: 300,
    },
    child: {
      targetTokens: 600,
      maxTokens: 750,
      minTokens: 180,
      overlapTokens: 80,
    },
    retrieval: {
      vectorLimit: 20,
      vectorCandidates: 100,
      lexicalLimit: 20,
      fusedLimit: 24,
      rerankLimit: 8,
    },
    context: {
      maxEvidenceTokens: 8000,
      maxHistoryTokens: 1500,
      maxCompleteTurns: 2,
    },
    embedding: {
      model: aiModels.cohere.embedding,
      dimensions: 1024,
      batchSize: 64,
    },
    reranker: {
      model: aiModels.cohere.reranking,
    },
    generation: {
      model: aiModels.openai.generation,
      auxiliaryModel: aiModels.openai.auxiliary,
    },
  },
} as const satisfies Record<
  RagStrategyVersion,
  {
    progress: Record<DocumentStage, number>;
    parent: {
      targetTokens: number;
      maxTokens: number;
      minTokens: number;
    };
    child: {
      targetTokens: number;
      maxTokens: number;
      minTokens: number;
      overlapTokens: number;
    };
    retrieval: {
      vectorLimit: number;
      vectorCandidates: number;
      lexicalLimit: number;
      fusedLimit: number;
      rerankLimit: number;
    };
    context: {
      maxEvidenceTokens: number;
      maxHistoryTokens: number;
      maxCompleteTurns: number;
    };
    embedding: {
      model: string;
      dimensions: number;
      batchSize: number;
    };
    reranker: {
      model: string;
    };
    generation: {
      model: string;
      auxiliaryModel: string;
    };
  }
>;

export type RagStrategy = (typeof RAG_STRATEGIES)[RagStrategyVersion];

export function getRagStrategy(version: RagStrategyVersion): RagStrategy {
  return RAG_STRATEGIES[version];
}
