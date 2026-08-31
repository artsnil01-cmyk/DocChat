import "server-only";

import type { ObjectId } from "mongodb";

import { chunksCollection } from "@/lib/db/collections";
import { serverEnv } from "@/lib/env/server";
import type { Chunk } from "@/models/chunk";

export async function listParentChunksByIds(params: {
  parentIds: ObjectId[];
}): Promise<Chunk[]> {
  if (params.parentIds.length === 0) {
    return [];
  }

  const chunks = await chunksCollection();

  return chunks
    .find({
      _id: {
        $in: params.parentIds,
      },
      kind: "parent",
      strategyVersion: serverEnv.ragStrategyVersion,
    })
    .toArray();
}
