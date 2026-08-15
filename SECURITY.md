# Security Policy

## First, the important context

**ContextGate is a security *demonstration*, not a security *product*.**

Every "secret" in this repository is synthetic and fictional:

- `EXEC_ONLY_CEDAR_7Q2M9X`, `EXEC_RESTRUCTURE_91P4LX`, `EXEC_COMP_83K2VQ`,
  `CONFIDENTIAL_ORION_4K8Q2` are canary tokens, not credentials.
- The $187,430,921 acquisition, Cedar Dynamics, Acme Corp and all ten documents are invented.
- `demo1234` is a published demo password.
- The default session signing key is published in `src/server/session.ts` on purpose so the
  demo runs with zero configuration.

None of these are secrets, and reports that they are "hardcoded credentials" or "exposed
secrets" will be closed. There is nothing here to exfiltrate.

## What counts as a vulnerability

The project makes exactly one security claim:

```
LLM_CONTEXT ⊆ DATA_AUTHORIZED_FOR_CURRENT_USER
```

**In scope — please report:**

- Any way to get content classified above a user's clearance into that user's model context.
- Any way to get an executive canary token into the `modelContext` or `answer` of a
  non-executive identity.
- Any way to change the effective `role`, `clearance` or `department` of a session from the
  browser — via the prompt, the request body, headers, cookies, or a forged session.
- Any way to make `/api/query` reach `src/server/demo-insecure/`.
- Any way to make the corpus text, document titles, or canary tokens appear in a client
  bundle, in server-rendered HTML, or in an unauthenticated response.
- Any disclosure of the *existence* of unauthorized documents — titles, classifications or
  per-document denial lists — through a response, an error message or the audit trail.
- Bypassing authentication on `/api/query`, `/api/audit`, `/api/attack/*`.
- A way to make the context builder silently continue after an invariant violation instead of
  aborting.

**Out of scope:**

- The demo passwords, the published signing key, or the synthetic canaries (see above).
- The insecure pipeline in `src/server/demo-insecure/` leaking. That is its documented
  purpose, and `tests/insecure-pipeline.test.ts` asserts that it does.
- The canary panel showing an `INTERNAL` user the *name* of an executive canary marked
  `NOT PRESENT`. This is a deliberate demo affordance and is documented in the README; the
  token arrives from an authorized API response and is never in the client bundle.
- The in-memory audit log not persisting across restarts or serverless instances.
- Missing rate limiting, CSRF tokens, account lockout, or password complexity. The
  authentication layer is scaffolding, not a contribution to the argument.
- Denial of service, or resource exhaustion via very long prompts.
- Dependency advisories in `devDependencies` with no exploitable path in this application.
- Anything requiring an attacker to already have server-side code execution or write access to
  `src/server/`.

If you are unsure whether something is in scope, report it privately anyway. A borderline
report is a fine thing to receive.

## How to report

**Please do not open a public issue or pull request for an in-scope vulnerability.**

Use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/thekarthikm/Contextgate/security/advisories/new)
   of this repository.
2. Click **Report a vulnerability**.
3. Include:
   - which identity you were authenticated as
   - the exact query, request body and model mode
   - what appeared in `modelContext` that should not have
   - a failing test, if you can write one — `tests/canary.test.ts` is a good template

A minimal reproduction as a failing Vitest case is the single most useful thing you can send.

## What happens next

This is a demo project maintained by one person, so there is no enterprise SLA. The honest
commitment:

| Stage | Target |
|---|---|
| Acknowledgement | within 5 days |
| Assessment and scope confirmation | within 14 days |
| Fix for a confirmed boundary break | as a priority, with a regression test |
| Public disclosure | after the fix lands, crediting you unless you prefer otherwise |

A confirmed break of the authorization boundary will be fixed **and** accompanied by a new test
that would have caught it. A demonstration project that quietly patches a hole without proving
the patch is worse than no demonstration at all.

## If you are using this in production

Please do not deploy the authentication and session layer as-is. What is intended to be
transferable is the **architecture**:

1. Resolve identity server-side, outside the model.
2. Construct the permitted search space from that identity, before any index is queried.
3. Re-verify at context construction, and abort rather than repair.
4. Give the model no tools that can widen its own scope.
5. Assume the model will disclose everything it receives, and test against its **input**.

Replace the rest — the identity store, the session handling, the retriever, the model — with
the real thing. See the production mapping table in the [README](README.md).
