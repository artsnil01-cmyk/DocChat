import { describe, expect, it } from "vitest";

import {
  resolveChatAnsweringPolicy,
  type ChatAnsweringPolicy,
} from "@/lib/chat/answering/policy";

const chatId = "507f1f77bcf86cd799439011";
const firstDocumentId = "507f1f77bcf86cd799439012";
const secondDocumentId = "507f1f77bcf86cd799439013";

describe("resolveChatAnsweringPolicy", () => {
  it("rejects a new chat without selected documents", () => {
    const policy = resolveChatAnsweringPolicy({
      question: "Resume ce document.",
    });

    expect(policy).toEqual({
      ok: false,
      reason: "new_chat_requires_documents",
    });
  });

  it("allows a new chat with selected documents without enrichment", () => {
    const policy = resolveChatAnsweringPolicy({
      question: "Resume ce document.",
      documentIds: [firstDocumentId, secondDocumentId],
    });

    expect(policy.ok).toBe(true);

    if (!policy.ok) {
      return;
    }

    expectPolicyMode(policy, "new_chat_explicit_documents");
    expect(policy.mode).toBe("new_chat_explicit_documents");
    expect(policy.shouldEnrichQuery).toBe(false);
    expect(policy.documentIds.map((documentId) => documentId.toHexString())).toEqual([
      firstDocumentId,
      secondDocumentId,
    ]);
  });

  it("uses selected documents on an existing chat without enrichment", () => {
    const policy = resolveChatAnsweringPolicy({
      chatId,
      question: "Compare ces passages.",
      documentIds: [firstDocumentId],
    });

    expect(policy.ok).toBe(true);

    if (!policy.ok) {
      return;
    }

    expectPolicyMode(policy, "existing_chat_explicit_documents");
    expect(policy.mode).toBe("existing_chat_explicit_documents");
    expect(policy.shouldEnrichQuery).toBe(false);
    expect(policy.chatId.toHexString()).toBe(chatId);
    expect(policy.documentIds.map((documentId) => documentId.toHexString())).toEqual([
      firstDocumentId,
    ]);
  });

  it("uses stored chat documents with enrichment when no documents are selected", () => {
    const policy = resolveChatAnsweringPolicy({
      chatId,
      question: "Et pour la deuxieme partie ?",
    });

    expect(policy.ok).toBe(true);

    if (!policy.ok) {
      return;
    }

    expectPolicyMode(policy, "existing_chat_stored_documents");
    expect(policy.mode).toBe("existing_chat_stored_documents");
    expect(policy.shouldEnrichQuery).toBe(true);
    expect(policy.chatId.toHexString()).toBe(chatId);
    expect(policy.documentIds).toBeUndefined();
  });
});

function expectPolicyMode<TMode extends Extract<ChatAnsweringPolicy, { ok: true }>["mode"]>(
  policy: Extract<ChatAnsweringPolicy, { ok: true }>,
  mode: TMode,
): asserts policy is Extract<ChatAnsweringPolicy, { ok: true; mode: TMode }> {
  expect(policy.mode).toBe(mode);
}
