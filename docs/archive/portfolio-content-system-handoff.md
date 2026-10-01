# Handoff — Portfolio Content Authoring System

---

## 1. What We're Building

A personal portfolio site with a markdown-driven content pipeline. Project pages are authored as `.md` files, parsed at build time by a custom Vite plugin into a typed block data model, and rendered by a block-based canvas system. The next piece is a VS Code skill (separate repo) that automates content creation by interviewing the author and generating these `.md` files.

---

## 2. Current State

### Portfolio site (working, deployed)

- **Repo:** GitHub repo (`nagbharat92/portfolio`), deployed via GitHub Pages — project site at `/portfolio/`
- **Local path:** The user's portfolio project folder (opened in Cowork)
- **Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, Framer Motion + CSS animations, hash-based routing
- **Vite config:** `vite.config.js` — includes `contentPlugin()`, `react()`, `tailwindcss()`, base path `/portfolio/` in production

### What's built and working

- **Sidebar navigation** — collapsible folder tree, hash routing (`#/page-id`), state persisted to localStorage
- **Block rendering pipeline** — `ProjectCanvas` → `BlockRenderer` → individual block renderers (iframe, stats, text, image, video, divider, custom)
- **Animation system** — Framer Motion crossfade between pages (200ms), CSS FadeInUp stagger for block entrance (1.4s expo-out)
- **Design system** — two-tier CSS custom property tokens (primitive → semantic), documented in `docs/design-system/`
- **Markdown content system (PRD 06)** — fully implemented:
  - Content files live in `src/data/content/` with folder-based sidebar mapping
  - Vite plugin at `plugins/content-plugin.js` parses `.md` files at build time via `gray-matter`
  - Virtual module `virtual:content-pages` exports `contentTree` as JSON
  - `src/data/pages.ts` imports `contentTree` and merges with static Home page
  - Dev server hot-reloads on `.md` file changes
  - One example file exists: `src/data/content/personal-work/experiment-1.md`

### Key file paths

```
docs/
  features/
    canvas/
      feature-canvas-prd-01 through 06
    content-authoring/
      content-authoring-system.md        ← THE PRODUCT DOC (full spec for the content system)
  design-system/
    01 through 05 (token docs)
  PROJECT-SUMMARY.md

plugins/
  content-plugin.js                      ← Vite plugin (parser + directory walker)

src/
  data/
    pages.ts                             ← Types, Home page, helpers, imports virtual:content-pages
    content/
      personal-work/
        experiment-1.md                  ← First real content file
  components/
    blocks/                              ← All block renderers
    canvas.tsx, project-canvas.tsx       ← Canvas rendering
    folder-tree.tsx, app-sidebar.tsx     ← Sidebar navigation
  vite-env.d.ts                          ← Type declaration for virtual:content-pages
```

### VS Code content-authoring skill (not started)

This is the next project. It will be a **separate Git repo** and **separate VS Code workspace**.

---

## 3. Decisions Made

- **One `.md` file per project page** — not one big file, not JSON, not TypeScript data. Markdown with YAML frontmatter.
- **Folder-based sidebar mapping** — directory structure under `src/data/content/` mirrors sidebar tree. `personal-work/` → "Personal Work" folder. Kebab-case → Title Case.
- **Build-time parsing via Vite plugin** — no markdown shipped to browser. Plugin generates JSON virtual module. Chose this over runtime parsing because GitHub Pages can't list directories at runtime.
- **Home page stays in `pages.ts`** — it uses custom blocks (`home-hero`, `home-social`) that can't be expressed in markdown.
- **Separate repo for the content skill** — different lifecycle, different consumer, no shared code. The `.md` file format is the contract between the two projects.
- **Skill writes to local portfolio path** — no cross-repo GitHub sync. The skill saves `.md` files directly to the portfolio's `src/data/content/` directory via a configured path. Author reviews and commits from the portfolio repo.
- **Copy the product doc into the skill repo** — the skill carries its own copy of `content-authoring-system.md` so it's self-contained. No live dependency on the portfolio's docs folder.
- **Model for PRDs:** Claude Opus 4.6 (3x). Plan mode for architectural work, Agent mode for well-specified changes.
- **PRD convention:** Model/Mode block first, then instruction block with exact file operations, then spec, then verification checklist.

---

## 4. Things That Didn't Work

- **Cross-repo GitHub workflow sync** — considered having the skill repo push `.md` files to the portfolio repo via GitHub Actions. Dropped because it automates the trivial step (file transfer) and skips the important one (content review before publish). Adds token/workflow complexity for no real gain at current scale.

---

## 5. Open Questions

- **Skill project structure** — not yet designed. Needs its own SKILL.md, a docs folder with the copied product doc, and a configuration mechanism for the output path (`CONTENT_DIR`).
- **Google Drive image workflow** — the skill should accept a Drive link and pull image URLs for ImageBlocks. Exact mechanism (direct share links, Drive API, manual URL extraction) hasn't been specified.

---

## 6. Next Steps

1. **Create the content-authoring skill repo** — new Git repo, new VS Code workspace.
2. **Copy `docs/features/content-authoring/content-authoring-system.md`** into the skill repo's own `docs/` folder as its reference spec.
3. **Design the skill** — a SKILL.md that instructs the agent to interview the author, research the project, accept image URLs, and generate a `.md` file matching the spec.
4. **Configure output path** — the skill needs to know where the portfolio's content directory lives on disk (e.g., env var or settings file).
5. **Test end-to-end** — skill generates a `.md` file → file appears in portfolio's content dir → Vite dev server picks it up → page renders in sidebar.

---

## 7. Working Context

- **No code changes in conversation.** Bharat brainstorms and writes PRDs here (Cowork / Claude desktop). Code execution happens in VS Code with Claude Opus 4.6 in Agent or Plan mode.
- **PRD-driven workflow.** Every code change is specified in a PRD first. The PRD includes a Model/Mode block, an agent instruction block with exact file operations, and a verification checklist. The agent in VS Code reads the PRD and executes it.
- **Design philosophy.** Bharat values restraint, first-principles thinking, and simplicity as the result of invisible decisions — not minimalism for its own sake. See his user preferences for the full philosophy. An agent making UI/UX decisions should read `docs/design-system/` and internalize the design token system before touching anything visual.
- **Content creation plugin exists** — there's a `content-creation` skill already installed in Cowork (see available skills). This is separate from the VS Code skill being built. The VS Code skill is specifically for generating `.md` files that the portfolio's Vite plugin consumes.

---

## Suggested Opening Message

```
I'm continuing from a previous conversation. I've attached the handoff document — please read it fully before responding. Pick up from the next steps section.
```
