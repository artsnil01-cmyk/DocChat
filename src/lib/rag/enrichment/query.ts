import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { aiModels } from "@/config/ai";
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

const openai = new OpenAI({
  apiKey: serverEnv.openaiApiKey,
});

export async function enrichRetrievalQuery(
  input: QueryEnrichmentInput,
): Promise<EnrichedRetrievalQuery> {
  try {
    const response = await openai.responses.parse({
      model: aiModels.openai.auxiliary,
      instructions: queryEnrichmentInstructions,
      input: buildQueryEnrichmentInput(input),
      text: {
        format: zodTextFormat(
          queryEnrichmentOutputSchema,
          "query_enrichment",
        ),
      },
    });
    const output = response.output_parsed;

    if (!output) {
      return originalQuestionFallback(input.question);
    }

    return {
      originalQuestion: input.question,
      retrievalQuery: output.needsRewrite ? output.query : input.question,
      needsRewrite: output.needsRewrite,
      fallbackUsed: false,
    };
  } catch {
    return originalQuestionFallback(input.question);
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
