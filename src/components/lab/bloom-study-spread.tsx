import { useState, type ReactNode } from "react"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { RoughBox } from "@/components/ui/rough-ink"
import { BLOOM_OUTLINE, BLOOM_PIGMENTS, BLOOM_PROSE_POLICY, BLOOM_SWATCHES } from "./bloom-tokens"
import { useBloomStudyMotion } from "@/hooks/use-bloom-study-motion"
import { BloomIntroParagraph } from "./bloom-intro-paragraph"
import "./bloom-study.css"

export function BloomStudyButton({ children, generate, color, ink }: {
  children: ReactNode; generate: () => void; color: string; ink: string
}) {
  const [hovered, setHovered] = useState(false)
  const motion = useBloomStudyMotion()
  return (
    <button
      type="button"
      className="bloom-surprise bloom-study-generate"
      style={{ backgroundColor: color, color: ink }}
      onClick={generate}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
    >
      <RoughBox {...BLOOM_OUTLINE.button} seed={672} boil={hovered && motion} />
      <span>{children}</span>
    </button>
  )
}

export function BloomStudySpread({ id, title, copy, button, generate, children, controls, magazine = false, reversed = false, wide = false, color = BLOOM_PIGMENTS.leaf.dark, ink = BLOOM_SWATCHES[2].ink }: {
  id: string; title: ReactNode; copy: string; button: string; generate: () => void
  children: ReactNode; controls?: ReactNode; magazine?: boolean; reversed?: boolean; wide?: boolean; color?: string; ink?: string
}) {
  return (
    <section id={id} className="bloom-page bloom-study-spread" data-reversed={reversed} data-wide={wide} aria-labelledby={`${id}-title`}>
      <div className="bloom-study-copy">
        <h2 id={`${id}-title`} className={magazine ? "sr-only" : undefined}>{title}</h2>
        {magazine && copy.startsWith("I ")
          ? <BloomIntroParagraph>{copy}</BloomIntroParagraph>
          : <JustifiedParagraph dropCap={magazine} policy={BLOOM_PROSE_POLICY} className="bloom-story">{copy}</JustifiedParagraph>}
        {magazine && controls && <div className="bloom-study-copy-controls">{controls}</div>}
        <BloomStudyButton generate={generate} color={color} ink={ink}>{button}</BloomStudyButton>
      </div>
      <div className="bloom-study-workbench">
        {children}
        {!magazine && controls && <div className="bloom-study-controls">{controls}</div>}
      </div>
    </section>
  )
}
