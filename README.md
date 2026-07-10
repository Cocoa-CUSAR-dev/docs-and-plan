# Cocoa Databank Docs

Team documentation site for the **Databank for Cocoa Supply Chain (Is Thai Cacao)** project, built with [Docusaurus](https://docusaurus.io/). It consolidates everything from `../cocoa_project_transfer/` into a browsable knowledge base.

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
