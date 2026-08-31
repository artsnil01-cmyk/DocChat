import { z } from "zod";

export const groundedAnswerCitationSchema = z.object({
  citationId: z.string().trim().regex(/^S\d+$/),
});

export const groundedAnswerOutputSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z.array(groundedAnswerCitationSchema),
  title: z.string().trim().min(1).max(80).nullable(),
});
