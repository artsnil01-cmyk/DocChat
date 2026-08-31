# System Overview

DocChat is a Next.js application deployed on Vercel. It provides authenticated access to a workspace-scoped RAG experience for native-text French and Arabic PDF documents.

## Responsibilities

- Next.js handles UI routes, API routes, answer responses, and deployment runtime.
- MongoDB Atlas stores accounts, sessions, documents, chunks, chats, messages, and search indexes.
- Vercel Blob stores original private PDF files.
- Cohere provides multilingual embeddings and reranking.
- OpenAI provides grounded answer generation.

## Boundaries

- Frontend code must not access provider secrets.
- API routes must delegate business logic to `lib/`.
- RAG pipeline steps are backend-owned and are not exposed as separate public parse/chunk/embed endpoints.
