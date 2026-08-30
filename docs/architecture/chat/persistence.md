# Chat Persistence

Chats are workspace-scoped conversation records. A new chat is created only when the first meaningful message or document action needs persistence.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /api/chats` | List workspace chats. |
| `POST /api/chats` | Create a chat. |
| `GET /api/chats/{chatId}` | Read one workspace chat. |
| `DELETE /api/chats/{chatId}` | Delete one workspace chat. |

## Rules

- Empty "new chat" UI state does not create a database record.
- Chat operations resolve workspace from the authenticated session.
- `Chat.documentIds` references workspace documents attached to the conversation.
- Uploading a document does not attach it to a chat.
- Selected documents are added to `Chat.documentIds` when the user sends a non-empty message.
- Detaching a document from a chat does not delete it from the workspace library.
- Per-query document restrictions do not mutate `Chat.documentIds`.
