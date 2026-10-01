# Feature: Canvas — PRD 02
## Canvas Shell + Home Page

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Agent
Context: Standard
```

**Instruction for Agent mode:**
```
Read @docs/features/canvas/feature-canvas-prd-02-home-page.md in full before doing anything.
Execute all changes described in the Target State section in order.
Create and modify exactly these files:
  MODIFY:  src/lib/motion.ts
  MODIFY:  src/components/canvas.tsx
  NEW:     src/components/home-canvas.tsx
  NEW:     src/components/project-placeholder.tsx
Touch no other files. Run the verification checklist when done.
```

---

## What This PRD Does

Replaces the canvas stub from PRD 01 with a real routing system. Builds the Home page canvas with a full animated layout. Adds a placeholder for project pages that will be replaced in PRD 03.

The main deliverables are:
- **Page transition** — crossfade between pages using `AnimatePresence`
- **Content stagger** — top-to-bottom fade + rise entrance for every element on every page
- **Home page** — name, tagline, bio, and social links with staggered entrance
- **Project placeholder** — minimal holding view for project pages until PRD 03

---

## What This PRD Does NOT Do

- It does not build the project page view (iframe, toolbar, content below). That is PRD 03.
- It does not modify the sidebar or data layer. Those are done and working from PRD 01.
- It does not add scrolling behaviour beyond what CSS provides naturally.
- It does not touch `src/index.css`, `src/data/pages.ts`, or any `ui/` components.

---

## Scope

### Files to modify
```
src/lib/motion.ts                       — add stagger variant exports
src/components/canvas.tsx               — replace stub with routing + AnimatePresence
```

### New files
```
src/components/home-canvas.tsx          — Home page layout and content
src/components/project-placeholder.tsx  — minimal placeholder for project pages
```

### Files that must NOT be modified
```
src/components/folder-tree.tsx
src/components/app-sidebar.tsx
src/data/pages.ts
src/App.tsx
src/components/ui/*
src/index.css
```

---

## Animation Specification

This section is the source of truth for all motion in this PRD. Do not deviate from these values.

### Page transition (canvas level)

When the selected page changes, the canvas content crossfades — old content fades out while new content begins fading in simultaneously. They overlap briefly. No directional movement. No scale.

```
Exit:  opacity 1 → 0   duration: duration.base   ease: ease.out
Enter: opacity 0 → 1   duration: duration.base   ease: ease.out
Mode:  AnimatePresence with no mode prop (default = sync, allows overlap)
Key:   selectedPage.id  (changing the key triggers the transition)
```

### Content stagger (page level)

Every element inside a page — heading, tagline, bio, links — enters individually in top-to-bottom order. Each element starts slightly below its final position and rises up while fading in.

```
Container: staggerChildren: 0.15   (150ms between each child)
           delayChildren:   0.1    (100ms pause before first child, lets the crossfade begin)

Each item:
  Enter from: opacity 0, y: +12px
  Enter to:   opacity 1, y: 0
  Duration:   duration.slow (0.3s)
  Ease:       ease.out
```

The stagger variants are defined once in `src/lib/motion.ts` and reused across all page components. This ensures Home and project pages have identical stagger behaviour.

### When does the stagger replay?

Every time `AnimatePresence` unmounts and remounts the page component (i.e. every page switch), the stagger replays from the beginning. This happens automatically because the `key` prop on the canvas wrapper changes with each page selection.

---

## Target State

### Change 1 — MODIFY: `src/lib/motion.ts`

Add two new exports at the bottom of the file — `staggerContainer` and `staggerItem`. These are Framer Motion variant objects used by all canvas page components.

Add after the existing `transitions` export:

```typescript
/**
 * Stagger variants for canvas page content.
 * Apply staggerContainer to the wrapping motion.div.
 * Apply staggerItem to each child element that should animate in sequence.
 *
 * Usage:
 *   <motion.div variants={staggerContainer} initial="hidden" animate="visible">
 *     <motion.div variants={staggerItem}>First element</motion.div>
 *     <motion.div variants={staggerItem}>Second element</motion.div>
 *   </motion.div>
 */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
} as const

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: ease.out,
    },
  },
} as const
```

Note: `duration.slow` and `ease.out` are already defined earlier in `motion.ts`. Reference them directly — do not hardcode values.

---

### Change 2 — MODIFY: `src/components/canvas.tsx`

Replace the entire file with the following. This is the canvas router — it handles the page transition and delegates rendering to the correct page component.

```tsx
import { AnimatePresence, motion } from "framer-motion"
import { useFolderTree } from "@/components/folder-tree"
import { HomeCanvas } from "@/components/home-canvas"
import { ProjectPlaceholder } from "@/components/project-placeholder"
import { duration, ease } from "@/lib/motion"

/**
 * Canvas — main content area of the portfolio.
 *
 * Handles page transitions via AnimatePresence crossfade.
 * Routes to the correct page component based on the selected page id.
 *
 * Routing:
 *   id === 'home'  →  HomeCanvas
 *   any other id   →  ProjectPlaceholder (replaced by ProjectPage in PRD 03)
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
            {selectedPage.id === 'home' ? (
              <HomeCanvas />
            ) : (
              <ProjectPlaceholder page={selectedPage} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Why `absolute inset-0` on the motion wrapper:** During the crossfade, both the exiting and entering page are in the DOM simultaneously. Without `absolute inset-0`, the two overlapping elements would stack vertically and push layout. `absolute inset-0` pins each page to fill the canvas container exactly, allowing them to overlap cleanly during the transition.

---

### Change 3 — NEW: `src/components/home-canvas.tsx`

Create this file. It is the Home / About page of the portfolio. All text is dummy content — placeholder that Bharat will refine. The structure and animation are final.

```tsx
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"

const SOCIAL_LINKS = [
  { label: "@bharatnag92",  href: "https://x.com/bharatnag92" },
  { label: "GitHub",        href: "https://github.com/nagbharat92" },
  { label: "LinkedIn",      href: "https://www.linkedin.com/in/bharatnag/" },
  { label: "Email",         href: "mailto:nagbharat92@gmail.com" },
]

/**
 * HomeCanvas — the about / home page rendered in the canvas area.
 *
 * Layout:
 *   Name (display)
 *   Tagline
 *   Bio
 *   Social links
 *
 * All elements enter with a staggered fade + rise animation on every
 * page selection. Text content is placeholder — update in src/data/pages.ts
 * or directly here once copy is finalised.
 */
export function HomeCanvas() {
  return (
    <div className="flex h-full overflow-y-auto">
      <div className="m-auto w-full max-w-lg px-8 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >

          {/* Name */}
          <motion.div variants={staggerItem}>
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              Bharat Nag
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.div variants={staggerItem} className="mt-3">
            <p className="text-xl text-muted-foreground">
              Building thoughtfully at the intersection of design and code.
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div variants={staggerItem} className="mt-10">
            <div className="h-px w-12 bg-border" />
          </motion.div>

          {/* Bio */}
          <motion.div variants={staggerItem} className="mt-8">
            <p className="text-base leading-relaxed text-foreground/80">
              I spend my time at the intersection of design and engineering —
              making things that feel considered, building tools that get out
              of the way, and learning in public. Currently exploring what
              thoughtful product design looks like at a smaller scale.
            </p>
          </motion.div>

          <motion.div variants={staggerItem} className="mt-4">
            <p className="text-base leading-relaxed text-foreground/80">
              This site is a living project. Everything here — the design
              system, the canvas, the tools — is being built from scratch
              and in the open. Work in progress by design.
            </p>
          </motion.div>

          {/* Social links */}
          <motion.div
            variants={staggerItem}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-2"
          >
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
```

---

### Change 4 — NEW: `src/components/project-placeholder.tsx`

Create this file. It is a temporary holding view for project pages. It will be completely replaced by the full project page in PRD 03. It still uses the stagger system so the animation infrastructure is consistent.

```tsx
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import type { PageNode } from "@/data/pages"

interface ProjectPlaceholderProps {
  page: PageNode
}

/**
 * ProjectPlaceholder — temporary canvas view for project pages.
 * Replaced entirely by ProjectPage in Feature Canvas PRD 03.
 */
export function ProjectPlaceholder({ page }: ProjectPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center gap-3"
      >
        <motion.p
          variants={staggerItem}
          className="text-lg font-medium text-foreground"
        >
          {page.name}
        </motion.p>
        <motion.p
          variants={staggerItem}
          className="text-sm text-muted-foreground"
        >
          Full project view coming in PRD 03.
        </motion.p>
      </motion.div>
    </div>
  )
}
```

---

## Rules

### Animation rules

**DO** use `staggerContainer` and `staggerItem` from `@/lib/motion` for all page content. Never define stagger values inline in a component.

**DO NOT** add `mode="wait"` to `AnimatePresence`. `mode="wait"` creates the sequential "out then in" transition. We want crossfade (overlap), which is the default behaviour with no mode prop.

**DO NOT** add `position: relative` to the `motion.div` inside `AnimatePresence`. It must be `absolute inset-0` to prevent layout stacking during the crossfade.

**DO NOT** nest another `AnimatePresence` inside `HomeCanvas` or `ProjectPlaceholder`. The outer `AnimatePresence` in `canvas.tsx` handles page transitions. Inner components only need the stagger variant system.

### Layout rules

**DO** keep the Home canvas content centred with `m-auto` and constrained with `max-w-lg`. The dot grid background should remain visible around the content — the content should not fill the full canvas width.

**DO** use `overflow-y-auto` on the scroll wrapper so content is reachable on small viewports without breaking the overall `overflow: hidden` on `#root`.

**DO NOT** add a background to the canvas wrapper or the motion div. The dot grid background from `body` in `index.css` should show through.

### Routing rules

**DO** add new page types to the routing condition in `canvas.tsx`. When PRD 03 is executed, `ProjectPlaceholder` will be replaced with `<ProjectPage page={selectedPage} />`.

**DO NOT** use `selectedPage.id === 'experiment-1'` for routing. Route on the presence or absence of `selectedPage.url` — or keep the binary `home` vs everything else split as it is now. PRD 03 will formalise project page routing.

### Content rules

**DO** treat all text in `home-canvas.tsx` as dummy content. It is structurally correct but the copy is placeholder. It will be updated when real content is ready.

**DO NOT** hardcode social links in multiple places. They live in the `SOCIAL_LINKS` constant at the top of `home-canvas.tsx`. When the sidebar footer is eventually updated to read from a shared source, this constant will be extracted to `src/data/`.

---

## Dos and Don'ts — Quick Reference

| Scenario | Correct | Wrong |
|---|---|---|
| Adding a new stagger element on Home | Wrap in `<motion.div variants={staggerItem}>` | Hardcode an `initial`/`animate` on the element directly |
| Changing the stagger speed | Update `staggerChildren` in `motion.ts` `staggerContainer` | Change the value inside a component |
| Adding a new page type in the future | Add a new branch in `canvas.tsx` routing condition | Create a separate `Canvas` component for the new type |
| The crossfade feels too fast | Increase `duration.base` in `motion.ts` | Change the transition inline in `canvas.tsx` |
| Home page bio text needs updating | Edit the `<p>` text directly in `home-canvas.tsx` | Edit `pages.ts` — Home content is not stored there |

---

## Verification Checklist

After making these changes, verify:

1. **Home page loads with stagger** — On first load, `Home` is selected. The canvas shows the Home page. Name enters first, then tagline, then divider, then first bio paragraph, then second bio paragraph, then social links. Each element enters after the previous with a visible delay.

2. **Fade + rise is visible** — Each element should visibly rise from slightly below its final position while fading in. If elements simply appear without movement, the `y: 12` initial value is not being applied.

3. **Page transition crossfade works** — Click `Experiment 1` in the sidebar. The Home content should begin fading out while the project placeholder begins fading in simultaneously. There should be no empty flash between pages.

4. **Stagger replays on every switch** — Click Home → Experiment 1 → Home. Every time you return to Home, the stagger plays again from the beginning.

5. **Project placeholder renders correctly** — When `Experiment 1` is selected, the placeholder shows the project name ("Experiment 1") and the PRD 03 note, both with stagger animation.

6. **No layout shift during transition** — During the crossfade, the two overlapping pages must not push each other vertically. Both must stay within the canvas bounds. If there is layout shift, the `absolute inset-0` is missing.

7. **Dot grid visible** — The dot grid background from `body` must be visible around the Home page content. The canvas must not have a solid background covering it.

8. **Social links open correctly** — Click each social link on the Home page. Twitter, GitHub, and LinkedIn should open in a new tab. Email should open the mail client.

9. **Scrollable on small viewports** — Resize the browser to a narrow height. The Home page content should be scrollable within the canvas without affecting the sidebar.

10. **Light and dark mode** — Toggle dark mode. All text, links, and the divider line must render correctly in both themes.

11. **No TypeScript errors** — Check the VS Code Problems panel. Zero errors.

12. **Correct files changed** — Run `git diff --name-only`. Only `src/lib/motion.ts`, `src/components/canvas.tsx`, `src/components/home-canvas.tsx`, and `src/components/project-placeholder.tsx` should appear.

---

## How to Test

Open the browser at `localhost:5173`.

1. Watch the canvas on load — the Home page should animate in element by element from top to bottom. Count the stagger steps: name, tagline, divider, bio paragraph 1, bio paragraph 2, links.
2. Click `Experiment 1` — watch the crossfade. Both pages should briefly overlap during the fade.
3. Click `Home` again — stagger replays.
4. Toggle dark mode — everything should look right in both themes.
5. Hover over the social links — they should underline on hover.
6. Click one to confirm it opens correctly.

That is the full test for this PRD. No automated tests required.
