# RAG Pipeline

The production path is `page-parent-child-v1`. It extracts native PDF text by page, chunks page-grounded text into parent and child chunks, embeds child chunks, retrieves child evidence, reranks it, expands to parent evidence, and generates a grounded answer.

## Responsibilities

- `config/rag.ts` owns the strategy map, chunk limits, retrieval limits, model references, and progress anchors.
- `lib/rag/ingestion/` owns document ingestion orchestration.
- `lib/rag/extraction/` owns PDF text extraction and page provenance.
- `lib/rag/chunking/` owns strategy-versioned chunking.
- `lib/rag/embeddings/` owns Cohere embedding calls.
- `lib/rag/retrieval/` owns dense retrieval, lexical retrieval, and fusion.
- `lib/rag/reranking/` owns Cohere reranking.
- `lib/rag/context/` owns parent evidence context and evidence budgeting.
- `lib/rag/answer/` owns grounded OpenAI prompt construction and answer generation.

## LangChain Boundary

LangChain may be used for integration plumbing: chunk document shape, Cohere embeddings, Cohere reranking, and small structured-output helpers.

The RAG architecture stays custom. PDF text extraction, chunking, MongoDB retrieval, RRF, parent expansion, context budgeting, authorization, and final streaming depend on explicit project behavior.

## Ingestion Contract

See `documents/ingestion.md` for the full PDF-to-chunks flow.

Blob completion schedules ingestion with Next.js `after()` so the upload callback response stays fast.

`processDocument()` acquires the document processing lock, then calls the RAG ingestion runner with `workspaceId`, `documentId`, and `lockToken`.

The ingestion runner updates `Document.status`, `stage`, and `progress` through document lifecycle helpers. It releases the processing lock when the run finishes or fails.

The ingestion runner reads the private Blob, verifies SHA-256, extracts page text, normalizes it, creates parent/child chunks, embeds child chunks, and marks the document ready after successful persistence.

## Retrieval Contract

```mermaid
flowchart TD
  A["User question"] --> B["Resolve chat and document scope"]
  B --> C["Contextualize question when needed"]
  C --> D["Dense retrieval over child embeddings"]
  C --> E["Lexical retrieval over child text"]
  D --> F["RRF fusion by child chunk"]
  E --> F
  F --> G["Cohere rerank fused child candidates"]
  G --> H["Load parent chunks for best child matches"]
  H --> I["Apply parent evidence token budget"]
  I --> J["Grounded answer generation"]
```

Retrieval filters by workspace, selected document IDs, chunk kind, and strategy version.

## Strategy

`page-parent-child-v1` uses:

- parent target `1600`, max `2200`;
- child target `600`, max `750`, overlap `80`;
- dense top `20`, lexical top `20`, fused top `24`, rerank top `8`;
- evidence budget `8000` tokens;
- Cohere `embed-v4.0` with 1024 dimensions;
- Cohere `rerank-v4.0-pro`;
- OpenAI `generation` model for final answers and `auxiliary` model for contextualization and titles.
