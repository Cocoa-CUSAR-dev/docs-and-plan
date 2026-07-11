---
sidebar_position: 3
---

# Mobile Backend (Go)

**Location:** `cocoa_project_transfer/go-server-transfer-2026-06-16/` · **Stack:** Go, **Gin** (router), **GORM** (PostgreSQL), Docker Compose, port **8080** · **Serves:** the Flutter mobile app

:::note[Stack correction]
The original README didn't name the frameworks. The team's [Go Server Walkthrough](/docs/phase-0/go-server-walkthrough) (with sequence diagrams and a full API list) established it's **Gin + GORM** — meaning this backend uses an ORM while the Kotlin side deliberately uses jOOQ without one, against the same database. That split is tracked as [GO-1](/docs/phase-0#4-go-mobile-backend).
:::

## What it does

- **Auth & RBAC** (`auth_handler.go`) — login/registration and token-based sessions for the three field roles (Farmer, Processor, Collector).
- **Registration management** — farms & plots, processing stations, hubs (each role manages its own records).
- **Dynamic form engine** (`form_handler.go`) — serves tasks and form schemas to the mobile app; on submission, **dissects the generic payload into the dedicated domain tables** (agronomy, logistics, fermentation, drying, grading) instead of storing raw blobs. Also supports pulling a submission back out for editing, propagating edits to the domain tables.
- **Reference data** (`ref_handler.go`) — single source of truth for dropdowns: provinces/districts/subdistricts, chemicals, soil types, activity types, weather.
- **Daily tasks** — pulls researcher-assigned tasks so they appear for field users on the right day.

## Project structure

*(Verified against the repo — the original README claimed a `services/` layer that doesn't exist; business logic lives inside the handlers.)*

```
cmd/
└── main.go                    # entry point + all route definitions (r.Run(":8080"))
internal/
├── database/
│   └── postgres.go            # GORM connection + pool from .env
├── handlers/                  # API entry points AND business logic
│   ├── agriculture_handler.go
│   ├── auth_handler.go
│   ├── collection_handler.go
│   ├── form_handler.go        # dynamic forms: tasks, submissions, dissection
│   ├── processing_handler.go
│   └── ref_handler.go         # lookup/dropdown data
├── middleware/
│   └── auth_middleware.go     # JWT cookie validation
└── models/                    # GORM structs: auth, farmer, farm, plot, batch, harvest, hub, processing_station, ref
.env                           # environment variables
```

## Architecture notes

- There is **no service layer** — handlers do transport *and* business logic. The README's "Clean Architecture" claim describes the intent, not the code.
- Database connection setup is isolated in `internal/database/`, but queries themselves live in the handlers via GORM.

## Run

Prerequisite: Docker + Docker Compose (`Dockerfile` and `docker-compose.yml` are in the repo), `.env` file configured.

```bash
docker compose up -d --build
```

Code quality: `go fmt`, `go vet`.

## Auth model

JWT signed with `JWT_KEY`, delivered as a **cookie** (`JWT_NAME`). Routes are split into `public` (`/public/login`, `/public/register`, `/public/test`) and `protected` — the JWT middleware validates the cookie and puts only `user_id` into the Gin context (no roles in the token; see [GO-2](/docs/phase-0#4-go-mobile-backend)).

Full endpoint list and sequence diagrams: [Go Server Walkthrough](/docs/phase-0/go-server-walkthrough).

## Gotchas

- The form-dissection logic in `form_handler.go` writes to domain tables **by convention, not FK enforcement** in some spots — notably `form.response.task_log_id`, which actually holds a `task_id` and has no FK ([C2](/docs/critical-issues#c2)). Be careful when extending submission handling.
- Reference dropdown consistency depends on the `ref.*_constant` mirror tables, which are trigger-maintained — and those triggers are the ones broken in `other.sql` ([C1](/docs/critical-issues#c1)).
- GORM models in `internal/models/` are a **second, independent definition of the schema** — after any DB change, update them by hand and check they still match what jOOQ generates on the Kotlin side ([GO-1](/docs/phase-0#4-go-mobile-backend)).

## See also

- [Go Server Walkthrough](/docs/phase-0/go-server-walkthrough) — sequence diagrams, file-by-file guide, full API list
- [Weak-Point Register — GO items](/docs/phase-0#4-go-mobile-backend)
- [Mobile App](/docs/components/mobile-app) — the client this server serves
