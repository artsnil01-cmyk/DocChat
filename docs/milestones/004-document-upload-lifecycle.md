# Milestone 004: Document Upload Lifecycle

## Goal

Implement secure PDF upload, workspace-local deduplication, chat attachment, status tracking, and document cleanup.

## Steps

- [ ] Implement upload preflight route.
- [ ] Validate PDF metadata and size.
- [ ] Accept client SHA-256 content hash.
- [ ] Reuse existing workspace document on duplicate content hash.
- [ ] Attach existing documents to chats with `$addToSet`.
- [ ] Persist `pending_upload` document records.
- [ ] Authorize direct upload to private Vercel Blob storage.
- [ ] Verify Blob upload completion server-side.
- [ ] Recalculate backend SHA-256 during ingestion.
- [ ] Handle late duplicate discovery.
- [ ] Implement document status polling.
- [ ] Remove document reference from chat.
- [ ] Garbage-collect chunks, Blob, and document record when final chat reference is removed.

## Validation

- [ ] Duplicate upload avoids re-ingestion.
- [ ] Same filename with different content creates a distinct document.
- [ ] Final-reference removal deletes document data.
