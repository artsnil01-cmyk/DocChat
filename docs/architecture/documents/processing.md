# Document Processing

Processing starts after Blob completion or through an explicit retry. The ingestion runner resumes from the stored durable stage.

See `documents/ingestion.md` for the PDF-to-chunks pipeline.

## Statuses

```ts
type DocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed"
  | "cancelled";
```

## Stages

```ts
type DocumentStage =
  | "reading"
  | "embedding"
  | "indexing";
```

`reading` covers Blob read, hash verification, PDF extraction, text normalization, chunk creation, and chunk persistence. `embedding` embeds child chunks. `indexing` finalizes readiness after indexed data is present.

## Lock

`processingLock` prevents duplicate processing for the same workspace document.

```ts
type DocumentProcessingLock = {
  token: string;
  expiresAt: Date;
};
```

The lock is valid only for documents with Blob data and status `processing`, `failed`, or `cancelled`. Public callers use `processDocument()`; direct lock calls stay internal to the document service.

Progress values are strategy-owned UI anchors. They describe user-visible stage movement, not exact compute percentages.

## Cancellation

Processing cancellation is soft. The cancel route sets `cancelRequestedAt`; the active durable stage finishes, then the pipeline checks the flag before starting the next stage.

If cancellation is requested:

- stop before the next stage;
- mark `status: "cancelled"`;
- release `processingLock`;
- keep Blob data for retry or explicit delete.

`pending_upload` documents can be deleted immediately. `processing` documents are cancelled before deletion. `ready`, `failed`, and `cancelled` documents can be deleted explicitly from the workspace library.

## Process Route Results

| State | Meaning |
| --- | --- |
| `processing_started` | Lock acquired and processing/resume started. |
| `upload_required` | The document needs Blob upload first. |
| `already_processing` | Another active lock is processing the document. |
| `ready` | The document is already processed. |

If lock acquisition sees a stale state, the service rereads the document and remaps the public result before returning an error.
