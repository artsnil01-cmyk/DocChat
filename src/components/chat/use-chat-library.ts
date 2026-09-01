"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteClientChat,
  getClientChat,
  listClientChats,
  streamClientChatMessage,
  type ClientChatDetail,
  type ClientChatSummary,
} from "@/lib/client/chats";
import {
  appendStreamingAssistantDelta,
  appendOptimisticAnsweringMessages,
  buildPreparedStreamingChatDetail,
  completeStreamingChatDetail,
  createOptimisticUserMessage,
  createThinkingMessage,
  failStreamingAssistantMessage,
  mergeChatSummary,
  replaceActiveChatSummary,
} from "./chat-message-state";

type ChatLibraryState = {
  chats: ClientChatSummary[];
  activeChat: ClientChatDetail | null;
  activeChatId: string | null;
  loading: boolean;
  answering: boolean;
  loadingChatId?: string;
  error?: string;
};

export type UseChatLibraryResult = ChatLibraryState & {
  refreshChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  startNewConversation: () => void;
  sendMessage: (params: {
    question: string;
    documentIds?: string[];
  }) => Promise<boolean>;
  deleteChat: (chatId: string) => Promise<void>;
};

export function useChatLibrary(): UseChatLibraryResult {
  const [state, setState] = useState<ChatLibraryState>({
    chats: [],
    activeChat: null,
    activeChatId: null,
    loading: true,
    answering: false,
  });

  const refreshChats = useCallback(async () => {
    setState((currentState) => ({
      ...currentState,
      loading: true,
      error: undefined,
    }));

    try {
      const chats = await listClientChats();
      setState((currentState) => ({
        ...currentState,
        chats,
        loading: false,
      }));
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        loading: false,
        error: getClientErrorMessage(error),
      }));
    }
  }, []);

  const selectChat = useCallback(async (chatId: string) => {
    if (state.answering) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeChatId: chatId,
      loadingChatId: chatId,
      error: undefined,
    }));

    try {
      const chat = await getClientChat(chatId);
      setState((currentState) => ({
        ...currentState,
        activeChat: chat,
        activeChatId: chat.id,
        loadingChatId: undefined,
      }));
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        loadingChatId: undefined,
        error: getClientErrorMessage(error),
      }));
    }
  }, [state.answering]);

  const startNewConversation = useCallback(() => {
    if (state.answering) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeChat: null,
      activeChatId: null,
      error: undefined,
    }));
  }, [state.answering]);

  const sendMessage = useCallback(
    async (params: {
      question: string;
      documentIds?: string[];
    }): Promise<boolean> => {
      if (state.answering) {
        return false;
      }

      const question = params.question.trim();

      if (!question) {
        return false;
      }

      const previousChat = state.activeChat;
      const userMessage = createOptimisticUserMessage({
        chatId: state.activeChatId,
        content: question,
      });
      const thinkingMessage = createThinkingMessage(state.activeChatId);
      const optimisticState = appendOptimisticAnsweringMessages({
        chat: previousChat,
        userMessage,
        thinkingMessage,
      });

      setState((currentState) => ({
        ...currentState,
        activeChat: optimisticState.chat
          ? {
              ...optimisticState.chat,
              messages: optimisticState.messages,
            }
          : {
              id: "local:new-chat",
              title: "Nouvelle conversation",
              documentIds: params.documentIds ?? [],
              createdAt: userMessage.createdAt,
              updatedAt: userMessage.createdAt,
              messages: optimisticState.messages,
            },
        activeChatId: state.activeChatId,
        answering: true,
        error: undefined,
      }));

      let streamChat: ClientChatDetail | null = null;
      let hasPreparedStream = false;

      try {
        for await (const event of streamClientChatMessage({
          chatId: state.activeChatId ?? undefined,
          question,
          documentIds: params.documentIds?.length ? params.documentIds : undefined,
        })) {
          if (event.type === "prepared") {
            hasPreparedStream = true;
            streamChat = buildPreparedStreamingChatDetail({
              previousChat,
              chat: event.chat,
              userMessage: event.userMessage,
            });

            setState((currentState) => ({
              ...currentState,
              chats: mergeChatSummary(currentState.chats, event.chat),
              activeChat: streamChat,
              activeChatId: event.chat.id,
            }));
            continue;
          }

          if (event.type === "title") {
            streamChat = streamChat
              ? {
                  ...event.chat,
                  messages: streamChat.messages,
                }
              : streamChat;

            setState((currentState) => ({
              ...currentState,
              chats: replaceActiveChatSummary(currentState.chats, event.chat),
              activeChat: streamChat ?? currentState.activeChat,
            }));
            continue;
          }

          if (event.type === "delta") {
            if (!streamChat) {
              continue;
            }

            streamChat = appendStreamingAssistantDelta({
              chat: streamChat,
              text: event.text,
            });

            setState((currentState) => ({
              ...currentState,
              activeChat: streamChat,
            }));
            continue;
          }

          if (event.type === "done") {
            if (!streamChat) {
              continue;
            }

            streamChat = completeStreamingChatDetail({
              chat: streamChat,
              summary: event.chat,
              assistantMessage: event.assistantMessage,
              evidence: event.evidence,
            });

            setState((currentState) => ({
              ...currentState,
              chats: mergeChatSummary(currentState.chats, event.chat),
              activeChat: streamChat,
              activeChatId: event.chat.id,
              answering: false,
            }));
            continue;
          }

          if (event.type === "error") {
            throw new Error(event.error);
          }
        }

        setState((currentState) => ({
          ...currentState,
          answering: false,
        }));

        return true;
      } catch (error) {
        if (hasPreparedStream && streamChat) {
          const failedChat = failStreamingAssistantMessage({
            chat: streamChat,
            message: getClientErrorMessage(error),
          });

          setState((currentState) => ({
            ...currentState,
            activeChat: failedChat,
            activeChatId: failedChat.id,
            answering: false,
            error: getClientErrorMessage(error),
          }));

          return false;
        }

        setState((currentState) => ({
          ...currentState,
          activeChat: previousChat,
          activeChatId: previousChat?.id ?? null,
          answering: false,
          error: getClientErrorMessage(error),
        }));

        return false;
      }
    },
    [state.activeChat, state.activeChatId, state.answering],
  );

  const deleteChat = useCallback(async (chatId: string) => {
    if (state.answering) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: undefined,
    }));

    try {
      await deleteClientChat(chatId);
      setState((currentState) => {
        const isDeletingActiveChat = currentState.activeChatId === chatId;

        return {
          ...currentState,
          chats: currentState.chats.filter((chat) => chat.id !== chatId),
          activeChat: isDeletingActiveChat ? null : currentState.activeChat,
          activeChatId: isDeletingActiveChat ? null : currentState.activeChatId,
        };
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: getClientErrorMessage(error),
      }));
    }
  }, [state.answering]);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  return useMemo(
    () => ({
      ...state,
      refreshChats,
      selectChat,
      startNewConversation,
      sendMessage,
      deleteChat,
    }),
    [deleteChat, refreshChats, selectChat, sendMessage, startNewConversation, state],
  );
}

function getClientErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Action conversation impossible.";
}
