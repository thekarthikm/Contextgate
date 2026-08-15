# Contributing to ContextGate

Thanks for being here. Contributions are genuinely welcome — bug fixes, better copy, extra
attacks, accessibility work, new demo documents, deployment guides, translations.

ContextGate has one unusual constraint that shapes everything below.

## The one rule

This project exists to demonstrate a single security property:

```
LLM_CONTEXT ⊆ DATA_AUTHORIZED_FOR_CURRENT_USER
```

Everything else — the interface, the corpus, the animations, the deterministic model — is
scaffolding around that claim. So:

> **A contribution must not weaken the claim, and must not make the claim harder to verify.**

A change that makes the demo prettier while making the boundary fuzzier is a net negative
here, even if it would be a clear improvement in a normal application. That is not a
judgement about anyone's taste; it is just what this particular repository is for.

If you are unsure whether an idea fits, open an issue before writing code. Getting told
"yes, and here's the shape of it" is faster than a rejected pull request.

---

## Quick start

```bash
git clone https://github.com/thekarthikm/Contextgate.git
cd Contextgate
npm install
npm run dev            # http://localhost:3000
```

Before opening a pull request:

```bash
npm run verify         # typecheck + build + tests — must be green
```

And for anything touching the pipeline, the API or the retriever:

```bash
npm run dev                      # terminal 1
node scripts/demo-story.mjs      # terminal 2 — 93 assertions, must be 0 failed
```

**Requirements:** Node.js ≥ 20.9.

---

## The invariants

These are not style preferences. A pull request that breaks one of them will be declined, and
in most cases CI will catch it before a human does.

### 1. Sensitive data lives under `src/server/` and nowhere else

The corpus, the identity records and the canary tokens live in `src/server/**`, and every
module there begins with `import 'server-only'`. That marker turns an import from a client
component into a build error.

- ❌ Never import `@/server/*` from `src/components/**`.
- ❌ Never inline a canary token or document text into client code, page props, static JSON,
  React state, `localStorage`, or the HTML.
- ✅ Enterprise content reaches the browser only as the body of an authorized API response.

Enforced by `tests/client-bundle.test.ts`, which scans the real production client assets.

### 2. Authorization happens before retrieval

```ts
// ✅ The only acceptable ordering
const permitted = authorizedSearchSpace(identity);
return rankChunks(permitted, query);

// ❌ Never, anywhere on the real path
const all = rankChunks(allChunks(), query);
return all.filter((c) => authorized(identity, c));
```

Filtering after retrieval is the exact failure this project was built to argue against. If
you are optimising the retriever, the candidate set must still be derived from the identity
before any ranking happens.

Related and easy to miss: **statistics count as data.** `rankChunks()` computes IDF over the
candidate set only, not the whole corpus, so relevance scores handed to a low-clearance caller
are never a function of documents that caller cannot read. Keep it that way.

### 3. The context builder aborts; it does not repair

`buildContext()` throws `InvariantViolationError` when an unauthorized chunk reaches it.

Do not "improve" this by dropping the offending chunk and continuing. Silently repairing an
invariant violation hides the retrieval bug that produced it, and converts a loud failure into
a quiet one. Enforced by `tests/context-invariant.test.ts`.

### 4. The model gets no tools

The model receives one completed context payload and returns text. It has no
`searchAllDocuments()`, no `getDocument()`, no `executeSQL()`, no `setClearance()`, no
retrieval of any kind.

If you swap in a real LLM (see below), it must not be given tools that can widen its own
retrieval scope. The moment the model can retrieve, the boundary moves inside the model, and
the demonstration is over.

### 5. `demo-insecure/` stays quarantined

`src/server/demo-insecure/` deliberately implements the forbidden ordering so the comparison
view shows a real leak. It is reachable **only** from `/api/attack/compare`.

- ❌ `/api/query` must never import it.
- ❌ No module under `src/server/` (except itself) may import it.
- ❌ No client component may import it.
- ✅ Its warning banner stays.

Enforced by `tests/isolation.test.ts`.

### 6. Nothing authorization-bearing is read from the client

`role`, `clearance`, `department`, `userId`, `tenant`, `allowedDocuments` and friends are
enumerated in `FORBIDDEN_REQUEST_FIELDS` and discarded. The only inputs `/api/query` reads
are `query` and `modelMode`.

If you add a request field, it must be incapable of influencing authorization. If a new field
*would* be authorization-bearing, add it to `FORBIDDEN_REQUEST_FIELDS` instead.

### 7. Denials do not disclose

The employee response is:

> I couldn't find relevant information in the resources available for this request.

Not *"you do not have permission to view the Project Cedar acquisition document."* The second
version leaks the document's existence, its name and its sensitivity. Same rule for the audit
trail, error messages and API responses: **counts, never unauthorized content.**

- ❌ No "access denied" alert as the primary chat response.
- ❌ No redacted executive content. The point is that it was never present.
- ❌ No list of excluded or denied documents.

Enforced by `tests/metadata.test.ts`.

### 8. Tests assert on model input

```ts
// ✅ Tests the architecture
expect(result.modelContext).not.toContain(CEDAR_CANARY);

// ⚠️ Necessary but insufficient on its own
expect(result.answer).not.toContain(CEDAR_CANARY);
```

Asserting only on the answer tests whether the model felt like complying. Assert on
`modelContext` — the exact bytes the model received.

### 9. Never weaken a test to make a change pass

If a security test fails, the change is wrong until proven otherwise. Deleting an assertion,
loosening a matcher, or adding a skip to get CI green is the one thing that will get a pull
request closed without much discussion.

Two legitimate exceptions, both requiring an explanation in the PR:

- The test encoded an assumption that was **too strict** and never security-relevant (for
  example, asserting an exact retrieved-chunk count when the security property only requires
  that every chunk be authorized).
- You are **replacing** an assertion with a stronger one.

### 10. Dependencies stay near zero

Runtime dependencies are `next`, `react` and `react-dom`. That is deliberate: every dependency
is code a reviewer has to trust, and this repository's whole value is being auditable in an
afternoon.

Before proposing a dependency, please confirm it is genuinely not writable in ~100 lines. Icons,
class-name helpers, date formatting and state management are all already handled locally.

If a dependency is warranted:

- pin an exact version (no `^`, no `~`, no `latest`)
- prefer a version published at least 7 days ago
- explain in the PR why it cannot be avoided

---

## Things that will be declined

Not because they are bad ideas, but because they are the wrong ideas *for this repository*:

- **Kubernetes, microservices, Redis, PostgreSQL, pgvector, message queues, Terraform,
  observability stacks, external vector databases.** The demo must run with `npm install &&
  npm run dev`. Infrastructure that is invisible during the demo is pure cost here.
- **Requiring an API key to run.** The core demonstration must work immediately after loading,
  with nothing configured. A real LLM may be added only as a strictly optional path with the
  deterministic model as the default (see below).
- **A real authentication provider as the default.** Complex OAuth or an enterprise IdP would
  bury the one idea the demo is trying to isolate. A documented optional adapter is fine.
- **Moving the demo toward a general-purpose RAG framework.** Scope creep dilutes the claim.
- **Marketing-site sections.** No giant hero headlines, testimonials, pricing tables, stock
  imagery or illustrations. This should read as an enterprise security console.
- **Splitting into separate frontend and backend repositories.**

---

## Contributions that are especially welcome

- **New attacks** for the Attack Lab. Add to `src/lib/attacks.ts`, and add a test asserting
  the boundary holds. If you find an attack that *works*, that is the most valuable
  contribution possible — please report it as a security issue rather than opening a public
  PR. See [SECURITY.md](SECURITY.md).
- **Adversarial test cases**, especially ones that probe the retriever's scoring or the
  session layer.
- **Accessibility**: keyboard navigation, focus management, screen-reader labels, contrast.
- **An optional real-LLM adapter.** Must be opt-in via environment variable, must default to
  the deterministic model, must not give the model tools, and must not become required for
  any part of the demo or the tests.
- **Additional corpus documents.** See the note on document changes below.
- **Deployment guides** for platforms other than Vercel.
- **Copy edits.** Precise, plain writing is a feature of this project.

---

## Working with the corpus

Documents live in `src/server/corpus.ts`. If you change them, note that several tests and the
scripted demo depend on specific counts and phrases:

- Maya is authorized for exactly **3 of 10** documents, Marcus **5**, Elena **10**.
- `"What is our deployment process?"` must return a grounded answer for Maya.
- `"What is Project Cedar and what are we paying for it?"` must return **zero** chunks for
  Maya and disclose the price to Elena.
- Maya's three authorized documents must not contain the words `Cedar`, `Orion`,
  `restructuring` or the acquisition price, or the Cedar demonstration stops being clean.

Run `npm test && node scripts/demo-story.mjs` after any corpus edit. If you deliberately
change the counts, update the README table and the affected tests in the same commit.

New canary tokens go in `src/server/canaries.ts` and must be added to the scanned list in
`tests/helpers.ts` so the bundle scan covers them.

---

## Pull request process

1. **Branch** from `main`: `feature/short-description` or `fix/short-description`.
2. **Commit** in focused increments with clear messages. Conventional-commit prefixes
   (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`) are used here.
3. **Run `npm run verify`.** CI runs typecheck, build and the full test suite on every pull
   request; it will not merge red.
4. **Fill in the pull request template**, including the security checklist. It is short, and
   it exists so that reviewers can focus on the interesting part of your change.
5. **Explain the *why*.** What the diff does is visible; why it is correct is not.

Reviews focus on: does this preserve the invariants, does it keep the claim verifiable, and is
it still auditable in an afternoon.

### Reporting a real vulnerability

If you find a way to get executive data into an unauthorized user's model context, **do not
open a public issue or pull request.** Use GitHub's private vulnerability reporting — see
[SECURITY.md](SECURITY.md). A working break of the boundary is the most interesting thing that
could happen to this project, and it deserves a coordinated fix.

---

## Style

Follow the code that is already there.

- **TypeScript strict mode.** No `any`, no non-null assertions on untrusted input.
- **Comments explain *why*, never *what*.** The security-critical modules are commented
  heavily and on purpose: a reader has to be able to understand the reasoning, not just the
  mechanism. Match that standard in `src/server/**`. Do not add narration to obvious code.
- **Tailwind v4** with the design tokens in `src/app/globals.css`. No inline style objects, no
  new colour literals — colour carries meaning here (green = authorized, amber = suspicious,
  red = blocked or leaked).
- **No emoji in the interface.**
- **No dead controls.** Every button does something real. Nothing is faked or mocked in the UI.

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be decent to each other.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE), the same terms that cover the project.
