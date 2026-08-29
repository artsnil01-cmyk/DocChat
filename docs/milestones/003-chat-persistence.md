# Milestone 003: Chat Persistence

## Goal

Implement the backend chat model before document upload and RAG use it.

## Steps

- [ ] Implement chat creation.
- [ ] Implement chat listing by workspace.
- [ ] Implement chat detail loading.
- [ ] Persist user messages.
- [ ] Persist assistant messages.
- [ ] Load bounded recent conversation history.
- [ ] Keep `Chat.documentIds` as persistent/default document scope.
- [ ] Validate per-query document restrictions against workspace and chat.

## Validation

- [ ] Chats are isolated by workspace.
- [ ] Messages load in chronological order.
- [ ] Per-query document scope does not overwrite `Chat.documentIds`.
