import { z } from "zod";

import { emailSchema, nonEmptyStringSchema } from "@/lib/validation/common";

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: nonEmptyStringSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
