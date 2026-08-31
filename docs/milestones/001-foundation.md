# Milestone 001: Backend Foundation

## Goal

Establish server configuration, persistence access, setup scripts, and reusable auth primitives.

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
- [x] Add Vercel Blob access verification.
- [x] Add password hashing helpers.
- [x] Implement shared account seed with Argon2id.
- [x] Implement opaque auth-token helpers.
- [x] Implement auth session persistence with SHA-256 token storage.
- [x] Implement signed persistent workspace cookie.
- [x] Implement auth guard and workspace resolver.
- [x] Wire setup orchestration.

## Validation

- [x] `npm run verify`
- [x] `npm run setup`
- [x] `npm run typecheck`
- [x] `npm run lint`
