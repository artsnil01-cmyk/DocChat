# DocChat — Product Requirements & Architecture Specification

**Project:** SMARTLY.AI Technical Test — Senior Full Stack Engineer, AI / LLM  
**Application:** DocChat  
**Target deployment:** Vercel  
**Primary stack:** TypeScript, Node.js, Next.js  
**Status:** Architecture and implementation plan agreed  
**Scope policy:** Items described as “bonus” in the original specification are treated as required scope for this implementation.

---

## 1. Purpose

DocChat is a full-stack Retrieval-Augmented Generation application that allows a user to upload one or more native-text PDF documents and ask natural-language questions about their contents.

The system must:

- ingest PDF documents;
- preserve source/page provenance;
- chunk and embed their content;
- retrieve relevant passages using hybrid search;
- rerank retrieved candidates;
- generate an answer using only evidence from the selected documents;
- stream the answer to the frontend;
- show the evidence used;
- support French and Arabic;
- support multiple documents and multiple chat sessions;
- remain deployable and usable on Vercel without local installation.

The implementation is intended to be clean, production-oriented, observable, testable, and well documented rather than a minimal proof of concept.

---

## 2. Core Functional Requirements

### 2.1 Authentication

The deployed application is publicly reachable but must not expose paid API-backed functionality to arbitrary internet users.

The application therefore uses one shared test account.

Requirements:

- one account is seeded during setup;
- password is never stored in plaintext;
- password is hashed using a strong password hashing algorithm such as Argon2id;
- credentials are supplied through environment variables during seeding;
- multiple concurrent logins are allowed;
- each successful login creates an independent authenticated session;
- sessions are represented through secure, `HttpOnly` cookies;
- backend routes validate authentication, not only frontend pages.

The shared account exists only as an access gate. User data isolation is handled by workspaces.

---

## 3. Workspace Model

Because multiple evaluators may use the same shared account concurrently, documents and chats must not be scoped directly to the shared account.

Each authenticated browser/tester is associated with a persistent workspace.

Conceptually:

```text
Account
  └── Auth Session
      └── Workspace
          ├── Documents
          └── Chat Sessions
              └── Messages
```

The server-side session stores:

```ts
{
  accountId: string;
  workspaceId: string;
}
```

The browser does not need direct access to the workspace identifier.

### Workspace behavior

- a browser/tester sees only documents belonging to its workspace;
- chat sessions belong to the workspace;
- the same shared account can be used simultaneously from multiple browsers;
- each browser receives its own authenticated session;
- deleting browser cookies/site data may sever the browser from its prior workspace; this is acceptable for the test scope;
- cross-device workspace recovery is not required.

---

## 4. Document Experience

### 4.1 Upload

The user uploads native-text PDF files.

Constraints:

- PDF only;
- maximum approximately 10 MB;
- maximum approximately 50 pages;
- invalid file type and oversize uploads must be rejected;
- upload and processing state must be visible in the UI.

The main upload endpoint remains:

```http
POST /api/upload
```

However, it does not carry the PDF bytes through the Vercel Function.

Instead it:

1. authenticates the current session;
2. validates upload intent and metadata;
3. creates a pending document record;
4. authorizes a direct client upload to private Vercel Blob storage.

The browser then uploads the file directly to Vercel Blob using a short-lived scoped authorization flow.

This avoids Vercel Function request-body limits while keeping storage credentials private.

### 4.2 Blob storage

Original PDFs are retained in private object storage for:

- traceability;
- reprocessing;
- debugging;
- future re-indexing;
- source preservation.

Chosen storage:

**Vercel Blob**

Rationale:

- native Vercel integration;
- suitable free-tier capacity for the expected test workload;
- direct client upload support;
- avoids routing large PDF bodies through the application function;
- reduces infrastructure fragmentation.

The application uses:

```env
BLOB_READ_WRITE_TOKEN=
```

locally and in deployment.

The token is server-side only.

### 4.3 Upload completion and ingestion handoff

After the direct Blob upload completes, the backend must verify the completed object and transition the corresponding document into the ingestion lifecycle.

The frontend does not orchestrate the internal ingestion stages.

Conceptually:

```text
Browser
  │
  ├── POST /api/upload
  │       ├── create pending document
  │       └── authorize Blob upload
  │
  └──────────────► Vercel Blob
                       │
                       │ upload completed
                       ▼
                 backend completion handler
                       │
                       ▼
                 document queued
                       │
                       ▼
                 ingestion pipeline
```

The exact asynchronous execution mechanism used for post-upload ingestion is an implementation decision to finalize with Vercel runtime constraints in mind.

---

## 5. Document Processing Status

The frontend must display progress without exposing unnecessary backend implementation details.

Public processing states should remain coarse and stable.

Recommended public state model:

```ts
type DocumentStatus =
  | "pending"
  | "uploaded"
  | "processing"
  | "indexing"
  | "ready"
  | "failed";
```

Internal pipeline states may be more detailed, but should map to this public model.

Status endpoint:

```http
GET /api/documents/:id/status
```

The frontend polls this endpoint while a document is processing.

Polling is preferred over SSE/WebSockets because:

- the number of state transitions is small;
- polling requests are short-lived;
- it is naturally compatible with serverless execution;
- it avoids maintaining long-lived connections unnecessarily.

The polling loop stops when the document reaches:

- `ready`, or
- `failed`.

---

## 6. Document Deletion and Lifecycle

Users can remove documents from their workspace.

Deleting a document must remove or invalidate:

- document metadata;
- parent chunks;
- child chunks;
- embeddings/search-indexed records;
- Blob object;
- chat/document associations where appropriate.

The implementation should avoid orphaned blobs or orphaned chunks.

Failed or abandoned uploads should be handled safely and be eligible for cleanup.

---

# 7. RAG Architecture

## 7.1 High-level pipeline

```text
PDF
 ↓
page/layout-aware extraction
 ↓
text normalization
 ↓
parent/child chunking
 ↓
Cohere embeddings
 ↓
MongoDB Atlas
 ├── vector index
 └── lexical search index
 ↓
user query
 ↓
dense retrieval + lexical retrieval
 ↓
candidate fusion
 ↓
Cohere reranking
 ↓
parent / neighbor context expansion
 ↓
context budget enforcement
 ↓
OpenAI grounded generation
 ↓
streamed answer + sources
```

---

## 7.2 PDF extraction

The input scope is native-text PDFs, so OCR/computer vision is not required.

A PDF is not equivalent to HTML and cannot be assumed to expose a reliable semantic tree. However, native-text PDFs frequently expose text objects with layout-related information such as:

- page number;
- coordinates;
- text position;
- font size;
- font name/style;
- line placement;
- text blocks.

The parser should preserve this information where available.

This supports later structure inference such as:

- probable headings;
- paragraph boundaries;
- list items;
- indentation changes;
- vertical whitespace;
- section boundaries;
- page provenance.

If layout information is unreliable, the system falls back to page-aware text chunking.

Page provenance must be preserved from extraction onward.

---

# 8. Chunking Strategy

Two chunking strategies are planned.

The active strategy is selected by environment configuration:

```env
RAG_STRATEGY_VERSION=parent-child-v1
```

Each strategy version defines its own immutable parameters in code.

The persisted chunks store only the strategy version required to identify how they were produced.

---

## 8.1 Phase 1 — Parent/Child Chunking

Initial production strategy:

**`parent-child-v1`**

Characteristics:

- token-aware;
- sentence/paragraph boundaries preferred;
- overlapping child chunks;
- larger parent chunks;
- child chunks are embedded and retrieved;
- parents provide broader context after retrieval.

Token count is a budget, not a blind cut point.

Preferred split boundaries, from strongest to weakest:

```text
section boundary
↓
paragraph boundary
↓
list-item boundary
↓
sentence boundary
↓
line boundary
↓
token boundary
```

Illustrative initial parameters:

```text
child target:       ~500–700 tokens
child overlap:      ~10–15%
parent target:      ~1,500–2,000 tokens
parent maximum:     ~2,500 tokens
```

These values are starting hypotheses and must be evaluated rather than treated as universal constants.

### Why overlap remains useful with parent/child retrieval

Overlap improves the probability that evidence spanning a child boundary remains independently retrievable.

Parent expansion solves a different problem: restoring broader context after a relevant child has already been found.

Therefore both mechanisms are retained.

---

## 8.2 Phase 2 — Layout/Structure-Aware Parent/Child Chunking

Second strategy:

**`layout-parent-child-v2`**

This phase builds on the same retrieval pipeline but uses inferred document structure.

Instead of selecting parents purely by fixed token windows, the system attempts to select the nearest meaningful structural ancestor that provides sufficient context without exceeding a configured parent budget.

Example:

```text
Document
└── 2. Contract Conditions
    ├── 2.1 Duration
    ├── 2.2 Cancellation
    │   ├── child A
    │   ├── child B
    │   └── child C
    └── 2.3 Renewal
```

A subsection can be a parent when it is sufficiently self-contained and within the parent token budget.

A very large section is not used as one parent merely because it is structurally higher-level.

Tiny structural sections may be merged with a nearby/enclosing semantic block when needed.

Useful chunk metadata includes:

```json
{
  "sectionPath": [
    "2. Contract Conditions",
    "2.2 Cancellation"
  ],
  "parentId": "...",
  "pageStart": 6,
  "pageEnd": 7
}
```

The Phase 2 strategy is retained only if evaluation shows an improvement over Phase 1.

---

# 9. Chunk Model

The shared chunk model supports both strategies.

```ts
type Chunk = {
  documentId: string;
  strategyVersion: string;

  kind: "parent" | "child";

  text: string;
  tokenCount: number;

  parentId?: string;
  sectionPath?: string[];

  pageStart: number;
  pageEnd: number;

  startOffset?: number;
  endOffset?: number;

  language: "fr" | "ar" | "mixed";

  embedding?: number[];
};
```

Notes:

- embeddings are normally stored only on child chunks;
- parent chunks exist primarily for context expansion;
- `strategyVersion` identifies the exact strategy definition in code;
- no separate `embeddingModel` or `chunkingConfigVersion` field is required because strategy versions are deterministic and traceable in code.

---

# 10. Multilingual Support

Supported languages:

- French;
- Arabic.

English support is not a project requirement.

## 10.1 Dense semantic retrieval

Chosen model:

**Cohere `embed-v4.0`**

Usage:

```text
document chunks → input_type = search_document
user queries    → input_type = search_query
```

The embedding model is multilingual and handles both target languages.

Dense retrieval can also bridge languages semantically where useful.

---

## 10.2 Lexical retrieval

Dense retrieval is complemented by lexical search through MongoDB Atlas Search.

The same chunk text field is indexed using alternate language-specific analyzers:

```text
text
├── French analyzer: lucene.french
└── Arabic analyzer: lucene.arabic
```

The canonical stored chunk remains:

```json
{
  "text": "...",
  "language": "fr"
}
```

No duplicated `text_fr` / `text_ar` storage model is required.

### Index-time behavior

MongoDB Search creates an internal search index.

The analyzer:

- tokenizes text;
- normalizes terms;
- applies language-specific rules;
- applies language-specific stop-word handling;
- applies stemming/term normalization where appropriate.

This internal index is conceptually similar to an inverted index:

```text
term A → chunk 1, chunk 9
term B → chunk 3, chunk 7
```

The application does not manually extract or store keyword-to-chunk mappings.

### Query-time behavior

The user query is sent to the corresponding lexical search path.

French query:

```text
question
 ↓
French analyzer
 ↓
MongoDB lexical search
 ↓
ranked chunk results
```

Arabic query:

```text
question
 ↓
Arabic analyzer
 ↓
MongoDB lexical search
 ↓
ranked chunk results
```

The application does not manually extract “important keywords” before searching.

MongoDB handles query analysis and relevance scoring.

---

## 10.3 Mixed-language documents

Mixed-language documents are supported reasonably without introducing a translation layer.

Chunking behavior:

- if a strong language transition occurs at a natural structural boundary, it becomes a preferred chunk boundary;
- short code-switching inside a coherent paragraph does not force a split;
- chunk metadata may use `language: "mixed"` where appropriate.

Dense retrieval remains reliable for mixed-language content.

Lexical retrieval may use both analyzer paths when query language is ambiguous or mixed.

No document-wide translation is introduced.

---

# 11. Persistence

## 11.1 Database

Chosen database:

**MongoDB Atlas**

MongoDB stores:

- shared account;
- authentication sessions;
- workspaces;
- documents;
- chunk metadata and text;
- embeddings;
- chats;
- messages;
- retrieval-related metadata.

MongoDB Atlas also provides:

- vector search;
- lexical search;
- language-aware analyzers.

This avoids introducing separate PostgreSQL, Elasticsearch, and vector database services.

---

## 11.2 Suggested collections

```text
accounts
sessions
workspaces
documents
chunks
chats
messages
```

Exact collection fields and indexes are implementation-level details, but the ownership hierarchy is:

```text
account
 └── session
      └── workspace
           ├── documents
           └── chats
                └── messages
```

---

# 12. Hybrid Retrieval

Hybrid retrieval is included from the first implementation phase.

The application retrieves candidates through two independent branches.

```text
                    ┌── dense vector search
Question ───────────┤
                    └── lexical search
                             ↓
                      candidate fusion
                             ↓
                         reranking
```

---

## 12.1 Dense branch

```text
question
 ↓
Cohere embed-v4.0
 ↓
query vector
 ↓
MongoDB Atlas Vector Search
 ↓
nearest child chunks
```

Vector search uses cosine similarity.

MongoDB returns the matching chunk documents and their similarity/search metadata, not only raw embedding arrays.

---

## 12.2 Lexical branch

```text
question
 ↓
language-specific MongoDB analyzer
 ↓
MongoDB Search
 ↓
ranked child chunks
```

---

## 12.3 Candidate fusion

Results from both branches are:

- normalized as candidate chunks;
- deduplicated by chunk ID;
- combined into one candidate pool;
- passed to the reranker.

The exact fusion algorithm and score presentation are implementation decisions to finalize during retrieval tuning.

---

# 13. Reranking

Chosen model:

**Cohere `rerank-v4.0-pro`**

The reranker receives:

- the original user query;
- textual candidate passages.

It does not rerank embedding arrays.

Conceptually:

```text
Dense candidates
       +
Lexical candidates
       ↓
candidate texts
       ↓
Cohere rerank-v4.0-pro
       ↓
final ranked evidence
```

The reranker is a second-stage relevance model and is distinct from MongoDB lexical scoring.

---

# 14. Context Expansion

Small child chunks improve retrieval precision but may not contain enough context for generation.

After reranking:

1. take the strongest child chunks;
2. group children by parent;
3. deduplicate overlapping parents;
4. selectively expand to parent and/or neighboring context;
5. enforce a final context budget.

The system must not blindly expand every retrieved child into the maximum-size parent.

Two separate budgets exist:

- per-parent context budget;
- total prompt evidence budget.

Illustrative total evidence target:

```text
~6,000–10,000 tokens
```

The exact budget is tuned against model cost, latency, and evaluation quality.

---

# 15. Generation

Chosen provider:

**OpenAI**

OpenAI is used for final answer generation.

The generator receives:

- the current user question;
- relevant chat history as appropriate;
- only the selected evidence from the active document scope;
- explicit grounding instructions.

The model must:

- answer only from supplied evidence;
- avoid unsupported general knowledge;
- explicitly state when the answer is not present in the selected documents.

Responses are streamed to the frontend token-by-token.

Endpoint:

```http
POST /api/chat
```

Detailed prompt design, generation-state persistence, interruption handling, and failure behavior are finalized during implementation.

---

# 16. Sources

Every answer must expose the supporting evidence used.

Source information should include:

- document name;
- page number or page range;
- truncated chunk text;
- relevance/similarity information.

The exact score surfaced to the UI is finalized during retrieval implementation because the pipeline has several possible scoring layers:

- cosine/vector similarity;
- lexical score;
- fusion score;
- reranker relevance score.

The internal evaluation layer may retain all scores even if the UI presents one simplified relevance measure.

---

# 17. Multi-Document Chat

Multi-document support is required.

A chat has an explicit active document scope.

The user can select documents visually and can also reference documents through an `@document` interaction.

Example:

```text
[@ contract.pdf] [@ policy.pdf]

What are the termination conditions?
```

The `@` mechanism identifies retrieval scope only. It does not introduce separate comparison semantics.

API shape:

```json
{
  "chatId": "...",
  "question": "...",
  "documentIds": [
    "doc_123",
    "doc_456"
  ]
}
```

Retrieval must always filter by:

- current workspace;
- selected document IDs.

---

# 18. Chat UX

The application uses a conventional high-quality chat layout.

Suggested structure:

```text
┌──────────────────────────────────────────────┐
│ Sidebar              │ Current conversation  │
│                      │                       │
│ Chat 1               │ Active documents      │
│ Chat 2               │                       │
│ Chat 3               │ Messages              │
│                      │ Sources               │
│ + New chat           │                       │
└──────────────────────────────────────────────┘
```

Requirements:

- clickable chat history in a left sidebar;
- create new chat;
- switch between chats without losing state;
- visible selected document scope;
- document selector;
- `@document` affordance;
- streamed assistant answers;
- expandable or readable sources;
- clear document-processing state.

Multiple chats may have requests in progress concurrently.

Frontend request state must therefore be scoped by:

- `chatId`;
- individual message/generation identifier.

No global single-request state should cause one chat stream to overwrite another.

---

# 19. Evaluation Framework

Evaluation is separate from normal application persistence.

No evaluation results are stored in MongoDB.

The repository preserves every experiment and its results so earlier runs are never overwritten.

Suggested structure:

```text
evaluation/
├── fixtures/
│   ├── french/
│   └── arabic/
│
├── datasets/
│   ├── french-v1.json
│   └── arabic-v1.json
│
├── experiments/
│   ├── 001-parent-child-hybrid/
│   │   ├── config.json
│   │   ├── retrieval-results.json
│   │   ├── answer-results.json
│   │   └── summary.md
│   │
│   └── 002-layout-parent-child/
│       ├── config.json
│       ├── retrieval-results.json
│       ├── answer-results.json
│       └── summary.md
│
└── scripts/
    ├── evaluate-retrieval.ts
    └── evaluate-answers.ts
```

Each experiment records:

- strategy version;
- chunk parameters;
- retrieval parameters;
- results;
- summary.

Git history provides additional traceability.

---

## 19.1 Evaluation ground truth

Evaluation entries should use stable evidence references instead of chunk IDs because chunk IDs change when chunking strategies change.

Example:

```json
{
  "question": "Quel est le délai de résiliation ?",
  "expectedAnswer": "30 jours",
  "relevantPages": [7],
  "relevantPassages": [
    "Le contrat peut être résilié avec un préavis de trente jours..."
  ]
}
```

---

## 19.2 Retrieval evaluation

Retrieval is measured independently from answer generation.

Useful metrics:

- Recall@K;
- Precision@K;
- MRR;
- optionally nDCG after reranking.

Evaluation should distinguish:

1. hybrid retrieval before reranking;
2. reranked retrieval;
3. Phase 1 chunking;
4. Phase 2 chunking;
5. French performance;
6. Arabic performance.

This allows diagnosis of whether a poor final answer came from:

- retrieval;
- reranking;
- context expansion;
- generation.

---

## 19.3 Answer evaluation

Final generation evaluation should include:

- factual correctness;
- grounding;
- citation correctness;
- completeness;
- refusal behavior when evidence is absent.

The evaluation set must contain both:

- answerable questions;
- deliberately unanswerable questions.

---

# 20. Automated Tests

Evaluation of RAG quality is separate from software testing.

Suggested test structure:

```text
tests/
├── unit/
│   ├── chunking/
│   ├── overlap/
│   ├── structure-detection/
│   ├── result-fusion/
│   ├── prompt-construction/
│   └── auth-session/
│
├── integration/
│   ├── upload-lifecycle/
│   ├── retrieval/
│   └── chat/
│
└── e2e/
    └── upload-chat-stream-sources/
```

Priority tests include:

- token-aware splitting;
- overlap behavior;
- parent/child relationships;
- page provenance;
- hybrid candidate deduplication;
- language routing;
- workspace isolation;
- retrieval filtering by document scope;
- upload lifecycle;
- streamed chat response;
- displayed sources.

---

# 21. API Surface

Minimum required endpoints:

```http
POST /api/upload
GET  /api/documents/:id/status
POST /api/chat
```

Additional endpoints are introduced as required for:

- authentication;
- document listing;
- document deletion;
- chat creation;
- chat listing/history;
- document selection;
- upload completion/orchestration.

The client must never orchestrate private RAG pipeline steps through endpoints such as:

```text
/api/parse
/api/chunk
/api/embed
```

Those operations remain backend-owned internal logic.

---

# 22. Security

Required security principles:

- no provider secret exposed client-side;
- `HttpOnly`, secure authentication/session cookies;
- one session per login;
- password hash only in database;
- test password supplied through environment variables;
- PDF MIME/type validation;
- PDF size enforcement;
- workspace ownership checks on every document/chat operation;
- selected document IDs validated against the current workspace;
- private Blob storage;
- short-lived scoped client-upload authorization;
- server-side verification of upload completion;
- backend-side rate limiting;
- structured input validation;
- environment variables managed through Vercel in production.

Rate-limit values and detailed error contracts are finalized during implementation.

---

# 23. Logging and Observability

Structured logging is required.

The detailed logger implementation is finalized during implementation, but the architecture should support correlation across a full request.

Useful correlation dimensions include:

- request ID;
- workspace ID;
- chat ID;
- document ID;
- ingestion job ID / generation ID;
- duration;
- retrieval candidate counts.

Sensitive document content should not be logged by default.

---

# 24. Environment Configuration

Expected application environment variables:

```env
# Application
SESSION_SECRET=
RAG_STRATEGY_VERSION=parent-child-v1

# Shared account seed
TEST_USER_EMAIL=
TEST_USER_PASSWORD=

# MongoDB Atlas
MONGODB_URI=
MONGODB_DATABASE=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Cohere
COHERE_API_KEY=

# OpenAI
OPENAI_API_KEY=
```

No `APP_URL` is required unless a later feature needs a canonical absolute application URL.

The application does not require broad Vercel account credentials or MongoDB Atlas account credentials.

It only receives resource-level credentials.

---

# 25. Local Development

Local execution should use the same managed external services as production where practical.

Typical flow:

```bash
npm install
npm run setup
npm run dev
```

The setup command should:

1. validate environment variables;
2. test MongoDB connectivity;
3. create/verify required MongoDB indexes;
4. seed the shared account if absent;
5. verify Vercel Blob access;
6. fail clearly when required infrastructure is unavailable.

The application runtime does not automatically provision Vercel or MongoDB infrastructure.

Developers provide resource credentials through `.env.local`.

---

# 26. Bootstrap and Repository Reproducibility

Suggested scripts:

```text
scripts/
├── setup.ts
├── seed.ts
├── create-indexes.ts
└── verify-env.ts
```

Suggested commands:

```bash
npm run setup
npm run db:seed
npm run db:indexes
npm run verify
```

The shared account seed must:

```text
TEST_USER_PASSWORD
      ↓
Argon2id
      ↓
passwordHash
      ↓
MongoDB
```

No plaintext credentials are committed.

---

# 27. Implementation Phases

## Phase 0 — Foundation

Deliver:

- Next.js TypeScript project;
- strict TypeScript configuration;
- environment validation;
- MongoDB connection layer;
- Vercel Blob connection;
- authentication;
- session/workspace model;
- shared-account seed;
- base application shell.

---

## Phase 1 — Documents and Initial RAG

Deliver:

- secure direct PDF upload;
- pending document lifecycle;
- Blob completion handling;
- polling status endpoint;
- page-aware native PDF extraction;
- `parent-child-v1`;
- overlap;
- Cohere embeddings;
- MongoDB vector index;
- MongoDB French/Arabic lexical indexes;
- hybrid retrieval;
- candidate fusion;
- Cohere reranking;
- parent/context expansion;
- OpenAI generation;
- streaming;
- sources;
- first French/Arabic evaluation suite.

This is the first complete production-capable RAG path.

---

## Phase 2 — Chat and Multi-Document UX

Deliver:

- persistent chat sessions;
- left chat sidebar;
- multiple concurrent chats;
- selected document scope;
- document selector;
- `@document` interaction;
- history persistence;
- workspace isolation;
- document deletion;
- source presentation.

---

## Phase 3 — Structure-Aware Retrieval Improvement

Deliver:

- PDF layout metadata extraction;
- heading/paragraph/list inference;
- `layout-parent-child-v2`;
- structural parent selection;
- section path metadata;
- mixed-language-aware boundary preference;
- evaluation against Phase 1;
- retain previous experiment results.

Phase 2 chunking becomes the active strategy only if measured results justify it.

---

## Phase 4 — Quality, Security and Delivery

Deliver:

- unit tests;
- integration tests;
- E2E test;
- rate limiting;
- structured logging;
- final error handling;
- refusal/grounding tuning;
- retrieval-score presentation decision;
- sample PDF;
- final evaluation results;
- README;
- architecture diagram;
- deployment validation;
- clean Git history.

---

# 28. Non-Goals

The following are intentionally outside scope unless later required:

- OCR/scanned PDF support;
- per-person user accounts;
- social login;
- cross-device workspace restoration;
- document translation;
- custom Elasticsearch deployment;
- separate vector database;
- local SQLite persistence in production;
- automatic SaaS infrastructure provisioning;
- comparison-specific chat mode;
- general web knowledge answering.

---

# 29. Final Architecture

```text
                           ┌──────────────────────────────┐
                           │        Next.js / Vercel     │
                           │                              │
                           │  Auth / Sessions / Workspace│
                           │  Upload orchestration       │
                           │  Chat API                   │
                           │  Status polling             │
                           │  Streaming                  │
                           └──────────────┬───────────────┘
                                          │
              ┌───────────────────────────┼────────────────────────────┐
              │                           │                            │
              ▼                           ▼                            ▼
     ┌─────────────────┐        ┌──────────────────┐         ┌─────────────────┐
     │  Vercel Blob    │        │ MongoDB Atlas    │         │     Cohere      │
     │                 │        │                  │         │                 │
     │ private PDFs    │        │ accounts         │         │ embed-v4.0      │
     │ originals       │        │ sessions         │         │ rerank-v4.0-pro │
     └─────────────────┘        │ workspaces       │         └─────────────────┘
                                │ documents        │
                                │ chunks           │
                                │ vector search    │
                                │ lexical search   │
                                │ chats/messages   │
                                └─────────┬────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │     OpenAI       │
                                │                  │
                                │ grounded answer  │
                                │ streaming        │
                                └──────────────────┘
```

---

# 30. Success Criteria

The project is successful when:

- the deployed application is stable and publicly reachable on Vercel;
- unauthorized users cannot consume the application APIs;
- multiple authenticated browsers remain isolated through workspaces;
- PDF uploads up to the required size are supported safely;
- document processing status is visible;
- multiple PDFs are supported;
- French and Arabic retrieval work;
- hybrid lexical+dense retrieval is used;
- Cohere reranking improves final evidence ordering;
- answers are grounded strictly in selected documents;
- unsupported questions are refused;
- responses stream to the frontend;
- sources and page provenance are visible;
- multiple chat sessions and history work correctly;
- earlier RAG experiments remain reproducible and preserved;
- tests cover important software behavior;
- the repository can be run locally with documented environment variables;
- the README clearly explains architecture, trade-offs, chunking, retrieval, setup and evaluation.
