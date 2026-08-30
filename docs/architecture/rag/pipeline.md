# RAG Pipeline

The production path is `layout-parent-child-v1`. It extracts native PDF layout, reconstructs reading order, infers structure, chunks text into parent and child chunks, embeds child chunks, retrieves evidence, expands context, and generates a grounded answer.

## Responsibilities

- `config/rag.ts` owns the strategy map, chunk limits, retrieval limits, model references, and progress anchors.
- `lib/rag/ingestion/` owns document ingestion orchestration.
- `lib/rag/extraction/` owns PDF text extraction and page provenance.
- `lib/rag/chunking/` owns strategy-versioned chunking.
- `lib/rag/embeddings/` owns Cohere embedding calls.
- `lib/rag/context/` owns parent and neighbor context expansion.
- `lib/rag/generation/` owns grounded OpenAI prompt construction and streaming generation.

## LangChain Boundary

LangChain may be used for integration plumbing: chunk document shape, Cohere embeddings, Cohere reranking, and small structured-output helpers.

The RAG architecture stays custom. PDF layout extraction, reading order, structure inference, chunking, MongoDB retrieval, RRF, parent expansion, context budgeting, authorization, and final streaming depend on explicit project behavior.

## Ingestion Contract

Blob completion schedules ingestion with Next.js `after()` so the upload callback response stays fast.

`processDocument()` acquires the document processing lock, then calls the RAG ingestion runner with `workspaceId`, `documentId`, and `lockToken`.

The ingestion runner updates `Document.status`, `stage`, and `progress` through document lifecycle helpers. It releases the processing lock when the run finishes or fails.

The first skeleton marks ingestion as failed with `rag_ingestion_not_implemented` until PDF extraction is added.

## Strategy

`layout-parent-child-v1` uses:

- parent target `1600`, max `2200`;
- child target `600`, max `750`, overlap `80`;
- dense top `20`, lexical top `20`, fused top `24`, rerank top `8`;
- evidence budget `8000` tokens;
- Cohere `embed-v4.0` with 1024 dimensions;
- Cohere `rerank-v4.0-pro`;
- OpenAI `generation` model for final answers and `auxiliary` model for contextualization and titles.
