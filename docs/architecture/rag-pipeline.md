# RAG Pipeline

The initial production path is `parent-child-v1`. It extracts native PDF text, preserves page provenance, chunks text into parent and child chunks, embeds child chunks, retrieves evidence, expands context, and generates a grounded answer.

## Responsibilities

- `lib/rag/extraction/` owns PDF text extraction and page provenance.
- `lib/rag/chunking/` owns strategy-versioned chunking.
- `lib/rag/embeddings/` owns Cohere embedding calls.
- `lib/rag/context/` owns parent and neighbor context expansion.
- `lib/rag/generation/` owns grounded OpenAI prompt construction and streaming generation.
