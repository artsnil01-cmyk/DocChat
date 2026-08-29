# Milestone 005: Initial RAG Backend

## Goal

Deliver the first grounded French/Arabic RAG path over selected chat documents after chat and document domains are stable.

## Steps

- [ ] Extract native-text PDF content with page provenance.
- [ ] Implement `parent-child-v1` chunking.
- [ ] Preserve parent/child relationships.
- [ ] Generate Cohere embeddings for child chunks.
- [ ] Create MongoDB Atlas vector index for chunks.
- [ ] Create MongoDB Atlas lexical search index for French and Arabic.
- [ ] Implement query contextualization.
- [ ] Implement dense retrieval.
- [ ] Implement French and Arabic lexical retrieval.
- [ ] Fuse and deduplicate candidates.
- [ ] Rerank with Cohere.
- [ ] Expand parent and neighboring context.
- [ ] Enforce evidence context budget.
- [ ] Persist user messages.
- [ ] Persist assistant messages.
- [ ] Generate grounded OpenAI streamed answers.
- [ ] Return source chunk references and relevance scores.

## Validation

- [ ] Retrieval filters by workspace and selected documents.
- [ ] Unsupported questions are refused.
- [ ] Sources resolve to document names and page ranges.
