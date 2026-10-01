# Feature Canvas PRD 03 — State Persistence

---

## Model and Mode

```
Model:   Claude Opus 4.6
Mode:    Agent
Context: Standard
```

**Instruction for Agent mode:**
```
Read @docs/features/canvas/feature-canvas-prd-03-state-persistence.md in full before doing anything.
Execute all changes described in the Target State section in order.
Modify exactly these files:
  MODIFY: src/data/pages.ts
  MODIFY: src/components/folder-tree.tsx
Touch no other files. Run the verification checklist when done.
```

---

## Goal

After this PRD is executed:
- Refreshing the page while on any page (e.g. Experiment 1) restores that page — not Home.
- Browser back/forward buttons navigate between previously selected pages.
- Sidebar folders that were expanded before a refresh are still expanded after.
- Scroll position is **not** persisted — it resets to top on every page change. This is intentional.

---

## What is being built

Two independent persistence mechanisms, both implemented inside `FolderTreeProvider` in `folder-tree.tsx`:

1. **Hash-based URL routing** — the selected page id is reflected in the URL hash (e.g. `/#/experiment-1`). On load, the hash is read and used to restore the active page. Back/forward browser buttons work via the `hashchange` event.

2. **Sidebar folder state in localStorage** — the set of expanded folder ids is written to localStorage whenever a folder is toggled. On load, this is read back and used to restore which folders were open.

These two are intentionally separate concerns. The URL owns which page is selected. localStorage owns which folders are open.

---

## Decisions locked in

| Decision | Choice | Reason |
|---|---|---|
| URL strategy | Hash-based (`/#/page-id`) | GitHub Pages has no server-side routing. Hashes work natively. No library needed. |
| Scroll persistence | None | Pages are short. Resetting to top on each navigation is cleaner and simpler. The canvas div already scrolls independently per mount. |
| Folder state storage | localStorage | Persists across refresh and across sessions. Small payload (just an array of strings). |
| localStorage key | `portfolio-sidebar-expanded` | Namespaced to this project to avoid collisions. |

---

## Hash format

```
/#/home           → Home page
/#/experiment-1   → Experiment 1 page
```

- Empty hash or unrecognised hash → falls back to `'home'`.
- Home page explicitly writes `/#/home` to the hash (no special empty-string case).

---

## Files changed

| File | Change type |
|---|---|
| `src/data/pages.ts` | Add `findAncestorFolderIds()` helper |
| `src/components/folder-tree.tsx` | Update `FolderTreeProvider` — read/write hash and localStorage |

No other files change.

---

## Target state

### 1. `src/data/pages.ts` — add helper

Add this function after the existing `findPage()` export. It returns the ids of all ancestor folders for a given page id, which are needed to auto-expand the sidebar when restoring a deep page from the URL.

```ts
/**
 * Returns the ids of all ancestor FolderNodes that contain the page with the
 * given id. Used to auto-expand the sidebar when restoring a page from the URL.
 * Returns an empty array if the page is at the root or not found.
 */
export function findAncestorFolderIds(
  nodes: SidebarNode[],
  pageId: string,
  ancestors: string[] = []
): string[] {
  for (const node of nodes) {
    if (node.type === 'folder') {
      const found = findAncestorFolderIds(node.children, pageId, [...ancestors, node.id])
      if (found.length > 0) return found
    } else if (node.id === pageId) {
      return ancestors
    }
  }
  return []
}
```

### 2. `src/components/folder-tree.tsx` — update FolderTreeProvider

#### a. Add import for `findAncestorFolderIds`

```ts
import {
  type SidebarNode,
  type PageNode,
  type FolderNode,
  sidebarData,
  findPage,
  collectFolderIds,
  findAncestorFolderIds,   // ← add this
} from "@/data/pages"
```

#### b. Add two pure helper functions above `FolderTreeProvider` (not inside it)

These are defined once — not recreated on every render.

```ts
const STORAGE_KEY = 'portfolio-sidebar-expanded'

/** Reads the page id from the URL hash. Returns 'home' as fallback. */
function getInitialPageId(): string {
  const hash = window.location.hash // e.g. "#/experiment-1"
  const id = hash.replace(/^#\//, '').trim()
  return id && findPage(sidebarData, id) ? id : 'home'
}

/** Reads expanded folder ids from localStorage. Returns an empty array on failure. */
function getStoredExpandedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
```

#### c. Replace the FolderTreeProvider state initialisation

Replace the current `useState` calls at the top of `FolderTreeProvider` with these:

```ts
export function FolderTreeProvider({ children }: { children: ReactNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initialPageId = getInitialPageId()
    const stored = getStoredExpandedIds()
    const ancestors = findAncestorFolderIds(sidebarData, initialPageId)
    // Merge stored + ancestors so the restored page's parent folders are visible
    return new Set([...stored, ...ancestors])
  })

  const [selectedId, setSelectedId] = useState<string | null>(() => getInitialPageId())

  const [selectedPage, setSelectedPage] = useState<PageNode | null>(() =>
    findPage(sidebarData, getInitialPageId())
  )
```

#### d. Update the `toggle` callback to write localStorage

```ts
const toggle = useCallback((id: string) => {
  setExpandedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    return next
  })
}, [])
```

#### e. Update the `select` callback to write the URL hash

```ts
const select = useCallback((id: string) => {
  setSelectedId(id)
  setSelectedPage(findPage(sidebarData, id))
  window.location.hash = `/${id}`
}, [])
```

#### f. Add a `useEffect` for back/forward navigation

Add this inside `FolderTreeProvider`, after the `select` callback:

```ts
useEffect(() => {
  function onHashChange() {
    const hash = window.location.hash.replace(/^#\//, '').trim()
    const id = hash && findPage(sidebarData, hash) ? hash : 'home'
    setSelectedId(id)
    setSelectedPage(findPage(sidebarData, id))
    // Auto-expand ancestors of the restored page
    const ancestors = findAncestorFolderIds(sidebarData, id)
    if (ancestors.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set([...prev, ...ancestors])
        return next
      })
    }
  }
  window.addEventListener('hashchange', onHashChange)
  return () => window.removeEventListener('hashchange', onHashChange)
}, [])
```

Don't forget to import `useEffect` from React at the top of the file alongside `useState`, `useCallback`, `createContext`, `useContext`, and `type ReactNode`.

---

## What does NOT change

- `canvas.tsx` — no changes. The crossfade and routing logic is unchanged.
- `home-canvas.tsx` — no changes.
- `project-placeholder.tsx` — no changes.
- `src/data/pages.ts` structure — only `findAncestorFolderIds` is added, nothing else changes.
- `App.tsx` — no changes.
- `index.css` — no changes.

---

## Verification checklist

After running this in VS Code, test the following in the browser at `localhost:5173`:

1. **Load home** — URL shows `/#/home`. Home canvas is visible.
2. **Expand "Personal Work"** — the folder opens. Refresh the page. The folder is still open after refresh.
3. **Click Experiment 1** — URL changes to `/#/experiment-1`. Experiment 1 placeholder is shown.
4. **Refresh while on Experiment 1** — page loads back to Experiment 1, not Home. "Personal Work" folder is expanded.
5. **Browser back button** — returns to `/#/home`, Home canvas appears.
6. **Browser forward button** — returns to `/#/experiment-1`, Experiment 1 placeholder appears.
7. **Clear localStorage in DevTools** → refresh → URL is `/#/home`, folders are collapsed, Home is selected. (Clean slate test.)
8. **Type a bad hash manually** (e.g. `/#/nonexistent`) → should fall back to Home.
