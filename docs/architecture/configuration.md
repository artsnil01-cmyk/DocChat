# Configuration

DocChat separates secrets from non-secret application choices.

## Secrets

Secrets belong in environment files such as `.env.local` for local development and Vercel environment variables for deployment.

Examples:

- `SESSION_SECRET`
- `MONGODB_URI`
- `BLOB_READ_WRITE_TOKEN`
- `COHERE_API_KEY`
- `OPENAI_API_KEY`

## Model Configuration

Provider model choices are non-secret defaults and live in `config/ai.ts`.

These values describe which external models the application uses. They do not replace provider credentials.

## RAG Operation Configuration

`RAG_STRATEGY_VERSION` remains an environment variable because it controls which deterministic RAG strategy is active at runtime.

The model config and RAG strategy are complementary: model config selects provider models, while the strategy selects the application pipeline behavior that uses them.
