# Cocoa Databank Docs

Team documentation site for the **Databank for Cocoa Supply Chain (Is Thai Cacao)** project, built with [Docusaurus](https://docusaurus.io/). The single source of truth for architecture, the Phase 0 weak-point register, the fix plan, and the project log.

## The project (2026–2027 thesis)

A 10-month, two-phase modernization of the Cocoa Supply Chain Databank:

- **Phase I (mandatory, by Dec 2026):** add a **LINE OA AI chatbot** as a new farmer data-entry channel, modernize the farmer app, add SSO (LINE ↔ web), reminders, and web submission history. The existing form system stays in place — the chatbot is additive, **no data migration**. Tech-debt refactoring runs alongside every sprint.
- **Phase II (gated, Dec 2026 – Apr 2027):** Knowledge Base + Computer Vision cocoa-disease detection.

### Sibling repos (Cocoa-CUSAR-dev org)

| Repo | What it is |
|---|---|
| `cocoa-database` | Shared PostgreSQL schema/seed (the integration contract) |
| `cocoa-web-backend` | Kotlin + Spring Boot + jOOQ — researcher-side backend |
| `cocoa-mobile-backend` | Go + Gin + GORM — farmer-side backend |
| `cocoa-researcher-web` | Next.js researcher web portal |
| `cocoa-mobile-app` | Flutter farmer app (modernized in Phase I) |
| `cocoa-docs` | This site |

Start reading at `docs/intro.md` → `docs/phase-0/` (weak-point register) → `docs/plans/` (roadmap + sprint-sized fix map).

## Run locally

```bash
npm install
npm start          # dev server at http://localhost:3000
npm run build      # production build into build/
npm run serve      # serve the production build
```

## Where things go

| Content | Location | Notes |
|---|---|---|
| Living docs (setup, components, plans) | `docs/**/*.md` | Plain Markdown; sidebar auto-generates from folders + `sidebar_position` |
| Critical issue tracking | `docs/critical-issues.md` | Update the Status column when a fix lands |
| Decision / milestone log | `blog/YYYY-MM-DD-slug.md` | Rendered at `/log`; add yourself to `blog/authors.yml` |
| Snapshot documents (don't edit) | `docs/database/db-review.md`, `fix-decisions.md` | Frozen copies of the 2026-07-08 DB review |
| Diagrams (SVG/PNG) | `static/diagrams/` | Reference as `/diagrams/<name>` |
| Hosted PDFs/DOCX | `static/files/` | Keep it light — heavy files stay in the transfer folder and get indexed in `docs/archive/` |

## Conventions

- `.md` files are parsed as **CommonMark** (safe for pasted documents); use `.mdx` only if a page needs React.
- Admonition titles use bracket syntax: `:::warning[Title]`.
- Custom heading anchors: `## My Heading {#my-id}` — used heavily for cross-linking issue IDs (C1, D2, …).
- Mermaid diagrams work in fenced ` ```mermaid ` blocks.
- New "dead" documents (finished reports, old decks) go in the transfer folder + a row in `docs/archive/index.md`. Living knowledge becomes a real docs page.

## Deploying

The site is fully static. `npm run build` then host `build/` anywhere (GitHub Pages, Netlify, a university server). Before deploying, set the real `url` in `docusaurus.config.js`.
