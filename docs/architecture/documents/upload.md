# Document Upload

PDF bytes are uploaded directly from the browser to private Vercel Blob storage. The backend owns authorization, metadata validation, deduplication, and completion verification.

## Routes

| Route | Caller | Purpose |
| --- | --- | --- |
| `POST /api/documents` | Frontend | Upload preflight, document reuse, Blob upload instructions. |
| `POST /api/documents/blob` | Vercel Blob SDK and Blob service | Client upload token generation and upload completion callback. |
| `GET /api/documents` | Frontend | Workspace document library listing. |
| `GET /api/documents/{documentId}/status` | Frontend | Status polling. |
| `DELETE /api/documents/{documentId}?chatId=...` | Frontend | Detach document from a chat. |
| `DELETE /api/documents/{documentId}` | Frontend | Delete document from the workspace library. |

## Flow

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as Next API
  participant Blob as Vercel Blob
  participant Mongo as MongoDB

  UI->>UI: calculate SHA-256(file)
  UI->>API: POST /api/documents
  API->>Mongo: create or reuse workspace document
  API-->>UI: existing document or upload instructions

  UI->>API: Blob SDK calls /api/documents/blob for token
  API->>Mongo: validate workspace, chat, document, pathname
  API-->>UI: short-lived Blob client token

  UI->>Blob: upload PDF directly
  Blob->>API: upload completed callback
  API->>Blob: read metadata and bytes
  API->>API: recalculate SHA-256
  API->>Mongo: mark processing or attach duplicate
```

## Local Callback Testing

Blob callbacks cannot reach `localhost`. For local testing, expose the dev server with a public tunnel and set `VERCEL_BLOB_CALLBACK_URL` before starting Next.js.

```bash
ngrok config add-authtoken <token>
ngrok http 3000
npm run dev
```

`VERCEL_BLOB_CALLBACK_URL` is local-only and should not be pushed as a deployment value.

## Rules

- The browser never sends PDF bytes through the Next.js request body.
- Upload preflight accepts metadata only: `chatId`, `name`, `sizeBytes`, `contentHash`.
- Documents are workspace assets and can exist without a chat reference.
- Existing workspace documents are reused by `(workspaceId, contentHash)`.
- Blob pathnames are stable: `documents/{documentId}/original.pdf`.
- Backend hash verification is authoritative.
- Hash mismatch deletes the uploaded Blob and document record.
- Detaching from a chat does not delete the workspace document.
- Global delete removes the document from all chats, then deletes chunks, Blob, and document record.
