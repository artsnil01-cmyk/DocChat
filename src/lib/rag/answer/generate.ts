import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { aiModels } from "@/config/ai";
import {
  buildGroundedAnswerInput,
  groundedAnswerInstructions,
  type GroundedAnswerInput,
} from "@/lib/rag/answer/prompt";
import { groundedAnswerOutputSchema } from "@/lib/rag/answer/schema";
import { serverEnv } from "@/lib/env/server";

const openai = new OpenAI({
  apiKey: serverEnv.openaiApiKey,
});

export type GroundedAnswerOutput = z.infer<typeof groundedAnswerOutputSchema>;

export async function generateGroundedAnswer(
  input: GroundedAnswerInput,
): Promise<GroundedAnswerOutput> {
  const response = await openai.responses.parse({
    model: aiModels.openai.generation,
    instructions: groundedAnswerInstructions,
    input: buildGroundedAnswerInput(input),
    text: {
      format: zodTextFormat(groundedAnswerOutputSchema, "grounded_answer"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Grounded answer response did not match the expected schema.");
  }

  return response.output_parsed;
}
