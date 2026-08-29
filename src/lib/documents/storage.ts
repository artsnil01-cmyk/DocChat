import "server-only";

import { list } from "@vercel/blob";

import { serverEnv } from "@/lib/env/server";

export async function verifyBlobAccess(): Promise<void> {
  await list({
    limit: 1,
    token: serverEnv.blobReadWriteToken,
  });
}
