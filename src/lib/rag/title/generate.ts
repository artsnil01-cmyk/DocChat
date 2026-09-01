import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { aiModels } from "@/config/ai";
import { serverEnv } from "@/lib/env/server";
import {
  buildChatTitleInput,
  chatTitleInstructions,
  type ChatTitleInput,
} from "@/lib/rag/title/prompt";
import { chatTitleOutputSchema } from "@/lib/rag/title/schema";

const openai = new OpenAI({
  apiKey: serverEnv.openaiApiKey,
});

export type ChatTitleOutput = z.infer<typeof chatTitleOutputSchema>;

export async function generateChatTitle(
  input: ChatTitleInput,
): Promise<ChatTitleOutput> {
  const response = await openai.responses.parse({
    model: aiModels.openai.auxiliary,
    instructions: chatTitleInstructions,
    input: buildChatTitleInput(input),
    text: {
      format: zodTextFormat(chatTitleOutputSchema, "chat_title"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Chat title response did not match the expected schema.");
  }

  return response.output_parsed;
}
