import { z } from "zod";

import {
  nonEmptyStringSchema,
  objectIdStringSchema,
} from "@/lib/validation/common";

export const createChatRequestSchema = z.object({
  title: nonEmptyStringSchema.max(120).optional(),
});

export const chatRouteParamsSchema = z.object({
  chatId: objectIdStringSchema,
});

export const chatMessageRequestSchema = z.object({
  chatId: objectIdStringSchema.optional(),
  question: nonEmptyStringSchema.max(8000),
  documentIds: z.array(objectIdStringSchema).min(1).optional(),
});

export type CreateChatRequest = z.infer<typeof createChatRequestSchema>;
export type ChatRouteParams = z.infer<typeof chatRouteParamsSchema>;
export type ChatMessageRequest = z.infer<typeof chatMessageRequestSchema>;
