# DocChat PRD Addendum — Data Model, Workspace/Auth, Document Scope & Retrieval Context

**Purpose:** This document contains only the project decisions, rules, and flows defined after the original DocChat PRD.  
**Scope:** Authentication/session handling, workspace identity, MongoDB collections, document ownership and deduplication, chat/document scope, deletion, conversational retrieval context, and ingestion concurrency.  
**Status:** Implementation decisions to carry forward.

---

# 1. Updated Core Data Model

Use **six MongoDB collections**:

```text
accounts
sessions
documents
chunks
chats
messages
```

There is **no `workspaces` collection**.

Conceptually:

```text
Account
└── Auth Sessions

Persistent Workspace Identity
├── Documents
│   └── Chunks
└── Chats
    └── Messages
```

The workspace is a persistent isolation identifier, not a MongoDB document of its own.

---

# 2. Authentication and Workspace Are Separate Concepts

Authentication lifecycle and workspace lifecycle must not be coupled.

An authentication session proves that the browser is logged in. It is temporary and may expire.

The workspace identifies the persistent browser/tester data scope. It survives authentication expiry, logout, and creation of a new auth session.

This ensures that a tester can sign out or return later without losing chats and documents associated with that browser workspace.

---

# 3. Authentication Cookie

Use an opaque cryptographically random session token.

Example generation:

```ts
crypto.randomBytes(32).toString("base64url")
```

The browser receives:

```text
docchat_auth=<raw random session token>
```

Recommended properties:

```text
HttpOnly
Secure in production
SameSite=Lax
persistent expiry
```

The raw token is never stored in MongoDB.

Store only:

```text
SHA-256(raw session token)
```

as `sessions.tokenHash`.

Authentication on each request:

```text
docchat_auth cookie
        ↓
SHA-256(raw token)
        ↓
lookup sessions.tokenHash
        ↓
matching non-expired session
        ↓
authenticated request
```

The auth token does **not** need a separate signature because it contains no trusted payload. It is only a high-entropy bearer credential.

---

# 4. Workspace Cookie

Use a second persistent cookie:

```text
docchat_workspace
```

The workspace identifier is not an authentication credential, but it must be tamper-resistant.

Conceptually:

```text
workspaceId.signature
```

where:

```text
signature = HMAC-SHA256(SESSION_SECRET, workspaceId)
```

`SESSION_SECRET` is used for signing and verifying workspace identifiers.

It is **not** used for password hashing or session-token hashing.

Mechanisms remain separate:

```text
Password
→ Argon2id
→ accounts.passwordHash

Auth token
→ SHA-256
→ sessions.tokenHash

Workspace ID
→ HMAC-SHA256 with SESSION_SECRET
→ signed workspace cookie
```

---

# 5. Login / Logout Lifecycle

## First login on a browser

```text
Valid email + password
        ↓
No valid workspace cookie
        ↓
Generate new workspaceId
        ↓
Generate new random auth token
        ↓
Create Session record
        ↓
Set:
- docchat_auth
- docchat_workspace
```

## Returning login

```text
Valid email + password
        ↓
Valid signed workspace cookie exists
        ↓
Reuse workspaceId
        ↓
Generate a fresh auth token
        ↓
Create a new Session record
        ↓
Previous workspace data becomes available again
```

## Logout

```text
Delete/revoke current Session
Clear docchat_auth
KEEP docchat_workspace
```

Logout removes authentication without destroying workspace identity.

---

# 6. Session Expiration

Authentication sessions should expire, with a generous persistent lifetime rather than a short browser-only session.

The `sessions` collection contains `expiresAt`.

Create a MongoDB TTL index on `expiresAt` so expired auth-session records are automatically removed.

Session expiration does **not** delete chats, messages, documents, chunks, or workspace identity.

---

# 7. Collection Schemas

## 7.1 `accounts`

```ts
type Account = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
};
```

Rules:

- normalize email to lowercase before storage;
- store only an Argon2id password hash;
- `email` is unique.

Index:

```text
email UNIQUE
```

## 7.2 `sessions`

```ts
type Session = {
  _id: ObjectId;
  accountId: ObjectId;
  workspaceId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};
```

Rules:

- one login creates one auth Session;
- several auth sessions may point to the same workspace;
- raw session tokens never enter MongoDB.

Indexes:

```text
tokenHash UNIQUE
expiresAt TTL
```

## 7.3 `documents`

```ts
type Document = {
  _id: ObjectId;
  workspaceId: string;

  name: string;
  contentHash: string;

  blobPathname?: string;

  sizeBytes: number;
  pageCount?: number;

  status:
    | "pending_upload"
    | "processing"
    | "ready"
    | "failed";

  stage?:
    | "reading"
    | "preparing"
    | "indexing";

  progress?: number;

  error?: {
    code: string;
    message: string;
  };

  createdAt: Date;
  updatedAt: Date;
};
```

`Document` is stored at the workspace boundary so an already-ingested PDF can be reused across chats in the same workspace.

Documents are exposed to the user through chats; the application does not need a global workspace-level document library UI.

Critical unique index:

```text
UNIQUE(workspaceId, contentHash)
```

## 7.4 `chunks`

```ts
type Chunk = {
  _id: ObjectId;
  documentId: ObjectId;

  strategyVersion: string;
  kind: "parent" | "child";

  text: string;
  tokenCount: number;

  parentId?: ObjectId;
  sectionPath?: string[];

  pageStart: number;
  pageEnd: number;

  startOffset?: number;
  endOffset?: number;

  language: "fr" | "ar" | "mixed";

  embedding?: number[];
};
```

Rules:

- child chunks are the primary vector/lexical retrieval units;
- parent chunks provide expanded context;
- embeddings normally belong to child chunks;
- chunks do not duplicate `workspaceId`; ownership is resolved through `documentId`.

Indexes:

```text
documentId
documentId + strategyVersion + kind
```

Atlas retrieval indexes remain responsible for vector search over `embedding`, lexical search over `text`, filterable `documentId`, and strategy/kind filtering.

## 7.5 `chats`

```ts
type Chat = {
  _id: ObjectId;
  workspaceId: string;
  title: string;
  documentIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};
```

`documentIds` means all documents associated with this chat. It does **not** mean documents used by the most recent query.

Index:

```text
workspaceId + updatedAt DESC
```

## 7.6 `messages`

```ts
type Message = {
  _id: ObjectId;
  chatId: ObjectId;

  role: "user" | "assistant";
  content: string;

  status:
    | "streaming"
    | "completed"
    | "failed";

  sources?: {
    chunkId: ObjectId;
    relevanceScore: number;
  }[];

  createdAt: Date;
};
```

Rules:

- messages are stored separately from chats;
- source metadata stays minimal;
- do not duplicate filename, page, document ID, or excerpt when those can be resolved through the referenced chunk/document.

Index:

```text
chatId + createdAt
```

---

# 8. Chat-Level Document UX

Documents behave as **chat-level attachments from the user's perspective**.

Example:

```text
Chat A
├── contract.pdf
└── policy.pdf

Chat B
└── handbook.pdf
```

Internally, the document record remains workspace-scoped so the same physical PDF can be reused without re-ingestion.

Therefore:

```text
storage / deduplication boundary
= workspace

user-visible attachment boundary
= chat
```

This gives chat-scoped document behavior without paying the ingestion cost twice.

---

# 9. Persistent Chat Scope vs Query-Specific Scope

`Chat.documentIds` is the persistent/default document scope of the conversation.

Example:

```ts
Chat.documentIds = [doc1, doc2, doc3]
```

A single question may intentionally target only one document.

Request:

```json
{
  "chatId": "...",
  "question": "What are the cancellation requirements?",
  "documentIds": ["doc1"]
}
```

Behavior:

```text
request.documentIds supplied
        ↓
validate every document belongs to:
- current workspace
- current chat
        ↓
retrieve only from supplied documents
```

The stored chat remains:

```ts
Chat.documentIds = [doc1, doc2, doc3]
```

It must **not** be overwritten by a per-query selection.

If the request omits `documentIds`, fall back to `Chat.documentIds`.

So:

```text
Chat.documentIds
= persistent/default chat scope

POST /api/chat.documentIds
= optional per-question retrieval restriction
```

---

# 10. Document Removal and Garbage Collection

Removing a document from a chat removes only the reference from that chat first.

Example:

```text
Chat A → doc1, doc2
Chat B → doc2
```

Remove `doc2` from Chat A:

```text
Chat A → doc1
Chat B → doc2
```

No underlying document data is deleted because another chat still references it.

Implementation:

```ts
$pull: {
  documentIds: documentId
}
```

After removing the reference, check whether any chat in the same workspace still contains that `documentId`.

If references remain:

```text
keep Document
keep Chunks
keep Blob
```

If reference count becomes zero:

```text
delete chunks for document
delete Blob object
delete Document record
```

The application therefore garbage-collects a document when it is no longer attached to any chat in its workspace.

---

# 11. Client-Side Duplicate Detection Before Upload

Before requesting upload authorization, the browser calculates:

```text
SHA-256(raw PDF bytes)
```

The hash is independent of filename.

The browser sends an upload preflight request containing:

```json
{
  "chatId": "...",
  "name": "contract.pdf",
  "sizeBytes": 1234567,
  "contentHash": "..."
}
```

The backend checks:

```text
workspaceId + contentHash
```

before allowing Blob upload.

---

# 12. Reusing an Existing Document

If the document already exists in the same workspace:

```text
existing Document found
        ↓
do NOT upload to Blob
do NOT parse again
do NOT re-chunk
do NOT call embeddings again
        ↓
reuse existing documentId
        ↓
add documentId to current chat with $addToSet
```

Frontend feedback:

```text
Document recognized
contract.pdf was added to this chat.
```

The same document may therefore be attached to multiple chats while being stored and indexed once inside the workspace.

---

# 13. Duplicate Detection Is Workspace-Local

Deduplication must **not** cross workspace boundaries.

If Workspace A and Workspace B upload byte-identical PDFs, allow both independently.

The uniqueness rule is:

```text
UNIQUE(workspaceId, contentHash)
```

not:

```text
UNIQUE(contentHash)
```

This preserves isolation and avoids cross-user ownership/privacy complexity.

---

# 14. Frontend Hash vs Backend Hash

The browser-generated SHA-256 is an optimization, not the final trust boundary.

## Frontend hash

Used for pre-upload duplicate detection, potentially avoiding:

- Blob upload;
- PDF parsing;
- embeddings;
- duplicate chunks.

## Backend hash

During ingestion, while the backend already reads the uploaded PDF bytes, calculate SHA-256 again.

The backend-generated value is authoritative.

Validate:

```text
backendHash === declared frontendHash
```

No separate second file pass is required.

---

# 15. Late Duplicate Discovery

Normally duplicates are caught before Blob upload.

The backend must still handle malicious/incorrect client hashes, concurrent uploads, and race conditions.

If backend verification discovers that the uploaded PDF already exists in the same workspace:

```text
resolve canonical existing Document
        ↓
remove/discard newly created duplicate Blob
        ↓
remove/discard duplicate pending Document
        ↓
reuse canonical documentId
        ↓
attach canonical document to current chat
```

Frontend should replace any temporary/new document reference with the canonical existing document.

The unique Mongo index on:

```text
(workspaceId, contentHash)
```

is the final concurrency safety mechanism.

---

# 16. Same Filename, Different Content

Filename equality does not imply document equality.

If `contract.pdf` already exists but a new upload has the same filename and a different SHA-256, treat it as a different document.

Generate a unique display name:

```text
contract.pdf
contract (2).pdf
contract (3).pdf
```

The display name and Blob object name are independent.

Use a stable internal Blob path such as:

```text
documents/{documentId}/original.pdf
```

Changing `Document.name` must not require renaming/copying the Blob object.

---

# 17. Raw-Byte Deduplication Only

SHA-256 deduplication detects byte-identical files.

It does not attempt to detect semantically identical PDFs.

Saving the same visible PDF through another editor may alter internal metadata and produce different bytes. That is acceptable.

Do not introduce semantic-document deduplication.

---

# 18. Conversational Retrieval Context

A follow-up question may depend on earlier turns.

Example:

```text
Q1: What is the cancellation period?
A1: The cancellation period is 30 days.

Q2: And who must receive the notice?
```

Embedding only the follow-up can lose necessary context.

Therefore add a retrieval-question contextualization step before retrieval.

---

# 19. Query Contextualizer

Input:

```text
bounded recent conversation history
+
current user question
```

The contextualizer decides whether the question requires rewriting.

Conceptual structured result:

```ts
{
  needsRewrite: boolean;
  retrievalQuery: string;
}
```

Standalone questions may remain unchanged.

Dependent follow-ups are rewritten into standalone retrieval queries.

Do **not** rewrite every question automatically.

The contextualizer decides whether rewriting is required.

---

# 20. Retrieval vs Final Generation Inputs

The contextualized `retrievalQuery` is an internal retrieval artifact.

Use it for:

```text
Cohere query embedding
+
Mongo lexical search
```

Then continue through hybrid retrieval, reranking, and context expansion.

The final answer generator receives:

```text
original user question
+
bounded recent conversation history
+
retrieved evidence
```

Do not replace the original user question with the rewritten retrieval query in the final conversation.

---

# 21. Conversation History Window

Do not send the entire historical chat transcript on every generation.

Initial rule:

```text
last 2 complete user/assistant turns
+
current question
```

Equivalent maximum shape:

```text
User Q[n-2]
Assistant A[n-2]

User Q[n-1]
Assistant A[n-1]

Current User Q[n]
```

Also apply a token ceiling.

Initial suggested maximum:

```text
~1,000–1,500 tokens for previous conversation context
```

So:

```text
take up to 2 complete previous turns
while respecting the history token budget
```

This bounded history is used by both the contextualizer and final answer generation.

---

# 22. Ingestion Concurrency

MongoDB and Vercel Blob can safely handle concurrent operations, but neither executes the complete ingestion pipeline automatically.

The application backend remains responsible for:

```text
read PDF
↓
extract text
↓
chunk
↓
call embeddings
↓
write chunks
↓
mark document ready
```

Multiple documents may be processed independently.

The frontend may request multiple independent Blob upload authorizations and upload multiple PDFs concurrently.

---

# 23. No Processing Jobs Collection Initially

Do not create a dedicated `processing_jobs` or `upload_jobs` collection at this stage.

The document record itself tracks the initial lifecycle:

```text
status
stage
progress
error
```

A jobs collection should be introduced only if the eventual execution architecture requires durable queue bookkeeping such as retries, claims, leases, next-attempt times, dead-letter state, or queue-message IDs.

Do not add this complexity before there is a concrete runtime need.

---

# 24. Locked Implementation Rules

1. No separate `workspaces` collection.
2. Authentication sessions and persistent workspace identity are distinct.
3. Domain data uses `workspaceId`, not auth `sessionId`, as its isolation key.
4. Documents are stored/deduplicated at workspace scope but exposed as chat attachments.
5. A document is ingested once per workspace and may be referenced by multiple chats.
6. `Chat.documentIds` is persistent chat scope; request `documentIds` is a query-specific override.
7. Per-query document selection never mutates the chat's persistent document list.
8. Removing the final chat reference to a document garbage-collects its chunks, Blob, and document record.
9. Raw-byte SHA-256 is used for duplicate detection.
10. Browser hashing is a preflight optimization; backend hashing is authoritative verification.
11. Deduplication never crosses workspace boundaries.
12. Conversation-dependent queries are contextualized before embedding/retrieval.
13. The final LLM still receives the original user question.
14. Conversation context is bounded to the most recent two complete turns plus a token limit.
15. Do not introduce a jobs collection unless durable ingestion orchestration actually requires one.
