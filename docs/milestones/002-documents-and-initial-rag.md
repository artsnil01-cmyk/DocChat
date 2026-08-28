# Milestone 002: Documents And Initial RAG

## Goal

Deliver the first complete production-capable document ingestion and RAG path.

## Steps

- [ ] Implement direct PDF upload authorization.
- [ ] Add client-hash upload preflight contract.
- [ ] Reuse existing workspace document on duplicate content hash.
- [ ] Persist `pending_upload` document records.
- [ ] Verify Blob upload completion server-side.
- [ ] Recalculate backend SHA-256 during ingestion.
- [ ] Handle late duplicate discovery and canonical document replacement.
- [ ] Implement document status polling.
- [ ] Extract native-text PDF content with page provenance.
- [ ] Implement `parent-child-v1` chunking.
- [ ] Generate Cohere embeddings for child chunks.
- [ ] Create MongoDB vector and lexical indexes.
- [ ] Implement dense retrieval.
- [ ] Implement French and Arabic lexical retrieval.
- [ ] Add query contextualization before retrieval.
- [ ] Fuse and deduplicate candidates.
- [ ] Rerank with Cohere.
- [ ] Expand parent and neighboring context.
- [ ] Generate grounded OpenAI streamed answers.
- [ ] Return sources with page provenance.
- [ ] Add first French and Arabic evaluation datasets.

## Validation

- [ ] Upload lifecycle integration tests pass.
- [ ] Retrieval integration tests pass.
- [ ] Initial retrieval evaluation results are stored under `evaluation/experiments/`.
