# Feature Canvas PRD 06 — Markdown Content System

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Plan (then Agent)
Context: Standard
```

**Instruction for Plan mode:**
```
Read @docs/features/canvas/feature-canvas-prd-06-markdown-content.md in full.
Read @src/data/pages.ts to understand existing types and data.
Read @vite.config.js to understand current build setup.
Plan the implementation, then execute.
```

**Instruction for Agent mode (after plan is approved):**
```
Read @docs/features/canvas/feature-canvas-prd-06-markdown-content.md in full before doing anything.
Install dependencies first, then create and modify files in the order listed.
  INSTALL: gray-matter
  NEW:     src/data/content/personal-work/experiment-1.md
  NEW:     plugins/content-plugin.js
  NEW:     src/vite-env.d.ts (or modify if it exists)
  MODIFY:  src/data/pages.ts
  MODIFY:  vite.config.js
Touch no other files. Run the verification checklist when done.
```

---

## What This PRD Does

Moves project content out of `pages.ts` and into individual Markdown files — one `.md` file per project page. A Vite plugin reads these files at build time, parses them into the existing `PageNode` + `Block[]` data model, and provides them as a virtual module. The site's rendering layer is untouched.

After this PRD:

- Project pages are authored as `.md` files in `src/data/content/`, one per page.
- The directory structure inside `content/` maps directly to the sidebar folder tree.
- Frontmatter holds metadata (name, year) and structured blocks (iframe URL, stats).
- The markdown body holds written content, images, videos, and dividers using simple conventions.
- A Vite plugin parses everything at build time — no markdown in the browser bundle.
- The dev server hot-reloads when any `.md` file is added, edited, or deleted.
- Home page stays in `pages.ts` (it uses custom blocks that can't be expressed in markdown).

---

## What This PRD Does NOT Do

- Change any component, renderer, or UI file. The block rendering pipeline from PRD 05 is untouched.
- Build the VS Code content-authoring skill. That is a separate future effort.
- Add new block types. The existing seven types are sufficient.
- Handle the Home page. Home uses custom blocks and stays as TypeScript data in `pages.ts`.

---

## Dependencies

```
npm install gray-matter
```

`gray-matter` parses YAML frontmatter from markdown strings. Used by the Vite plugin at build time only — it is not shipped to the browser.

---

## The Markdown Content File Format

This is the specification for `.md` files in `src/data/content/`. Every project page is one file.

### Frontmatter fields

```yaml
---
name: "Portfolio Site"          # Required. Page name shown in sidebar.
id: portfolio-site              # Optional. Defaults to filename (without .md).
year: 2025                      # Optional. Metadata for future filtering/sorting.
featured: true                  # Optional. Reserved for future use.
order: 1                        # Optional. Sort order within folder. Default: alphabetical by name.
iframe: https://example.com   # Optional. Live preview URL → becomes first IframeBlock.
stats:                          # Optional. Metadata strip → becomes StatsBlock after iframe.
  - React
  - Vite
  - Tailwind CSS
  - "2025"
  - label: GitHub
    href: https://github.com/nagbharat92
---
```

**Stats format:** Each item is either a plain string (becomes `{ label: string }`) or an object with `label` and optional `href`. Numbers like `2025` must be quoted to stay as strings.

### Body conventions

The markdown body is parsed top-to-bottom into blocks using these rules:

| Syntax | Resulting block |
|---|---|
| `## Heading` | Starts a new **TextBlock** with `title` set to the heading text. All following paragraphs become the `body` (as raw markdown). |
| Paragraphs (no heading above) | **TextBlock** with no `title`. |
| `---` | **DividerBlock**. |
| `![alt](src)` on its own line | **ImageBlock**. `alt` → `alt` field, `src` → `src` field. |
| `> caption text` immediately after an image | Sets the `caption` field on the preceding ImageBlock. |
| `[video](embedUrl)` on its own line | **VideoBlock**. Must use the YouTube `/embed/` URL format. |
| `> caption text` immediately after a video | Sets the `caption` field on the preceding VideoBlock. |

**Important parsing rules:**

1. The parser processes lines sequentially. When it encounters a heading, divider, image, or video, it first flushes any accumulated text into a TextBlock, then processes the new element.
2. Only `##` (h2) headings create titled text blocks. Do not use `#` (h1) or `###` (h3) — they will be treated as regular markdown inside the text body.
3. Multiple paragraphs under the same heading are joined into one TextBlock body, preserving the original markdown (line breaks, bold, links, lists all pass through).
4. A `---` that separates frontmatter from body is handled by `gray-matter` and is not seen by the body parser. Only `---` lines in the body produce DividerBlocks.
5. Blank lines between blocks are ignored by the parser (they are not accumulated into text).

### Block generation order

For a file with both frontmatter blocks and body blocks, the final `blocks` array is assembled as:

1. **IframeBlock** — from frontmatter `iframe` field (if present)
2. **StatsBlock** — from frontmatter `stats` field (if present)
3. **Body blocks** — in the order they appear in the markdown body

This matches the existing convention established by Experiment 1: hero preview first, metadata strip second, then authored content.

### Complete example

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

This is a sandbox for trying new ideas — small, fast experiments built to learn something specific rather than ship something polished.

The site itself became the first experiment. Building a canvas-based portfolio in public, one PRD at a time, turned out to be more interesting than the projects it was meant to showcase.

---

![Placeholder — replace with a real screenshot or asset.](https://picsum.photos/seed/experiment1/1200/800)
> Replace this with a screenshot or process image.

## How it came together

Started with a question: what if the portfolio was the project?

Each piece — the design system, the canvas layout, the block-based content model — was designed first, then built. PRDs written before a single line of code. Constraints chosen deliberately.

The result is a site that can grow without getting messy. Adding a new project means adding a block array. Adding a new kind of content means adding a new block type.

---

[video](https://www.youtube.com/embed/dQw4w9WgXcQ)
> Replace this with your own video embed URL.

Building things in the open has taught me more than any tutorial ever could.

Each experiment started with a single question — what happens if I just try it? Some went nowhere. A few turned into something worth keeping. All of them taught me something.

This is that collection. Unpolished by design. The point was never the output.
```

This example produces the exact same block sequence as the current Experiment 1 in `pages.ts`.

---

## Directory structure

```
src/data/content/
└── personal-work/
    └── experiment-1.md
```

**Mapping rules:**

- Each subdirectory becomes a **FolderNode** in the sidebar tree.
- Each `.md` file becomes a **PageNode** (leaf) inside its parent folder.
- Folder names are derived from directory names: kebab-case → Title Case (`personal-work` → "Personal Work").
- Files and folders starting with `_` or `.` are ignored.
- Nested directories are supported to any depth (a folder inside a folder).

**Ordering:**

- Pages within a folder: sorted by frontmatter `order` field (ascending), then alphabetically by `name`.
- Folders: sorted alphabetically by derived name.

---

## Target State — file by file

---

### `src/data/content/personal-work/experiment-1.md` — NEW

The existing Experiment 1 content from `pages.ts`, converted to the markdown format. Use the exact content from the "Complete example" section above.

---

### `plugins/content-plugin.js` — NEW

A Vite plugin that:

1. **Resolves** the virtual module ID `virtual:content-pages`.
2. **Loads** it by scanning `src/data/content/`, parsing all `.md` files, and generating a JavaScript module that exports the content tree as JSON.
3. **Watches** the content directory in dev mode — any `.md` file change (add, edit, delete) invalidates the virtual module and triggers a full reload.

```js
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = 'src/data/content'
const VIRTUAL_ID = 'virtual:content-pages'
const RESOLVED_ID = '\0virtual:content-pages'

export default function contentPlugin() {
  return {
    name: 'portfolio-content',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return generateModule()
    },

    configureServer(server) {
      const contentDir = path.resolve(CONTENT_DIR)

      // Ensure directory exists before watching
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true })
      }

      server.watcher.add(contentDir)

      const reload = (file) => {
        if (!file.endsWith('.md')) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

// ─── Module generation ─────────────────────────────────────────────────────

function generateModule() {
  const contentDir = path.resolve(CONTENT_DIR)
  if (!fs.existsSync(contentDir)) {
    return 'export const contentTree = []'
  }
  const tree = walkDirectory(contentDir)
  return `export const contentTree = ${JSON.stringify(tree, null, 2)}`
}

// ─── Directory walker ──────────────────────────────────────────────────────

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const folders = []
  const pages = []

  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      const children = walkDirectory(path.join(dir, entry.name))
      if (children.length > 0) {
        folders.push({
          id: entry.name,
          type: 'folder',
          name: toTitleCase(entry.name),
          children,
        })
      }
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(path.join(dir, entry.name), 'utf-8')
      const filename = entry.name.replace(/\.md$/, '')
      const result = parseContentFile(raw, filename)
      pages.push(result)
    }
  }

  // Sort pages: explicit order first, then alphabetical by name
  pages.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.page.name.localeCompare(b.page.name)
  })

  // Sort folders alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name))

  // Return folders first, then pages (pages are unwrapped from the helper object)
  return [...folders, ...pages.map((p) => p.page)]
}

// ─── Markdown file parser ──────────────────────────────────────────────────

function parseContentFile(raw, filename) {
  const { data: fm, content } = matter(raw)

  const blocks = []

  // 1. Iframe block from frontmatter
  if (fm.iframe) {
    blocks.push({ type: 'iframe', url: fm.iframe })
  }

  // 2. Stats block from frontmatter
  if (fm.stats && fm.stats.length > 0) {
    blocks.push({
      type: 'stats',
      items: fm.stats.map((s) => {
        if (typeof s === 'string') return { label: s }
        if (typeof s === 'number') return { label: String(s) }
        return s
      }),
    })
  }

  // 3. Parse body into blocks
  blocks.push(...parseBody(content))

  return {
    page: {
      id: fm.id ?? filename,
      type: 'page',
      name: fm.name ?? toTitleCase(filename),
      ...(fm.year != null ? { year: fm.year } : {}),
      ...(fm.featured != null ? { featured: fm.featured } : {}),
      blocks,
    },
    order: fm.order ?? Infinity,
  }
}

// ─── Body parser ───────────────────────────────────────────────────────────

function parseBody(body) {
  const blocks = []
  const lines = body.split('\n')

  let currentTitle = undefined
  let currentLines = []

  function flushText() {
    const text = currentLines.join('\n').trim()
    if (text) {
      const block = { type: 'text', body: text }
      if (currentTitle) block.title = currentTitle
      blocks.push(block)
    }
    currentTitle = undefined
    currentLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines that aren't inside a text accumulation
    if (trimmed === '' && currentLines.length === 0 && currentTitle == null) {
      continue
    }

    // Divider: --- (three or more hyphens, nothing else)
    if (/^-{3,}$/.test(trimmed)) {
      flushText()
      blocks.push({ type: 'divider' })
      continue
    }

    // Heading: ## Title (only h2)
    const headingMatch = trimmed.match(/^##\s+(.+)$/)
    if (headingMatch) {
      flushText()
      currentTitle = headingMatch[1]
      continue
    }

    // Image: ![alt](src) — must be the entire line
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushText()
      const alt = imgMatch[1] || undefined
      const src = imgMatch[2]
      const imageBlock = { type: 'image', src }
      if (alt) imageBlock.alt = alt

      // Check next non-blank line for > caption
      if (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim()
        const captionMatch = nextTrimmed.match(/^>\s*(.+)$/)
        if (captionMatch) {
          imageBlock.caption = captionMatch[1]
          i++ // skip caption line
        }
      }
      blocks.push(imageBlock)
      continue
    }

    // Video: [video](url) — must be the entire line (case-insensitive "video")
    const videoMatch = trimmed.match(/^\[video\]\(([^)]+)\)$/i)
    if (videoMatch) {
      flushText()
      const videoBlock = { type: 'video', embedUrl: videoMatch[1] }

      // Check next non-blank line for > caption
      if (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim()
        const captionMatch = nextTrimmed.match(/^>\s*(.+)$/)
        if (captionMatch) {
          videoBlock.caption = captionMatch[1]
          i++
        }
      }
      blocks.push(videoBlock)
      continue
    }

    // Regular line — accumulate for text block
    currentLines.push(line)
  }

  // Flush any remaining text
  flushText()

  return blocks
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function toTitleCase(kebab) {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
```

---

### `src/vite-env.d.ts` — NEW (or MODIFY if it exists)

Type declaration for the virtual module so TypeScript can import it.

```ts
/// <reference types="vite/client" />

declare module 'virtual:content-pages' {
  import type { SidebarNode } from '@/data/pages'
  export const contentTree: SidebarNode[]
}
```

If `src/vite-env.d.ts` already exists, add the `declare module` block to it. Do not remove the existing `/// <reference types="vite/client" />` line.

---

### `src/data/pages.ts` — MODIFY

Three changes:

**1. Add import at the top of the file (after the header comment, before type definitions):**

```ts
import { contentTree } from 'virtual:content-pages'
```

**2. Remove Experiment 1 from `sidebarData`.**

Remove the entire `personal-work` FolderNode and its children. The `sidebarData` array becomes:

```ts
export const sidebarData: SidebarNode[] = [
  {
    id: 'home',
    type: 'page',
    name: 'Home',
    blocks: [
      {
        type: 'custom',
        componentId: 'home-hero',
      },
      {
        type: 'text',
        body: `I spend my time at the intersection of design and engineering — making things that feel considered, building tools that get out of the way, and learning in public. Currently exploring what thoughtful product design looks like at a smaller scale.

This site is a living project. Everything here — the design system, the canvas, the tools — is being built from scratch and in the open. Work in progress by design.`,
      },
      {
        type: 'custom',
        componentId: 'home-social',
      },
    ],
  },

  // Content pages — generated from .md files in src/data/content/
  ...contentTree,
]
```

**3. Everything else stays exactly as-is.** All type definitions (`Block`, `IframeBlock`, `StatsBlock`, `TextBlock`, `ImageBlock`, `VideoBlock`, `DividerBlock`, `CustomBlock`, `PageNode`, `FolderNode`, `SidebarNode`), all helper functions (`findPage`, `collectFolderIds`, `findAncestorFolderIds`), and the file header comment remain unchanged.

---

### `vite.config.js` — MODIFY

Import and register the content plugin.

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import contentPlugin from './plugins/content-plugin.js'

export default defineConfig({
  plugins: [contentPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/portfolio/' : '/',
})
```

Note: `contentPlugin()` is listed first so the virtual module is resolved before other plugins process imports.

---

## What does NOT change

- Every file in `src/components/` — the entire rendering pipeline is untouched.
- `src/index.css` — no style changes.
- `src/lib/` — utilities unchanged.
- `src/hooks/` — unchanged.
- Block type definitions in `pages.ts` — unchanged.
- Helper functions in `pages.ts` — unchanged.
- Home page content in `pages.ts` — unchanged.

---

## Future extensions (not part of this PRD)

These are documented for context. Each would be a small, separate follow-up.

- **`_folder.yaml`** — optional file inside a content directory to override the auto-derived folder name, set an explicit sort order, or add folder-level metadata.
- **VS Code content-authoring skill** — an AI-assisted tool that interviews the author, researches the project, and generates a complete `.md` file in the correct format.
- **Image handling** — a convention for storing images alongside content (e.g., `src/data/content/personal-work/experiment-1/` as a directory with `index.md` + image files), with the plugin resolving relative image paths.

---

## Verification checklist

After running in VS Code, test the following:

**Build and types:**
1. `npx tsc --noEmit` — zero errors.
2. `npm run dev` — dev server starts without errors.
3. `npm run build` — production build completes without errors.

**Content parity:**
4. Navigate to Experiment 1 in the sidebar. The page should render identically to before — same blocks in the same order: iframe → stats → text ("What I built") → divider → image → text ("How it came together") → divider → video → text.
5. Confirm the iframe shows `example.com`.
6. Confirm the stats strip shows: React · Vite · Tailwind CSS · 2025 · GitHub (link).
7. Confirm the YouTube video embed renders.
8. Confirm all FadeInUp animations still work (blocks stagger in).

**Home page unaffected:**
9. Navigate to Home. Renders exactly as before — hero, bio, social links.

**Hot reload (dev mode):**
10. Edit the `name` field in `experiment-1.md`. Save. The sidebar label should update after the page reloads.
11. Add a new file `src/data/content/personal-work/test-page.md` with minimal frontmatter (`name: "Test Page"`) and one text paragraph in the body. It should appear in the sidebar under "Personal Work" after reload.
12. Delete `test-page.md`. It should disappear from the sidebar after reload.

**Sidebar structure:**
13. The "Personal Work" folder in the sidebar should contain Experiment 1, same as before.
14. Collapsing and expanding the folder should work. State persistence (localStorage) should be unaffected.
