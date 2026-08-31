import "server-only";

import type { AnyBulkWriteOperation, ObjectId } from "mongodb";

import type { RagStrategy } from "@/config/rag";
import { chunksCollection } from "@/lib/db/collections";
import { embedDocumentTexts } from "@/lib/rag/embeddings/cohere";
import type { Chunk } from "@/models/chunk";

export type EmbedDocumentChunksResult = {
  embeddedCount: number;
};

export async function embedDocumentChunks(params: {
  documentId: ObjectId;
  strategyVersion: string;
  strategy: RagStrategy;
}): Promise<EmbedDocumentChunksResult> {
  const chunks = await chunksCollection();
  const childChunks = await chunks
    .find({
      documentId: params.documentId,
      strategyVersion: params.strategyVersion,
      kind: "child",
      embedding: { $exists: false },
    })
    .sort({ pageStart: 1, startOffset: 1, _id: 1 })
    .toArray();
  let embeddedCount = 0;

  for (
    let index = 0;
    index < childChunks.length;
    index += params.strategy.embedding.batchSize
  ) {
    const batch = childChunks.slice(
      index,
      index + params.strategy.embedding.batchSize,
    );
    const embeddings = await embedDocumentTexts({
      texts: batch.map((chunk) => chunk.text),
      strategy: params.strategy,
    });

    if (embeddings.length !== batch.length) {
      throw new Error("Embedding response count does not match chunk count.");
    }

    assertEmbeddingDimensions({
      embeddings,
      expectedDimensions: params.strategy.embedding.dimensions,
    });

    await updateChunkEmbeddings({
      chunks: batch,
      embeddings,
    });
    embeddedCount += batch.length;
  }

  return { embeddedCount };
}

function assertEmbeddingDimensions(params: {
  embeddings: number[][];
  expectedDimensions: number;
}): void {
  const invalidEmbedding = params.embeddings.find(
    (embedding) => embedding.length !== params.expectedDimensions,
  );

  if (invalidEmbedding) {
    throw new Error("Embedding dimensions do not match strategy configuration.");
  }
}

async function updateChunkEmbeddings(params: {
  chunks: Chunk[];
  embeddings: number[][];
}): Promise<void> {
  const chunks = await chunksCollection();
  const operations = params.chunks.map(
    (chunk, index): AnyBulkWriteOperation<Chunk> => ({
      updateOne: {
        filter: {
          _id: chunk._id,
          embedding: { $exists: false },
        },
        update: {
          $set: {
            embedding: params.embeddings[index],
          },
        },
      },
    }),
  );

  if (operations.length > 0) {
    await chunks.bulkWrite(operations, {
      ordered: true,
    });
  }
}
