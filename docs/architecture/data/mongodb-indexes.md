# MongoDB Indexes

This is the index plan implemented by `scripts/create-indexes.ts`.

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
| `chunks` | Vector index on `embedding`, with filters on `documentId`, `strategyVersion`, and `kind` | Dense retrieval over child chunks within the selected document scope. |
| `chunks` | Search index on `text` with French and Arabic analyzer paths | Lexical retrieval for French, Arabic, and mixed-language queries. |

Atlas retrieval indexes may be provisioned separately from ordinary collection indexes if the project environment makes scripted creation unreliable.
