# Chat And Streaming

Chats are workspace-scoped and own a persistent/default document scope. Assistant responses stream to the frontend while preserving message and generation identity.

## Responsibilities

- `lib/chat/` owns chat sessions, messages, and generation state.
- The chat streaming route is added with the first RAG backend implementation.
- Frontend request state must be scoped by `chatId` and generation/message identifier.

No global single-request state should control all active chats.

## Document Scope

`Chat.documentIds` is the persistent/default document scope of a conversation. It references workspace documents attached to the chat, not the documents used by the latest query.

`POST /api/chat.documentIds` is an optional per-question retrieval restriction. If present, each requested document must belong to the current workspace and current chat. This per-query selection never mutates `Chat.documentIds`.

If the request omits `documentIds`, retrieval falls back to `Chat.documentIds`.
