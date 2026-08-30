# Milestone 004: Document Upload Lifecycle

## Goal

Implement secure PDF upload, workspace-local deduplication, chat attachment, status tracking, and cleanup rules.

## Steps

- [x] Implement upload preflight route.
- [x] Validate PDF metadata and size.
- [x] Accept client SHA-256 content hash.
- [x] Reuse workspace document records on duplicate content hash.
- [x] Rename same-name uploads deterministically when content differs.
- [x] Persist `pending_upload` document records.
- [x] Return Blob upload instructions from preflight for new documents.
- [x] Authorize direct upload to private Vercel Blob storage.
- [x] Verify Blob upload completion server-side.
- [x] Attach documents to chats through `Chat.documentIds`.
- [x] Attach existing documents to chats with `$addToSet`.
- [x] List documents by workspace and chat scope.
- [ ] Recalculate backend SHA-256 during ingestion.
- [ ] Handle late duplicate discovery.
- [x] Implement document status polling.
- [ ] Remove document reference from a chat without deleting shared document data.
- [ ] Garbage-collect chunks, Blob, and document record when final chat reference is removed.

## Validation

- [ ] Duplicate upload avoids re-ingestion.
- [ ] Same filename with different content creates a distinct document.
- [ ] Same-name display names remain understandable.
- [ ] Removing from one chat keeps documents used by another chat.
- [ ] Final-reference removal deletes document data.
- [ ] Status polling exposes public processing stages.
