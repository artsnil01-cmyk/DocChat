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
- Rate-limit paid API-backed endpoints.
- Avoid logging sensitive document content by default.
