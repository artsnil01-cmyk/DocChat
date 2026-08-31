import type {
  ClientChatDetail,
  ClientChatMessage,
  ClientChatSummary,
  SendClientChatMessageResponse,
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

export function buildAnsweredChatDetail(params: {
  previousChat: ClientChatDetail | null;
  response: SendClientChatMessageResponse;
}): ClientChatDetail {
  const previousMessages =
    params.previousChat?.id === params.response.chat.id
      ? params.previousChat.messages
      : [];

  return {
    ...params.response.chat,
    messages: [
      ...previousMessages,
      params.response.messages.user,
      {
        ...params.response.messages.assistant,
        evidence: params.response.evidence,
      },
    ],
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
