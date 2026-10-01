import { useEffect, useRef } from "react"
import { AnimatePresence, usePresence } from "framer-motion"
import { useFolderTree } from "@/components/folder-tree"
import { ProjectCanvas } from "@/components/project-canvas"
import type { PageNode } from "@/data/pages"

function PageTransition({ page }: { page: PageNode }) {
  const [isPresent, safeToRemove] = usePresence()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPresent || !ref.current) return

    const transition = ref.current.getAnimations().find(
      (animation) => animation instanceof CSSTransition && animation.transitionProperty === "opacity"
    )
    let disposed = false
    const finish = () => {
      if (!disposed) safeToRemove?.()
    }

    if (transition) {
      // Cancellation also completes an exit, including reduced-motion changes.
      transition.finished.then(finish, finish)
    } else {
      finish()
    }

    return () => { disposed = true }
  }, [isPresent, safeToRemove])

  return (
    <div
      ref={ref}
      className="page-transition"
      data-page={page.id}
      data-present={isPresent}
      inert={!isPresent}
    >
      <ProjectCanvas page={page} />
    </div>
  )
}

/** CSS owns opacity; AnimatePresence only retains pages until their exits finish. */
export function Canvas() {
  const { selectedPage } = useFolderTree()

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {selectedPage && (
          <PageTransition key={selectedPage.id} page={selectedPage} />
        )}
      </AnimatePresence>
    </div>
  )
}
