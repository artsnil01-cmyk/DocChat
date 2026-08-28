# MongoDB Indexes

This document is the source of truth for base MongoDB indexes created by `scripts/create-indexes.ts`.

Atlas Search and Vector Search indexes are also listed here because retrieval depends on them, but their exact provisioning mechanism may differ from ordinary collection indexes.

## Ordinary Collection Indexes

### `accounts`

```text
email UNIQUE
```

Purpose:

- Enforce one account per normalized email.
- Support shared-account lookup during login.

Rules:

- Email is normalized to lowercase before storage.
- The unique constraint applies to the normalized stored value.

### `sessions`

```text
tokenHash UNIQUE
expiresAt TTL
```

Purpose:

- `tokenHash` supports authenticated request lookup from `docchat_auth`.
- `expiresAt` automatically removes expired auth-session records.

Rules:

- The raw auth token is never stored.
- TTL cleanup does not delete workspace data.

### `documents`

```text
(workspaceId, contentHash) UNIQUE
```

Purpose:

- Enforce workspace-local raw-byte PDF deduplication.
- Provide the final concurrency safety mechanism for duplicate uploads.

Rules:

- Deduplication never crosses workspace boundaries.
- Filename is not part of document identity.

### `chunks`

```text
documentId
(documentId, strategyVersion, kind)
```

Purpose:

- Delete all chunks for a document during garbage collection.
- Filter chunks by document, strategy, and parent/child kind during retrieval and maintenance.

Rules:

- Chunks do not duplicate `workspaceId`.
- Workspace ownership is resolved through the parent document.

### `chats`

```text
(workspaceId, updatedAt DESC)
```

Purpose:

- Load the chat sidebar for the current workspace in recent-first order.

Rules:

- `Chat.documentIds` is the persistent/default document scope.
- Per-query `documentIds` never mutates this list.

### `messages`

```text
(chatId, createdAt)
```

Purpose:

- Load conversation history in chronological order.
- Build bounded history windows for contextualization and final generation.

## Atlas Retrieval Indexes

### `chunks` Vector Search

Vector search indexes child chunk embeddings.

Required fields:

- `embedding` as the vector field
- `documentId` as a filter field
- `strategyVersion` as a filter field
- `kind` as a filter field

Rules:

- Vector search uses cosine similarity.
- Retrieval filters to selected document IDs and active strategy.
- Child chunks are the primary vector retrieval units.

### `chunks` Lexical Search

Lexical search indexes the same canonical `text` field using French and Arabic analyzer paths.

Required behavior:

- French analyzer path for French queries.
- Arabic analyzer path for Arabic queries.
- Both paths may be queried for mixed or ambiguous language input.

Rules:

- Do not duplicate stored text into `text_fr` or `text_ar` fields.
- The application does not manually extract keyword maps.

## Implementation Notes

`scripts/create-indexes.ts` should create ordinary collection indexes idempotently.

Atlas Search and Vector Search index creation may be handled by script only if the available MongoDB driver/API path is reliable for the project environment. Otherwise, this document remains the manual provisioning checklist and `scripts/setup.ts` should verify that the required indexes exist or fail clearly.
