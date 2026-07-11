---
sidebar_position: 5
---

# Mobile App (Flutter)

**Location:** `cocoa_project_transfer/cocoa-app-poc-0.2/` · **Stack:** Flutter 3.9+ (Dart ^3.9.2), BLoC, MapLibre GL, Material 3 · **Talks to:** the Go mobile backend

The field app for **Farmer / Processor / Collector** roles. UI is Thai (font: NotoSansThaiLooped). User-facing manuals per role are in the [Archive → Manuals](/docs/archive/manuals).

## Key design decisions

### 1. Offline-first

Cocoa plantations often have unstable connectivity, so the app is built to work offline:

- **Fetch:** network first; if offline, fall back to the latest cache in `shared_preferences` (key-value). A 10-second timeout also triggers the cache fallback, so the app never hangs.
- **Mutations:** queued locally with `pending` status and synchronized when connectivity returns.
- **Conflict resolution:** timestamps + UUIDs detect duplicates (UUID PKs in the DB make offline inserts safe).

### 2. Dynamic role-based forms

Three roles see different form sets (Agronomy, Logistics, Processing). Forms render from `schema.json` — planned to be served by the backend in the future — so new form types can be added without touching the core structure.

### 3. `ServiceProvider` — single data gateway

All HTTP + local storage goes through `lib/services/service_provider.dart`:

- Session management (cookie-based auth)
- Unified GET/POST/PUT/DELETE
- Mock mode vs real mode for development
- **The backend host is configured here** — change it in `service_provider.dart` when pointing at a different server.

### 4. Multi-flavor (white-label) strategy

Built to serve multiple cooperatives: logos, colors, and API endpoints come from `assets/schema.json` + YAML configs rather than hard-coded values.

## Features

- **Identity:** register/login, role selection (Farmer / Processor / Collector)
- **Registration:** farms & plots, processing stations, hubs
- **Activity forms:** plot activities, fertilizer, chemicals, pest/disease reports (Agronomy); delivery + lot management (Logistics); grading, fermentation, drying (Processing)
- **Home calendar** of assigned daily tasks; all submitted forms can be viewed and edited later

## Code structure (`lib/`)

*(Verified against the repo — the original README's `blocs/` and `screens/` names were wrong.)*

| Path | Purpose |
|---|---|
| `main.dart` / `route.dart` | Entry point and routing |
| `bloc/` | BLoC state management, one folder per feature (login, farm, plot, hub, batch, task, dynamic, …) |
| `models/` | Data classes + JSON (de)serialization |
| `widgets/pages/` | Full-screen pages (login, home, registrations, dynamic forms, …) |
| `widgets/components/` | Reusable form inputs (`form_input`, `dropdown_input`, `gis_input`, `upload_input`, …) and scaffolds |
| `services/` | HTTP, GPS, files — one service per domain, plus `service_provider.dart` |

## Run & build

```bash
flutter pub get
flutter run                      # with an emulator running

flutter build apk --release      # Android APK
flutter build appbundle          # Play Store bundle
flutter build ipa                # iOS (requires macOS + Xcode)
```

## Performance test artifacts

A recorded performance test (screen recording, `cpu.json`, `memory.csv`, `network.json`) is archived at `cocoa_project_transfer/Flutter Performance Test/`.

## See also

- [Flutter App Technical Analysis](/docs/phase-0/flutter-analysis) — full architecture writeup (BLoC layers, offline sync, dynamic forms)
- [Weak-Point Register — APP items](/docs/phase-0#5-flutter-mobile-app) — hardcoded LAN URL, plain HTTP, unencrypted storage
- [Go Server](/docs/components/go-server) — the backend this app talks to
- [User Manuals (Thai)](/docs/archive/manuals) — per-role guides for v0.2
