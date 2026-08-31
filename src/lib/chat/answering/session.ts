import "server-only";

import {
  attachDocumentsToChat,
  createChatRecord,
  getWorkspaceChatRecord,
} from "@/lib/chat/service";
import type { ChatAnsweringPolicy } from "@/lib/chat/answering/policy";
import type { Chat } from "@/models/chat";

export type PreparedChatAnsweringSession =
  | {
      ok: true;
      chat: Chat;
      question: string;
      documentIds?: ChatAnsweringPolicyDocumentIds;
      shouldEnrichQuery: boolean;
      shouldGenerateTitle: boolean;
    }
  | {
      ok: false;
      reason: "chat_not_found";
    };

type ChatAnsweringPolicyDocumentIds = Extract<
  ChatAnsweringPolicy,
  { ok: true; documentIds: unknown }
>["documentIds"];

export async function prepareChatAnsweringSession(params: {
  workspaceId: string;
  policy: Extract<ChatAnsweringPolicy, { ok: true }>;
}): Promise<PreparedChatAnsweringSession> {
  if (params.policy.mode === "new_chat_explicit_documents") {
    const chat = await createChatRecord({
      workspaceId: params.workspaceId,
      documentIds: params.policy.documentIds,
    });

    return {
      ok: true,
      chat,
      question: params.policy.question,
      documentIds: params.policy.documentIds,
      shouldEnrichQuery: false,
      shouldGenerateTitle: true,
    };
  }

  const chat = params.policy.documentIds
    ? await attachDocumentsToChat({
        chatId: params.policy.chatId,
        workspaceId: params.workspaceId,
        documentIds: params.policy.documentIds,
      })
    : await getWorkspaceChatRecord({
        chatId: params.policy.chatId,
        workspaceId: params.workspaceId,
      });

  if (!chat) {
    return {
      ok: false,
      reason: "chat_not_found",
    };
  }

  return {
    ok: true,
    chat,
    question: params.policy.question,
    documentIds: params.policy.documentIds,
    shouldEnrichQuery: params.policy.shouldEnrichQuery,
    shouldGenerateTitle: false,
  };
}
