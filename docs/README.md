# DocChat Setup

## Environment

Create `.env.local` from `.env.example`.

Required keys:

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

## Bootstrap

```bash
npm install
npm run verify
npm run setup
```

`npm run setup` creates database indexes and seeds the shared account.

## Local Blob Callbacks

Vercel Blob callbacks need a public URL. `localhost` is not reachable from the Blob service.

Use ngrok locally:

```bash
ngrok config add-authtoken <token>
ngrok http 3000
```

Copy the HTTPS URL into `.env.local` before starting Next.js:

```env
VERCEL_BLOB_CALLBACK_URL=https://your-ngrok-url.ngrok-free.app
```

Then run:

```bash
npm run dev
```

## Deployment

Do not commit `VERCEL_BLOB_CALLBACK_URL`. It is local-only and should not be pushed as a deployment value.

## Architecture

- `architecture/auth/`: sessions, cookies, workspace identity.
- `architecture/data-model/`: MongoDB model and indexes.
- `architecture/documents/`: upload, retry, processing.
- `architecture/chat/`: chat persistence and streaming.
- `architecture/rag/`: ingestion and retrieval plans.
