# Working Practices

This document captures my preferred way of working with an engineering agent. It is intentionally project-agnostic and reusable across future projects.

## 1. Think Before Executing

- Do not rush into code when the model, goal, or constraints are still unclear.
- First understand the existing work, the intended outcome, and the source of truth.
- For complex work, explain the direction before implementation.
- If there are multiple valid paths, compare them briefly and choose the cleanest one.

## 2. Respect The Source Of Truth

- When a design, document, data model, or reference file is provided, follow it closely.
- Do not reinterpret or adapt it unnecessarily.
- If something in the reference looks inconsistent, ask or explain the issue before changing direction.
- Avoid inventing new patterns when an established pattern already exists.

## 3. Work In Milestones And Batches

- Split large work into clear phases.
- Split each phase into small batches that can be reviewed independently.
- After each batch, state what changed and what remains.
- Keep milestone documents updated so progress and pending work are visible.

## 4. Keep The Work Clean

- Prefer a clean structural fix over a quick patch.
- Avoid dirty overrides, hidden special cases, duplicated logic, or temporary clutter.
- Clean up leftovers when a direction changes.
- Keep files and folders organized by responsibility.

## 5. Communicate Clearly

- Be direct and concrete.
- Explain what is happening in plain terms.
- Lead with the outcome, then mention the reason.
- Avoid vague reassurance, cheerleading, or unnecessary praise.
- If something is risky or technically weak, say so clearly and explain the better path.

## 6. Preserve The Bigger Picture

- Keep the long-term architecture in mind while implementing the current small step.
- Do not solve today’s issue in a way that blocks tomorrow’s work.
- When a temporary solution is necessary, keep it contained and document why it exists.
- Prefer systems that can grow without needing repeated rewrites.

## 7. Use Evidence, Not Guessing

- Inspect the actual files before judging the situation.
- Verify assumptions with code, docs, tests, or direct checks.
- When diagnosing an issue, separate confirmed facts from likely causes.
- Do not claim something is fixed until the relevant check has been done.

## 8. Keep UI Work Faithful And Controlled

- For UI work, match the provided reference closely.
- Do not mix unrelated old styling with a new source design.
- Avoid cosmetic fixes that create messy CSS.
- If responsive behavior matters, handle desktop and mobile intentionally.

## 9. Validate Proportionally

- Use the right level of validation for the risk of the change.
- Small syntax-only changes may need a syntax/type check.
- Larger behavior changes may need tests, builds, or manual verification.
- If a check cannot be run, state why and what should be run by the user.

## 10. Keep Decisions Reusable

- When a useful working rule emerges, document it.
- Prefer naming, structure, and process that can be reused on future projects.
- Keep documentation brief, direct, and useful for execution.
- Avoid documenting old mistakes unless they matter for current decisions.

