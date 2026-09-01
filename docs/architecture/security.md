# Security

DocChat protects paid provider-backed functionality behind a shared test account and workspace-scoped server-side authorization.

## Requirements

- Hash passwords with Argon2id.
- Store sessions in secure HttpOnly cookies.
- Validate auth in backend routes.
- Never expose provider secrets to the browser.
- Validate PDF MIME type and size.
- Keep Blob objects private.
- Use short-lived scoped upload authorization.
- Verify completed Blob uploads against the declared SHA-256 hash before parsing.
- Scope chat, document, and retrieval operations to the authenticated workspace.
- Keep document processing writes protected by processing-lock tokens.
- Rate-limit paid API-backed endpoints.
- Avoid logging sensitive document content by default.
