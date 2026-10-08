import { startTransition, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import { motion, useAnimationControls } from "framer-motion"
import { RoughBox } from "@/components/ui/rough-ink"
import { BOIL_BOWING } from "@/hooks/use-boil-seed"
import { useBloomStudyMotion } from "@/hooks/use-bloom-study-motion"
import { BLOOM_MOTION, BLOOM_OUTLINE } from "./bloom-tokens"

function subscribeHoverInk(onChange: () => void) {
  const query = window.matchMedia(BLOOM_MOTION.hoverQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const hoverInkSnapshot = () => window.matchMedia(BLOOM_MOTION.hoverQuery).matches

export function BloomSurpriseButton({ children, onClick, className = "", style }: {
  children: ReactNode
  onClick: () => void
  className?: string
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const hoverAllowed = useSyncExternalStore(subscribeHoverInk, hoverInkSnapshot, () => false)
  const motionAllowed = useBloomStudyMotion()
  const controls = useAnimationControls()
  const inkActive = hovered && hoverAllowed && motionAllowed

  useEffect(() => {
    if (motionAllowed) return
    controls.stop()
    controls.set({ scale: 1, y: 0 })
  }, [controls, motionAllowed])

  const surprise = () => {
    controls.stop()
    controls.set({ scale: 1, y: 0 })
    if (motionAllowed) {
      void controls.start({
        scale: [...BLOOM_MOTION.press.scale],
        y: [...BLOOM_MOTION.press.y],
        transition: {
          duration: BLOOM_MOTION.press.duration,
          times: [...BLOOM_MOTION.press.times],
          ease: "easeOut",
        },
      })
    }
    // Keep the press feedback responsive while React prepares the new drawing.
    startTransition(onClick)
  }

  return (
    <motion.button
      type="button"
      onClick={surprise}
      onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
      initial={false}
      animate={controls}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      style={style}
      className={`ink-boil-parent bloom-surprise ${className}`.trim()}
    >
      <RoughBox {...BLOOM_OUTLINE.button} boil={inkActive} bowing={inkActive ? BOIL_BOWING : undefined} />
      <span className="ink-boil">{children}</span>
    </motion.button>
  )
}
