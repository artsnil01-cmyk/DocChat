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
- [x] Keep Blob upload token payload workspace/document scoped.
- [x] Keep upload independent from chat attachment.
- [x] List documents by workspace and optional chat scope.
- [x] Recalculate backend SHA-256 during ingestion.
- [x] Delete untrusted uploads when backend hash does not match.
- [x] Handle late duplicate discovery.
- [x] Make upload preflight resumable for pending documents.
- [x] Reuse uploaded failed documents through processing retry.
- [x] Add document processing retry route contract.
- [x] Implement document status polling.
- [x] Remove document reference from a chat without deleting workspace document data.
- [x] Add explicit global document delete from workspace library.
- [x] Add soft processing cancellation contract.

## Validation

- [ ] Duplicate upload avoids re-ingestion.
- [ ] Same filename with different content creates a distinct document.
- [ ] Same-name display names remain understandable.
- [ ] Removing from one chat keeps documents used by another chat.
- [x] Chat detach keeps workspace document data.
- [x] Processing retry maps upload-required, active-processing, and ready states.
- [x] Status polling exposes public processing stages.
