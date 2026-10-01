import { AnimatePresence, motion } from "framer-motion"
import { useFolderTree } from "@/components/folder-tree"
import { ProjectCanvas } from "@/components/project-canvas"
import { transitions } from "@/lib/motion"

/**
 * Canvas — main content area of Sketch Lab.
 *
 * Handles sequential page transitions via AnimatePresence mode="wait".
 * On page switch the old page fades out completely (200ms, ease-in),
 * then the new page fades in (300ms, ease-out) while its content blocks
 * perform the staggered CSS entrance animation.
 *
 * All pages (including Home) are rendered by ProjectCanvas via the block renderer.
 */
export function Canvas() {
  const { selectedPage } = useFolderTree()

  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="wait">
        {selectedPage && (
          <motion.div
            key={selectedPage.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: transitions.pageEnter }}
            exit={{ opacity: 0, transition: transitions.pageExit }}
            className="h-full"
          >
            <ProjectCanvas page={selectedPage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
