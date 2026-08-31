import { z } from "zod";

export const queryEnrichmentOutputSchema = z.object({
  needsRewrite: z.boolean(),
  query: z.string().trim().min(1),
});
