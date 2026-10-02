import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { File } from "lucide-react"
import { LabPreview } from "@/components/lab/lab-preview"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import {
  type SidebarNode,
  type PageNode,
  sidebarData,
  findPage,
} from "@/data/pages"

const LAB_HINTS: Record<string, string> = {
  home: "Explore all experiments",
  "folder-lab": "Shape the ink",
  "type-pairing": "Pair type with intent",
  backgrounds: "Find your palette",
  motion: "Find its rhythm",
  "flower-lab": "Grow a hand-drawn garden",
  "text-boil": "Bring letters to life",
  controls: "Play with the details",
  seattle: "A little personal signature",
}

// ─── Depth padding ────────────────────────────────────────────────────────────
// Computed from spacing tokens: base indent + depth × step.
// Eliminates the static lookup table and scales to any depth.

// ─── FolderItem ───────────────────────────────────────────────────────────────

function FolderItem({
  node,
  depth,
  selectedId,
  select,
}: {
  node: SidebarNode
  depth: number
  selectedId: string | null
  select: (id: string) => void
}) {
  const { open } = useSidebar()
  const indentStyle = {
    paddingLeft: `calc(var(--tree-indent-base) + ${depth} * var(--tree-indent-step))`,
  }

  // Folders are always-expanded grouping headers — not interactive, no toggle.
  // Their children always render, indented one step in.
  if (node.type === 'folder') {
    return (
      <li>
        <div
          className="mt-4 mb-1 flex w-full items-center gap-2 px-(--tree-item-px) py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50"
          style={indentStyle}
        >
          <span className="truncate">{node.name}</span>
        </div>

        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              select={select}
            />
          ))}
        </ul>
      </li>
    )
  }

  // Pages are the interactive leaves.
  const isSelected = selectedId === node.id
  const PageIcon = node.icon ?? File
  const hint = LAB_HINTS[node.id]

  return (
    <li>
      <button
        onClick={() => select(node.id)}
        aria-current={isSelected ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-(--tree-item-px) py-2 text-left text-sm text-sidebar-foreground",
          "transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          "cursor-pointer",
          isSelected && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        )}
        style={indentStyle}
      >
        {hint ? (
          <>
            <span aria-hidden="true" className="flex h-9 w-11 shrink-0 items-center justify-center">
              <LabPreview id={node.id} active={isSelected && open} compact />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{node.name}</span>
              <span className="mt-0.5 block text-xs text-sidebar-foreground/60">{hint}</span>
            </span>
          </>
        ) : (
          <>
            <PageIcon className="size-4 shrink-0 text-sidebar-foreground/50" />
            <span className="truncate text-sidebar-foreground/70">{node.name}</span>
          </>
        )}
      </button>
    </li>
  )
}

// ─── Context ──────────────────────────────────────────────────────────────────

type FolderTreeContextValue = {
  selectedId: string | null
  selectedPage: PageNode | null
  select: (id: string) => void
}

const FolderTreeContext = createContext<FolderTreeContextValue | null>(null)

/** Reads the page id from the URL hash. Returns 'home' as fallback. */
function getInitialPageId(): string {
  const hash = window.location.hash // e.g. "#/experiment-1"
  const id = hash.replace(/^#\//, '').trim()
  return id && findPage(sidebarData, id) ? id : 'home'
}

export function FolderTreeProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(() => getInitialPageId())

  const [selectedPage, setSelectedPage] = useState<PageNode | null>(() =>
    findPage(sidebarData, getInitialPageId())
  )

  const select = useCallback((id: string) => {
    setSelectedId(id)
    setSelectedPage(findPage(sidebarData, id))
    window.location.hash = `/${id}`
  }, [])

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#\//, '').trim()
      const id = hash && findPage(sidebarData, hash) ? hash : 'home'
      setSelectedId(id)
      setSelectedPage(findPage(sidebarData, id))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <FolderTreeContext.Provider value={{ selectedId, selectedPage, select }}>
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

// ─── useSidebarNavigate ─────────────────────────────────────────────────────────

/**
 * The single navigation entry point for EVERY sidebar control — the tree pages
 * and the "Home" header button alike. It selects the page and, on mobile, also
 * dismisses the sidebar sheet.
 *
 * Any new navigation affordance (a future header link, a footer shortcut, etc.)
 * should call this hook instead of the raw `select`, so the close-on-navigate
 * behaviour never has to be re-wired per control. Must be used inside
 * <SidebarProvider> (all sidebar controls are).
 */
export function useSidebarNavigate() {
  const { select } = useFolderTree()
  const { setOpen } = useSidebar()

  return useCallback(
    (id: string) => {
      select(id)
      setOpen(false)
    },
    [select, setOpen]
  )
}

// ─── FolderTree ───────────────────────────────────────────────────────────────

export function FolderTree() {
  const { selectedId } = useFolderTree()
  const navigate = useSidebarNavigate()

  return (
    <ul className="flex flex-col gap-0.5">
      {sidebarData.map((node) => (
        <FolderItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          select={navigate}
        />
      ))}
    </ul>
  )
}
