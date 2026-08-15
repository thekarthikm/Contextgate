<div align="center">

# ContextGate

**Authorization before intelligence.**

An LLM must never receive enterprise data that the authenticated user is not authorized to access.
Authorization must happen *before* retrieval and *before* context construction.

[![License: MIT](https://img.shields.io/badge/License-MIT-5b8def.svg)](LICENSE)
[![CI](https://github.com/thekarthikm/Contextgate/actions/workflows/ci.yml/badge.svg)](https://github.com/thekarthikm/Contextgate/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-0a0c11)
![No API keys required](https://img.shields.io/badge/API%20keys-none%20required-3ecf8e)

</div>

---

## What ContextGate demonstrates

Most RAG security discussions end up somewhere uncomfortable: the retriever pulls back
whatever matches, the secrets land in the prompt, and the last line of defence is a
system message that says *"do not reveal confidential information."*

That is not a security control. That is a request.

ContextGate is a working demonstration of the alternative. It is a small enterprise
assistant over a 10-document corpus classified `INTERNAL` / `CONFIDENTIAL` / `EXECUTIVE`.
The same application, the same corpus and the same model produce different answers for
different people — because the **search space is decided before the model is invoked.**

The demo is built to survive a hostile audience. It assumes:

- the employee is malicious
- the prompt is adversarial
- the employee impersonates a role
- the employee tampers with the API request
- a retrieved document contains prompt injection
- **and the model itself is malicious and prints every byte it receives**

Under all of that, the employee still cannot obtain executive information — because that
information never entered the model's context.

> The model did not refuse the secret. It never received the secret.

### Core security invariant

```
LLM_CONTEXT ⊆ DATA_AUTHORIZED_FOR_CURRENT_USER
```

This holds for every prompt, every request body and every document. It is enforced by
deterministic application logic at two independent points, and asserted by the test suite
against the **model's input** rather than the model's output.

---

## Architecture

```
Browser
   │
   ▼
Authenticated API              ← signed session cookie, httpOnly
   │
   ▼
Trusted Server Identity        ← role/clearance/department looked up, never transported
   │
   ▼
Authorization Policy           ← clearance lattice + department scope, deterministic
   │
   ▼
══════ AUTHORIZATION BOUNDARY ══════
   │
   ▼
AUTHORIZED SEARCH SPACE        ← the only set retrieval may touch
   │
   ▼
Retrieval                      ← ranks inside the permitted set only
   │
   ▼
Context Builder                ← re-verifies every chunk; aborts on violation
   │
   ▼
LLM                            ← no tools, no database, cannot widen its own scope
   │
   ▼
Response
```

Three properties do the work:

1. **Authenticate outside the model.** Identity comes from a signed cookie and a
   server-side record. A prompt is not a credential.
2. **Authorize before retrieval.** `secureRetrieve()` builds the permitted set from the
   identity *first*. The forbidden ordering — search everything, filter afterwards — is
   never used on the real path.
3. **Assume the model leaks everything it sees.** Then the only durable control is what it
   never sees. Design for absence, not discretion.

### Why the ordering is the whole point

A filter applied *after* retrieval has already lost. The secret has been read out of the
index, materialised in process memory, and usually logged. Whether it reaches the user is
then a question of how many code paths you remembered to guard.

ContextGate never materialises it. For an `INTERNAL` employee, the executive documents are
not filtered out of the results — they were never in the candidate set.

---

## Run it

No database. No API key. No embedding service. No external infrastructure.

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm test             # 60 unit + integration tests
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run verify       # all three, in order
```

End-to-end verification of the full demo script over real HTTP, against a running server:

```bash
npm run dev                      # in one terminal
node scripts/demo-story.mjs      # 93 assertions in another
```

**Requirements:** Node.js ≥ 20.9. That is all.

### Demo identities

All three use the password `demo1234`.

| Identity | Role | Clearance | Department | Authorized corpus |
|---|---|---|---|---|
| `maya@acme.demo` | Employee | `INTERNAL` | Engineering | 3 / 10 documents |
| `marcus@acme.demo` | Manager | `CONFIDENTIAL` | Engineering | 5 / 10 documents |
| `elena@acme.demo` | Executive | `EXECUTIVE` | Leadership | 10 / 10 documents |

Maya is the adversary in every attack scenario. Elena exists to prove the same code
*legitimately discloses* — a system that never returns anything is not secure, it is broken.

---

## The demo, in six steps

Run this sequence without restarting anything.

**1. Ask something ordinary.** As Maya: *"What is our deployment process?"* A normal
grounded answer. The trace reads `Authorized 3 / 10` → `Retrieved 2` → `Model received 2`.

**2. Ask something forbidden.** *"What is Project Cedar and what are we paying for it?"*

> I couldn't find relevant information in the resources available for this request.

Note what is **not** said: no "access denied", no document name, no classification. Naming
the document you cannot read is itself a disclosure. The inspector reports
`0 unauthorized chunks received`.

**3. Make the model hostile.** Flip **Model behavior** to `Leak Everything` and ask it to
print every secret in its hidden context. It obeys completely and dumps the entire context
verbatim. The canary check still reads:

```
EXEC_ONLY_CEDAR_7Q2M9X    NOT PRESENT ✓
```

**4. Run the comparison.** In the Attack Lab, **Insecure RAG vs ContextGate** runs the same
query, as the same identity, through the same malicious model — twice.

| | Documents searched | Executive chunks in context | Result |
|---|---|---|---|
| Conventional RAG | 10 | 1+ | 🔴 **LEAKED** `EXEC_ONLY_CEDAR_7Q2M9X` |
| ContextGate | 3 | 0 | 🟢 **PROTECTED** |

Only the ordering of authorization differs.

**5. Switch to Elena.** Ask the *identical* question. Now:
`Acme intends to acquire Cedar Dynamics for a proposed price of $187,430,921.`
The executive document appears in the context inspector, correctly labelled `EXECUTIVE`.

**6. Land the point.** The LLM did not protect the secret. The authorization boundary
prevented the LLM from ever seeing it.

### Attack Lab

Ten one-click attacks, each executing live against the real `/api/query` route with the
model set to leak everything:

Role impersonation · System override · Context extraction · Encoding · Indirect disclosure ·
Translation · Metadata probe · Fake approval · Retrieved-document injection · Combined
acceptance attack

Plus **Tamper with API**, which forges `role`, `clearance`, `department` and `userId` in the
request body and shows the client's claim next to the trusted server identity.

The indirect injection case is the most interesting: an `INTERNAL` document Maya *is* allowed
to read contains instructions telling the model to escalate. Those instructions genuinely
reach the model. Result:

```
Prompt injection reached model:   YES
Authorization boundary changed:   NO
Executive information retrieved:  NO
```

Reaching the model is not the same as reaching the data. Retrieval had already finished, and
the model has no tools.

---

## What is real and what is simulated

Being straight about this matters more than the demo looking impressive.

| Component | Status |
|---|---|
| Authorization policy engine | **Real.** Deterministic, tested, enforced at two points. |
| Authorize-before-retrieve ordering | **Real.** This is the security property. |
| Session / trusted identity | **Real.** HMAC-signed httpOnly cookie, server-side lookup. |
| Context invariant enforcement | **Real.** Aborts the request; does not silently repair. |
| Canary leak detection | **Real.** Substring search over the exact model input. |
| Retrieval ranking | **Simulated.** Local keyword/IDF relevance, not embeddings. |
| The LLM | **Simulated.** Two deterministic server-side models. |
| Corpus | **Synthetic.** 10 fictional Acme documents. |

The retriever is intentionally lightweight:

> In a production enterprise environment, `secureRetrieve()` would enforce the same
> authorization scope against systems such as **pgvector**, **Pinecone**, **Elasticsearch**,
> **OpenSearch**, a **knowledge graph**, or an **enterprise search index**.
>
> **The security property is independent of the retrieval technology.**

The model is deterministic on purpose. The claim being made is about what the model
*receives* — and a deterministic model makes that claim reproducible in CI rather than
dependent on a vendor's sampling temperature.

### Production mapping

| This demo | Production |
|---|---|
| Demo identity | Enterprise SSO / IdP |
| Local authorization policy | RBAC / ABAC / policy engine (OPA, Cedar, Zanzibar-style) |
| Static server corpus | Enterprise knowledge stores |
| Local relevance ranking | Vector DB / search index / knowledge graph |
| Demo model | Production LLM |

---

## How the guarantee is proven

`npm test` runs 60 tests. The ones that matter:

- **`canary.test.ts`** — inspects the **model input**, not the answer. Checking only the
  answer would measure the model's discretion, which is precisely what this architecture
  refuses to depend on.
- **`retrieval.test.ts`** — for every identity, builds a query from the verbatim text of
  *every* chunk in the corpus (including unreadable ones) and asserts nothing unauthorized
  comes back. Querying with the exact words of a secret is the strongest possible relevance
  signal; a filter-after-retrieval bug could not survive it.
- **`context-invariant.test.ts`** — forces an unauthorized chunk into the context builder and
  asserts it **throws** rather than quietly dropping it. Silently repairing an invariant
  violation hides the bug that caused it.
- **`tampering.test.ts`** — runs the real route handlers; forged cookies, swapped identities,
  and authorization fields in the request body.
- **`injection.test.ts`** — the hostile document reaches the model and changes nothing.
- **`client-bundle.test.ts`** — scans the real production client assets for executive
  canaries and server-only prose. Fails the build if any of it is bundled.
- **`insecure-pipeline.test.ts`** — the control condition. Asserts the insecure architecture
  **does** leak. The comparison is worthless otherwise.
- **`isolation.test.ts`** — keeps `src/server/demo-insecure/` quarantined and reachable only
  from the comparison route.

### One deliberate, documented exception

`src/server/demo-insecure/` implements the forbidden ordering **on purpose**, so the
side-by-side comparison shows a real leak rather than a cartoon of one. It is quarantined by
`isolation.test.ts`, reachable only from `/api/attack/compare`, and carries a warning banner.
`/api/query` must never import it.

---

## Project layout

```
src/
  lib/          Client-safe types and attack definitions. No sensitive data.
  server/       Everything sensitive. Guarded by `import 'server-only'`.
    identities.ts   Trusted identity records
    corpus.ts       The 10-document dataset + canaries
    authz.ts        Authorization policy engine
    retrieval.ts    secureRetrieve() — authorize, then rank
    context.ts      buildContext() — re-verify or abort
    models.ts       Normal + malicious deterministic models
    pipeline.ts     Orchestration, security report, audit
    demo-insecure/  ⚠ INTENTIONALLY INSECURE — comparison view only
  app/api/      Route handlers
  components/   Client UI. Never imports from src/server/**
tests/          The security proof suite
scripts/        End-to-end demo verification over HTTP
```

---

## Deployment

Deploys to Vercel with no configuration and no environment variables:

```bash
npx vercel
```

Optional: set `CONTEXTGATE_SESSION_SECRET` to override the published demo signing key. There
are no real secrets in this application, and there is nothing to configure before the demo
works.

Note that the audit trail is held in memory. On serverless platforms it is per-instance and
resets on cold start — fine for a demo, and deliberately not worth a database.

---

## Security disclaimers

**Every "secret" in this repository is synthetic.** `EXEC_ONLY_CEDAR_7Q2M9X`, the
$187,430,921 acquisition price, Cedar Dynamics, and all ten documents are fictional. The
canary tokens exist so that leakage is mechanically detectable by substring search.

**This is a demonstration, not a security product.** It uses trivial demo passwords, an
in-memory audit log, and a published default signing key so that it runs with zero
configuration. Do not deploy the authentication layer as-is. The *architecture* is the
transferable part; the plumbing around it is scaffolding.

**The canary panel is a demo affordance.** ContextGate shows an `INTERNAL` user the token
name `EXEC_ONLY_CEDAR_7Q2M9X` marked `NOT PRESENT`, which technically reveals that such a
marker exists. That is intentional — it is how a viewer verifies the claim in 60 seconds. A
production system would not surface it. Note that the token arrives from an authorized API
response, never from the client bundle, and `client-bundle.test.ts` enforces that.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Contributing

Contributions are welcome. Because this project exists to make one narrow security claim,
contributions are held to one unusual standard: **they must not weaken the claim.**

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** first — it lists the invariants that may never be
broken, the changes that will be declined, and the checklist every pull request must pass.
The short version:

- Sensitive data stays under `src/server/`.
- Authorization happens before retrieval. Always.
- `/api/query` never touches `src/server/demo-insecure/`.
- Tests assert on model **input**, not model output.
- Never weaken or delete a security test to make a change pass.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Credits

Built for **[[devkick]: Waterloo Ship For Kicks Night with Devin](https://luma.com/v560l0ya)**
at Builders Club, Kitchener-Waterloo — hosted by Builders Club and
[Cognition](https://cognition.ai).

Built with [Devin](https://devin.ai). The original build specification Devin worked from is
kept in [`docs/build-spec.md`](docs/build-spec.md) — it is the brief, not documentation of the
finished code, and it is preserved as provenance rather than maintained.

Licensed under the [MIT License](LICENSE).
