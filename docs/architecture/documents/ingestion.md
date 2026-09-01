# Document Ingestion

Document ingestion turns a verified private Blob PDF into searchable MongoDB chunks.

## Entry Points

| Entry | Purpose |
| --- | --- |
| Blob completion callback | Starts ingestion after direct upload succeeds. |
| `POST /api/documents/{documentId}/process` | Retries or resumes processing for uploaded documents. |

## Durable Stages

| Stage | Work |
| --- | --- |
| `reading` | Read Blob bytes, verify hash, extract text, normalize pages, create chunks. |
| `embedding` | Embed child chunks with Cohere `search_document`. |
| `indexing` | Finalize indexed data and mark the document ready. |

Reading preserves citation-critical structure: page numbers, line breaks, paragraph gaps, probable headings, and clear failure for unsupported native-text extraction.

## Flow

```mermaid
flowchart TD
  A["Blob completion or process retry"] --> B["Acquire document processing lock"]
  B --> C["reading: download private Blob bytes into a buffer"]
  C --> D["Verify backend SHA-256 against Document.contentHash"]
  D --> E{"Hash matches"}
  E -->|No| F["Delete untrusted Blob and document record"]
  E -->|Yes| G["Extract native PDF text by page"]
  G --> H{"Usable text"}
  H -->|No| I["Mark failed: unsupported native-text PDF"]
  H -->|Yes| J["Prepare page text"]
  J --> J1["Preserve line breaks from PDF text items"]
  J --> J2["Use vertical gaps for paragraph breaks"]
  J --> J3["Use font-size hints for probable headings"]
  J1 --> K["Create parent chunks across page boundaries"]
  J2 --> K
  J3 --> K
  K --> L["Create overlapping child chunks inside parents"]
  L --> M["Persist parent and child chunks"]
  M --> N["embedding: embed child chunks with Cohere"]
  N --> O["Store child embeddings"]
  O --> P["indexing: rely on Atlas vector and text indexes"]
  P --> Q["Mark document ready"]
```

## Indexing Surface

| Index | Use |
| --- | --- |
| Atlas Vector Search | Dense retrieval over child embeddings filtered by document, kind, and strategy. |
| Atlas Search | Lexical retrieval over child text with standard, French, and Arabic analyzers. |

## Rules

- Scanned or unsupported PDFs fail clearly.
- Hash mismatch deletes the uploaded Blob and document record.
- Cancellation is checked between durable stages.
- Retry resumes from the stored durable stage.
- Parent chunks provide answer context; child chunks drive retrieval.
