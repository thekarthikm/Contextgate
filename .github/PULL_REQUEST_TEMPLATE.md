<!--
Thanks for contributing to ContextGate.

If you have found a way to get executive data into an unauthorized user's model
context, please STOP and report it privately instead:
https://github.com/thekarthikm/Contextgate/security/advisories/new
-->

## What this changes

<!-- One or two sentences. -->

## Why

<!-- The diff shows what. Explain why it is correct, or why it is worth doing. -->

## Type of change

- [ ] Bug fix
- [ ] New attack for the Attack Lab
- [ ] Test / verification improvement
- [ ] UI or accessibility improvement
- [ ] Documentation
- [ ] Corpus change
- [ ] Refactor / chore

---

## Security checklist

ContextGate exists to demonstrate one property:
`LLM_CONTEXT ⊆ DATA_AUTHORIZED_FOR_CURRENT_USER`.
Please confirm this change does not weaken it. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the reasoning behind each item.

- [ ] Sensitive data (corpus, identities, canaries) stays under `src/server/`, and no client
      component imports `@/server/*`
- [ ] Authorization still happens **before** retrieval — no search-then-filter anywhere on the
      real path
- [ ] `buildContext()` still **aborts** on an unauthorized chunk rather than dropping it
- [ ] The model still has no tools and cannot widen its own retrieval scope
- [ ] `/api/query` still does not import `src/server/demo-insecure/`
- [ ] No new authorization-bearing field is read from the request body
- [ ] Denials still disclose nothing — no document names, classifications or "access denied"
- [ ] No security test was weakened, skipped or deleted to make this pass
- [ ] No new runtime dependency (or: justified below, pinned exactly, published >7 days ago)

## Verification

- [ ] `npm run verify` passes (typecheck + build + 60 tests)
- [ ] `node scripts/demo-story.mjs` passes against a running dev server — **required** if this
      touches the pipeline, the API, the retriever or the corpus
- [ ] New behaviour is covered by a test that asserts on `modelContext` (model **input**), not
      just on `answer`

## Browser check

<!-- Delete if this is a docs-only change. -->

- [ ] Verified at 1440px (desktop)
- [ ] Verified at 390px (mobile) — no horizontal overflow, no clipped text
- [ ] No dead controls introduced

## Notes for the reviewer

<!--
Anything that would be hard to spot from the diff. If you weakened or changed an
existing assertion, explain here why the old one was too strict or how the new one
is stronger.
-->
