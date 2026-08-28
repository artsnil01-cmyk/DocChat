# Document Lifecycle

PDF bytes should not pass through the Vercel Function body. The backend authorizes direct upload to private Vercel Blob storage, then verifies completion and starts ingestion.

## Responsibilities

- `app/api/upload/route.ts` accepts upload preflight metadata and returns upload authorization or an existing document reuse result.
- `lib/documents/validation.ts` validates file type, size, and metadata.
- `lib/documents/storage.ts` owns Vercel Blob interactions.
- `lib/documents/lifecycle.ts` owns document state transitions.

## Statuses

```ts
type DocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed";
```

Detailed work can be surfaced through:

```ts
type DocumentStage = "reading" | "preparing" | "indexing";
```

## Deduplication

Before requesting upload authorization, the browser calculates `SHA-256(raw PDF bytes)` and sends:

```json
{
  "chatId": "...",
  "name": "contract.pdf",
  "sizeBytes": 1234567,
  "contentHash": "..."
}
```

The backend checks `(workspaceId, contentHash)`.

If a document already exists in the workspace, the backend does not authorize a new Blob upload, does not parse the file again, and adds the existing `documentId` to the current chat with `$addToSet`.

The backend recalculates the SHA-256 while ingesting uploaded bytes. That backend hash is authoritative and must match the declared frontend hash.

## Chat Attachments And Garbage Collection

Documents are stored and deduplicated at workspace scope, but they are user-visible as chat attachments.

Removing a document from a chat first removes only that chat reference. If another chat in the same workspace still references the document, the document, chunks, and Blob stay in place.

If the removed reference was the final chat reference, the application deletes:

- chunks for the document;
- Blob object;
- document record.

Do not add a processing jobs collection initially. The document record tracks lifecycle with `status`, `stage`, `progress`, and `error`.
