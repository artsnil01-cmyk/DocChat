# Milestone 004: Structure-Aware Retrieval

## Goal

Evaluate whether layout-aware chunking improves retrieval and answer quality over `parent-child-v1`.

## Steps

- [ ] Extract layout metadata where available.
- [ ] Infer headings, paragraphs, lists, and section boundaries.
- [ ] Implement `layout-parent-child-v2`.
- [ ] Persist section path metadata.
- [ ] Prefer strong mixed-language boundaries.
- [ ] Run retrieval evaluation against Phase 1.
- [ ] Run answer evaluation against Phase 1.
- [ ] Decide whether to promote the strategy.
- [ ] Preserve all experiment outputs.

## Validation

- [ ] Structure-detection unit tests pass.
- [ ] Evaluation summary explains whether Phase 2 improves quality.
