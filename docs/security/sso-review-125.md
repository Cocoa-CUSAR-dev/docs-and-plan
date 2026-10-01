---
title: "SSO Security Review (US3-2, #125)"
---

# SSO Security Review — LINE OA ↔ Web Platform

**Issue:** docs-and-plan#125 (SEC — Security review & pen-test pass) · **Parent:** US3-2 (#120)
**Companion:** [SSO Remediation & Retest](./sso-remediation-125.md) (what was fixed + retest evidence)
**Scope:** the SSO token lifecycle only · **Method:** white-box review, with live
proof-of-concept against a locally-running instance.
**Reviewed at:** web-backend `dev` (SSO introduced in `33cb2fe`, cross-surface e2e in `#54`).

> This is a white-box review by a team member, not an independent penetration
> test — see [Limitations](#limitations).

## Executive summary

The SSO mechanism lets a LINE diary card open the web app already logged in. The
review assessed its token lifecycle end to end and raised **8 findings**:

| Severity | Count | IDs |
| --- | --- | --- |
| 🔴 High | 2 | F1, F2 |
| 🟠 Medium | 3 | F3, F4, F5 |
| 🟡 Low | 3 | F6, F7, F8 |

The most serious issue (F1) is that the short-lived SSO token doubles as a full
API credential. Remediation status and retest evidence are tracked separately in
the [companion report](./sso-remediation-125.md).

## 1. What SSO does

Lets the LINE diary card's "view full history" button open the web app already
logged in, without the farmer ever handling a password (US2-6).

```
chatbot ──POST /service/sso/tokens (X-Service-Key, userId)──▶ web-backend: mintToken()
        └─ short-lived JWT ──▶ deep link {WEB_APP_URL}/sso?token=... ──▶ pushed into LINE chat
farmer taps ──▶ web-app /sso route ──POST /auth/sso/exchange──▶ exchangeForCookie()
             └─ validates token → sets a full session cookie → redirects to /history
```

Key files: `SsoService.kt`, `SsoServiceController.kt`, `JwtTokenService.kt`,
`CookieService.kt`, `JwtAuthenticationFilter.kt`, `SecurityConfig.kt` (web-backend);
`src/app/sso/route.ts` (web-app); `src/sso/client.py`, `src/line/router.py` (chatbot).

## 2. Findings

Severity is this reviewer's judgement for this app's context (a link that
unlocks a farmer's own diary history), not formal CVSS.

| ID | Finding | Severity |
| --- | --- | --- |
| F1 | SSO mint token is accepted as an `Authorization: Bearer` API credential | 🔴 High |
| F2 | Token travels in the URL query string (`/sso?token=`) | 🔴 High |
| F3 | Token is replayable (not single-use) | 🟠 Medium |
| F4 | `mintToken` mints for any `userId` on the service key alone | 🟠 Medium |
| F5 | Session cookie set without a `SameSite` attribute (CSRF globally disabled) | 🟠 Medium |
| F6 | Exchange redirect host built from client-supplied `x-forwarded-host` | 🟡 Low |
| F7 | No rate limiting on mint or exchange | 🟡 Low |
| F8 | CORS `allowCredentials=true` with wildcard methods/headers; origin config fragile | 🟡 Low |

**Observed sound (no concern):** constant-time service-key comparison;
fail-closed when the service key is unset; `HttpOnly` + `Secure` cookies;
web-backend and mobile-backend use separate JWT signing keys (a token from one
is not valid at the other); the JWT parser swallows malformed tokens instead of
surfacing a 500.

### F1 — mint token usable as an API bearer credential (High)

The minted SSO token is structurally identical to a session token (same signing
key, same `subject`/`userId`/`permissions` claims) and `JwtAuthenticationFilter`
accepts any valid JWT presented as `Authorization: Bearer`. The token meant only
to be redeemed at `/auth/sso/exchange` is therefore a full API credential for its
whole TTL — anyone who intercepts the deep-link token (forwarded LINE message,
logs) can call the API as that farmer without ever exchanging it.

**Evidence:** `POST /service/sso/tokens` → `GET /auth/me` with the mint token as a
Bearer header → `200` + the farmer's profile.

**Recommendation:** distinguish the SSO token from a session token (e.g. a token
type/audience claim) so it is only accepted at exchange and refused as a request
credential.

### F2 — token in the URL query string (High)

The deep link is `{WEB_APP_URL}/sso?token=<jwt>`. Tokens in URLs leak through
browser history, `Referer` headers, and proxy/server access logs.

**Recommendation:** deliver the token so it doesn't land in logs (POST body or URL
fragment), paired with single-use redemption.

### F3 — replayable token (Medium)

`exchangeForCookie` keeps no server-side state, so a token can be redeemed
repeatedly within its TTL (the code comment acknowledges this and relies on the
short TTL alone). A forwarded/intercepted deep-link token can mint multiple
sessions.

**Evidence:** mint one token, `POST /auth/sso/exchange` twice → `200` both times.

**Recommendation:** make the token single-use — record each redeemed token and
refuse one already seen, claimed atomically to survive concurrent exchanges.

### F4 — mint trusts the service key alone (Medium)

`mintToken` requires only a valid `X-Service-Key` and will mint a
session-bootstrap token for any `userId` in the body, with no proof the caller
owns that user. A leaked service key therefore compromises every farmer. This is
the same trust boundary as the other `/service/**` routes, but SSO raises the
stakes because the output bootstraps a full web session.

**Recommendation:** rate-limit mint, rotate the service key periodically, and
consider scoping mint to recently-linked users.

### F5 — session cookie without SameSite (Medium)

`CookieService` sets `HttpOnly` + `Secure` but no `SameSite`, while CSRF is
disabled globally (`SecurityConfig`: `.csrf { it.disable() }`). That combination
leaves state-changing endpoints exposed to CSRF.

**Recommendation:** issue the session cookie with `SameSite=Lax` (or stricter).

### F6 — redirect host from `x-forwarded-host` (Low)

`web-app/src/app/sso/route.ts` builds the post-exchange redirect from the
client-supplied `x-forwarded-host` header, with no allowlist and no Next.js
trusted-host configuration. Safety depends entirely on the production reverse
proxy overwriting that header.

**Recommendation:** confirm the prod proxy always sets `x-forwarded-host`, or
validate it against an allowlist.

### F7 — no rate limiting (Low)

Neither mint nor exchange is rate-limited, so replay/scan attempts are
unthrottled. Low impact on its own (JWT signatures make guessing infeasible).

**Recommendation:** add a throttle on these routes as defence in depth.

### F8 — CORS configuration (Low)

`SecurityConfig` sets `allowCredentials=true` with `allowedMethods=["*"]` and
`allowedHeaders=["*"]`; allowed origins come from the `cors.origins` property,
which is not set in `application.properties` and whose env var in the repo's
`.env` is named `CORS_ORIGIN` (singular) while Spring binds `cors.origins` from
`CORS_ORIGINS`. If prod doesn't set the expected variable, origins fall back to
the literal `"default"`. Credentialed CORS with a mis-set origin is a risk.

**Recommendation:** verify the prod env var name and value; pin explicit origins.

## Limitations

- White-box review by a team member; the live proof-of-concept demonstrates
  exploitability but is author-run against a local instance, not an independent
  black-box test on staging.
- Scope was the SSO token lifecycle only; broader auth (login, refresh, RBAC)
  was not assessed.
- Severity ratings are contextual judgement, not formal CVSS scoring.
