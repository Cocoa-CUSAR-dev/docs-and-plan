---
sidebar_position: 5
title: TLS coverage
---

# TLS coverage (X-6e)

Checked on 2026-10-20 for [docs-and-plan#164](https://github.com/Cocoa-CUSAR-dev/docs-and-plan/issues/164). Re-run it any time with:

```bash
python scripts/check-tls.py
python scripts/check-tls.py --postgres <host part of DATABASE_URL>
```

The script uses only the Python standard library and needs no credentials.

## Public endpoints

| Service | Host | TLS | Certificate | Plain HTTP | HSTS |
|---|---|---|---|---|---|
| web-app | `web-app-ivory-nine.vercel.app` | 1.3 | Google Trust Services, valid to 2026-11-27 | 308 → https | yes, 2 years, preload |
| chatbot (LINE webhook) | `chatbot-alpha-beige-18.vercel.app` | 1.3 | Google Trust Services, valid to 2026-11-27 | 308 → https | yes, 2 years, preload |
| mobile-backend | `mobile-backend-render.onrender.com` | 1.3 | Google Trust Services, valid to 2026-12-20 | 301 → https | no |
| mobile-backend (app default) | `mobile-backend-2-t8h6.onrender.com` | 1.3 | Google Trust Services, valid to 2026-12-20 | 301 → https | no |
| mobile-app web test build | `cocoa-cusar-dev.github.io/mobile-app/` | 1.3 | Let's Encrypt, valid to 2026-12-29 | 301 → https | no |

All certificates are issued and renewed automatically by the host (Vercel, Render, GitHub Pages), so nothing here needs renewing by hand.

There is no HSTS header on Render or GitHub Pages. That matters little here: the only clients of mobile-backend are the app and other services, which call `https://` directly, not a browser typing the address.

## Database

Neon offers TLS 1.3 with a certificate valid for its hostname, and **refuses any connection that skips TLS** ("connection is insecure (try using `sslmode=require`)"). So even a service whose connection string forgot `sslmode=require` could not fall back to plain text; it would fail to connect instead.

Each service also asks for TLS itself:

- **web-backend:** `SPRING_DATASOURCE_URL` must end in `?sslmode=require` (documented in the repo since `c416ffa`).
- **mobile-backend:** `DB_SSLMODE` defaults to `require` in `internal/database/postgres.go`, and `render.yaml` sets it explicitly.
- **chatbot:** `DATABASE_URL` carries `?ssl=require`.

## Mobile app

- **APP-1 is fixed:** the base URL defaults to `https://mobile-backend-2-t8h6.onrender.com`, not a LAN IP. The deployed web build points at `https://mobile-backend-render.onrender.com`, which was checked in the built `main.dart.js`.
- **Android release builds:** the main manifest allowed cleartext (`usesCleartextTraffic="true"`), so a release build would also have spoken plain HTTP to an `http://` URL. [mobile-app `fix/164-release-https-only`](https://github.com/Cocoa-CUSAR-dev/mobile-app/tree/fix/164-release-https-only) moves that flag to the debug manifest. Debug builds can still reach a local backend, and release builds use the Android default (off).

## Not verified from outside

These can only be read in the hosting dashboards. Each should be an `https://` URL:

| Setting | Where |
|---|---|
| web-backend's public URL (to add to the script) | Render → web-backend service |
| `BACKEND_URL` (web-app → web-backend) | Vercel → web-app → Environment Variables |
| `KOTLIN_BACKEND_URL`, `GO_BACKEND_URL`, `WEB_APP_URL` (chatbot → the rest) | Vercel → chatbot → Environment Variables |
| `WEB_BACKEND_URL` (mobile-backend → web-backend) | Render → mobile-backend → Environment |
| `API_BASE_URL` (mobile-app web build) | GitHub → mobile-app → Actions secrets; the built bundle shows https |

## Open question

Two mobile-backend services are live. The app's built-in default is `mobile-backend-2-t8h6`, but the web test build uses `mobile-backend-render`. Both serve valid TLS, but only one of them should be the backend the team means.

A custom domain is out of scope here: it needs DNS ownership first (see #164).
