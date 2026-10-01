import { House } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { FolderTree, useFolderTree, useSidebarNavigate } from "@/components/folder-tree"
import { RoughBox } from "@/components/ui/rough-ink"
import { SeattleSignature } from "@/components/seattle-signature"
import { cn } from "@/lib/utils"

const linkClasses = "ink-boil inline-flex items-baseline gap-1 rounded text-sidebar-foreground/70 underline-offset-4 hover:text-sidebar-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export function AppSidebar({ setDark }: { setDark: (fn: (d: boolean) => boolean) => void }) {
  const { selectedId } = useFolderTree()
  const navigate = useSidebarNavigate()
  const { open } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader className="p-(--sidebar-content-padding) pb-(--sidebar-section-gap)">
        <button
          onClick={() => navigate('home')}
          className={cn(
            "ink-boil-parent flex w-full items-center gap-(--tree-item-gap) rounded-md px-(--tree-item-px) py-(--tree-item-py) text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer",
            selectedId === 'home' && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <House className="size-4 shrink-0 text-sidebar-foreground/70" />
          <span className="ink-boil">Home</span>
        </button>
      </SidebarHeader>

      {/* Hairline anchoring Home as the root, above the grouped tree. */}
      <SidebarSeparator boil bowing={1} />

      <SidebarContent className="p-(--sidebar-content-padding) pt-(--sidebar-section-gap) hide-scrollbar">
        <FolderTree />
      </SidebarContent>

      <SidebarSeparator boil bowing={1} />

      <SidebarFooter className="max-h-[55%] shrink-0 gap-3 overflow-y-auto px-4 pt-4 pb-10">
        <SeattleSignature animated={open} compact />
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <a href="https://github.com/nagbharat92/sketch-lab" target="_blank" rel="noopener noreferrer" className={linkClasses}>
            View source
          </a>
          <span aria-hidden="true" className="text-sidebar-foreground/40">·</span>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle light and dark theme"
            className={`${linkClasses} cursor-pointer`}
          >
            Shift the light
          </button>
        </div>
      </SidebarFooter>

      {/* Hand-drawn sketchy outline framing the whole sidebar (replaces the
          old CSS border + shadow). Sits as a non-interactive overlay. The inset
          is the concentric gap: the outline's corner radius = the panel's
          rounded-xl (28px) minus this inset (28 − 3 = 25px), so inner radius +
          padding = outer radius and the ink stays a uniform 3px inside the
          rounded corner (roundedRectPath now uses true arcs, so it stays
          concentric at the corner too). The outline `boil`s so its stroke keeps
          re-wobbling while the sidepanel is shown (same cadence as the folder);
          bowing={1} gives the sidepanel a curvier ink than the site default. */}
      <RoughBox seed={7} inset={3} boil bowing={1} className="text-sidebar-foreground/70" />
    </Sidebar>
  )
}
