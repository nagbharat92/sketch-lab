import { FadeInUp } from "@/components/ui/fade-in-up"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { RoughBox } from "@/components/ui/rough-ink"
import type { IframeBlock } from "@/data/pages"

export function IframeBlockRenderer({ block, index }: { block: IframeBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <div className="relative aspect-[4/3] w-full">
        <div className="h-full w-full overflow-hidden rounded-xl bg-card">
          <iframe
            src={block.url}
            className="h-full w-full"
            loading="lazy"
            title="Project preview"
          />
        </div>
        <RoughBox seed={53} className="text-muted-foreground" />
      </div>
      {block.caption && (
        <JustifiedParagraph className="mt-(--caption-gap) text-center text-(length:--content-body-size) text-muted-foreground">
          {block.caption}
        </JustifiedParagraph>
      )}
    </FadeInUp>
  )
}
