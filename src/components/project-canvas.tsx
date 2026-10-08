import { BlockRenderer } from "@/components/blocks/block-renderer"
import { FadeInUp } from "@/components/ui/fade-in-up"
import type { PageNode } from "@/data/pages"

interface ProjectCanvasProps {
  page: PageNode
}

/**
 * ProjectCanvas — renders a page's block array inside a scrollable content column.
 *
 * Layout:
 *   - A single scrollable content column; blocks are centered with a max width.
 *
 * Page title:
 *   - The page name is rendered as a large display-font title that stands in for
 *     the first section heading (that text block's own title is suppressed), with
 *     generous space above it to separate it from the stats / links row.
 *
 * Block spacing:
 *   - Default gap between blocks: mt-10
 *   - stats block gets mt-4 (sits tight below the iframe card)
 */
export function ProjectCanvas({ page }: ProjectCanvasProps) {
  const blocks = page.blocks ?? []
  const isHome = page.id === 'home'
  const isBloom = page.id === 'flower-lab'

  // The page title replaces the first section heading: find the first text block
  // that carries a title, drop that title, and render the page name above it.
  const titleBlockIndex = blocks.findIndex(
    (b) => b.type === 'text' && Boolean(b.title)
  )

  return (
    <div className="relative h-full">

      {/* Scrollable content — full height, no clipping */}
      <div className="h-full overflow-y-auto">
        <div
          className={`project-content mx-auto w-full max-w-(--content-max-width) px-(--content-px) pb-(--content-py-mobile) ${isBloom ? 'lg:pb-0' : 'lg:pb-(--content-py)'} ${
            isHome ? 'pt-(--content-pt-home)' : isBloom ? 'pt-(--content-pt) lg:pt-0' : 'pt-(--content-pt)'
          }`}
        >
          {blocks.map((block, i) => {
            const isFullWidth =
              block.type === 'iframe' ||
              (block.type === 'custom' &&
                (block.componentId === 'lab-home' ||
                 block.componentId === 'folder-lab' ||
                 block.componentId === 'seattle-lab' ||
                block.componentId === 'type-lab' ||
                block.componentId === 'color-lab' ||
                block.componentId === 'motion-lab' ||
                block.componentId === 'flower-lab' ||
                block.componentId === 'controls-lab' ||
                block.componentId === 'text-boil'))
            const isStats = block.type === 'stats'
            const isTitleBlock = i === titleBlockIndex

            // Suppress the first section heading — the page title stands in for it.
            const rendered =
              isTitleBlock && block.type === 'text'
                ? { ...block, title: undefined }
                : block

            const gap =
              i === 0
                ? ''
                : isTitleBlock
                  ? 'mt-(--page-title-gap)'
                  : isStats
                    ? 'mt-(--block-gap-tight)'
                    : 'mt-(--block-gap)'

            return (
              <div key={i} className={gap}>
                {isFullWidth ? (
                  <BlockRenderer block={rendered} index={i} />
                ) : (
                  <div className="mx-auto max-w-2xl">
                    {isTitleBlock && (
                      <FadeInUp i={i}>
                        <h1 className="mb-(--page-title-mb) font-display text-[2rem] sm:text-[2.5rem] leading-[1.1] tracking-tight text-foreground">
                          {page.name}
                        </h1>
                      </FadeInUp>
                    )}
                    <BlockRenderer block={rendered} index={i} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
