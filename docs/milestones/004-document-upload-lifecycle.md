# Milestone 004: Document Upload Lifecycle

## Goal

Implement secure PDF upload, workspace-local deduplication, status tracking, and workspace document cleanup rules.

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
- [x] List documents by workspace.
- [x] Recalculate backend SHA-256 during ingestion.
- [x] Delete untrusted uploads when backend hash does not match.
- [x] Handle late duplicate discovery.
- [x] Make upload preflight resumable for pending documents.
- [x] Reuse uploaded failed documents through processing retry.
- [x] Add document processing retry route contract.
- [x] Implement document status polling.
- [x] Add explicit global document delete from workspace library.
- [x] Add soft processing cancellation contract.

## Validation

- [x] Duplicate upload avoids re-ingestion.
- [x] Same filename with different content creates a distinct document.
- [x] Same-name display names remain understandable.
- [x] Global delete removes the workspace document from all chats.
- [x] Processing retry maps upload-required, active-processing, and ready states.
- [x] Status polling exposes public processing stages.
