import { FadeInUp } from "@/components/ui/fade-in-up"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import type { VideoBlock } from "@/data/pages"

export function VideoBlockRenderer({ block, index }: { block: VideoBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={block.embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          loading="lazy"
          title="Video embed"
        />
      </div>
      {block.caption && (
        <JustifiedParagraph className="mt-(--caption-gap) text-center text-(length:--content-body-size) text-muted-foreground">
          {block.caption}
        </JustifiedParagraph>
      )}
    </FadeInUp>
  )
}
