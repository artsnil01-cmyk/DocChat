import { describe, expect, it } from "vitest";

import {
  buildGroundedAnswerInput,
  groundedAnswerInstructions,
} from "@/lib/rag/answer/prompt";
import type { AnswerContext } from "@/lib/rag/context";
import {
  buildQueryEnrichmentInput,
  queryEnrichmentInstructions,
} from "@/lib/rag/enrichment/prompt";
import {
  buildChatTitleInput,
  chatTitleInstructions,
} from "@/lib/rag/title/prompt";

describe("grounded answer prompt", () => {
  it("serializes the original question and evidence", () => {
    const input = JSON.parse(
      buildGroundedAnswerInput({
        question: "Resume le document.",
        answerContext: buildAnswerContext(),
      }),
    );

    expect(input).toEqual({
      question: "Resume le document.",
      evidence: [
        {
          citationId: "S1",
          documentName: "rapport.pdf",
          pageStart: 2,
          pageEnd: 3,
          text: "Le document presente les objectifs du projet.",
        },
      ],
    });
  });

  it("includes retrievalQuery only when it differs from the question", () => {
    const unchangedInput = JSON.parse(
      buildGroundedAnswerInput({
        question: "Quels sont les risques ?",
        retrievalQuery: "Quels sont les risques ?",
        answerContext: buildAnswerContext(),
      }),
    );
    const enrichedInput = JSON.parse(
      buildGroundedAnswerInput({
        question: "Et les risques ?",
        retrievalQuery: "Quels sont les risques du projet DocChat ?",
        answerContext: buildAnswerContext(),
      }),
    );

    expect(unchangedInput.retrievalQuery).toBeUndefined();
    expect(enrichedInput.retrievalQuery).toBe(
      "Quels sont les risques du projet DocChat ?",
    );
  });

  it("keeps the grounding and language instructions explicit", () => {
    expect(groundedAnswerInstructions).toContain(
      "Answer in the same language as the user's question.",
    );
    expect(groundedAnswerInstructions).toContain("Do not use em dashes.");
    expect(groundedAnswerInstructions).toContain("Do not use outside knowledge.");
  });
});

describe("query enrichment prompt", () => {
  it("serializes the question and bounded history as data", () => {
    const input = JSON.parse(
      buildQueryEnrichmentInput({
        question: "Et la conclusion ?",
        conversationHistory: [
          {
            role: "user",
            content: "Resume le document.",
          },
          {
            role: "assistant",
            content: "Le document presente trois axes.",
          },
        ],
      }),
    );

    expect(input.question).toBe("Et la conclusion ?");
    expect(input.conversationHistory).toHaveLength(2);
  });

  it("requires same-language retrieval query generation", () => {
    expect(queryEnrichmentInstructions).toContain(
      "Return the retrieval query in the same language as the user's question.",
    );
    expect(queryEnrichmentInstructions).toContain("Do not answer the question.");
  });
});

describe("chat title prompt", () => {
  it("serializes the title input question", () => {
    expect(JSON.parse(buildChatTitleInput({ question: "ما هو الملخص؟" }))).toEqual({
      question: "ما هو الملخص؟",
    });
  });

  it("keeps title language and punctuation rules explicit", () => {
    expect(chatTitleInstructions).toContain(
      "Use the same language as the user's question.",
    );
    expect(chatTitleInstructions).toContain("Do not use em dashes.");
  });
});

function buildAnswerContext(): AnswerContext {
  return {
    totalEvidenceTokens: 12,
    evidence: [
      {
        citationId: "S1",
        parentChunkId: "parent-1",
        matchedChildChunkIds: ["child-1"],
        relevance: {
          bestChildChunkId: "child-1",
          rerankScore: 0.91,
          rerankRank: 1,
          fusedScore: 0.5,
        },
        documentId: "document-1",
        documentName: "rapport.pdf",
        pageStart: 2,
        pageEnd: 3,
        tokenCount: 12,
        text: "Le document presente les objectifs du projet.",
      },
    ],
  };
}
