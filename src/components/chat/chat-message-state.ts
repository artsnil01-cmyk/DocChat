import type {
  ClientChatDetail,
  ClientChatEvidence,
  ClientChatMessage,
  ClientChatSummary,
} from "@/lib/client/chats";

const optimisticChatId = "local:new-chat";
const thinkingMessageId = "local:thinking";

export type ChatMessageState = {
  chat: ClientChatDetail | null;
  messages: ClientChatMessage[];
};

export function createOptimisticUserMessage(params: {
  chatId: string | null;
  content: string;
}): ClientChatMessage {
  return {
    id: `local:user:${crypto.randomUUID()}`,
    chatId: params.chatId ?? optimisticChatId,
    role: "user",
    content: params.content,
    status: "completed",
    createdAt: new Date().toISOString(),
  };
}

export function createThinkingMessage(
  chatId: string | null,
): ClientChatMessage {
  return {
    id: thinkingMessageId,
    chatId: chatId ?? optimisticChatId,
    role: "assistant",
    content: "",
    status: "streaming",
    createdAt: new Date().toISOString(),
  };
}

export function appendOptimisticAnsweringMessages(params: {
  chat: ClientChatDetail | null;
  userMessage: ClientChatMessage;
  thinkingMessage: ClientChatMessage;
}): ChatMessageState {
  return {
    chat: params.chat,
    messages: [
      ...(params.chat?.messages ?? []),
      params.userMessage,
      params.thinkingMessage,
    ],
  };
}

export function buildPreparedStreamingChatDetail(params: {
  previousChat: ClientChatDetail | null;
  chat: ClientChatSummary;
  userMessage: ClientChatMessage;
}): ClientChatDetail {
  const previousMessages =
    params.previousChat?.id === params.chat.id ? params.previousChat.messages : [];
  const thinkingMessage = createThinkingMessage(params.chat.id);

  return {
    ...params.chat,
    messages: [...previousMessages, params.userMessage, thinkingMessage],
  };
}

export function appendStreamingAssistantDelta(params: {
  chat: ClientChatDetail;
  text: string;
}): ClientChatDetail {
  return {
    ...params.chat,
    messages: params.chat.messages.map((message) =>
      message.id === thinkingMessageId
        ? {
            ...message,
            content: `${message.content}${params.text}`,
            status: "streaming",
          }
        : message,
    ),
  };
}

export function completeStreamingChatDetail(params: {
  chat: ClientChatDetail;
  summary: ClientChatSummary;
  assistantMessage: ClientChatMessage;
  evidence: ClientChatEvidence[];
}): ClientChatDetail {
  const persistedAssistantMessage = {
    ...params.assistantMessage,
    evidence: params.evidence,
  };
  const hasThinkingMessage = params.chat.messages.some(
    (message) => message.id === thinkingMessageId,
  );

  return {
    ...params.summary,
    messages: hasThinkingMessage
      ? params.chat.messages.map((message) =>
          message.id === thinkingMessageId ? persistedAssistantMessage : message,
        )
      : [...params.chat.messages, persistedAssistantMessage],
  };
}

export function failStreamingAssistantMessage(params: {
  chat: ClientChatDetail;
  message: string;
}): ClientChatDetail {
  return {
    ...params.chat,
    messages: params.chat.messages.map((message) =>
      message.id === thinkingMessageId
        ? {
            ...message,
            content: params.message,
            status: "failed",
          }
        : message,
    ),
  };
}

export function mergeChatSummary(
  chats: ClientChatSummary[],
  chat: ClientChatSummary,
): ClientChatSummary[] {
  const nextChats = chats.filter((currentChat) => currentChat.id !== chat.id);

  return [chat, ...nextChats].sort(compareChatsByUpdatedAt);
}

export function replaceActiveChatSummary(
  chats: ClientChatSummary[],
  chat: ClientChatSummary,
): ClientChatSummary[] {
  return chats.map((currentChat) =>
    currentChat.id === chat.id ? chat : currentChat,
  );
}

function compareChatsByUpdatedAt(
  firstChat: ClientChatSummary,
  secondChat: ClientChatSummary,
): number {
  return Date.parse(secondChat.updatedAt) - Date.parse(firstChat.updatedAt);
}
