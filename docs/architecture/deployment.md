# Deployment

The target deployment platform is Vercel. Runtime services are externally managed through resource-level credentials.

## Required Environment Variables

- `SESSION_SECRET`
- `RAG_STRATEGY_VERSION`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `MONGODB_URI`
- `MONGODB_DATABASE`
- `BLOB_READ_WRITE_TOKEN`
- `COHERE_API_KEY`
- `OPENAI_API_KEY`

The runtime does not automatically provision Vercel or MongoDB infrastructure.
