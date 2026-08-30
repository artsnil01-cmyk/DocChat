# Document Processing

Processing starts after Blob completion or through an explicit retry. The current implementation defines the contract and lock behavior; full RAG ingestion is implemented in Milestone 005.

## Statuses

```ts
type DocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed";
```

## Stages

```ts
type DocumentStage =
  | "reading"
  | "normalizing"
  | "chunking"
  | "embedding"
  | "indexing";
```

## Lock

`processingLock` prevents duplicate processing for the same workspace document.

```ts
type DocumentProcessingLock = {
  token: string;
  expiresAt: Date;
};
```

The lock is valid only for documents with Blob data and status `processing` or `failed`. Public callers use `processDocument()`; direct lock calls stay internal to the document service.

## Process Route Results

| State | Meaning |
| --- | --- |
| `processing_started` | Lock acquired and processing/resume started. |
| `upload_required` | The document needs Blob upload first. |
| `already_processing` | Another active lock is processing the document. |
| `ready` | The document is already processed. |

If lock acquisition sees a stale state, the service rereads the document and remaps the public result before returning an error.
