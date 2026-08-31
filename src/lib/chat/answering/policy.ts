import "server-only";

import { ObjectId } from "mongodb";

import type { ChatMessageRequest } from "@/lib/chat/schemas";

export type ChatAnsweringPolicy =
  | {
      ok: true;
      mode: "new_chat_explicit_documents";
      question: string;
      chatId?: undefined;
      documentIds: ObjectId[];
      shouldEnrichQuery: false;
    }
  | {
      ok: true;
      mode: "existing_chat_explicit_documents";
      question: string;
      chatId: ObjectId;
      documentIds: ObjectId[];
      shouldEnrichQuery: false;
    }
  | {
      ok: true;
      mode: "existing_chat_stored_documents";
      question: string;
      chatId: ObjectId;
      documentIds?: undefined;
      shouldEnrichQuery: true;
    }
  | {
      ok: false;
      reason: "new_chat_requires_documents";
    };

export function resolveChatAnsweringPolicy(
  request: ChatMessageRequest,
): ChatAnsweringPolicy {
  const documentIds = request.documentIds?.map((documentId) => new ObjectId(documentId));

  if (!request.chatId) {
    if (!documentIds || documentIds.length === 0) {
      return {
        ok: false,
        reason: "new_chat_requires_documents",
      };
    }

    return {
      ok: true,
      mode: "new_chat_explicit_documents",
      question: request.question,
      documentIds,
      shouldEnrichQuery: false,
    };
  }

  const chatId = new ObjectId(request.chatId);

  if (documentIds && documentIds.length > 0) {
    return {
      ok: true,
      mode: "existing_chat_explicit_documents",
      question: request.question,
      chatId,
      documentIds,
      shouldEnrichQuery: false,
    };
  }

  return {
    ok: true,
    mode: "existing_chat_stored_documents",
    question: request.question,
    chatId,
    shouldEnrichQuery: true,
  };
}
