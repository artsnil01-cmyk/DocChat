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
- `Chat.documentIds` stores the default document scope for the conversation.
- Per-query document restrictions do not mutate `Chat.documentIds`.
