# Milestone 001: Foundation

## Goal

Implement the application foundation required before document ingestion and RAG.

## Steps

- [x] Validate required environment variables.
- [x] Add script-safe env schema.
- [x] Add server-only env wrapper.
- [x] Add non-secret provider model configuration.
- [x] Document the boundary between secrets, model config, and RAG strategy config.
- [x] Add MongoDB index planning document.
- [x] Add MongoDB connection layer.
- [x] Add collection helpers for six MongoDB collections.
- [x] Add ordinary MongoDB index creation script.
- [x] Add common validation primitives.
- [x] Add auth validation schemas.
- [x] Add document validation schemas.
- [x] Add chat validation schemas.
- [ ] Add Vercel Blob access verification.
- [x] Add password hashing helpers.
- [x] Implement shared account seed with Argon2id.
- [ ] Implement opaque auth-token helpers.
- [ ] Implement auth session persistence with SHA-256 token storage.
- [ ] Implement signed persistent workspace cookie.
- [ ] Implement auth guard and workspace resolver.
- [ ] Build login page after design source is provided.
- [ ] Build base authenticated app shell after design source is provided.

## Validation

- [x] `npm run verify`
- [ ] `npm run setup`
- [ ] Auth/session unit tests pass.
