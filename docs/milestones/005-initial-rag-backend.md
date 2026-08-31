# Milestone 005: Page-Aware RAG Backend

## Goal

Implement the production `page-parent-child-v1` ingestion and retrieval pipeline for native-text French/Arabic PDFs.

## Strategy And Config

- [x] Add RAG config constants.
- [x] Add document ingestion service boundary.
- [x] Wire document processing route to ingestion runner.
- [x] Set `RAG_STRATEGY_VERSION=page-parent-child-v1`.
- [x] Replace flat RAG config with strategy map.
- [x] Centralize chunk, retrieval, embedding, reranking, and evidence-budget constants.
- [x] Define LangChain as integration plumbing, not the RAG architecture.

## Ingestion Trigger And State

- [x] Keep Blob completion callback fast.
- [x] Trigger ingestion after Blob completion.
- [x] Keep user-visible durable stages traceable.
- [x] Add cancellation checkpoints between durable processing stages.
- [x] Resume ingestion from the stored durable stage.
- [x] Refactor ingestion execution into standardized stage runners.

Current public stages:

```ts
type DocumentStage =
  | "reading"
  | "embedding"
  | "indexing";
```

## PDF Text Extraction

- [x] Add PDF extraction dependency.
- [x] Read private Blob bytes server-side.
- [x] Verify backend SHA-256 before parsing.
- [x] Extract native text by page.
- [x] Fail native-text unsupported PDFs cleanly.
- [x] Preserve page provenance.

## Page Text Preparation

- [x] Normalize text conservatively.
- [x] Preserve page ranges during chunk assembly.
- [X] Keep extraction fallback-free: unsupported PDFs fail clearly.

## Structure And Chunking

- [x] Build page-aware parent chunks.
- [x] Build overlapping child chunks inside parents.
- [x] Preserve page ranges, offsets, and language.
- [x] Keep parent chunks unembedded.

## Embedding And Persistence

- [x] Add token budgeting dependency.
- [x] Add LangChain only when wiring embeddings or reranking.
- [x] Embed child chunks with Cohere `search_document`.
- [x] Batch child embeddings.
- [x] Delete stale chunks before retry.
- [x] Insert complete parent/child chunk set.
- [x] Mark document `ready` only after successful persistence.

## Search Indexes

- [x] Create MongoDB Atlas vector index for 1024D cosine search.
- [x] Filter vector search by document, kind, and strategy.
- [x] Create MongoDB Atlas lexical Search index for `text`.
- [x] Configure standard, French, and Arabic analyzers.

## Retrieval Scope And Guards

- [x] Add chat/question retrieval request schema.
- [x] Load chat by workspace.
- [x] Resolve document scope from explicit `documentIds` or `Chat.documentIds`.
- [x] Validate selected documents belong to workspace.
- [x] Require selected documents to be `ready`.
- [x] Reject empty document scope.
- [x] Keep per-query document scope from mutating `Chat.documentIds`.

## Retrieval And Reranking

- [x] Load bounded recent chat history.
- [x] Contextualize dependent follow-up queries.
- [x] Embed retrieval query with Cohere `search_query`.
- [x] Run dense retrieval.
- [x] Run French/Arabic lexical retrieval.
- [x] Fuse and deduplicate candidates with RRF.
- [x] Rerank with Cohere.
- [x] Expand parent context.
- [x] Enforce evidence context budget.

## Chat Answering

- [x] Persist user messages.
- [x] Generate grounded OpenAI answers.
- [ ] Add streaming after non-streaming answer path is correct.
- [x] Persist assistant messages.
- [x] Persist source child chunk IDs and rerank scores.

## Validation

- [ ] Retrieval filters by workspace and selected documents.
- [ ] Unsupported questions are refused.
- [ ] Sources resolve to document names and page ranges.
- [ ] Failed ingestion leaves no usable partial index.
