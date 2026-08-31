import { z } from "zod";

import {
  nonEmptyStringSchema,
  objectIdStringSchema,
} from "@/lib/validation/common";

export const retrievalRequestSchema = z.object({
  chatId: objectIdStringSchema,
  question: nonEmptyStringSchema.max(8000),
  documentIds: z.array(objectIdStringSchema).min(1).optional(),
});

export type RetrievalRequest = z.infer<typeof retrievalRequestSchema>;
