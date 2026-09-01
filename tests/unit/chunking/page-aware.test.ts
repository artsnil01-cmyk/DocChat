import { describe, expect, it } from "vitest";

import { RAG_STRATEGIES } from "@/config/rag";
import { buildPageAwareChunks } from "@/lib/rag/chunking/page-aware";
import type { NormalizedPdfText } from "@/lib/rag/normalization";

type PageAwareChunkingStrategy = Parameters<
  typeof buildPageAwareChunks
>[0]["strategy"];

type TestChunkConfig = {
  targetTokens: number;
  maxTokens: number;
  minTokens: number;
  overlapTokens?: number;
};

describe("buildPageAwareChunks", () => {
  it("creates page-aware parent and child chunks without forcing page boundaries", () => {
    const strategy = testStrategy({
      parent: {
        targetTokens: 80,
        maxTokens: 120,
        minTokens: 1,
      },
      child: {
        targetTokens: 16,
        maxTokens: 24,
        minTokens: 1,
        overlapTokens: 4,
      },
    });
    const result = buildPageAwareChunks({
      document: {
        pageCount: 2,
        pages: [
          {
            page: 1,
            text: "Le premier paragraphe introduit le projet DocChat et ses objectifs.",
          },
          {
            page: 2,
            text: "La suite precise les contraintes de recherche documentaire et les sources.",
          },
        ],
      },
      strategy,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.parents).toHaveLength(1);
    expect(result.parents[0]).toMatchObject({
      pageStart: 1,
      pageEnd: 2,
      language: "fr",
    });
    expect(result.parents[0].spans.map((span) => span.page)).toEqual([1, 2]);
    expect(result.children.length).toBeGreaterThan(1);
    expect(
      result.children.every((child) => child.parentLocalId === "parent-1"),
    ).toBe(true);
    expect(
      result.children.every(
        (child) => child.tokenCount <= strategy.child.maxTokens,
      ),
    ).toBe(true);
  });

  it("overlaps adjacent child chunks", () => {
    const result = buildPageAwareChunks({
      document: singlePageDocument(
        "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
      ),
      strategy: testStrategy({
        parent: {
          targetTokens: 80,
          maxTokens: 120,
          minTokens: 1,
        },
        child: {
          targetTokens: 5,
          maxTokens: 8,
          minTokens: 1,
          overlapTokens: 2,
        },
      }),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const [firstChild, secondChild] = result.children;

    expect(firstChild).toBeDefined();
    expect(secondChild).toBeDefined();
    expect(firstChild.endOffset).toBeGreaterThan(secondChild.startOffset);
  });

  it("splits oversized paragraphs before creating parent chunks", () => {
    const strategy = testStrategy({
      parent: {
        targetTokens: 8,
        maxTokens: 10,
        minTokens: 1,
      },
      child: {
        targetTokens: 6,
        maxTokens: 8,
        minTokens: 1,
        overlapTokens: 0,
      },
    });
    const result = buildPageAwareChunks({
      document: singlePageDocument(
        "un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize",
      ),
      strategy,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.parents.length).toBeGreaterThan(1);
    expect(
      result.parents.every(
        (parent) => parent.tokenCount <= strategy.parent.maxTokens,
      ),
    ).toBe(true);
    expect(
      result.children.every((child) => child.tokenCount <= strategy.child.maxTokens),
    ).toBe(true);
  });

  it("classifies Arabic and mixed-language chunks by character dominance", () => {
    const arabicResult = buildPageAwareChunks({
      document: singlePageDocument(
        "\u0647\u0630\u0627 \u0645\u0633\u062a\u0646\u062f \u0639\u0631\u0628\u064a \u064a\u0634\u0631\u062d \u0627\u0647\u062f\u0627\u0641 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u0627\u062c\u0627\u0628\u0629.",
      ),
      strategy: testStrategy(),
    });
    const mixedResult = buildPageAwareChunks({
      document: singlePageDocument(
        "DocChat analyse les documents \u0648\u064a\u0639\u0631\u0636 \u0627\u0644\u0645\u0635\u0627\u062f\u0631 \u0644\u0644\u0645\u0633\u062a\u062e\u062f\u0645.",
      ),
      strategy: testStrategy(),
    });

    expect(arabicResult.ok).toBe(true);
    expect(mixedResult.ok).toBe(true);

    if (!arabicResult.ok || !mixedResult.ok) {
      return;
    }

    expect(arabicResult.parents[0].language).toBe("ar");
    expect(mixedResult.parents[0].language).toBe("mixed");
  });

  it("fails when no chunks can be created", () => {
    const result = buildPageAwareChunks({
      document: {
        pageCount: 1,
        pages: [
          {
            page: 1,
            text: "  ",
          },
        ],
      },
      strategy: testStrategy(),
    });

    expect(result).toMatchObject({
      ok: false,
      code: "NO_CHUNKS_CREATED",
    });
  });
});

function singlePageDocument(text: string): NormalizedPdfText {
  return {
    pageCount: 1,
    pages: [
      {
        page: 1,
        text,
      },
    ],
  };
}

function testStrategy(overrides?: {
  parent?: Partial<TestChunkConfig>;
  child?: Partial<TestChunkConfig>;
}): PageAwareChunkingStrategy {
  const strategy = RAG_STRATEGIES[
    "page-parent-child-v1"
  ] as unknown as PageAwareChunkingStrategy;

  return {
    ...strategy,
    ...overrides,
    parent: {
      ...strategy.parent,
      ...overrides?.parent,
    } as PageAwareChunkingStrategy["parent"],
    child: {
      ...strategy.child,
      ...overrides?.child,
    } as PageAwareChunkingStrategy["child"],
  };
}
