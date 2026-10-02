import { useState, useEffect } from 'react'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { RoughMenuButton } from '@/components/ui/rough-menu-button'
import { InkBoilFilter } from '@/components/ui/ink-boil'
import { FolderTreeProvider, useFolderTree } from '@/components/folder-tree'
import { Canvas } from '@/components/canvas'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function App() {
  const [dark, setDark] = useState(() =>
    document.documentElement.dataset.theme === 'dark'
  )

  useEffect(() => {
    const toggle = () => {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#1A1815' : '#FCFAF3')
    }

    if (document.startViewTransition) {
      document.startViewTransition(toggle)
    } else {
      toggle()
    }
  }, [dark])

  return (
    <FolderTreeProvider>
      {/* One global, always-animating SVG filter that every link references on
          hover (see the INK BOIL block in index.css). Rendered once here so the
          hand-drawn "boil" comes for free to any <a> site-wide. */}
      <InkBoilFilter />
      <AppLayout dark={dark} setDark={setDark} />
    </FolderTreeProvider>
  )
}

/**
 * AppLayout — the sidebar + canvas shell.
 *
 * Every route, including the merged Home landing page, renders here. Page-to-page
 * transitions are handled inside Canvas (AnimatePresence + content FadeInUp).
 */
function AppLayout({ dark, setDark }: { dark: boolean; setDark: (fn: (d: boolean) => boolean) => void }) {
  const { selectedId } = useFolderTree()
  const isHome = selectedId === 'home'

  return (
    <SidebarProvider keyboardShortcutEnabled={!isHome}>
      {!isHome && <AppSidebar dark={dark} setDark={setDark} />}

      <div className="relative flex flex-1 min-h-0">
        {!isHome && <MenuButton />}

        {/* Canvas — full bleed, scrolls independently */}
        <main className="flex-1 min-h-0">
          <Canvas />
        </main>
      </div>
    </SidebarProvider>
  )
}

/**
 * MenuButton — the hamburger trigger, fixed top-left at every breakpoint. It
 * fades out while the drawer is open (matching the drawer's own timing: 500ms
 * out as the drawer opens, 300ms back in as it closes) so the two never overlap.
 * z-20 keeps it above sticky page content (e.g. the Strokes preview stage, z-10).
 */
function MenuButton() {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        'absolute top-(--page-inset) left-(--page-inset) z-20 flex items-center transition-opacity ease-in-out',
        open
          ? 'pointer-events-none opacity-0 duration-500'
          : 'opacity-100 duration-300'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <RoughMenuButton />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Explore
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default App
