# Feature Canvas PRD 05 — ProjectCanvas + Block Renderer

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Agent
Context: Standard
```

**Instruction for Agent mode:**
```
Read @docs/features/canvas/feature-canvas-prd-05-project-canvas.md in full before doing anything.
Read @docs/motion/content-transition-prd.md in full before writing any component.
Install dependencies first, then create and modify files in the order listed.
  INSTALL: react-markdown remark-gfm
  NEW:     src/components/canvas-toolbar.tsx
  NEW:     src/components/project-canvas.tsx
  NEW:     src/components/blocks/block-renderer.tsx
  NEW:     src/components/blocks/iframe-block.tsx
  NEW:     src/components/blocks/stats-block.tsx
  NEW:     src/components/blocks/text-block.tsx
  NEW:     src/components/blocks/image-block.tsx
  NEW:     src/components/blocks/video-block.tsx
  NEW:     src/components/blocks/divider-block.tsx
  NEW:     src/components/blocks/custom-block.tsx
  NEW:     src/components/blocks/custom/home-hero.tsx
  NEW:     src/components/blocks/custom/home-social.tsx
  MODIFY:  src/components/canvas.tsx
  MODIFY:  src/App.tsx
  DELETE:  src/components/home-canvas.tsx
  DELETE:  src/components/project-placeholder.tsx
Touch no other files. Run the verification checklist when done.
```

---

## What This PRD Does

Builds the full canvas rendering system. After this PRD:

- Every page in the sidebar renders via a unified block renderer — Home, project pages, everything.
- The Home page's custom blocks (`home-hero`, `home-social`) are wired up to real components.
- All six standard block types render correctly: `iframe`, `stats`, `text`, `image`, `video`, `divider`.
- A fixed toolbar with an "Open in new tab" icon button appears at the top of the canvas on desktop and in the mobile toolbar row on mobile.
- `home-canvas.tsx` and `project-placeholder.tsx` are deleted.

---

## What This PRD Does NOT Do

- Change any data in `src/data/pages.ts` — that was PRD 04.
- Add more custom block types — the registry pattern makes that a future one-file addition.
- Build any CMS, editing interface, or admin tooling.

---

## Dependencies

Run before creating any files:

```
npm install react-markdown remark-gfm
```

`react-markdown` renders markdown body in `TextBlock`.
`remark-gfm` adds GitHub Flavored Markdown support (tables, strikethrough, task lists).

---

## Animation system

Full spec lives in `@docs/motion/content-transition-prd.md`. Read it before writing any component. Summary of what matters for this PRD:

**Two animation layers — each with a distinct job:**

| Layer | What it animates | How |
|---|---|---|
| Page crossfade | Old page fades out, new page fades in simultaneously | Framer Motion `AnimatePresence` in `canvas.tsx` — 200ms, opacity only |
| Content entrance | Blocks arrive from below, one after another | CSS `FadeInUp` component — 1.4s expo-out, decelerating stagger |

These are complementary. Do not conflate them. Do not replace Framer Motion crossfade with CSS. Do not replace FadeInUp with Framer Motion.

**Rules for FadeInUp in block renderers:**

- Every block renderer wraps its outermost element in `<FadeInUp i={index}>` where `index` is the block's position in the array (0-based).
- The `i` prop drives the CSS `--i` custom property, which the `calc()` delay formula reads automatically. Do not hardcode delay values anywhere.
- Use `FadeInUp` from `@/components/ui/fade-in-up` — do not create inline animation styles.
- The `className` prop on `FadeInUp` applies to the wrapper `div`. Use it for spacing only (e.g. `className="mt-4"`), never for overriding animation properties.
- Blocks with higher indices (7, 8, 9...) will have longer delays — this is intentional. Content below the fold is not visible until the user scrolls, so the delay is not felt.

**What uses `animate-fade-in` (flat fade, no movement):**

The `animate-fade-in` class is for containers and wrappers that should appear without shifting — typically page shells. Block content always uses `animate-fade-in-up` via `FadeInUp`. Do not mix these up.

**Stagger tokens (defined in `src/index.css`, do not change them here):**

```
--stagger-base:   100ms   /* gap before element 1 starts after element 0 */
--stagger-growth:  10ms   /* each subsequent gap grows by this amount */
```

Resulting schedule: i=0 → 0ms, i=1 → 100ms, i=2 → 210ms, i=3 → 330ms, i=4 → 460ms...

---

## Layout overview

```
App.tsx
├── [Mobile only] Top bar row
│     ├── Left: SidebarTrigger
│     └── Right: <CanvasActions />        ← new, mobile-only
└── <main>
      └── <Canvas />
            └── AnimatePresence crossfade
                  └── <ProjectCanvas page={...} />
                        ├── [Desktop only] <CanvasActions /> in header row
                        └── Scrollable content column (max-w-xl, centered)
                              └── blocks rendered in order, each in a <FadeInUp>
```

`CanvasActions` is a shared component rendered in two places — one visible on mobile, one on desktop. Both exist in the DOM but are toggled with responsive classes.

---

## Content column dimensions

- Max width: `max-w-xl` (576px)
- Horizontal padding: `px-6`
- Top padding: `py-8` (desktop has toolbar header above; `py-16` on mobile where toolbar row is separate)
- Block gap: `mt-10` between most blocks, `mt-4` between an `iframe` block and the `stats` block that follows it

---

## Target State — file by file

---

### `src/components/canvas-toolbar.tsx` — NEW

Exports `CanvasActions` (the icon buttons) and nothing else. Used in both the desktop canvas header and the mobile toolbar row in App.tsx.

Reads `selectedPage` from `useFolderTree`. Finds the first `iframe` block on the selected page. Shows "Open in new tab" only when a URL exists.

```tsx
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFolderTree } from "@/components/folder-tree"
import type { IframeBlock } from "@/data/pages"

/**
 * CanvasActions — icon button group for the current page.
 *
 * Rendered twice: inside ProjectCanvas (desktop) and in App.tsx mobile toolbar.
 * Responsive visibility is controlled by the parent — this component is display-agnostic.
 */
export function CanvasActions() {
  const { selectedPage } = useFolderTree()

  const iframeBlock = selectedPage?.blocks?.find(
    (b): b is IframeBlock => b.type === 'iframe'
  )

  if (!iframeBlock) return null

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <a
              href={iframeBlock.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open project in new tab"
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open in new tab</TooltipContent>
      </Tooltip>
    </div>
  )
}
```

---

### `src/components/project-canvas.tsx` — NEW

The main canvas page component. Renders the toolbar header (desktop only) and the scrollable block list.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"
import { CanvasActions } from "@/components/canvas-toolbar"
import { BlockRenderer } from "@/components/blocks/block-renderer"
import type { PageNode } from "@/data/pages"

interface ProjectCanvasProps {
  page: PageNode
}

/**
 * ProjectCanvas — renders a page's block array inside a scrollable content column.
 *
 * Layout:
 *   - Desktop: sticky toolbar row at top (hidden on mobile), then scrollable blocks
 *   - Mobile: no toolbar here — it lives in App.tsx's mobile top bar
 *
 * Block spacing:
 *   - Default gap between blocks: mt-10
 *   - stats block gets mt-4 (sits tight below the iframe card)
 */
export function ProjectCanvas({ page }: ProjectCanvasProps) {
  const blocks = page.blocks ?? []

  return (
    <div className="flex h-full flex-col">

      {/* Desktop toolbar — hidden on mobile */}
      <div className="hidden md:flex items-center justify-end px-4 py-3">
        <CanvasActions />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-6 py-16 md:py-8">
          {blocks.map((block, i) => {
            const isStats = block.type === 'stats'
            return (
              <div key={i} className={i > 0 ? (isStats ? 'mt-4' : 'mt-10') : ''}>
                <BlockRenderer block={block} index={i} />
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
```

---

### `src/components/blocks/block-renderer.tsx` — NEW

Dispatches each block to its renderer. Exhaustive switch — TypeScript will warn if a new block type is added to the union but not handled here.

```tsx
import type { Block } from "@/data/pages"
import { IframeBlockRenderer } from "@/components/blocks/iframe-block"
import { StatsBlockRenderer } from "@/components/blocks/stats-block"
import { TextBlockRenderer } from "@/components/blocks/text-block"
import { ImageBlockRenderer } from "@/components/blocks/image-block"
import { VideoBlockRenderer } from "@/components/blocks/video-block"
import { DividerBlockRenderer } from "@/components/blocks/divider-block"
import { CustomBlockRenderer } from "@/components/blocks/custom-block"

interface BlockRendererProps {
  block: Block
  index: number
}

export function BlockRenderer({ block, index }: BlockRendererProps) {
  switch (block.type) {
    case 'iframe':  return <IframeBlockRenderer  block={block} index={index} />
    case 'stats':   return <StatsBlockRenderer   block={block} index={index} />
    case 'text':    return <TextBlockRenderer    block={block} index={index} />
    case 'image':   return <ImageBlockRenderer   block={block} index={index} />
    case 'video':   return <VideoBlockRenderer   block={block} index={index} />
    case 'divider': return <DividerBlockRenderer             index={index} />
    case 'custom':  return <CustomBlockRenderer  block={block} index={index} />
  }
}
```

---

### `src/components/blocks/iframe-block.tsx` — NEW

4:3 aspect ratio card. No browser chrome. Rounded corners, subtle border.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { IframeBlock } from "@/data/pages"

export function IframeBlockRenderer({ block, index }: { block: IframeBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <div className="w-full overflow-hidden rounded-xl border border-border bg-card aspect-[4/3]">
        <iframe
          src={block.url}
          className="h-full w-full"
          loading="lazy"
          title="Project preview"
        />
      </div>
      {block.caption && (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {block.caption}
        </p>
      )}
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/stats-block.tsx` — NEW

Horizontal metadata strip. Items separated by a muted dot. Links are styled the same as plain text but become interactive.

```tsx
import { Fragment } from "react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { StatsBlock } from "@/data/pages"

export function StatsBlockRenderer({ block, index }: { block: StatsBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        {block.items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="text-muted-foreground/40 select-none" aria-hidden>·</span>
            )}
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 underline-offset-4 hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/text-block.tsx` — NEW

Renders the optional title then the markdown body using `react-markdown` + `remark-gfm`. Custom component overrides apply prose styling without needing the Tailwind typography plugin.

```tsx
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { TextBlock } from "@/data/pages"

export function TextBlockRenderer({ block, index }: { block: TextBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      {block.title && (
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
          {block.title}
        </h2>
      )}
      <div className="text-block-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-base leading-relaxed text-foreground/80 mb-4 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors duration-150"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-4 text-foreground/80 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 mb-4 text-foreground/80 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-base leading-relaxed">{children}</li>,
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm">
                {children}
              </code>
            ),
            hr: () => <hr className="border-border my-6" />,
          }}
        >
          {block.body}
        </ReactMarkdown>
      </div>
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/image-block.tsx` — NEW

Full-width image. Works with any public URL — local, Unsplash, Google Drive direct-share links.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { ImageBlock } from "@/data/pages"

export function ImageBlockRenderer({ block, index }: { block: ImageBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <figure>
        <img
          src={block.src}
          alt={block.alt ?? ""}
          className="w-full rounded-xl"
          loading="lazy"
        />
        {block.caption && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {block.caption}
          </figcaption>
        )}
      </figure>
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/video-block.tsx` — NEW

YouTube embed at 16:9. Use the `/embed/VIDEO_ID` URL format, not the watch URL.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { VideoBlock } from "@/data/pages"

export function VideoBlockRenderer({ block, index }: { block: VideoBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={block.embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          loading="lazy"
          title="Video embed"
        />
      </div>
      {block.caption && (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {block.caption}
        </p>
      )}
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/divider-block.tsx` — NEW

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"

export function DividerBlockRenderer({ index }: { index: number }) {
  return (
    <FadeInUp i={index}>
      <hr className="border-border" />
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/custom-block.tsx` — NEW

Component registry. Maps `componentId` strings to real React components. To register a new custom block in the future: import the component and add one line to `REGISTRY`.

```tsx
import type { CustomBlock } from "@/data/pages"
import { HomeHero } from "@/components/blocks/custom/home-hero"
import { HomeSocial } from "@/components/blocks/custom/home-social"

type CustomBlockComponent = React.ComponentType<{
  index: number
  props?: Record<string, unknown>
}>

/**
 * REGISTRY — maps componentId strings to React components.
 *
 * To add a new custom block:
 *   1. Create the component in src/components/blocks/custom/
 *   2. Import it here
 *   3. Add one entry to REGISTRY
 */
const REGISTRY: Record<string, CustomBlockComponent> = {
  'home-hero':   HomeHero,
  'home-social': HomeSocial,
}

export function CustomBlockRenderer({
  block,
  index,
}: {
  block: CustomBlock
  index: number
}) {
  const Component = REGISTRY[block.componentId]

  if (!Component) {
    if (import.meta.env.DEV) {
      console.warn(
        `[CustomBlock] No component registered for componentId: "${block.componentId}"`
      )
    }
    return null
  }

  return <Component index={index} props={block.props} />
}
```

---

### `src/components/blocks/custom/home-hero.tsx` — NEW

Extracted from `home-canvas.tsx`. Renders the large name, tagline, and short accent divider line as one animated unit.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"

interface HomeHeroProps {
  index: number
  props?: Record<string, unknown>
}

export function HomeHero({ index }: HomeHeroProps) {
  return (
    <FadeInUp i={index}>
      <h1 className="text-5xl font-bold tracking-tight text-foreground">
        Bharat Nag
      </h1>
      <p className="mt-3 text-xl text-muted-foreground">
        Building thoughtfully at the intersection of design and code.
      </p>
      <div className="mt-10 h-px w-12 bg-border" />
    </FadeInUp>
  )
}
```

---

### `src/components/blocks/custom/home-social.tsx` — NEW

Extracted from `home-canvas.tsx`. Renders the row of social links.

```tsx
import { FadeInUp } from "@/components/ui/fade-in-up"

interface HomeSocialProps {
  index: number
  props?: Record<string, unknown>
}

const SOCIAL_LINKS = [
  { label: "@bharatnag92", href: "https://x.com/bharatnag92" },
  { label: "GitHub",       href: "https://github.com/nagbharat92" },
  { label: "LinkedIn",     href: "https://www.linkedin.com/in/bharatnag/" },
  { label: "Email",        href: "mailto:nagbharat92@gmail.com" },
]

export function HomeSocial({ index }: HomeSocialProps) {
  return (
    <FadeInUp i={index} className="flex flex-wrap gap-x-6 gap-y-2">
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium underline-offset-4 hover:underline text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          {link.label}
        </a>
      ))}
    </FadeInUp>
  )
}
```

---

### `src/components/canvas.tsx` — MODIFY

Remove the `HomeCanvas` and `ProjectPlaceholder` imports and routing. Route everything to `ProjectCanvas`.

Replace the entire file with:

```tsx
import { AnimatePresence, motion } from "framer-motion"
import { useFolderTree } from "@/components/folder-tree"
import { ProjectCanvas } from "@/components/project-canvas"
import { duration, ease } from "@/lib/motion"

/**
 * Canvas — main content area of the portfolio.
 *
 * Handles page transitions via AnimatePresence crossfade.
 * All pages (including Home) are rendered by ProjectCanvas via the block renderer.
 */
export function Canvas() {
  const { selectedPage } = useFolderTree()

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence>
        {selectedPage && (
          <motion.div
            key={selectedPage.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="absolute inset-0"
          >
            <ProjectCanvas page={selectedPage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

### `src/App.tsx` — MODIFY

Add `CanvasActions` to the mobile toolbar right slot. The comment `{/* Right actions (future) */}` is already there — replace it.

Import `CanvasActions`:
```tsx
import { CanvasActions } from '@/components/canvas-toolbar'
```

Replace `{/* Right actions (future) */}` with:
```tsx
{/* Right actions */}
<CanvasActions />
```

No other changes to App.tsx.

---

### `src/components/home-canvas.tsx` — DELETE

No longer needed. Content moved to `home-hero` and `home-social` custom block components, and bio text is now a `text` block in `pages.ts`.

---

### `src/components/project-placeholder.tsx` — DELETE

No longer needed. Replaced by `ProjectCanvas`.

---

## What does NOT change

- `src/data/pages.ts` — data and types unchanged.
- `src/components/folder-tree.tsx` — unchanged.
- `src/components/app-sidebar.tsx` — unchanged.
- `src/components/ui/*` — all UI primitives unchanged.
- `src/lib/motion.ts` — unchanged.
- `src/index.css` — unchanged.

---

## Verification checklist

After running in VS Code, test the following at `localhost:5173`:

**Home page:**
1. Select Home in the sidebar. The canvas shows: large "Bharat Nag" heading, tagline, short accent line, bio paragraph, social links. Matches what was there before.
2. All elements animate in with the FadeInUp stagger sequence.
3. Social links are clickable and open correctly.

**Experiment 1:**
4. Select Experiment 1. Canvas crossfades in. The iframe card appears at 4:3 ratio showing `example.com`.
5. Below the iframe: the stats strip with React · Vite · Tailwind CSS · 2025 · GitHub (link).
6. Then text sections, a divider, a placeholder image, more text, a divider, a YouTube video embed, and a final text block.
7. The content scrolls smoothly — toolbar stays fixed at top.
8. The "Open in new tab" icon button appears in the toolbar. Clicking it opens `https://example.com` in a new tab.

**Toolbar:**
9. On desktop (≥ md breakpoint): toolbar row visible at top of canvas, right-aligned.
10. On mobile (< md): toolbar row in App.tsx shows the ExternalLink button on the right, alongside the hamburger on the left. (Resize browser to confirm.)

**Crossfade:**
11. Switching between Home and Experiment 1 crossfades smoothly with no layout jump.

**Animation system:**
12. On Home: open DevTools → Elements. Each FadeInUp block div should have an inline `style="--i: N"`. Confirm `--i` increments correctly from 0 across the blocks.
13. On Experiment 1: select the page, then immediately scroll to the bottom. Content below the fold should animate in as it enters view (elements in-flight, not already settled). This confirms the stagger is working with real delays, not collapsing to zero.
14. Navigate Home → Experiment 1 → Home rapidly. No flashing, no stuck-invisible elements. The CSS `animation-fill-mode: both` should keep elements properly hidden until their delay elapses and visible after they complete.

**TypeScript:**
15. `npx tsc --noEmit` — zero errors.
