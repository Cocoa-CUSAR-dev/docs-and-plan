---
title: "SSO Remediation & Retest (US3-2, #125)"
---

# SSO Remediation & Retest Report

**Engagement:** docs-and-plan#125 (SEC — Security review & pen-test pass) · **Parent:** US3-2 (#120)
**Companion:** [SSO Security Review — findings](./sso-review-125.md)
**Target:** web-backend branch `sec/sso-security-review`; database branch `sec/sso-single-use-token`.

This report records which findings from the [assessment](./sso-review-125.md)
were remediated in this engagement, the fix delivered for each, and the retest
that confirms it. Finding descriptions and risk live in the assessment report;
this one is the status-and-evidence side.

## 1. Summary

The assessment raised 8 findings (2 High, 3 Medium, 3 Low). This engagement
remediated the three that are self-contained code fixes in web-backend and
proved each closed by retest; the remaining five are tracked as follow-up
issues.

| Outcome | Findings |
| --- | --- |
| Remediated & retest-passed | F1, F2, F3, F5 |
| Open — deferred to follow-up | F4, F6, F7, F8 |

## 2. Status by finding

| ID | Severity | Status | Delivered in |
| --- | --- | --- | --- |
| F1 | 🔴 High | Remediated | web-backend `a72e72b` |
| F2 | 🔴 High | Remediated | web-app `41a3312` + chatbot `a30fd4d` |
| F3 | 🟠 Medium | Remediated | web-backend `4eb6cb1` + database `cf90a20` |
| F4 | 🟠 Medium | Open — follow-up issue | — |
| F5 | 🟠 Medium | Remediated | web-backend `7b343de` |
| F6 | 🟡 Low | Open — prod verification | — |
| F7 | 🟡 Low | Open — follow-up issue | — |
| F8 | 🟡 Low | Open — prod verification | — |

## 3. Remediation detail

Mechanism lives in the commits above; summarised here for the audit trail.

- **F1 — token not usable as a bearer credential.** SSO tokens are stamped with
  a `token_type=sso` claim; the exchange endpoint accepts only that type, and the
  JWT authentication filter refuses such tokens as request credentials.
- **F2 — token off the URL.** The diary deep link now carries the token in the
  URL fragment (`/sso#token=`) instead of the query string. The fragment never
  reaches the server, so the token can't land in access logs or a Referer. The
  web-app `/sso` page reads it client-side and POSTs it to exchange for the
  session cookie.
- **F3 — single-use.** SSO tokens carry a `jti` recorded in `auth.sso_used_token`
  (migration `V27`) via an atomic `INSERT ... ON CONFLICT DO NOTHING`; a `jti`
  already present is refused.
- **F5 — SameSite.** The session cookie is issued with `SameSite=Lax`.

## 4. Retest

Each remediated finding was verified two ways: an automated adversarial test
(`SsoSecurityTest`, written to fail before the fix and pass after), and a live
retest against a running instance on the fix branch. Values below are scrubbed
(no tokens, user identifiers, or hosts).

| ID | Check | Before (vulnerable) | After (fixed) |
| --- | --- | --- | --- |
| F1 | SSO token presented as `Authorization: Bearer` to `GET /auth/me` | `200` + profile returned | `401` |
| F2 | token in the deep link; inspect the web-app request log | `GET /sso?token=…` — token logged | `GET /sso` — no token (it rides in the `POST /sso/exchange` body) |
| F3 | Same minted token exchanged twice at `POST /auth/sso/exchange` | `200`, `200` | `200`, `401` |
| F5 | `Set-Cookie` on exchange | no `SameSite` attribute | `SameSite=Lax` present¹ |

¹ `Secure` is also set in production (`cookie.secure=true`); it is absent only on
the plain-HTTP local dev instance used for the retest.

**Automated suite:** F1/F3/F5 are covered by `SsoSecurityTest` (web-backend);
F2 by a chatbot test asserting the deep link uses the fragment. Each was written
to fail before its fix and pass after. The full web-backend suite + ktlint, and
the chatbot suite, pass on the fix branches (web-backend's pre-existing
cross-surface identity e2e #126 included).

**Retest verdict:** F1, F3, F5 — **closed**.

## 5. Deferred findings → recommended follow-up

Tracked as sub-issues of #125 (see assessment report for full detail):

| ID | Follow-up |
| --- | --- |
| F4 | Rate-limit and rotate the key for `/service/**` mint; consider scoping. |
| F6 | Verify prod reverse-proxy handling of `x-forwarded-host`, or allowlist it. |
| F7 | Rate-limit SSO mint and exchange. |
| F8 | Verify prod CORS origin configuration; pin explicit origins. |

Additionally recommended: an independent black-box pen-test on staging by a
non-author, and a janitor to purge expired rows from `auth.sso_used_token`.

## Methodology & limitations

- White-box review by a team member. The live retest demonstrates the fixes on a
  running instance but is author-run against a local build, not an independent
  black-box test on staging.
- Detailed reproduction steps were kept out of this public document by design;
  the request/response summaries above are sufficient to evidence each retest.
- Severity ratings are contextual judgement, not formal CVSS scoring.
