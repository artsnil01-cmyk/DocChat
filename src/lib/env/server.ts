import "server-only";

import { readServerEnv, type ServerEnv } from "@/lib/env/schema";

export const serverEnv: ServerEnv = readServerEnv(process.env);
export type { ServerEnv };
