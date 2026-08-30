# Document Lifecycle

PDF bytes should not pass through the Vercel Function body. The backend authorizes direct upload to private Vercel Blob storage, then verifies completion and starts ingestion.

## Responsibilities

- `app/api/upload/route.ts` accepts preflight metadata and creates or reuses a document record.
- `app/api/upload/blob/route.ts` handles Vercel Blob token generation and completion callbacks.
- `lib/documents/schemas.ts` validates file type, size, and metadata.
- `lib/documents/storage.ts` owns Vercel Blob interactions.
- `lib/documents/service.ts` owns document state transitions.

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

Existing workspace documents are reused by content hash. `ready`, `processing`, and uploaded `failed` documents do not upload again. `pending_upload` documents return upload instructions so the browser can retry. `failed` documents without Blob data reset to `pending_upload`.

New preflight responses include the Blob pathname and upload handler URL only when upload is required.

The backend recalculates the SHA-256 while ingesting uploaded bytes. That backend hash is authoritative and must match the declared frontend hash.

If the backend hash does not match, the uploaded Blob and document record are deleted because the file is not trusted.

## Chat Attachments And Garbage Collection

Documents are stored and deduplicated at workspace scope, but they are user-visible as chat attachments.

Removing a document from a chat first removes only that chat reference. If another chat in the same workspace still references the document, the document, chunks, and Blob stay in place.

If the removed reference was the final chat reference, the application deletes:

- chunks for the document;
- Blob object;
- document record.

Do not add a processing jobs collection initially. The document record tracks lifecycle with `status`, `stage`, `progress`, and `error`.

Document responses include `nextAction`: `upload`, `process`, `wait`, or `none`.
