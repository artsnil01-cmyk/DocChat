import "server-only";

import { ObjectId } from "mongodb";

import { chunksCollection } from "@/lib/db/collections";
import type {
  ChildChunkDraft,
  ParentChunkDraft,
} from "@/lib/rag/chunking/types";
import type { Chunk } from "@/models/chunk";

export type PersistChunkDraftsResult = {
  parentCount: number;
  childCount: number;
};

export async function persistChunkDrafts(params: {
  documentId: ObjectId;
  strategyVersion: string;
  parents: ParentChunkDraft[];
  children: ChildChunkDraft[];
}): Promise<PersistChunkDraftsResult> {
  const chunks = await chunksCollection();

  await chunks.deleteMany({
    documentId: params.documentId,
    strategyVersion: params.strategyVersion,
  });

  const parentIdByLocalId = new Map<string, ObjectId>();
  const parentChunks = params.parents.map((parent): Chunk => {
    const parentId = new ObjectId();
    parentIdByLocalId.set(parent.localId, parentId);

    return {
      _id: parentId,
      documentId: params.documentId,
      strategyVersion: params.strategyVersion,
      kind: "parent",
      text: parent.text,
      tokenCount: parent.tokenCount,
      pageStart: parent.pageStart,
      pageEnd: parent.pageEnd,
      language: parent.language,
    };
  });
  const childChunks = params.children.map((child): Chunk => {
    const parentId = parentIdByLocalId.get(child.parentLocalId);

    if (!parentId) {
      throw new Error(`Missing parent chunk for ${child.parentLocalId}.`);
    }

    return {
      _id: new ObjectId(),
      documentId: params.documentId,
      strategyVersion: params.strategyVersion,
      kind: "child",
      text: child.text,
      tokenCount: child.tokenCount,
      parentId,
      pageStart: child.pageStart,
      pageEnd: child.pageEnd,
      startOffset: child.startOffset,
      endOffset: child.endOffset,
      language: child.language,
    };
  });
  const chunkRecords = [...parentChunks, ...childChunks];

  if (chunkRecords.length > 0) {
    await chunks.insertMany(chunkRecords);
  }

  return {
    parentCount: parentChunks.length,
    childCount: childChunks.length,
  };
}
