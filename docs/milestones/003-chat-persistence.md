# Milestone 003: Chat Persistence

## Goal

Implement backend chat CRUD and stable chat scope rules before document upload and RAG use them.

## Steps

- [x] Implement chat creation for the authenticated workspace.
- [x] Implement chat listing by workspace.
- [x] Implement chat detail loading.
- [x] Implement chat deletion by workspace.
- [x] Define canonical empty-chat behavior.
- [x] Load bounded recent conversation history.
- [x] Keep `Chat.documentIds` as persistent/default document scope.
- [x] Keep message persistence ready for RAG without streaming behavior.

## Validation

- [x] Chat CRUD routes require authentication.
- [ ] Empty chat UI does not create unused chat records.
- [ ] First meaningful chat action creates the chat record.
- [ ] Chats are isolated by workspace.
- [x] Deleted chats are unavailable from the workspace.
- [ ] Messages load in chronological order.
- [ ] Per-query document scope does not overwrite `Chat.documentIds`.
