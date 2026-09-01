# Retrieval And Ranking

Retrieval combines dense vector search and MongoDB Atlas lexical search, then deduplicates and reranks candidates.

## Responsibilities

- Query contextualization rewrites dependent follow-up questions only when the request uses stored `Chat.documentIds`.
- Dense retrieval embeds the contextualized retrieval query with Cohere and searches MongoDB Atlas Vector Search.
- Lexical retrieval uses the contextualized retrieval query with MongoDB Atlas Search and French/Arabic analyzers.
- Candidate fusion uses Reciprocal Rank Fusion and deduplicates child chunks before reranking.
- Cohere reranking receives the retrieval query and fused child candidate texts.
- Parent evidence is loaded after reranking.

Retrieval must always filter by current workspace and resolved document IDs.

## Implementation Boundary

Cohere embeddings and reranking use the official Cohere SDK directly. MongoDB vector search, lexical search, RRF fusion, parent expansion, context budgeting, and workspace filtering stay explicit application code.

## Flow

```mermaid
flowchart TD
  A["User question"] --> A1{"Explicit documentIds?"}
  A1 -->|Yes| A2["Use original question"]
  A1 -->|No| A3["Contextualize with bounded history"]
  A2 --> B["Dense child retrieval"]
  A2 --> C["Lexical child retrieval"]
  A3 --> B
  A3 --> C
  B --> D["RRF child fusion"]
  C --> D
  D --> E["Cohere rerank"]
  E --> F["Select best child per parent"]
  F --> G["Load parent chunks"]
  G --> H["Apply maxEvidenceTokens to parent text"]
```

## Conversational Context

A bounded recent history window is used for both the contextualizer and final answer generation:

```text
last 2 complete user/assistant turns
current question
token ceiling around 1,500 tokens
```

The contextualizer returns:

```ts
{
  needsRewrite: boolean;
  retrievalQuery: string;
}
```

The `retrievalQuery` is internal and is used for embedding, lexical search, and reranking. Final generation still receives the original user question, bounded conversation history, and retrieved parent evidence.

## Scoring

| Score | Use |
| --- | --- |
| Dense score | Diagnostics. |
| Lexical score | Diagnostics. |
| RRF fused score | Candidate merge and diagnostics. |
| Rerank score | Primary evidence ordering signal. |

## Limits

| Step | Limit |
| --- | --- |
| Dense retrieval | `20` results from `100` candidates |
| Lexical retrieval | `20` results |
| RRF fusion | `24` candidates |
| Cohere rerank | `8` children |
| Evidence context | `8000` parent tokens |
