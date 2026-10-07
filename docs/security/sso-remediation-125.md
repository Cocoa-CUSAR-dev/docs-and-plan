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
| Remediated & retest-passed | F1, F2, F3, F4, F5, F6, F7, F8 |

All eight findings are remediated in code. Two residual items are ops/prod
config, not code: rotating the `/service` key (F4) and pinning the real
`CORS_ORIGINS` per environment (F8).

F4's in-code angle is remediated (mint scoped to LINE-linked users + rate-limit
+ audit log); rotating the shared `/service` key remains an ops recommendation.

## 2. Status by finding

| ID | Severity | Status | Delivered in |
| --- | --- | --- | --- |
| F1 | 🔴 High | Remediated | web-backend `a72e72b` |
| F2 | 🔴 High | Remediated | web-app `41a3312` + chatbot `a30fd4d` |
| F3 | 🟠 Medium | Remediated | web-backend `4eb6cb1` + database `cf90a20` |
| F4 | 🟠 Medium | Remediated (mint scoped + rate-limited + audited; key rotation recommended) | web-backend `dc21e42`, `8142a21` |
| F5 | 🟠 Medium | Remediated | web-backend `7b343de` |
| F6 | 🟡 Low | Remediated (by the F2 rewrite) | web-app `41a3312` |
| F7 | 🟡 Low | Remediated | web-backend `8142a21` |
| F8 | 🟡 Low | Remediated (explicit CORS; pin origins in prod) | web-backend `4490429` |

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
- **F7 — rate limiting.** A `RateLimitFilter` throttles `/service/sso/tokens`
  and `/auth/sso/exchange` (in-memory fixed window per path + client IP), running
  ahead of the security chain so abuse is rejected with `429` before any auth or
  DB work.
- **F4 — mint trust boundary.** `mintToken` now refuses (403) unless the target
  user has an `auth.line_identity` row, so a leaked service key can't bootstrap a
  session for an arbitrary or never-linked user; every mint is audit-logged. Rate
  limiting (F7) additionally blunts brute-forcing. Rotating the shared `/service`
  key remains an ops recommendation.
- **F6 — redirect host.** Resolved by the F2 rewrite: the server `/sso` route that
  built a redirect from the client-supplied `x-forwarded-host` was removed; the
  new client page redirects with a relative, same-origin path, so no
  client-controlled host is trusted.
- **F8 — CORS.** Method and header wildcards are replaced with explicit
  allow-lists (credentials are allowed, so wildcards were risky), and the app
  logs a warning when `cors.origins` is unset. All browser traffic reaches the
  backend via the web-app BFF, so no real cross-origin call is affected. Pinning
  the real `CORS_ORIGINS` per environment remains a prod-config step.

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
| F4 | mint (`POST /service/sso/tokens`) for a user with no `auth.line_identity` row | token minted (success) | `403` (refused) |
| F5 | `Set-Cookie` on exchange | no `SameSite` attribute | `SameSite=Lax` present¹ |
| F6 | `x-forwarded-host` usage in web-app `src` | present in the `/sso` server route | none (route removed; relative same-origin redirect) |
| F7 | hammer `POST /service/sso/tokens` (limit set to 3 for the probe) | 25 requests, all pass the limiter (no `429`) | `429` from the 4th request on, before auth runs |
| F8 | CORS config for `/**` | `allowedMethods`/`allowedHeaders` = `["*"]` with credentials | explicit method/header allow-lists with credentials |

¹ `Secure` is also set in production (`cookie.secure=true`); it is absent only on
the plain-HTTP local dev instance used for the retest.

**Automated suite:** F1/F3/F5 are covered by `SsoSecurityTest`, F2 by a chatbot
test asserting the deep link uses the fragment, F7 by `RateLimitFilterTest`, and
F4 by an `SsoServiceTest` case refusing a mint for an unlinked user, and F8 by a
`SecurityCorsConfigTest` asserting non-wildcard CORS. Each was written to fail
before its fix and pass after. The full web-backend suite + ktlint, and the
chatbot suite, pass on the fix branches (web-backend's pre-existing cross-surface
identity e2e #126 included).

**Retest verdict:** all eight findings (F1–F8) — **closed in code**. Two residual
items are ops/prod config (below), not code.

## 5. Residual (ops / prod config) and recommended follow-up

No findings remain open in code. Residual operational items:

- **F4** — rotate the shared `/service` key periodically and keep it in a secret manager.
- **F8** — set `CORS_ORIGINS` to the web app's real origin(s) in each deployed environment.

Additionally recommended: an independent black-box pen-test on staging by a
non-author, and a janitor to purge expired rows from `auth.sso_used_token`.

## Methodology & limitations

- White-box review by a team member. The live retest demonstrates the fixes on a
  running instance but is author-run against a local build, not an independent
  black-box test on staging.
- Detailed reproduction steps were kept out of this public document by design;
  the request/response summaries above are sufficient to evidence each retest.
- Severity ratings are contextual judgement, not formal CVSS scoring.
