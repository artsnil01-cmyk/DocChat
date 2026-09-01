# Milestone 007: Evaluation And Tests

## Goal

Lock the current behavior with focused unit tests and a small manual RAG evaluation set.

## Steps

- [x] Add Vitest unit test runner.
- [x] Test chat answering policy.
- [x] Test prompt construction.
- [x] Test page-aware chunking and overlap.
- [x] Test candidate fusion.
- [x] Test document next-action policy.
- [x] Add French manual evaluation questions.
- [x] Add Arabic manual evaluation questions.
- [x] Record DocChat answers and verdicts in the evaluation tables.

## Validation

- [x] `npm test`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] Manual evaluation tables are filled after running the sample PDFs through the app.
