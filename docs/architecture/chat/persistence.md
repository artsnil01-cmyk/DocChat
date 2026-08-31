# Chat Persistence

Chats are workspace-scoped conversation records. A new chat is created only when the user sends a non-empty question with selected documents.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /api/chats` | List workspace chats. |
| `POST /api/chats` | Create a chat. |
| `GET /api/chats/{chatId}` | Read one workspace chat. |
| `DELETE /api/chats/{chatId}` | Delete one workspace chat. |

## Rules

- Empty "new chat" UI state does not create a database record.
- New chat answering requires non-empty text and selected documents.
- Chat operations resolve workspace from the authenticated session.
- `Chat.documentIds` references workspace documents attached to the conversation.
- Uploading a document does not attach it to a chat.
- Selected documents are added to `Chat.documentIds` when the user sends a non-empty message.
- Detaching a document from a chat does not delete it from the workspace library.
- Per-query document restrictions do not mutate `Chat.documentIds`.
- Draft selected documents are frontend-only until the message is sent.
- One answer runs at a time; chat navigation is locked during answering.

## Answering Policy

| Request | Behavior |
| --- | --- |
| No `chatId`, no `documentIds` | Reject. |
| No `chatId`, with `documentIds` | Create chat, attach selected documents, answer from selected documents. |
| Existing `chatId`, with `documentIds` | Attach selected documents, answer from selected documents. |
| Existing `chatId`, no `documentIds` | Answer from stored `Chat.documentIds`. |

Query enrichment runs only when the request uses stored `Chat.documentIds`.

## Frontend Behavior

- The composer clears submitted text and draft document chips when a send starts.
- The composer restores the submitted draft only if the request fails.
- Active chat documents render as read-only `@document` chips.
- Persisted assistant sources are hydrated from chunk and document records when a chat is reopened.
- Chat deletion removes the chat and messages; workspace documents remain.
