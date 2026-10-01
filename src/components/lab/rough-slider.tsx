import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import { STROKE_WIDTH, circlePaths, linePaths } from "@/components/lab/rough"
import { BOIL_BOWING, useBoilSeed } from "@/hooks/use-boil-seed"

interface RoughSliderProps {
  /** Control label, shown top-left and used as the accessible name. */
  label: string
  value: number
  min: number
  max: number
  /** Increment for drag-snapping and keyboard steps. */
  step?: number
  onChange: (value: number) => void
  /** Formats the numeric value for the top-right readout. */
  format?: (value: number) => string
  /** Fixed roughjs seed so the sketch stays stable. */
  seed?: number
  /**
   * Optional CSS colours (mapped min→max) that paint the rail & fill as a
   * spectrum instead of the default ink — so the slider itself shows which
   * colour each position selects. When set, the rail reads as a faded
   * spectrum and the filled portion as the vivid one.
   */
  gradient?: string[]
  /** Optional live colour for the knob face (the currently-selected colour). */
  thumbColor?: string
  /**
   * When set, draws the rail as a THICK stroke (px) roughly the size of the knob
   * (or a touch bigger) instead of the default hairline — "a version of the
   * original slider" where the knob reads as a bead nestled in the rail. The knob
   * then travels inside the rail's rounded ends. Omit for the default thin rail
   * (behaviour unchanged).
   */
  railWidth?: number
}

const HEIGHT = 40
const CY = HEIGHT / 2
const THUMB_R = 9
/** The colour face sits inset from the ink outline (its centre rides at THUMB_R)
 *  so a ~1px ring of the neutral base surface always shows between them. Without
 *  it a light face (e.g. a near-white day-bg swatch) and the light dark-mode ink
 *  stroke merge and the outline vanishes. Works in both themes since the base
 *  surface always contrasts the foreground ink. */
const FACE_R = THUMB_R - 1.5
/** How much the knob grows on hover/press — a visible "pop" for a small thumb. */
const POP_SCALE = 1.35

/** Measure an element's width, updating on resize so the track fills its cell. */
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

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Track prefers-reduced-motion so the knob's pop/boil is suppressed for users
 *  who opt out of motion (mirrors the guard baked into useBoilSeed). */
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
 * RoughSlider — a hand-drawn slider for the Folder Lab, matching the folder's
 * squiggly ink (see src/components/lab/rough.ts). Track, thumb and focus ring
 * are drawn once from a fixed seed; the thumb is only translated as the value
 * changes, so nothing re-wobbles.
 *
 * It's a custom control (not a native <input type="range">) so the drawn thumb
 * tracks the pointer exactly. Accessibility is provided via role="slider" +
 * aria-value* and full keyboard support (arrows / page / home / end).
 */
export function RoughSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  seed = 200,
  gradient,
  thumbColor,
  railWidth,
}: RoughSliderProps) {
  const [trackRef, w] = useTrackWidth<HTMLDivElement>()
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const prefersReduced = usePrefersReducedMotion()
  const uid = useId().replace(/:/g, "")
  const clipId = `slider-fill-${uid}`
  const gradId = `slider-grad-${uid}`
  const railStroke = gradient ? `url(#${gradId})` : "currentColor"
  // A `railWidth` opts into a THICK rail (≈ the knob's size). The rail then insets
  // its endpoints by half its width so the round caps land flush with the ends and
  // the knob nestles inside them.
  const fat = railWidth !== undefined
  const railInset = fat ? railWidth / 2 : 0
  // Coloured rails ride a touch wider so the neutral-ink casing behind them
  // reads as a thin keyline; the casing is wider still.
  const railW = fat ? railWidth : STROKE_WIDTH + (gradient ? 1 : 0)
  const fillW = fat ? railWidth + 1 : STROKE_WIDTH + 1
  const casingW = fat ? railWidth + 2.5 : STROKE_WIDTH + 2.5

  const trackX1 = railInset
  const trackX2 = Math.max(trackX1 + 1, w - railInset)
  const track = useMemo(() => linePaths(trackX1, CY, trackX2, CY, seed), [seed, trackX1, trackX2])
  // Pop + boil only while pointing at (or pressing) the knob — never on keyboard
  // focus — and never under reduced-motion. On mouse-exit both flags clear, so
  // the knob snaps its seed/bowing back and springs down to its resting size.
  const animate = (hovered || dragging) && !prefersReduced
  // The knob outline "boils" like the Motion page: its seed advances on the same
  // 0.2s/8-frame cadence and it draws with the curvier animated-stroke bowing.
  const thumbSeed = useBoilSeed(seed + 1, animate)
  const thumb = useMemo(
    () => circlePaths(0, 0, THUMB_R * 2, thumbSeed, animate ? BOIL_BOWING : undefined),
    [thumbSeed, animate],
  )
  const ring = useMemo(() => circlePaths(0, 0, (THUMB_R + 4) * 2, seed + 2), [seed])

  const snap = (n: number) => {
    const stepped = Math.round((n - min) / step) * step + min
    return parseFloat(clamp(stepped, min, max).toFixed(4))
  }

  // For a THIN rail the THUMB travels inset by its radius so its EDGE — not its
  // centre — lands on the ends (knob stops flush with the label). For a THICK
  // rail the knob rides INSIDE the rail, so its centre travels to the rail's
  // rounded ends (trackX1..trackX2).
  const thumbMinX = fat ? trackX1 : trackX1 + THUMB_R
  const thumbMaxX = Math.max(thumbMinX + 1, fat ? trackX2 : trackX2 - THUMB_R)

  const fraction = (value - min) / (max - min)
  const thumbX = thumbMinX + fraction * (thumbMaxX - thumbMinX)

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = clamp((clientX - rect.left - thumbMinX) / (thumbMaxX - thumbMinX), 0, 1)
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

  const active = dragging || focused

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {format ? format(value) : value}
        </span>
      </div>

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
        className={`relative touch-none select-none outline-none ${
          dragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
      >
        <svg
          aria-hidden="true"
          width={w || 0}
          height={HEIGHT}
          viewBox={`0 0 ${w || 1} ${HEIGHT}`}
          className="block overflow-visible text-foreground"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={Math.max(0, thumbX)} height={HEIGHT} />
            </clipPath>
            {gradient && (
              // Painted along the thumb's travel so the colour under the knob
              // matches the value; ends pad out to the edge stops.
              <linearGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={thumbMinX}
                y1={CY}
                x2={thumbMaxX}
                y2={CY}
              >
                {gradient.map((c, i) => (
                  <stop
                    key={i}
                    offset={gradient.length > 1 ? i / (gradient.length - 1) : 0}
                    stopColor={c}
                  />
                ))}
              </linearGradient>
            )}
          </defs>

          {/* Casing — a soft neutral-ink keyline drawn UNDER the coloured rail so
              a light colour stays legible on a light panel (WCAG 1.4.11 non-text
              contrast). Wider than the rail, so a thin dark edge always outlines
              the colour; only used for spectrum sliders. */}
          {gradient && (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={casingW}
              strokeLinecap="round"
              className="text-foreground"
              opacity={0.28}
            >
              {track.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          )}

          {/* Rail — full width. Default ink is thin + muted; a spectrum rail is
              the faded full range so the unfilled portion still shows its colours. */}
          <g
            fill="none"
            stroke={railStroke}
            strokeWidth={railW}
            strokeLinecap="round"
            className={gradient ? undefined : "text-muted-foreground"}
            opacity={gradient ? 0.7 : 1}
          >
            {track.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* Fill — the portion left of the thumb: thicker + more vivid than the
              rail. Reuses the rail's rough path, revealed up to the thumb via a
              clip, so it never re-wobbles as the value changes. */}
          <g
            clipPath={`url(#${clipId})`}
            fill="none"
            stroke={railStroke}
            strokeWidth={fillW}
            strokeLinecap="round"
            className={gradient ? undefined : "text-foreground"}
          >
            {track.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* Thumb (drawn at origin, moved along the track) */}
          <g transform={`translate(${thumbX} ${CY})`}>
            {/* Pop layer — grows the whole knob on hover/press with a spring
                overshoot (the site's "pop"), and springs back on mouse-exit.
                Scales about the knob centre; the static ring anchors the box so
                the boiling outline can't jitter the origin. */}
            <g
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: animate ? `scale(${POP_SCALE})` : "scale(1)",
                transition: "transform var(--duration-base) var(--ease-spring)",
              }}
            >
              {/* Focus / drag ring */}
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="round"
                className={`transition-opacity duration-150 ${active ? "opacity-40" : "opacity-0"}`}
              >
                {ring.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              {/* Knob base — solid surface fill masks the rail/fill passing behind it.
                  Uses the inherited --lab-surface (card bg) so it matches its panel. */}
              <circle r={THUMB_R} style={{ fill: "var(--lab-surface, var(--color-background))" }} />
              {/* Knob face — a spectrum knob shows the live selected colour; a plain
                  knob fills with ink on hover, fully on press. The colour face is
                  inset (FACE_R) so a ring of the base surface separates it from the
                  ink outline; the plain ink face keeps THUMB_R so a press reads as a
                  solid ink disc. */}
              {thumbColor ? (
                <circle r={FACE_R} style={{ fill: thumbColor }} />
              ) : (
                <circle
                  r={THUMB_R}
                  className="transition-opacity duration-150"
                  style={{ fill: "var(--color-foreground)", opacity: dragging ? 1 : hovered ? 0.7 : 0 }}
                />
              )}
              <g fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round">
                {thumb.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
