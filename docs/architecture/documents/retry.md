# Document Retry

Document responses include `nextAction`. The UI chooses the retry button behavior from that value.

| `nextAction` | UI Action | Backend Route |
| --- | --- | --- |
| `upload` | Retry upload. | `POST /api/documents`, then Blob SDK upload if instructed. |
| `process` | Retry processing. | `POST /api/documents/{documentId}/process` |
| `wait` | Show processing state. | Poll `GET /api/documents/{documentId}/status` |
| `none` | No retry action. | None |

## Flow

```mermaid
flowchart TD
  A[Document response] --> B{nextAction}
  B -->|upload| C[Call POST /api/documents]
  C --> D[Upload through Blob SDK]
  B -->|process| E[Call POST /api/documents/{documentId}/process]
  B -->|wait| F[Poll status]
  B -->|none| G[No retry]
```

## Rules

- `pending_upload` retries through the upload preflight route.
- `failed` with Blob data retries through the process route.
- `processing` returns `already_processing` while the active lock is valid.
- `ready` returns `ready`.
