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

```
cmd/
└── main.go                    # entry point + route definitions
internal/
├── database/                  # connection & DB primitives
├── handlers/                  # API entry points
│   ├── agriculture_handler.go
│   ├── auth_handler.go
│   ├── collection_handler.go
│   ├── form_handler.go        # dynamic forms: tasks, submissions, dissection
│   ├── processing_handler.go
│   └── ref_handler.go         # lookup/dropdown data
├── middleware/                # token checks, logging
├── models/                    # auth, farmer, farm, plot, batch, harvest, hub, processing_station, ref
└── services/                  # business logic
env                            # environment variables
```

## Architecture rules (keep these)

- Handlers (transport), services (business logic), and models (schemas) stay decoupled.
- Database operations are isolated in `internal/database/` so the schema can evolve without breaking endpoints.

## Run

Prerequisite: Docker + Docker Compose, `env` file configured.

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
