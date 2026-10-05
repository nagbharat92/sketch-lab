import type { ReactNode } from "react"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { BLOOM_PROSE_POLICY } from "./bloom-tokens"

type Initial = { glyph: ReactNode; aspectRatio: number }

const INITIAL: Initial = {
  aspectRatio: 44 / 64,
  glyph: (
    <svg viewBox="0 0 44 64" width="100%" height="100%" focusable="false" aria-hidden="true">
      <path fill="currentColor" d="M4 1 C14 -0.5 31 0 40 1 Q44 1 43 5 L42 10 Q42 13 38 13 L30 13 C29 24 30 40 29 51 L39 51 Q43 51 43 55 L44 60 Q44 64 40 64 C28 63 15 64 4 63 Q0 63 1 59 L1 55 Q1 51 5 51 L14 51 C15 39 14 25 15 13 L5 13 Q1 13 1 9 L0 5 Q0 1 4 1 Z" />
    </svg>
  ),
}

export function BloomIntroParagraph({ children, deferred, onReady, initial = INITIAL }: {
  children: string; deferred?: boolean; onReady?: () => void; initial?: Initial
}) {
  return (
    <JustifiedParagraph deferred={deferred} onReady={onReady} dropCap dropCapArtwork={initial} policy={BLOOM_PROSE_POLICY} className="bloom-story">
      {children}
    </JustifiedParagraph>
  )
}
