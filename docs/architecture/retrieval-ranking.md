# Retrieval And Ranking

Retrieval combines dense vector search and MongoDB Atlas lexical search, then deduplicates and reranks candidates.

## Responsibilities

- Query contextualization rewrites dependent follow-up questions only when needed.
- Dense retrieval embeds the contextualized retrieval query with Cohere and searches MongoDB Atlas Vector Search.
- Lexical retrieval uses the contextualized retrieval query with MongoDB Atlas Search and French/Arabic analyzers.
- Candidate fusion deduplicates child chunks before reranking.
- Cohere reranking receives the original query and candidate texts.

Retrieval must always filter by current workspace and selected document IDs.

## Conversational Context

A bounded recent history window is used for both the contextualizer and final answer generation:

```text
last 2 complete user/assistant turns
current question
token ceiling around 1,000-1,500 tokens
```

The contextualizer returns:

```ts
{
  needsRewrite: boolean;
  retrievalQuery: string;
}
```

The `retrievalQuery` is internal and is used only for embedding and lexical search. Final generation still receives the original user question, bounded conversation history, and retrieved evidence.
