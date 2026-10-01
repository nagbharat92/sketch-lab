import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import { ROUGH_OPTIONS, roughPathInfos } from "@/components/lab/rough"
import { BOIL_BOWING, useBoilSeed } from "@/hooks/use-boil-seed"
import { cn } from "@/lib/utils"

interface RoughChunkySliderProps {
  /** Control label, painted on top of the rail (left) + used as the accessible name. */
  label: string
  value: number
  min: number
  max: number
  /** Increment for drag-snapping and keyboard steps. */
  step?: number
  onChange: (value: number) => void
  /** Formats the numeric value for the top-right readout. */
  format?: (value: number) => string
  /** Fixed roughjs seed so the knob's sketch stays stable. */
  seed?: number
  /**
   * Optional CSS colours (mapped left→right) that paint the RAIL as a spectrum
   * instead of the neutral surface — so the rail itself shows the colours the
   * slider selects between. The fill is a translucent ink wash over it, so the
   * rail colour still reads through the filled portion.
   */
  gradient?: string[]
  /**
   * When set, the rail shows discrete step DOTS (a stepper). Dots sit on the
   * rail under the fill, so the filled portion "consumes" them and the remaining
   * steps stay visible. Purely visual — snapping is still driven by `step`.
   */
  stepper?: boolean
}

/** Chunky rail height (px) — kept in sync with the `h-14` utility on the rail. */
const RAIL_HEIGHT = 56
const CY = RAIL_HEIGHT / 2
/** Horizontal inset for the knob's travel + the label/value text, so the thin
 *  knob stays inside the pill's rounded corners and never overshoots the ends
 *  (matches the `left-5` / `right-5` = 20px padding on the text). */
const PAD = 20
/** Half-height of the thin knob stroke (~28px tall = about half the rail). */
const KNOB_HALF = 14
/** The knob reads as a bar — a touch heavier than the 1px hairline site ink. */
const KNOB_STROKE = 2

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Measure an element's width, updating on resize so the rail fills its cell. */
function useTrackWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = (x: number) => setW((prev) => (prev === x ? prev : x))
    set(Math.round(el.clientWidth))
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (cr) set(Math.round(cr.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Track prefers-reduced-motion so the knob's boil is suppressed for users who
 *  opt out of motion (mirrors the guard baked into useBoilSeed). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

/**
 * RoughChunkySlider — a fat-rail take on the lab slider. Where RoughSlider draws
 * a thin hand-drawn track with a big knob, this stacks the pieces the way a
 * chunky "smart-home" control does:
 *
 *   rail (fat pill / colour spectrum) → fill (translucent ink wash) →
 *   label + value (on top of the rail) → knob (thin, hidden until hover).
 *
 * The knob is a thin vertical ink bar that stays invisible at rest and fades in
 * + "boils" (squiggly hand-drawn wobble) on hover, focus or drag — so the resting
 * control reads as a clean pill and the hand-drawn character appears on touch.
 *
 * Like RoughSlider it's a custom control (role="slider" + aria-value* + pointer
 * drag + full keyboard support) rather than a native <input type="range">.
 */
export function RoughChunkySlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  seed = 300,
  gradient,
  stepper,
}: RoughChunkySliderProps) {
  const [trackRef, w] = useTrackWidth<HTMLDivElement>()
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const prefersReduced = usePrefersReducedMotion()

  // The knob shows (and boils) on hover, keyboard focus or an active drag — so
  // keyboard users still get a visible thumb, while mouse users see a clean pill
  // at rest. Boil is suppressed under reduced-motion (the knob still appears).
  const active = hovered || focused || dragging
  const animate = active && !prefersReduced
  const knobSeed = useBoilSeed(seed + 1, animate)
  const knob = useMemo(
    () =>
      roughPathInfos(`M 0 ${-KNOB_HALF} L 0 ${KNOB_HALF}`, {
        ...ROUGH_OPTIONS,
        seed: knobSeed,
        bowing: animate ? BOIL_BOWING : ROUGH_OPTIONS.bowing,
      }),
    [knobSeed, animate],
  )

  const snap = (n: number) => {
    const stepped = Math.round((n - min) / step) * step + min
    return parseFloat(clamp(stepped, min, max).toFixed(4))
  }

  // The knob (and thus the fill edge) travels inset by PAD from both ends so the
  // thin bar stays inside the pill's rounded corners.
  const knobMinX = PAD
  const knobMaxX = Math.max(knobMinX + 1, w - PAD)
  const fraction = (value - min) / (max - min)
  const knobX = knobMinX + fraction * (knobMaxX - knobMinX)

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = clamp((clientX - rect.left - knobMinX) / (knobMaxX - knobMinX), 0, 1)
    onChange(snap(min + frac * (max - min)))
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(true)
    setFromClientX(e.clientX)
    // Pointer capture keeps a drag tracking when the pointer leaves the control.
    // Best-effort: some (synthetic) events lack a valid pointer id, so a failed
    // capture must never abort the value update above.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture unsupported for this pointer — dragging still works while over it */
    }
  }
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setFromClientX(e.clientX)
  }
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* no capture to release */
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = value + step
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = value - step
        break
      case "PageUp":
        next = value + step * 10
        break
      case "PageDown":
        next = value - step * 10
        break
      case "Home":
        next = min
        break
      case "End":
        next = max
        break
      default:
        return
    }
    e.preventDefault()
    onChange(snap(next))
  }

  // Step dots span the knob's travel so the knob lands exactly on a dot at every
  // step; endpoints included. Guarded so a 0-width step can't divide by zero.
  const dotCount = stepper ? Math.max(1, Math.round((max - min) / step)) : 0
  const railGradient = gradient ? `linear-gradient(to right, ${gradient.join(", ")})` : undefined

  return (
    <div className="flex w-full flex-col">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format ? format(value) : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={railGradient ? { backgroundImage: railGradient } : undefined}
        className={cn(
          "relative h-14 w-full touch-none select-none overflow-hidden rounded-2xl outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "cursor-grabbing" : "cursor-pointer",
          !gradient && "bg-muted",
        )}
      >
        {/* Step dots — on the rail, UNDER the fill, so the filled portion covers
            the consumed steps and the remaining ones stay visible on the right. */}
        {stepper && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: dotCount + 1 }).map((_, i) => {
              const x = knobMinX + (i / dotCount) * (knobMaxX - knobMinX)
              return (
                <span
                  key={i}
                  className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
                  style={{ left: x }}
                />
              )
            })}
          </div>
        )}

        {/* Fill — the value/progress segment left of the knob. A translucent ink
            wash: darker than the rail, but see-through so the rail colour (or the
            spectrum underneath) still reads through the filled portion. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-l-2xl bg-foreground/20"
          style={{ width: knobX }}
        />

        {/* Label + value — on top of the rail/fill. */}
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium tabular-nums text-foreground">
          {format ? format(value) : value}
        </span>

        {/* Knob — thin vertical ink bar, on top of everything. Hidden at rest;
            fades in + boils (squiggly wobble) on hover / focus / drag. */}
        <svg
          aria-hidden="true"
          width={w || 0}
          height={RAIL_HEIGHT}
          viewBox={`0 0 ${w || 1} ${RAIL_HEIGHT}`}
          className="pointer-events-none absolute inset-0 overflow-visible text-foreground"
        >
          <g
            transform={`translate(${knobX} ${CY})`}
            className={cn("transition-opacity duration-150", active ? "opacity-100" : "opacity-0")}
          >
            <g fill="none" stroke="currentColor" strokeWidth={KNOB_STROKE} strokeLinecap="round">
              {knob.map((info, i) => (
                <path key={i} d={info.d} />
              ))}
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
