import { useState, useSyncExternalStore } from "react"
import { motion, useAnimationControls } from "framer-motion"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { BloomIllustration } from "@/components/lab/bloom-illustration"
import { growBloom, initialBloomState } from "@/components/lab/bloom-state"
import { BLOOM_MOTION, BLOOM_OUTLINE, BLOOM_PROSE_POLICY, BLOOM_SCENE_STYLE, BLOOM_SWATCHES } from "@/components/lab/bloom-tokens"
import { RoughBox } from "@/components/ui/rough-ink"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { BOIL_BOWING } from "@/hooks/use-boil-seed"

interface FlowerLabProps {
  index: number
  props?: Record<string, unknown>
}

function subscribeHoverInk(onChange: () => void) {
  const query = window.matchMedia(BLOOM_MOTION.hoverQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const hoverInkSnapshot = () => window.matchMedia(BLOOM_MOTION.hoverQuery).matches

function useHoverInk() {
  const [hovered, setHovered] = useState(false)
  const allowed = useSyncExternalStore(subscribeHoverInk, hoverInkSnapshot, () => false)
  return {
    active: hovered && allowed,
    handlers: {
      onPointerEnter: () => setHovered(true),
      onPointerLeave: () => setHovered(false),
      onPointerCancel: () => setHovered(false),
    },
  }
}

const BLOOM_INITIAL = {
  aspectRatio: 44 / 64,
  glyph: (
    <svg viewBox="0 0 44 64" width="100%" height="100%" focusable="false" aria-hidden="true">
      <path fill="currentColor" d="M4 1 C14 -0.5 31 0 40 1 Q44 1 43 5 L42 10 Q42 13 38 13 L30 13 C29 24 30 40 29 51 L39 51 Q43 51 43 55 L44 60 Q44 64 40 64 C28 63 15 64 4 63 Q0 63 1 59 L1 55 Q1 51 5 51 L14 51 C15 39 14 25 15 13 L5 13 Q1 13 1 9 L0 5 Q0 1 4 1 Z" />
    </svg>
  ),
}

export function FlowerLab({ index }: FlowerLabProps) {
  const [bloom, setBloom] = useState(initialBloomState)
  const { sceneSeed, garden, colorIndex } = bloom
  const surpriseMotion = useAnimationControls()
  const surpriseInk = useHoverInk()
  const color = BLOOM_SWATCHES[colorIndex]

  const surprise = () => {
    setBloom(growBloom)
    surpriseMotion.stop()
    surpriseMotion.set({ scale: 1, y: 0 })
    if (!window.matchMedia(BLOOM_MOTION.reducedQuery).matches) {
      void surpriseMotion.start({
        scale: [...BLOOM_MOTION.press.scale],
        y: [...BLOOM_MOTION.press.y],
        transition: { duration: BLOOM_MOTION.press.duration, times: [...BLOOM_MOTION.press.times], ease: "easeOut" },
      })
    }
  }

  return (
    <article aria-label="Bloom: a generative garden" className="bloom-page" style={BLOOM_SCENE_STYLE}>
      <div className="bloom-editorial">
        <FadeInUp i={index}>
          <JustifiedParagraph dropCap dropCapArtwork={BLOOM_INITIAL} policy={BLOOM_PROSE_POLICY} className="bloom-story">
            I started with a single flower and kept experimenting with its shape, colour and movement. Now it is a whole garden, drawn in code. Each click creates a new arrangement of flowers and foliage.
          </JustifiedParagraph>
          <JustifiedParagraph policy={BLOOM_PROSE_POLICY} className="bloom-story">
            The garden follows rules for plant size, branching and spacing. Taller blooms lead; smaller flowers and monsteras fill the gaps. I generate the leaf shapes, veins and ground details in code, then add a gentle ink wiggle.
          </JustifiedParagraph>

          <motion.button
            type="button"
            onClick={surprise}
            initial={false}
            animate={surpriseMotion}
            {...surpriseInk.handlers}
            style={{ backgroundColor: color.color, color: color.ink }}
            className="ink-boil-parent bloom-surprise"
          >
            <RoughBox {...BLOOM_OUTLINE.button} boil={surpriseInk.active} bowing={surpriseInk.active ? BOIL_BOWING : undefined} />
            <span className="ink-boil">Grow me a garden</span>
          </motion.button>
        </FadeInUp>

      </div>
      <div className="bloom-art-column">
        <figure aria-label="Your bloom" className="bloom-artwork">
          <BloomIllustration {...bloom} fill={color.color} animated />
          <span role="status" className="sr-only">Garden {sceneSeed + 1}: {garden.flowers.length + 1} flowers and {garden.monsteras.length} monsteras, with a {color.name.toLowerCase()} king bloom.</span>
        </figure>
      </div>
    </article>
  )
}
