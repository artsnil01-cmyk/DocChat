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
- `BLOB_WEBHOOK_PUBLIC_KEY`
- `COHERE_API_KEY`
- `OPENAI_API_KEY`

The runtime does not automatically provision Vercel or MongoDB infrastructure.

## Setup

Run `npm run setup` after environment variables are configured. The setup verifies env values, creates MongoDB indexes, and creates Atlas Search indexes.

For local Blob callback testing, expose the Next.js dev server with a HTTPS tunnel and set `VERCEL_BLOB_CALLBACK_URL` before starting `npm run dev`.
