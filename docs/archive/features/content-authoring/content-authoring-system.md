# Content Authoring System — Product Document

> Last updated: February 2026.
> This document is the full context for anyone (human or AI) working on the content authoring pipeline for the portfolio site.

---

## The Problem

The portfolio site is a block-based canvas system. Every page in the sidebar renders as an ordered sequence of typed content blocks — iframe previews, metadata strips, long-form text, images, videos, and dividers. The rendering pipeline is solid. The data model is extensible. But for the first five PRDs, all content lived inside a single TypeScript file (`src/data/pages.ts`). Adding a new project meant editing code. That doesn't scale, and it blocks the eventual goal: AI-assisted content authoring.

This system solves that by moving project content into standalone Markdown files that get parsed into the block model at build time. The rendering layer never changes. The authoring experience becomes: write a `.md` file, save it, see it on the site.

---

## How It Works

### The Pipeline

```
  .md file               Vite plugin               Block data              Canvas
  (authored)    ───►    (build time)     ───►     (in memory)    ───►    (rendered)

  frontmatter            gray-matter               PageNode               ProjectCanvas
  + markdown body        + body parser              + Block[]              + BlockRenderer
```

1. A Markdown file is saved in `src/data/content/`.
2. A custom Vite plugin (`plugins/content-plugin.js`) reads all `.md` files at build time.
3. Each file is parsed: YAML frontmatter becomes page metadata and structured blocks (iframe, stats); the markdown body becomes text, image, video, and divider blocks.
4. The plugin exports a virtual module (`virtual:content-pages`) containing the full content tree as JSON.
5. `src/data/pages.ts` imports this tree and merges it with the static Home page entry.
6. The existing block rendering pipeline (PRD 05) renders everything. No component changes needed.

In dev mode, the Vite plugin watches the content directory. Any file change triggers a hot reload.

### What Lives Where

| Content | Location | Why |
|---|---|---|
| Home page | `src/data/pages.ts` (inline) | Uses custom blocks (`home-hero`, `home-social`) that can't be expressed in markdown. |
| Project pages | `src/data/content/**/*.md` | One file per page. Parsed at build time. |
| Block type definitions | `src/data/pages.ts` | TypeScript types shared by both static and generated content. |
| Parser + plugin | `plugins/content-plugin.js` | Build-time only. Not shipped to browser. |

---

## The Markdown File Format

Every project page is a single `.md` file. The file has two parts: YAML frontmatter for metadata and structured blocks, and a markdown body for written content.

### Frontmatter

```yaml
---
name: "Project Name"              # Required. Sidebar label.
id: project-name                   # Optional. Defaults to filename.
year: 2025                         # Optional. For filtering/sorting.
featured: true                     # Optional. Reserved for future use.
order: 1                           # Optional. Sort position within folder.
iframe: https://example.com        # Optional. → IframeBlock (first block).
stats:                             # Optional. → StatsBlock (second block).
  - React
  - TypeScript
  - label: GitHub
    href: https://github.com/...
---
```

### Body Conventions

The markdown body is parsed linearly into blocks:

| You write | It becomes |
|---|---|
| `## Heading` followed by paragraphs | TextBlock with `title` and `body` |
| Paragraphs without a heading | TextBlock with no title |
| `---` | DividerBlock |
| `![alt](src)` on its own line | ImageBlock |
| `> caption` after an image | Sets the image caption |
| `[video](embedUrl)` on its own line | VideoBlock |
| `> caption` after a video | Sets the video caption |

Only `##` (h2) headings start new text blocks. Other heading levels are treated as markdown content within the text body.

### Block Generation Order

The final block array for any page is assembled as:

1. IframeBlock (from frontmatter `iframe`, if present)
2. StatsBlock (from frontmatter `stats`, if present)
3. Body blocks (in the order they appear in the markdown)

This matches the established visual pattern: hero preview first, metadata strip second, then authored content.

### Complete Example

```markdown
---
name: "Experiment 1"
year: 2025
featured: true
iframe: https://example.com
stats:
  - React
  - Vite
  - Tailwind CSS
  - "2025"
  - label: GitHub
    href: https://github.com/nagbharat92
---

## What I built

This is a sandbox for trying new ideas — small, fast experiments
built to learn something specific rather than ship something polished.

---

![Screenshot of the homepage](https://example.com/screenshot.png)
> A caption describing this image.

## How it came together

Started with a question: what if the portfolio was the project?

---

[video](https://www.youtube.com/embed/dQw4w9WgXcQ)
> A walkthrough of the build process.

Final reflections go here. No heading needed for this section.
```

---

## Directory Structure and Sidebar Mapping

```
src/data/content/
├── personal-work/
│   ├── experiment-1.md       → Page: "Experiment 1" inside folder "Personal Work"
│   └── portfolio-site.md     → Page: "Portfolio Site" inside folder "Personal Work"
└── professional/
    └── project-x.md          → Page: "Project X" inside folder "Professional"
```

- Each subdirectory becomes a **FolderNode** in the sidebar.
- Each `.md` file becomes a **PageNode** (leaf) inside its parent folder.
- Folder names: derived from directory names via kebab-case → Title Case (`personal-work` → "Personal Work").
- Files/folders starting with `_` or `.` are ignored.
- Page ordering within a folder: by frontmatter `order` (ascending), then alphabetically by `name`.
- Folder ordering: alphabetical by derived name.
- Nesting is supported to any depth.

---

## The Tech Stack for This System

| Piece | What | Why |
|---|---|---|
| `gray-matter` (npm) | Parses YAML frontmatter from markdown strings | Standard, lightweight, build-time only |
| `plugins/content-plugin.js` | Custom Vite plugin | Watches `.md` files, parses them, provides virtual module |
| `virtual:content-pages` | Vite virtual module | Generated at build time. Exports `contentTree` as JSON. Not a real file on disk. |
| `src/vite-env.d.ts` | TypeScript declaration | Tells TypeScript the virtual module exists and what it exports |

---

## How to Add a New Project Page

1. Create a `.md` file in the appropriate folder under `src/data/content/`.
2. Add frontmatter with at least `name`.
3. Write the body using the conventions above.
4. Save. In dev mode, the page appears in the sidebar after hot reload. In production, it appears after the next build and deploy.

No TypeScript, no imports, no component wiring. Just a markdown file.

---

## The Rendering Layer (unchanged)

For context, the block rendering pipeline was built in PRDs 04 and 05. It is completely independent of how content is authored.

| Component | Role |
|---|---|
| `canvas.tsx` | AnimatePresence crossfade between pages |
| `project-canvas.tsx` | Renders a page's block array in a scrollable column |
| `block-renderer.tsx` | Exhaustive switch: dispatches each block to its renderer |
| `iframe-block.tsx` | 4:3 aspect ratio live preview card |
| `stats-block.tsx` | Horizontal metadata strip with dot separators |
| `text-block.tsx` | Markdown body via react-markdown + remark-gfm |
| `image-block.tsx` | Full-width image with optional caption |
| `video-block.tsx` | 16:9 YouTube embed |
| `divider-block.tsx` | Horizontal rule |
| `custom-block.tsx` | Registry-based escape hatch for unique components |

Every block is wrapped in `FadeInUp` for staggered entrance animation. The animation system is defined in `docs/motion/content-transition-prd.md`.

---

## The Site Architecture (for context)

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| UI Primitives | shadcn/ui (Radix UI) |
| Icons | lucide-react |
| Animation | Framer Motion (page crossfade) + CSS (block entrance) |
| Markdown rendering | react-markdown + remark-gfm |
| Routing | Hash-based (`#/path`) — GitHub Pages compatible |
| Deployment | GitHub Pages via GitHub Actions (`actions/deploy-pages`) |
| Hosting | GitHub Pages project site — base path `/portfolio/` |

The site is structured as a file-system metaphor: collapsible sidebar on the left (folders and pages), block-based canvas on the right. Content is data-driven — adding a page or a block type never requires changes to the rendering code.

---

## What Exists (PRD History)

| PRD | What it built |
|---|---|
| 01 | PageNode tree, hash routing, sidebar navigation |
| 02 | Home page with FadeInUp stagger animation |
| 03 | State persistence (localStorage + URL) |
| 04 | Block type system — refactored PageNode to use `blocks: Block[]` |
| 05 | Full block rendering pipeline — ProjectCanvas, BlockRenderer, all renderers |
| 06 | **This system** — markdown content files, Vite plugin, build-time parsing |

---

## What's Next

### VS Code Content-Authoring Skill (separate project)

The next step is a VS Code skill that automates content creation. The skill will:

1. Interview the author — ask about the project, what was built, what tools were used, what the interesting decisions were.
2. Research — look up relevant context, technical details, anything that enriches the narrative.
3. Accept a Google Drive link for images — pull image URLs for use in ImageBlocks.
4. Generate a complete `.md` file in the format specified above — frontmatter, structured body, images placed in context.
5. Save the file to `src/data/content/` in the correct folder.

The skill outputs exactly the file format this system consumes. No intermediary. The author reviews and edits the markdown, then commits.

This skill is a **separate project** from the portfolio site. It lives in its own VS Code workspace and has its own development lifecycle. This product document exists partly to give that skill full context of the system it generates content for.

### Other Future Work

- **`_folder.yaml`** — optional file per directory to override auto-derived folder names and set explicit sort order.
- **Relative image paths** — support for images stored alongside content (e.g., a page directory with `index.md` + image files).
- **Search / filter** — find pages across the sidebar tree.
- **Content validation** — a CLI script that checks all `.md` files parse correctly before deploy.

---

## Working Rules

1. **PRDs only.** No direct code changes from conversation. All code goes through a PRD that the agent in VS Code executes.
2. **Model/Mode section** is always the first thing in a PRD after the title. Format: code block with Model, Mode, Context, and an instruction block for the agent.
3. **Model:** Claude Opus 4.6 (3x). **Mode:** Plan for architectural work, Agent for well-specified changes.
4. **One PRD at a time.** Test before writing the next.
5. **Agents read referenced docs** before touching any file.
6. **`npx tsc --noEmit`** is always part of the verification checklist.
