# Milestone 001: Foundation

## Goal

Implement the application foundation required before document ingestion and RAG.

## Steps

- [x] Validate required environment variables.
- [x] Add non-secret provider model configuration.
- [x] Document the boundary between secrets, model config, and RAG strategy config.
- [x] Add MongoDB index planning document.
- [ ] Add MongoDB connection layer.
- [ ] Add collection helpers for six MongoDB collections.
- [ ] Add base indexes for accounts, sessions, documents, chunks, chats, and messages.
- [ ] Add Vercel Blob access verification.
- [ ] Implement shared account seed with Argon2id.
- [ ] Implement opaque auth-token sessions with SHA-256 token storage.
- [ ] Implement signed persistent workspace cookie.
- [ ] Implement workspace isolation without a `workspaces` collection.
- [ ] Protect backend routes with auth guards.
- [ ] Build login page after design source is provided.
- [ ] Build base authenticated app shell after design source is provided.

## Validation

- [ ] `npm run verify`
- [ ] `npm run setup`
- [ ] Auth/session unit tests pass.
