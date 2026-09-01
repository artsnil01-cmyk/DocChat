import "server-only";

import OpenAI from "openai";

import { aiModels } from "@/config/ai";
import { serverEnv } from "@/lib/env/server";
import {
  buildGroundedAnswerInput,
  groundedAnswerInstructions,
  type GroundedAnswerInput,
} from "@/lib/rag/answer/prompt";

const openai = new OpenAI({
  apiKey: serverEnv.openaiApiKey,
});

export type GroundedAnswerStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      answer: string;
    };

export async function* streamGroundedAnswer(
  input: GroundedAnswerInput,
): AsyncGenerator<GroundedAnswerStreamEvent> {
  const stream = await openai.responses.create({
    model: aiModels.openai.generation,
    instructions: groundedAnswerInstructions,
    input: buildGroundedAnswerInput(input),
    stream: true,
  });

  let answer = "";

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      answer += event.delta;
      yield {
        type: "delta",
        text: event.delta,
      };
      continue;
    }

    if (event.type === "response.output_text.done") {
      answer = event.text;
    }
  }

  const finalAnswer = answer.trim();

  if (!finalAnswer) {
    throw new Error("Grounded answer stream returned no text.");
  }

  yield {
    type: "done",
    answer: finalAnswer,
  };
}
