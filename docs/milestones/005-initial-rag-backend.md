# Milestone 005: Layout-Aware RAG Backend

## Goal

Implement the production `layout-parent-child-v1` ingestion and retrieval pipeline for native-text French/Arabic PDFs.

## Strategy And Config

- [x] Add RAG config constants.
- [x] Add document ingestion service boundary.
- [x] Wire document processing route to ingestion runner.
- [x] Set `RAG_STRATEGY_VERSION=layout-parent-child-v1`.
- [x] Replace flat RAG config with strategy map.
- [x] Centralize chunk, retrieval, embedding, reranking, and evidence-budget constants.
- [x] Define LangChain as integration plumbing, not the RAG architecture.

## Ingestion Trigger And State

- [x] Keep Blob completion callback fast.
- [x] Trigger ingestion after Blob completion.
- [ ] Keep user-visible stages traceable.
- [ ] Add cancellation checkpoints between processing stages.

Current public stages:

```ts
type DocumentStage =
  | "reading"
  | "normalizing"
  | "chunking"
  | "embedding"
  | "indexing";
```

## PDF Layout Extraction

- [ ] Add PDF extraction dependency.
- [ ] Read private Blob bytes server-side.
- [ ] Verify backend SHA-256 before parsing.
- [ ] Extract page text items with layout metadata.
- [ ] Fail native-text unsupported PDFs cleanly.
- [ ] Preserve page provenance.

## Layout Reconstruction

- [ ] Group text items into lines.
- [ ] Preserve RTL ordering for Arabic.
- [ ] Detect lightweight columns.
- [ ] Remove clear repeated headers and footers.
- [ ] Normalize text conservatively.

## Structure And Chunking

- [ ] Infer headings, paragraphs, lists, and table-like blocks.
- [ ] Build layout-aware parent chunks.
- [ ] Build overlapping child chunks inside parents.
- [ ] Preserve `sectionPath`, page ranges, offsets, and language.
- [ ] Keep parent chunks unembedded.

## Embedding And Persistence

- [ ] Add token budgeting dependency.
- [ ] Add LangChain only when wiring embeddings or reranking.
- [ ] Embed child chunks with Cohere `search_document`.
- [ ] Batch child embeddings.
- [ ] Delete stale chunks before retry.
- [ ] Insert complete parent/child chunk set.
- [ ] Mark document `ready` only after successful persistence.

## Search Indexes

- [ ] Create MongoDB Atlas vector index for 1024D cosine search.
- [ ] Filter vector search by document, kind, and strategy.
- [ ] Create MongoDB Atlas lexical Search index for `text` and `sectionPath`.
- [ ] Configure standard, French, and Arabic analyzers.

## Retrieval And Reranking

- [ ] Load bounded recent chat history.
- [ ] Contextualize dependent follow-up queries.
- [ ] Embed retrieval query with Cohere `search_query`.
- [ ] Run dense retrieval.
- [ ] Run French/Arabic lexical retrieval.
- [ ] Fuse and deduplicate candidates with RRF.
- [ ] Rerank with Cohere.
- [ ] Expand parent context.
- [ ] Enforce evidence context budget.

## Chat Answering

- [ ] Validate selected documents belong to workspace and chat scope.
- [ ] Require selected documents to be `ready`.
- [ ] Persist user messages.
- [ ] Generate grounded OpenAI streamed answers.
- [ ] Persist assistant messages.
- [ ] Persist source child chunk IDs and rerank scores.

## Validation

- [ ] Retrieval filters by workspace and selected documents.
- [ ] Unsupported questions are refused.
- [ ] Sources resolve to document names and page ranges.
- [ ] Failed ingestion leaves no usable partial index.
