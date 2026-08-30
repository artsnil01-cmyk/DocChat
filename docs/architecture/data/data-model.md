# Data Model

MongoDB Atlas is the persistence and search layer.

## Collections

- `accounts`
- `sessions`
- `documents`
- `chunks`
- `chats`
- `messages`

There is no `workspaces` collection. `workspaceId` is a persistent isolation identifier carried by sessions, documents, and chats.

## Ownership

```text
Account
  Auth Sessions

Persistent Workspace Identity
  Documents
    Chunks
  Chats
    Messages
```

Every document, chunk, chat, and message operation must enforce workspace ownership.

## Collection Rules

### `accounts`

- `_id: ObjectId`
- `email: string`
- `passwordHash: string`
- `createdAt: Date`

Rules:

- Normalize email to lowercase before storage.
- Store only an Argon2id password hash.
- `email` is unique.

Indexes:

- `email` unique

### `sessions`

- `_id: ObjectId`
- `accountId: ObjectId`
- `workspaceId: string`
- `tokenHash: string`
- `createdAt: Date`
- `expiresAt: Date`

Rules:

- One login creates one auth session.
- Several auth sessions may point to the same workspace.
- Raw session tokens never enter MongoDB.

Indexes:

- `tokenHash` unique
- `expiresAt` TTL

### `documents`

- `_id: ObjectId`
- `workspaceId: string`
- `name: string`
- `contentHash: string`
- `blobPathname?: string`
- `sizeBytes: number`
- `pageCount?: number`
- `status: "pending_upload" | "processing" | "ready" | "failed"`
- `stage?: "reading" | "normalizing" | "chunking" | "embedding" | "indexing"`
- `progress?: number`
- `error?: { code: string; message: string }`
- `processingLock?: { token: string; expiresAt: Date }`
- `createdAt: Date`
- `updatedAt: Date`

Rules:

- Documents are stored at workspace scope and exposed as chat attachments.
- Byte-identical PDFs are deduplicated only within the same workspace.
- Filename equality does not imply document equality.
- Blob paths are stable internal paths such as `documents/{documentId}/original.pdf`.
- `processingLock` prevents duplicate ingestion work and expires quickly.

Indexes:

- `(workspaceId, contentHash)` unique

### `chunks`

- `_id: ObjectId`
- `documentId: ObjectId`
- `strategyVersion: string`
- `kind: "parent" | "child"`
- `text: string`
- `tokenCount: number`
- `parentId?: ObjectId`
- `sectionPath?: string[]`
- `pageStart: number`
- `pageEnd: number`
- `startOffset?: number`
- `endOffset?: number`
- `language: "fr" | "ar" | "mixed"`
- `embedding?: number[]`

Rules:

- Child chunks are primary retrieval units.
- Parent chunks provide expanded context.
- Chunks do not duplicate `workspaceId`; ownership is resolved through `documentId`.

Indexes:

- `documentId`
- `(documentId, strategyVersion, kind)`

Atlas Search indexes cover vector search over `embedding`, lexical search over `text`, filterable `documentId`, and strategy/kind filtering.

### `chats`

- `_id: ObjectId`
- `workspaceId: string`
- `title: string`
- `documentIds: ObjectId[]`
- `createdAt: Date`
- `updatedAt: Date`

Rules:

- `documentIds` is the persistent/default chat scope.
- Per-query document selection never overwrites `Chat.documentIds`.

Indexes:

- `(workspaceId, updatedAt DESC)`

### `messages`

- `_id: ObjectId`
- `chatId: ObjectId`
- `role: "user" | "assistant"`
- `content: string`
- `status: "streaming" | "completed" | "failed"`
- `sources?: { chunkId: ObjectId; relevanceScore: number }[]`
- `createdAt: Date`

Rules:

- Messages are stored separately from chats.
- Source metadata stays minimal and resolves display fields through chunk and document records.

Indexes:

- `(chatId, createdAt)`
