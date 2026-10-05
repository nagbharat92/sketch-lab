import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { motion, useAnimationControls } from "framer-motion"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { BloomIllustration } from "@/components/lab/bloom-illustration"
import { BloomFlowerStudy } from "@/components/lab/bloom-flower-study"
import { BloomBotanicalStudies } from "@/components/lab/bloom-botanical-studies"
import { DeferredBloomStudy } from "@/components/lab/deferred-bloom-study"
import { BloomIntroParagraph } from "@/components/lab/bloom-intro-paragraph"
import { Bloom } from "@/components/lab/color-swatch"
import { DEFAULT_BLOOM } from "@/lib/bloom"
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

export function FlowerLab({ index }: FlowerLabProps) {
  const [preparing, setPreparing] = useState(false)
  const [firstReady, setFirstReady] = useState(false)
  const [secondReady, setSecondReady] = useState(false)
  const [artReady, setArtReady] = useState(false)
  const firstDone = useCallback(() => setFirstReady(true), [])
  const secondDone = useCallback(() => setSecondReady(true), [])
  const artDone = useCallback(() => setArtReady(true), [])
  const ready = firstReady && secondReady && artReady

  useEffect(() => {
    let secondFrame = 0
    // Give the introduction a paint before mounting the garden behind it.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPreparing(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  return (
    <div className="bloom-entry" data-ready={ready} aria-busy={!ready}>
      {!ready && (
        <div className="bloom-intro" role="status" aria-label="Loading Bloom">
          <Bloom size={52} radius={21} shape={DEFAULT_BLOOM} fill={BLOOM_SWATCHES[0].color} seed={7} centerHole spin />
          <h1>Bloom</h1>
        </div>
      )}
      <div inert={!ready} aria-hidden={!ready}>
        {preparing && <Garden index={index} firstDone={firstDone} secondDone={secondDone} artDone={artDone} />}
        {ready && <>
          <DeferredBloomStudy label="The flower"><BloomFlowerStudy /></DeferredBloomStudy>
          <BloomBotanicalStudies />
        </>}
      </div>
    </div>
  )
}

function Garden({ index, firstDone, secondDone, artDone }: {
  index: number; firstDone: () => void; secondDone: () => void; artDone: () => void
}) {
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
          <BloomIntroParagraph deferred onReady={firstDone}>
            I started with a single flower and kept experimenting with its shape, colour and movement. Now it is a whole garden, drawn in code. Each click creates a new arrangement of flowers and foliage.
          </BloomIntroParagraph>
          <JustifiedParagraph deferred onReady={secondDone} policy={BLOOM_PROSE_POLICY} className="bloom-story">
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
          <BloomIllustration {...bloom} fill={color.color} animated onReady={artDone} />
          <span role="status" className="sr-only">Garden {sceneSeed + 1}: {garden.flowers.length + 1} flowers and {garden.monsteras.length} monsteras, with a {color.name.toLowerCase()} king bloom.</span>
        </figure>
      </div>
    </article>
  )
}
