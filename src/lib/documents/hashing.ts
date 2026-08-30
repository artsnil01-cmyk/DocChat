import "server-only";

import { createHash } from "node:crypto";

export function calculateBytesSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function calculateSha256Hex(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const hash = createHash("sha256");
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }

  return hash.digest("hex");
}
