# Feature: Canvas — PRD 01
## Data Model + Sidebar Wiring

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Agent
Context: Standard
```

**Instruction for Agent mode:**
```
Read @docs/features/canvas/feature-canvas-prd-01-data-model.md in full before doing anything.
Execute all changes described in the Target State section in order.
Create and modify exactly these files:
  NEW:      src/data/pages.ts
  NEW:      src/components/canvas.tsx
  MODIFY:   src/components/folder-tree.tsx
  MODIFY:   src/App.tsx
Touch no other files. Run the verification checklist when done.
```

---

## What This PRD Does

Introduces the data model that powers the entire canvas feature. Replaces the hardcoded sample folder data in `folder-tree.tsx` with a proper typed data file. Updates the sidebar to visually distinguish folders from pages. Wires the selected page through to a canvas stub component so the data flow is confirmed before any UI is built.

This PRD has no visual ambition. The canvas at the end of this PRD shows a single line of text — the selected page name. That is intentional. The canvas layout, iframe, and animations are built in PRDs 02 and 03. This PRD's only job is: **data flows correctly from the data file through the sidebar to the canvas.**

---

## What This PRD Does NOT Do

- It does not build the canvas layout, iframe, toolbar, or animations. Those are PRDs 02 and 03.
- It does not add any styling to the canvas area beyond confirming the page name renders.
- It does not add a Home page content layout. The Home page exists in the data but its canvas view is built in PRD 02.
- It does not touch `app-sidebar.tsx`, any `ui/` components, or `index.css`.

---

## Scope

### New files
```
src/data/pages.ts          — single source of truth for all sidebar/canvas content
src/components/canvas.tsx  — stub canvas component (renders page name only for now)
```

### Modified files
```
src/components/folder-tree.tsx  — new types, reads from data file, folder/page distinction
src/App.tsx                     — mounts Canvas stub inside <main>
```

### Files that must NOT be modified
```
src/components/app-sidebar.tsx
src/components/ui/*
src/lib/*
src/index.css
```

---

## Background: What Exists Today

### Current data structure in `folder-tree.tsx`

All nodes use a single type — there is no distinction between a folder and a page:

```typescript
export interface FolderNode {
  id: string
  name: string
  children?: FolderNode[]  // optional — leaf nodes have no children
}
```

Leaf nodes (no children) are currently treated as selectable items, but the canvas renders nothing when they are selected. All data is hardcoded directly inside `folder-tree.tsx` as `sampleFolders`.

### Current canvas

`App.tsx` has an empty `<main>` element:

```tsx
{/* Canvas */}
<main className="relative flex-1">
</main>
```

Nothing is rendered. Nothing reads the selected page.

### Current context

`FolderTreeContext` exposes `selectedId` (a string) but not the full page object. No component outside the sidebar can read what page is currently selected.

---

## The New Data Model

### Two node types

```
SidebarNode = FolderNode | PageNode

FolderNode:
  - type: 'folder'
  - id, name
  - children: SidebarNode[]   ← can contain both folders and pages

PageNode:
  - type: 'page'
  - id, name
  - url?          ← iframe src. Home page has none.
  - description?  ← short text shown above the iframe
  - techStack?    ← array of strings e.g. ["React", "Vite"]
  - content?      ← longer markdown-style write-up shown below the iframe
  - year?         ← number
  - featured?     ← boolean, reserved for future use
```

### Rules about the data model

**DO** keep all content data in `src/data/pages.ts`. No content should be hardcoded in components.

**DO** use `type: 'page'` for any item that should open something in the canvas when clicked.

**DO** use `type: 'folder'` for any item that only groups other items and has no canvas view of its own.

**DO NOT** give a folder a `url`, `description`, or `content`. Folders are navigation containers only.

**DO NOT** put a page inside another page. The hierarchy is: folder → page. Pages are always leaf nodes.

---

## Target State

### File 1 — NEW: `src/data/pages.ts`

Create this file at exactly this path. It is the single source of truth for all sidebar and canvas content.

```typescript
/**
 * pages.ts — Portfolio content data
 *
 * This is the single source of truth for all sidebar items and canvas content.
 * - FolderNode: a grouping container. Has children. No canvas view.
 * - PageNode:   a content item. Has a canvas view. Always a leaf node.
 *
 * To add a new project: add a PageNode inside the appropriate FolderNode.
 * To add a new category: add a FolderNode at the top level.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PageNode = {
  id: string
  type: 'page'
  name: string
  url?: string         // iframe src — omit for pages with no live preview
  description?: string // short text above the iframe (1–2 sentences)
  techStack?: string[] // e.g. ["React", "Vite", "Tailwind CSS"]
  content?: string     // longer write-up below the iframe (markdown-friendly)
  year?: number
  featured?: boolean   // reserved — not used in UI yet
}

export type FolderNode = {
  id: string
  type: 'folder'
  name: string
  children: SidebarNode[]
}

export type SidebarNode = FolderNode | PageNode

// ─── Data ─────────────────────────────────────────────────────────────────────

export const sidebarData: SidebarNode[] = [
  {
    id: 'home',
    type: 'page',
    name: 'Home',
    // No url — the Home canvas is a bespoke layout, not an iframe.
    // Content is defined in the Canvas component directly (PRD 02).
  },

  {
    id: 'personal-work',
    type: 'folder',
    name: 'Personal Work',
    children: [
      {
        id: 'experiments',
        type: 'page',
        name: 'Experiments',
        url: 'https://example.com', // placeholder — replace with real URL
        description: 'A sandbox for trying new ideas. Small, fast experiments built to learn something specific rather than ship something polished.',
        techStack: ['React', 'Vite', 'Tailwind CSS'],
        year: 2025,
        featured: true,
        content: `Building things in the open has taught me more than any tutorial ever could.

Each experiment here started with a single question — what happens if I just try it? Some went nowhere. A few turned into something worth keeping. All of them taught me something.

This is that collection. Unpolished by design. The point was never the output.`,
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a PageNode anywhere in the tree by id.
 * Returns null if not found or if the id belongs to a folder.
 */
export function findPage(nodes: SidebarNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.type === 'page' && node.id === id) return node
    if (node.type === 'folder') {
      const found = findPage(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Collect the ids of all folder nodes in the tree.
 * Used to set the initial expanded state — all folders start open.
 */
export function collectFolderIds(nodes: SidebarNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      ids.push(node.id)
      ids.push(...collectFolderIds(node.children))
    }
  }
  return ids
}
```

---

### File 2 — MODIFY: `src/components/folder-tree.tsx`

This file needs four changes:

1. Remove the local `FolderNode` interface and `sampleFolders` array.
2. Import types and data from `@/data/pages`.
3. Update `FolderItem` to handle `SidebarNode` — render folder icon for folders, file icon for pages.
4. Update `FolderTreeContext` to expose `selectedPage: PageNode | null`.
5. Export the `useFolderTree` hook so `canvas.tsx` can consume it.

**Complete replacement of `folder-tree.tsx`:**

```tsx
import {
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { Folder, FolderOpen, ChevronRight, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { transitions } from "@/lib/motion"
import {
  type SidebarNode,
  type PageNode,
  type FolderNode,
  sidebarData,
  findPage,
  collectFolderIds,
} from "@/data/pages"

// ─── Depth padding ────────────────────────────────────────────────────────────

const depthPadding: Record<number, string> = {
  0: "pl-2",
  1: "pl-6",
  2: "pl-10",
  3: "pl-14",
  4: "pl-18",
  5: "pl-22",
}

// ─── FolderItem ───────────────────────────────────────────────────────────────

function FolderItem({
  node,
  depth,
  expandedIds,
  toggle,
  selectedId,
  select,
}: {
  node: SidebarNode
  depth: number
  expandedIds: Set<string>
  toggle: (id: string) => void
  selectedId: string | null
  select: (id: string) => void
}) {
  const isFolder = node.type === 'folder'
  const isOpen = isFolder && expandedIds.has(node.id)
  const isSelected = !isFolder && selectedId === node.id

  return (
    <li>
      <button
        onClick={() => {
          if (isFolder) toggle(node.id)
          else select(node.id)
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground",
          "transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          "cursor-pointer",
          isSelected && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          depthPadding[depth] ?? "pl-2"
        )}
      >
        {/* Chevron — only for folders */}
        {isFolder ? (
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={transitions.microInteraction}
            className="flex shrink-0 items-center"
          >
            <ChevronRight className="size-3.5 text-sidebar-foreground/50" />
          </motion.span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Icon — folder open/closed for folders, file for pages */}
        {isFolder ? (
          isOpen ? (
            <FolderOpen className="size-4 shrink-0 text-sidebar-foreground/70" />
          ) : (
            <Folder className="size-4 shrink-0 text-sidebar-foreground/70" />
          )
        ) : (
          <FileText className="size-4 shrink-0 text-sidebar-foreground/70" />
        )}

        <span className="truncate">{node.name}</span>
      </button>

      {/* Children — only rendered for open folders */}
      <AnimatePresence initial={false}>
        {isFolder && isOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.expand}
            className="flex flex-col gap-0.5 overflow-hidden"
          >
            {(node as FolderNode).children.map((child) => (
              <FolderItem
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                toggle={toggle}
                selectedId={selectedId}
                select={select}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

// ─── Context ──────────────────────────────────────────────────────────────────

type FolderTreeContextValue = {
  expandedIds: Set<string>
  selectedId: string | null
  selectedPage: PageNode | null
  toggle: (id: string) => void
  select: (id: string) => void
}

const FolderTreeContext = createContext<FolderTreeContextValue | null>(null)

export function FolderTreeProvider({ children }: { children: ReactNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(collectFolderIds(sidebarData))
  )

  // Home is selected by default
  const [selectedId, setSelectedId] = useState<string | null>('home')
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(
    findPage(sidebarData, 'home')
  )

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const select = useCallback((id: string) => {
    setSelectedId(id)
    setSelectedPage(findPage(sidebarData, id))
  }, [])

  return (
    <FolderTreeContext.Provider
      value={{ expandedIds, selectedId, selectedPage, toggle, select }}
    >
      {children}
    </FolderTreeContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume the FolderTree context.
 * Use this in any component that needs to read or respond to the selected page.
 * Must be used inside <FolderTreeProvider>.
 */
export function useFolderTree() {
  const ctx = useContext(FolderTreeContext)
  if (!ctx) throw new Error("useFolderTree must be used inside FolderTreeProvider")
  return ctx
}

// ─── FolderTree ───────────────────────────────────────────────────────────────

export function FolderTree() {
  const { expandedIds, selectedId, toggle, select } = useFolderTree()

  return (
    <ul className="flex flex-col gap-0.5">
      {sidebarData.map((node) => (
        <FolderItem
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          toggle={toggle}
          selectedId={selectedId}
          select={select}
        />
      ))}
    </ul>
  )
}
```

---

### File 3 — NEW: `src/components/canvas.tsx`

Create this file. It is a stub — its only job in this PRD is to confirm that the selected page data flows from the sidebar into the canvas area. It will be completely replaced in PRD 02.

```tsx
import { useFolderTree } from "@/components/folder-tree"

/**
 * Canvas — main content area of the portfolio.
 *
 * PRD 01 stub: renders the selected page name only.
 * Full implementation in Feature Canvas PRD 02 (Home page) and PRD 03 (Project page).
 */
export function Canvas() {
  const { selectedPage } = useFolderTree()

  if (!selectedPage) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">No page selected</p>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Selected: <span className="font-medium text-foreground">{selectedPage.name}</span>
      </p>
    </div>
  )
}
```

---

### File 4 — MODIFY: `src/App.tsx`

Two changes:
1. Import `Canvas` from `@/components/canvas`.
2. Render `<Canvas />` inside the existing `<main>` element.

```tsx
/* BEFORE */
import { useState, useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { FolderTreeProvider } from '@/components/folder-tree'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

```tsx
/* AFTER — add Canvas import */
import { useState, useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { FolderTreeProvider } from '@/components/folder-tree'
import { Canvas } from '@/components/canvas'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

```tsx
/* BEFORE */
{/* Canvas */}
<main className="relative flex-1">
</main>
```

```tsx
/* AFTER */
{/* Canvas */}
<main className="relative flex-1">
  <Canvas />
</main>
```

No other changes to `App.tsx`. The `FolderTreeProvider` already wraps everything so `Canvas` can consume the context.

---

## Rules

### Data rules

**DO** add new projects by adding a `PageNode` inside the correct `FolderNode` in `sidebarData`. Never add content anywhere else.

**DO NOT** add content directly to folder-tree.tsx or any component file. Components render data. `pages.ts` owns data.

**DO NOT** put a `FolderNode` inside a `PageNode`. Pages are always leaf nodes.

**DO** use `url: undefined` (or simply omit the `url` field) for pages that have no live preview. The canvas will handle this gracefully in PRD 02.

### Context rules

**DO** use `useFolderTree()` to read `selectedPage` in any component that needs to respond to navigation. This is the single source of read access.

**DO NOT** read `selectedId` and then manually look up the page from the data. Use `selectedPage` directly — the context already resolved it.

**DO NOT** call `toggle()` on a page node or `select()` on a folder node. `toggle` is for folders (expand/collapse). `select` is for pages (load in canvas).

### Icon rules

**DO** use `FileText` icon for page nodes in the sidebar. It visually distinguishes pages from folders without needing labels.

**DO NOT** use `Folder`/`FolderOpen` for page nodes. Folder icons imply expandability, which pages do not have.

---

## Dos and Don'ts — Quick Reference

| Scenario | Correct | Wrong |
|---|---|---|
| Adding a new project | Add a `PageNode` to `sidebarData` in `pages.ts` | Add content to a component file |
| Reading the selected page | `const { selectedPage } = useFolderTree()` | `findPage(sidebarData, selectedId)` in a component |
| Home page canvas | `selectedPage.id === 'home'` check in Canvas | A separate route or page component |
| Adding a new category | Add a `FolderNode` at the top level of `sidebarData` | Create a new array or data structure |
| Checking if a node is a folder | `node.type === 'folder'` | `'children' in node` |

---

## Verification Checklist

After making these changes, verify:

1. **Sidebar structure** — The sidebar shows: `Home` (file icon, selected by default), `Personal Work` (folder, expanded), `Experiments` (file icon, inside Personal Work).

2. **Default selection** — On first load, `Home` is visually selected (highlighted) in the sidebar and the canvas shows `Selected: Home`.

3. **Page selection** — Click `Experiments`. The sidebar highlights it, the canvas shows `Selected: Experiments`. Click `Home`. Canvas shows `Selected: Home`.

4. **Folder toggle** — Click `Personal Work`. It collapses and the chevron rotates. Click again — it expands. The canvas does not change when a folder is clicked.

5. **File vs folder icons** — `Home` and `Experiments` show the `FileText` icon. `Personal Work` shows `Folder`/`FolderOpen` depending on state.

6. **No TypeScript errors** — The project compiles cleanly. Check the VS Code Problems panel.

7. **Light and dark mode** — Toggle dark mode. The sidebar and canvas both render correctly in both themes.

8. **Correct files changed** — Run `git diff --name-only`. Only `src/data/pages.ts` (new), `src/components/canvas.tsx` (new), `src/components/folder-tree.tsx`, and `src/App.tsx` should appear.

9. **No old sample data** — Search the codebase for `sampleFolders`. It should not exist anywhere. The old hardcoded data is gone.

---

## How to Test

Open the browser at `localhost:5173`.

1. Look at the sidebar — it should show `Home`, then `Personal Work` folder (expanded), then `Experiments` inside it.
2. Look at the canvas (right side) — it should say `Selected: Home`.
3. Click `Experiments` — canvas updates to `Selected: Experiments`.
4. Click `Personal Work` — folder collapses. Canvas stays on `Experiments`.
5. Toggle light/dark mode — everything looks right in both.

That's it. No other testing required. The canvas content itself is built in PRD 02.
