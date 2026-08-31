import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { aiModels } from "@/config/ai";
import { getRagStrategy } from "@/config/rag";
import {
  buildQueryEnrichmentInput,
  queryEnrichmentInstructions,
} from "@/lib/rag/enrichment/prompt";
import { queryEnrichmentOutputSchema } from "@/lib/rag/enrichment/schema";
import type {
  EnrichedRetrievalQuery,
  QueryEnrichmentInput,
} from "@/lib/rag/enrichment/types";
import { serverEnv } from "@/lib/env/server";
import { limitConversationHistory } from "@/lib/rag/history";

const openai = new OpenAI({
  apiKey: serverEnv.openaiApiKey,
});

export async function enrichRetrievalQuery(
  input: QueryEnrichmentInput,
): Promise<EnrichedRetrievalQuery> {
  const strategy = getRagStrategy(serverEnv.ragStrategyVersion);
  const boundedInput = {
    ...input,
    conversationHistory: limitConversationHistory({
      history: input.conversationHistory,
      maxCompleteTurns: strategy.context.maxCompleteTurns,
      maxTokens: strategy.context.maxHistoryTokens,
    }),
  };

  try {
    const response = await openai.responses.parse({
      model: aiModels.openai.auxiliary,
      instructions: queryEnrichmentInstructions,
      input: buildQueryEnrichmentInput(boundedInput),
      text: {
        format: zodTextFormat(
          queryEnrichmentOutputSchema,
          "query_enrichment",
        ),
      },
    });
    const output = response.output_parsed;

    if (!output) {
      return originalQuestionFallback(boundedInput.question);
    }

    return {
      originalQuestion: boundedInput.question,
      retrievalQuery: output.needsRewrite ? output.query : boundedInput.question,
      needsRewrite: output.needsRewrite,
      fallbackUsed: false,
    };
  } catch {
    return originalQuestionFallback(boundedInput.question);
  }
}

function originalQuestionFallback(question: string): EnrichedRetrievalQuery {
  return {
    originalQuestion: question,
    retrievalQuery: question,
    needsRewrite: false,
    fallbackUsed: true,
  };
}
