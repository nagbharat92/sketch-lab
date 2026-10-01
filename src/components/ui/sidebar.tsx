import * as React from "react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * The sidebar is an off-canvas floating DRAWER at every breakpoint — opened by
 * the hamburger menu button (RoughMenuButton). There is no always-visible
 * desktop sidebar: the drawer renders nothing in-flow, so the page content is
 * full width and centres itself. Open/closed state lives in SidebarProvider and
 * is toggled by the hamburger (or ⌘/Ctrl+B).
 *
 * (This replaced the large vendored shadcn sidebar — collapsible variants, rail,
 * inset, menu/group primitives, cookie persistence and mobile-breakpoint
 * switching were all removed as unused once the constant sidebar went away.)
 */

const SIDEBAR_WIDTH = "320px"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { keyboardShortcutEnabled?: boolean }
>(({ className, style, children, keyboardShortcutEnabled = true, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  const toggleSidebar = React.useCallback(() => setOpen((o) => !o), [])

  // ⌘/Ctrl+B toggles the menu drawer.
  React.useEffect(() => {
    if (!keyboardShortcutEnabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar, keyboardShortcutEnabled])

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({ open, setOpen, toggleSidebar }),
    [open, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          ref={ref}
          style={style}
          className={cn("flex h-full w-full", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = "SidebarProvider"

/**
 * Sidebar — the off-canvas menu drawer. Always an inset, rounded, floating Sheet
 * that slides + fades in from the left (see the `float` sheet variant). Renders
 * nothing in-flow, so it never reserves horizontal space.
 */
const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { dir?: "ltr" | "rtl" }
>(({ className, children, dir, ...props }, ref) => {
  const { open, setOpen } = useSidebar()

  return (
    <Sheet open={open} onOpenChange={setOpen} {...props}>
      <SheetContent
        dir={dir}
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
        side="float"
      >
        <div
          ref={ref}
          className={cn(
            "relative flex h-full w-full flex-col rounded-xl",
            className
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-(--sidebar-section-gap) p-(--sidebar-section-padding)", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-(--sidebar-section-gap) p-(--sidebar-section-padding)", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ComponentRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      className={cn("mx-(--sidebar-separator-mx) w-auto text-sidebar-foreground/60", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-(--sidebar-section-gap) overflow-auto",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
}
