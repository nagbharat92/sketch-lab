import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react"
import { AnimatePresence, usePresence } from "framer-motion"
import { useBloomStudyMotion } from "@/hooks/use-bloom-study-motion"
import type { GardenSelection } from "./bloom-selection"

function InspectorLayer({ children }: { children: ReactNode }) {
  const [present, remove] = usePresence()
  const ref = useRef<HTMLDivElement>(null)
  const motionAllowed = useBloomStudyMotion()

  useLayoutEffect(() => {
    const layer = ref.current
    if (!layer || layer.dataset.entered) return
    if (!motionAllowed) {
      layer.dataset.entered = "true"
      return
    }
    const frame = requestAnimationFrame(() => {
      // Establish the initial pose after control previews finish mounting.
      void getComputedStyle(layer).opacity
      layer.dataset.entered = "true"
    })
    return () => cancelAnimationFrame(frame)
  }, [motionAllowed])

  useEffect(() => {
    if (present || !ref.current) return
    const fade = ref.current.getAnimations().find(
      (animation) => animation instanceof CSSTransition && animation.transitionProperty === "opacity",
    )
    let disposed = false
    const finish = () => { if (!disposed) remove?.() }
    if (fade) fade.finished.then(finish, finish)
    else finish()
    return () => { disposed = true }
  }, [present, remove])

  return (
    <div ref={ref} className="bloom-panel-layer" data-panel="plant" data-active={present}
      inert={!present} aria-hidden={!present}>
      {children}
    </div>
  )
}

export function BloomPlayPanel({ selection, intro, children }: {
  selection?: GardenSelection; intro: ReactNode; children: ReactNode
}) {
  return (
    <div className="bloom-play-panel">
      {/* Invisible, rather than unmounted, so typography stays measured even after resizing. */}
      <div className="bloom-panel-layer" data-panel="intro" data-active={!selection}
        inert={!!selection} aria-hidden={!!selection}>
        {intro}
      </div>
      <AnimatePresence initial={false}>
        {selection && <InspectorLayer key={`${selection.kind}:${selection.id}`}>{children}</InspectorLayer>}
      </AnimatePresence>
    </div>
  )
}
