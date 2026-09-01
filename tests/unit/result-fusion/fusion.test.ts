import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { RAG_STRATEGIES } from "@/config/rag";
import { fuseRetrievalCandidates } from "@/lib/rag/retrieval/fusion";
import type {
  DenseRetrievalCandidate,
  LexicalRetrievalCandidate,
} from "@/lib/rag/retrieval/types";

type FusionStrategy = Parameters<typeof fuseRetrievalCandidates>[0]["strategy"];

const documentId = new ObjectId("507f1f77bcf86cd799439021");
const parentId = new ObjectId("507f1f77bcf86cd799439022");
const sharedChunkId = new ObjectId("507f1f77bcf86cd799439023");
const denseOnlyChunkId = new ObjectId("507f1f77bcf86cd799439024");
const lexicalOnlyChunkId = new ObjectId("507f1f77bcf86cd799439025");

describe("fuseRetrievalCandidates", () => {
  it("deduplicates shared child chunks and preserves dense and lexical metadata", () => {
    const [sharedCandidate, ...rest] = fuseRetrievalCandidates({
      denseCandidates: [
        denseCandidate(sharedChunkId, "dense shared", 0.91),
        denseCandidate(denseOnlyChunkId, "dense only", 0.82),
      ],
      lexicalCandidates: [
        lexicalCandidate(sharedChunkId, "lexical shared", 12),
        lexicalCandidate(lexicalOnlyChunkId, "lexical only", 8),
      ],
      strategy: testStrategy({ fusedLimit: 10 }),
    });

    expect(sharedCandidate.chunkId.toHexString()).toBe(
      sharedChunkId.toHexString(),
    );
    expect(sharedCandidate.denseRank).toBe(1);
    expect(sharedCandidate.lexicalRank).toBe(1);
    expect(sharedCandidate.denseScore).toBe(0.91);
    expect(sharedCandidate.lexicalScore).toBe(12);
    expect(rest.map((candidate) => candidate.chunkId.toHexString()).sort()).toEqual(
      [denseOnlyChunkId.toHexString(), lexicalOnlyChunkId.toHexString()].sort(),
    );
  });

  it("prefers candidates found in both retrieval lists", () => {
    const candidates = fuseRetrievalCandidates({
      denseCandidates: [
        denseCandidate(denseOnlyChunkId, "dense only", 0.99),
        denseCandidate(sharedChunkId, "shared", 0.8),
      ],
      lexicalCandidates: [
        lexicalCandidate(lexicalOnlyChunkId, "lexical only", 99),
        lexicalCandidate(sharedChunkId, "shared", 4),
      ],
      strategy: testStrategy({ fusedLimit: 10 }),
    });

    expect(candidates[0].chunkId.toHexString()).toBe(sharedChunkId.toHexString());
    expect(candidates[0].fusedScore).toBeGreaterThan(candidates[1].fusedScore);
  });

  it("respects the configured fused candidate limit", () => {
    const candidates = fuseRetrievalCandidates({
      denseCandidates: [
        denseCandidate(sharedChunkId, "first", 0.9),
        denseCandidate(denseOnlyChunkId, "second", 0.8),
      ],
      lexicalCandidates: [lexicalCandidate(lexicalOnlyChunkId, "third", 7)],
      strategy: testStrategy({ fusedLimit: 2 }),
    });

    expect(candidates).toHaveLength(2);
  });
});

function denseCandidate(
  chunkId: ObjectId,
  text: string,
  denseScore: number,
): DenseRetrievalCandidate {
  return {
    ...baseCandidate(chunkId, text),
    denseScore,
  };
}

function lexicalCandidate(
  chunkId: ObjectId,
  text: string,
  lexicalScore: number,
): LexicalRetrievalCandidate {
  return {
    ...baseCandidate(chunkId, text),
    lexicalScore,
  };
}

function baseCandidate(chunkId: ObjectId, text: string) {
  return {
    chunkId,
    documentId,
    parentId,
    text,
    tokenCount: 12,
    pageStart: 1,
    pageEnd: 1,
    startOffset: 0,
    endOffset: text.length,
    language: "fr" as const,
  };
}

function testStrategy(params: { fusedLimit: number }): FusionStrategy {
  const strategy = RAG_STRATEGIES[
    "page-parent-child-v1"
  ] as unknown as FusionStrategy;

  return {
    ...strategy,
    retrieval: {
      ...strategy.retrieval,
      fusedLimit: params.fusedLimit,
    } as FusionStrategy["retrieval"],
  };
}
