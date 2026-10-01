# Feature Canvas PRD 04 — Data Model Refactor

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Agent
Context: Standard
```

**Instruction for Agent mode:**
```
Read @docs/features/canvas/feature-canvas-prd-04-data-model-refactor.md in full before doing anything.
Execute all changes described in the Target State section in order.
Modify exactly these files:
  MODIFY: src/data/pages.ts
Touch no other files. Run the verification checklist when done.
```

---

## What This PRD Does

Replaces the flat fields on `PageNode` with a composable `blocks` array — for every page in the canvas, including Home. This is a purely structural change. No UI is touched. After this PRD, every page's content is an ordered list of typed blocks that can be freely composed, reordered, and extended.

This is the foundation that PRD 05 (ProjectCanvas UI) builds on top of.

---

## What This PRD Does NOT Do

- Build any UI. The canvas still shows `HomeCanvas` and `ProjectPlaceholder` after this runs.
- Touch `canvas.tsx`, `home-canvas.tsx`, `folder-tree.tsx`, or any component file.
- Change `FolderNode`, `SidebarNode`, or any helper functions.

---

## Why every page uses blocks — including Home

The previous version treated Home as a special case: no blocks, content hardcoded directly in `home-canvas.tsx`. This created two different systems — one data-driven, one component-driven — for the same problem.

Every canvas page is now expressed as blocks. Home uses a `custom` block for its unique display elements (the large name + tagline header, and the social links row). Everything else in the canvas uses standard block types. There is no more special-casing in the data layer.

The `home-canvas.tsx` component is not deleted in this PRD — it stays in place until PRD 05 retires it when the block renderer is built. But Home's content of record is now in `pages.ts`.

---

## The `custom` block — escape hatch

Six standard block types handle the vast majority of content needs. The `custom` block is a deliberate escape hatch for content that has unique display requirements that don't map to any standard type.

A `custom` block carries a `componentId` string. In PRD 05, a component registry will map `componentId` strings to actual React components. The data stays clean; the rendering logic lives in the UI layer.

Use `custom` sparingly. Before reaching for it, ask whether a standard block type could cover the need. It exists for genuinely unique cases — like Home's hero display and social links — not as a shortcut to avoid fitting content into the system.

---

## Target State

### 1. Block types

Add all block type definitions to `src/data/pages.ts`, immediately before the `PageNode` type. Replace the existing `// ─── Types ───` section entirely with the following:

```ts
// ─── Block types ──────────────────────────────────────────────────────────────

/**
 * IframeBlock — embeds a live URL as the hero preview card.
 * Renders with a 4:3 aspect ratio, contained width, no browser chrome.
 * Omit this block for pages with no live URL.
 */
export type IframeBlock = {
  type: 'iframe'
  url: string
  caption?: string
}

/**
 * StatsBlock — a horizontal metadata strip.
 * Items are label-only. Provide href to make an item a link.
 *
 * Example:
 *   items: [
 *     { label: 'React' },
 *     { label: '2025' },
 *     { label: 'GitHub', href: 'https://github.com/...' },
 *   ]
 */
export type StatsBlock = {
  type: 'stats'
  items: Array<{
    label: string
    href?: string
  }>
}

/**
 * TextBlock — a written section.
 * title is optional. body is Markdown: bold, italic, links, lists, inline code.
 * One TextBlock per authored section — no need to split individual paragraphs.
 */
export type TextBlock = {
  type: 'text'
  title?: string
  body: string
}

/**
 * ImageBlock — a full-width image.
 * src can be any publicly accessible URL, including Google Drive direct-share links.
 */
export type ImageBlock = {
  type: 'image'
  src: string
  alt?: string
  caption?: string
}

/**
 * VideoBlock — embeds a YouTube video at 16:9 aspect ratio.
 * Use the embed URL format: https://www.youtube.com/embed/VIDEO_ID
 * Not the watch URL (/watch?v=...) — the embed URL (/embed/...).
 */
export type VideoBlock = {
  type: 'video'
  embedUrl: string
  caption?: string
}

/**
 * DividerBlock — a visual pause between sections.
 * No content. Renders as a subtle full-width horizontal separator.
 */
export type DividerBlock = {
  type: 'divider'
}

/**
 * CustomBlock — escape hatch for content with unique display requirements.
 * componentId maps to a registered React component in the block renderer (PRD 05).
 * props is an optional bag of data passed to the component.
 *
 * Registered componentIds:
 *   'home-hero'    — large name + tagline + short accent line (Home page only)
 *   'home-social'  — social links row (Home page only)
 *
 * Use sparingly. Reach for a standard block type first.
 */
export type CustomBlock = {
  type: 'custom'
  componentId: string
  props?: Record<string, unknown>
}

/**
 * Block — the union of all content block types.
 *
 * To add a new block type in the future:
 *   1. Define a new exported type following the pattern above.
 *   2. Add it to this union.
 *   3. Add a renderer case in the ProjectCanvas block renderer (PRD 05).
 *   Nothing else changes.
 */
export type Block =
  | IframeBlock
  | StatsBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | DividerBlock
  | CustomBlock

// ─── Node types ───────────────────────────────────────────────────────────────
```

---

### 2. Updated PageNode

Replace the current `PageNode` type with this. Remove `url`, `description`, `techStack`, and `content`. Add `blocks`.

```ts
export type PageNode = {
  id: string
  type: 'page'
  name: string
  year?: number       // metadata — kept separate from blocks for filtering/sorting
  featured?: boolean  // reserved — not used in UI yet
  blocks?: Block[]    // ordered content blocks — undefined means no canvas content
}
```

`FolderNode` and `SidebarNode` are unchanged.

---

### 3. Updated file header comment

Replace the current JSDoc block at the very top of the file with this:

```ts
/**
 * pages.ts — Portfolio content data
 *
 * Single source of truth for sidebar navigation and all canvas page content.
 *
 * Structure:
 *   FolderNode  — grouping container. Has children. No canvas view of its own.
 *   PageNode    — content item. Has a canvas view. Always a leaf node.
 *
 * Authoring content:
 *   Every PageNode has a `blocks` array — an ordered list of typed content blocks.
 *   Add, remove, or reorder blocks freely. The canvas renders whatever is in the array.
 *
 *   Standard block types:
 *     iframe   — live project preview (4:3 aspect ratio, contained width)
 *     stats    — horizontal metadata strip (tools, year, links)
 *     text     — optional title + markdown body
 *     image    — full-width image (any URL, including Google Drive)
 *     video    — YouTube embed (use /embed/VIDEO_ID format)
 *     divider  — visual separator between sections
 *
 *   Escape hatch:
 *     custom   — maps to a registered React component via componentId
 *                use only when no standard block type fits
 *
 *   To add a new block type: see the Block union type below.
 *
 * To add a new project:
 *   Add a PageNode to the appropriate FolderNode's children array.
 *
 * To add a new category:
 *   Add a FolderNode at the top level of sidebarData.
 */
```

---

### 4. Updated sidebarData

Replace the entire `sidebarData` array with the following. Every page now has `blocks`.

```ts
export const sidebarData: SidebarNode[] = [
  {
    id: 'home',
    type: 'page',
    name: 'Home',
    blocks: [
      {
        // Large name + tagline display text + short accent divider line.
        // Rendered by the 'home-hero' custom component registered in PRD 05.
        type: 'custom',
        componentId: 'home-hero',
      },
      {
        type: 'text',
        body: `I spend my time at the intersection of design and engineering — making things that feel considered, building tools that get out of the way, and learning in public. Currently exploring what thoughtful product design looks like at a smaller scale.

This site is a living project. Everything here — the design system, the canvas, the tools — is being built from scratch and in the open. Work in progress by design.`,
      },
      {
        // Social links row: Twitter, GitHub, LinkedIn, Email.
        // Rendered by the 'home-social' custom component registered in PRD 05.
        type: 'custom',
        componentId: 'home-social',
      },
    ],
  },

  {
    id: 'personal-work',
    type: 'folder',
    name: 'Personal Work',
    children: [
      {
        id: 'experiment-1',
        type: 'page',
        name: 'Experiment 1',
        year: 2025,
        featured: true,
        blocks: [
          {
            type: 'iframe',
            url: 'https://example.com',
          },
          {
            type: 'stats',
            items: [
              { label: 'React' },
              { label: 'Vite' },
              { label: 'Tailwind CSS' },
              { label: '2025' },
              { label: 'GitHub', href: 'https://github.com/nagbharat92' },
            ],
          },
          {
            type: 'text',
            title: 'What I built',
            body: `This is a sandbox for trying new ideas — small, fast experiments built to learn something specific rather than ship something polished.

The site itself became the first experiment. Building a canvas-based portfolio in public, one PRD at a time, turned out to be more interesting than the projects it was meant to showcase.`,
          },
          {
            type: 'divider',
          },
          {
            type: 'image',
            src: 'https://picsum.photos/seed/experiment1/1200/800',
            alt: 'Placeholder — replace with a real screenshot or asset.',
            caption: 'Replace this with a screenshot or process image.',
          },
          {
            type: 'text',
            title: 'How it came together',
            body: `Started with a question: what if the portfolio was the project?

Each piece — the design system, the canvas layout, the block-based content model — was designed first, then built. PRDs written before a single line of code. Constraints chosen deliberately.

The result is a site that can grow without getting messy. Adding a new project means adding a block array. Adding a new kind of content means adding a new block type.`,
          },
          {
            type: 'divider',
          },
          {
            type: 'video',
            embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            caption: 'Replace this with your own video embed URL.',
          },
          {
            type: 'text',
            body: `Building things in the open has taught me more than any tutorial ever could.

Each experiment started with a single question — what happens if I just try it? Some went nowhere. A few turned into something worth keeping. All of them taught me something.

This is that collection. Unpolished by design. The point was never the output.`,
          },
        ],
      },
    ],
  },
]
```

---

## What does NOT change

- `FolderNode` — unchanged.
- `SidebarNode` — unchanged.
- `findPage()` — unchanged.
- `collectFolderIds()` — unchanged.
- `findAncestorFolderIds()` — unchanged.
- `home-canvas.tsx` — stays in place. Still renders Home for now. Retired in PRD 05.
- `canvas.tsx` — routing logic unchanged. Updated in PRD 05.
- `project-placeholder.tsx` — still renders for project pages. Replaced in PRD 05.
- Every other file — untouched.

---

## Verification checklist

This PRD only changes types and data. No visual change in the browser.

1. Run `npx tsc --noEmit`. Zero errors expected.
2. Run `npm run dev`. Dev server starts, no console errors.
3. Home canvas still renders correctly — `home-canvas.tsx` is still active.
4. Click Experiment 1 — placeholder still shows (name + "Full project view coming in PRD 03"). Correct.
5. In VS Code, hover over any block in `sidebarData` — TypeScript shows the correct block type with autocomplete for all seven block types including `custom`.
