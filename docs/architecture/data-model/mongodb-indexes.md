# MongoDB Indexes

Base indexes are implemented by `scripts/create-indexes.ts`. Retrieval indexes are implemented by `scripts/create-search-indexes.ts` and included in `npm run setup`.

## Collection Indexes

| Collection | Index | Purpose |
| --- | --- | --- |
| `accounts` | `{ email: 1 }`, unique | Login lookup and one account per normalized email. |
| `sessions` | `{ tokenHash: 1 }`, unique | Auth-cookie token lookup. |
| `sessions` | `{ expiresAt: 1 }`, TTL | Automatic expired session cleanup. |
| `documents` | `{ workspaceId: 1, contentHash: 1 }`, unique | Workspace-local PDF deduplication and upload race safety. |
| `chunks` | `{ documentId: 1 }` | Chunk cleanup and document-level retrieval filtering. |
| `chunks` | `{ documentId: 1, strategyVersion: 1, kind: 1 }` | Retrieval and maintenance filtering by document, strategy, and chunk kind. |
| `chats` | `{ workspaceId: 1, updatedAt: -1 }` | Recent-first chat listing for a workspace. |
| `messages` | `{ chatId: 1, createdAt: 1 }` | Chronological message loading and bounded history selection. |

## Atlas Retrieval Indexes

| Collection | Index | Purpose |
| --- | --- | --- |
| `chunks` | `chunks_vector_embedding`: vector on `embedding`, filters on `documentId`, `strategyVersion`, `kind` | Dense retrieval over child chunks within the selected document scope. |
| `chunks` | `chunks_text_search`: `text` with standard, French, Arabic analyzers | Lexical retrieval for French, Arabic, and mixed-language queries. |
