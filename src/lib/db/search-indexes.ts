import type { Db, SearchIndexDescription } from "mongodb";

import { collectionNames } from "@/lib/db/collection-names";

export const atlasSearchIndexNames = {
  chunksVector: "chunks_vector_embedding",
  chunksText: "chunks_text_search",
} as const;

export function getAtlasSearchIndexes(): SearchIndexDescription[] {
  return [
    {
      name: atlasSearchIndexNames.chunksVector,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 1024,
            similarity: "cosine",
          },
          {
            type: "filter",
            path: "documentId",
          },
          {
            type: "filter",
            path: "strategyVersion",
          },
          {
            type: "filter",
            path: "kind",
          },
        ],
      },
    },
    {
      name: atlasSearchIndexNames.chunksText,
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            text: [
              {
                type: "string",
                analyzer: "lucene.standard",
              },
              {
                type: "string",
                analyzer: "lucene.french",
              },
              {
                type: "string",
                analyzer: "lucene.arabic",
              },
            ],
          },
        },
      },
    },
  ];
}

export async function createAtlasSearchIndexes(database: Db): Promise<string[]> {
  const chunks = database.collection(collectionNames.chunks);
  const existingIndexes = await chunks.listSearchIndexes().toArray();
  const existingNames = new Set(existingIndexes.map((index) => index.name));
  const missingIndexes = getAtlasSearchIndexes().filter(
    (index) => typeof index.name === "string" && !existingNames.has(index.name),
  );

  if (missingIndexes.length === 0) {
    return [];
  }

  return chunks.createSearchIndexes(missingIndexes);
}
