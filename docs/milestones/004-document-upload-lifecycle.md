# Milestone 004: Document Upload Lifecycle

## Goal

Implement secure PDF upload, workspace-local deduplication, chat attachment, status tracking, and cleanup rules.

## Steps

- [ ] Implement upload preflight route.
- [ ] Validate PDF metadata and size.
- [ ] Accept client SHA-256 content hash.
- [ ] Reuse workspace document records on duplicate content hash.
- [ ] Rename same-name uploads deterministically when content differs.
- [ ] Persist `pending_upload` document records.
- [ ] Authorize direct upload to private Vercel Blob storage.
- [ ] Verify Blob upload completion server-side.
- [ ] Attach documents to chats through `Chat.documentIds`.
- [ ] Attach existing documents to chats with `$addToSet`.
- [ ] List documents by workspace and chat scope.
- [ ] Recalculate backend SHA-256 during ingestion.
- [ ] Handle late duplicate discovery.
- [ ] Implement document status polling.
- [ ] Remove document reference from a chat without deleting shared document data.
- [ ] Garbage-collect chunks, Blob, and document record when final chat reference is removed.

## Validation

- [ ] Duplicate upload avoids re-ingestion.
- [ ] Same filename with different content creates a distinct document.
- [ ] Same-name display names remain understandable.
- [ ] Removing from one chat keeps documents used by another chat.
- [ ] Final-reference removal deletes document data.
- [ ] Status polling exposes public processing stages.
