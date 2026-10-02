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
import { Bloom } from "@/components/lab/color-swatch"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { cn } from "@/lib/utils"
import { Sun, Moon } from "lucide-react"
import { XIcon, GitHubIcon } from "@/components/ui/social-icons"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const actionClasses = "ink-boil-parent inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export function AppSidebar({ dark, setDark }: { dark: boolean; setDark: (fn: (d: boolean) => boolean) => void }) {
  const { selectedId } = useFolderTree()
  const navigate = useSidebarNavigate()
  const { open } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader className="shrink-0 px-5 py-5 text-left">
        <button
          aria-label="Home"
          onClick={() => navigate('home')}
          className={cn(
            "ink-boil-parent flex w-full items-center gap-3 rounded-md text-sidebar-foreground transition-colors duration-150 hover:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer",
            selectedId === 'home' && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Bloom size={32} radius={13} shape={DEFAULT_BLOOM} fill="var(--accent-primary)" seed={7} centerHole />
          <span className="ink-boil font-display text-xl">Sketch Lab</span>
        </button>
        <p className="mt-2 text-sm leading-snug text-sidebar-foreground/65">
          Small experiments in hand-drawn UI.
        </p>
      </SidebarHeader>

      {/* Hairline anchoring Home as the root, above the grouped tree. */}
      <SidebarSeparator boil bowing={1} />

      <SidebarContent className="p-(--sidebar-content-padding) pt-(--sidebar-section-gap) hide-scrollbar">
        <FolderTree />
      </SidebarContent>

      <SidebarSeparator boil bowing={1} />

      <SidebarFooter className="max-h-[55%] shrink-0 gap-3 overflow-y-auto px-5 py-5">
        <SeattleSignature
          animated={open}
          compact
          layout="beside"
          minimal
          utilities={
            <nav aria-label="Social links and appearance" className="mt-2 flex items-center justify-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="https://x.com/bharatnag92" target="_blank" rel="noopener noreferrer" aria-label="Say hello to @bharatnag92 on X (opens in a new tab)" className={actionClasses}>
                    <XIcon className="ink-boil size-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Say hello on X</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="https://github.com/nagbharat92" target="_blank" rel="noopener noreferrer" aria-label="Explore my projects on GitHub (opens in a new tab)" className={actionClasses}>
                    <GitHubIcon className="ink-boil size-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Explore my projects</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className={`${actionClasses} cursor-pointer`}>
                    {dark
                      ? <Sun aria-hidden="true" strokeWidth={2.25} className="ink-boil size-5 fill-current" />
                      : <Moon aria-hidden="true" strokeWidth={2.25} className="ink-boil size-5 fill-current" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{dark ? "Switch to light theme" : "Switch to dark theme"}</TooltipContent>
              </Tooltip>
            </nav>
          }
        />
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
