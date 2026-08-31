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

## Answering Policy

| Request | Behavior |
| --- | --- |
| No `chatId`, no `documentIds` | Reject. |
| No `chatId`, with `documentIds` | Create chat, attach selected documents, answer from selected documents. |
| Existing `chatId`, with `documentIds` | Attach selected documents, answer from selected documents. |
| Existing `chatId`, no `documentIds` | Answer from stored `Chat.documentIds`. |

Query enrichment runs only when the request uses stored `Chat.documentIds`.
