# Auth, Session, And Workspace

The shared test account is an access gate. Workspaces isolate evaluator data when multiple browsers log in with the same credentials.

Authentication and workspace identity are separate concepts. An auth session proves the browser is logged in. A workspace identifier defines the persistent browser/tester data scope and can survive logout or session expiry.

## Responsibilities

- `lib/auth/` owns password verification, session creation, cookie handling, and route guards.
- `models/account.ts` and `models/session.ts` define the persisted auth shapes.
- API routes must validate the authenticated session server-side before reading or mutating workspace data.

## Auth Cookie

The auth cookie is:

```text
docchat_auth=<raw random session token>
```

The token is an opaque high-entropy bearer credential. The raw token is never stored in MongoDB; only `SHA-256(raw token)` is stored as `sessions.tokenHash`.

On each authenticated request:

```text
docchat_auth cookie
  SHA-256(raw token)
  lookup sessions.tokenHash
  require non-expired session
```

The auth token does not need a separate signature because it contains no trusted payload.

## Workspace Cookie

The workspace cookie is:

```text
docchat_workspace=workspaceId.signature
```

The workspace ID is not an authentication credential, but it must be tamper-resistant. The signature is `HMAC-SHA256(SESSION_SECRET, workspaceId)`.

## Secret Usage

```text
Password -> Argon2id -> accounts.passwordHash
Auth token -> SHA-256 -> sessions.tokenHash
Workspace ID -> HMAC-SHA256 with SESSION_SECRET -> signed workspace cookie
```

`SESSION_SECRET` signs workspace identifiers. It is not used for password hashing or session-token hashing.

## Login And Logout

First login on a browser creates a new workspace ID, creates a new session, and sets both cookies.

Returning login reuses a valid signed workspace cookie, creates a fresh auth session, and restores access to the existing workspace data.

Logout revokes the current session and clears `docchat_auth`, but keeps `docchat_workspace`.

Session expiry removes authentication only. It does not delete chats, messages, documents, chunks, or workspace identity.
