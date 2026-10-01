import { useEffect, useId, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { CornerFrame } from "@/components/ui/corner-frame"
import { RoughSlider } from "@/components/lab/rough-slider"
import { RoughCheckbox } from "@/components/lab/rough-checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TEXT_BOIL } from "@/lib/text-boil"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

interface TextBoilLabProps {
  index: number
  props?: Record<string, unknown>
}

const fmt1 = (v: number) => v.toFixed(1)
const fmtInt = (v: number) => `${Math.round(v)}`
const fmt3 = (v: number) => v.toFixed(3)
const fmtSec = (v: number) => `${v.toFixed(2)}s`

/**
 * Track prefers-reduced-motion so the boil holds still for users who opt out of
 * motion (the filter still roughens the text — it just stops reseeding).
 */
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
 * BoilFilter — the one SVG filter every boiling text element references.
 *
 * `feTurbulence` generates a noise field; `feDisplacementMap` pushes the text's
 * rendered pixels around by that noise, so the letterforms warp into a
 * hand-inked wobble. It works on ANY typeface because it distorts pixels, never
 * the font's vector data — and the text underneath stays real, selectable and
 * accessible.
 *
 * The "boil" is the same trick as the Motion lab: advance the noise `seed` on a
 * timer and the wobble jumps frame-to-frame (a hard cut, like our roughjs boil).
 * This component owns the animated seed so ONLY the filter def re-renders each
 * tick — the referencing text nodes never re-render; the browser just re-runs
 * the filter when its attributes change.
 */
function BoilFilter({
  id,
  scale,
  frequency,
  octaves,
  rougher,
  animate,
  interval,
}: {
  id: string
  scale: number
  frequency: number
  octaves: number
  rougher: boolean
  animate: boolean
  interval: number
}) {
  const reduced = usePrefersReducedMotion()
  const [seed, setSeed] = useState(1)

  useEffect(() => {
    if (!animate || reduced) return
    const ms = Math.max(60, Math.round(interval * 1000))
    const t = window.setInterval(() => {
      setSeed((s) => (s % 500) + 1)
    }, ms)
    return () => window.clearInterval(t)
  }, [animate, reduced, interval])

  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute h-0 w-0">
      <defs>
        <filter
          id={id}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type={rougher ? "turbulence" : "fractalNoise"}
            baseFrequency={frequency}
            numOctaves={octaves}
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * An inline link that boils ONLY while hovered/focused — the first real target
 * for this effect (links inside a paragraph). At rest it's crisp, ordinary text.
 */
function HoverBoilLink({ filterId, children }: { filterId: string; children: ReactNode }) {
  const [hovering, setHovering] = useState(false)
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      style={{ filter: hovering ? `url(#${filterId})` : undefined }}
      className="rounded-sm font-medium text-foreground underline decoration-muted-foreground/60 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  )
}

/**
 * A word that opens a tooltip whose label boils — the second real target. The
 * tooltip's own <TooltipContent> now boils its label site-wide (via InkBoilText
 * + the TEXT_BOIL token), so this just shows a plain tooltip and lets the shared
 * component do the wobble.
 */
function BoilTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded-sm font-medium text-foreground underline decoration-dotted decoration-muted-foreground/70 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>Hand-drawn tooltip</TooltipContent>
    </Tooltip>
  )
}

/**
 * A titled card — a light, sidebar-coloured panel grouping one control section,
 * matching the Strokes / Type / Colour / Motion labs. Publishes `--lab-surface`
 * so descendant slider knobs mask to the card's own background.
 */
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section
      style={{ "--lab-surface": "var(--color-sidebar)" } as CSSProperties}
      className="flex flex-col gap-4 rounded-2xl bg-(--lab-surface) p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action ? <div className="-mr-2">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Resets every parameter on the page to DEFAULTS. */
function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="Reset all controls to their defaults"
      title="Reset to defaults"
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RotateCcw className="size-4 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider">Reset</span>
    </button>
  )
}

/**
 * The default value of every control — the SINGLE source of truth for both the
 * initial state and the Reset button, so the two can never drift. (Mirrors the
 * DEFAULTS pattern in motion-lab.tsx / type-lab.tsx / color-lab.tsx.)
 */
// The lab starts from the SITE token (src/lib/text-boil.ts) so what you tune
// here and what every link wears stay in sync (`animate` is lab-only — the site
// filter always animates).
const DEFAULTS = {
  scale: TEXT_BOIL.scale, // displacement amount, in px of pixel-shove
  frequency: TEXT_BOIL.frequency, // baseFrequency — grain of the wobble (fine → coarse)
  octaves: TEXT_BOIL.octaves, // numOctaves — how much fine detail the noise carries
  animate: true, // boil (reseed on a timer) vs. a single static roughen
  interval: TEXT_BOIL.interval, // seconds each seed is held before the next
  rougher: TEXT_BOIL.rougher, // turbulence (spiky) vs. fractalNoise (soft, organic)
}

/**
 * TextBoilLab ("Wobble") — a parametric playground for making live text look
 * hand-inked and "boil" like our roughjs strokes, using an SVG displacement
 * filter (feTurbulence + feDisplacementMap).
 *
 * WHY this technique for this job: it warps the RENDERED PIXELS, so it works on
 * any typeface with zero per-font setup and keeps the underlying text real
 * (selectable, screen-reader friendly). That makes it the right tool for the
 * first targets — inline links inside a paragraph, and tooltips — where the text
 * must stay live. (The alternative, tracing glyph outlines through roughjs, is a
 * truer "sketch" but needs the font file and suits big headline words only.)
 */
export function TextBoilLab({ index }: TextBoilLabProps) {
  const uid = useId().replace(/:/g, "")
  const filterId = `text-boil-${uid}`

  const [scale, setScale] = useState(DEFAULTS.scale)
  const [frequency, setFrequency] = useState(DEFAULTS.frequency)
  const [octaves, setOctaves] = useState(DEFAULTS.octaves)
  const [animate, setAnimate] = useState(DEFAULTS.animate)
  const [interval, setInterval_] = useState(DEFAULTS.interval)
  const [rougher, setRougher] = useState(DEFAULTS.rougher)

  const reset = () => {
    setScale(DEFAULTS.scale)
    setFrequency(DEFAULTS.frequency)
    setOctaves(DEFAULTS.octaves)
    setAnimate(DEFAULTS.animate)
    setInterval_(DEFAULTS.interval)
    setRougher(DEFAULTS.rougher)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <BoilFilter
        id={filterId}
        scale={scale}
        frequency={frequency}
        octaves={octaves}
        rougher={rougher}
        animate={animate}
        interval={interval}
      />

      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        {/* ── STAGE — live text wearing the effect ─────────────────────── */}
        <FadeInUp i={index} className="flex min-w-0 flex-1">
          <div
            style={{ "--lab-stage": "var(--surface)" } as CSSProperties}
            className="relative flex w-full flex-col items-center justify-center gap-10 rounded-2xl bg-(--lab-stage) p-10 text-center lg:gap-14"
          >
            <CornerFrame />

            {/* Headline — always boiling, so the raw effect is easy to read. */}
            <div className="flex flex-col items-center gap-3">
              <h3
                style={{ filter: `url(#${filterId})` }}
                className="font-display text-4xl leading-none tracking-tight text-foreground sm:text-6xl"
              >
                hand-drawn
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Always on
              </span>
            </div>

            {/* Paragraph — the real use case: an inline link + a tooltip term. */}
            <div className="flex max-w-md flex-col items-center gap-3">
              <JustifiedParagraph className="text-(length:--content-body-size) leading-relaxed text-foreground">
                Roughened ink brings letters to life. Hover{" "}
                <HoverBoilLink filterId={filterId}>this link</HoverBoilLink> to feel it
                boil, or rest on{" "}
                <BoilTooltip>this term</BoilTooltip> to pop a tooltip
                that wobbles too.
              </JustifiedParagraph>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Hover a link · tooltip
              </span>
            </div>
          </div>
        </FadeInUp>

        {/* ── CONTROLS — a sticky rail beside the stage ────────────────── */}
        <FadeInUp i={index + 1} className="w-full shrink-0 lg:sticky lg:top-(--content-pt) lg:w-80">
          <div className="flex flex-col gap-4">
            <Card title="Distortion" action={<ResetButton onReset={reset} />}>
              <RoughSlider label="Amount" value={scale} min={0} max={20} step={0.5} onChange={setScale} format={fmt1} seed={11} />
              <RoughSlider label="Detail" value={frequency} min={0.005} max={0.08} step={0.005} onChange={setFrequency} format={fmt3} seed={12} />
              <RoughSlider label="Complexity" value={octaves} min={1} max={4} step={1} onChange={setOctaves} format={fmtInt} seed={13} />
            </Card>

            <Card title="Boil">
              <RoughCheckbox label="Animate (boil)" checked={animate} onChange={setAnimate} seed={31} />
              <div className={animate ? "" : "pointer-events-none opacity-40"}>
                <RoughSlider label="Frame time" value={interval} min={0.06} max={1} step={0.02} onChange={setInterval_} format={fmtSec} seed={21} />
              </div>
              <div className="pt-1">
                <RoughCheckbox label="Rougher noise" checked={rougher} onChange={setRougher} seed={41} />
              </div>
              <JustifiedParagraph className="text-sm text-muted-foreground">
                {animate
                  ? "The noise reseeds every frame, so the ink boils."
                  : "A single static seed — hand-inked, but held still."}
              </JustifiedParagraph>
            </Card>
          </div>
        </FadeInUp>
      </div>
    </TooltipProvider>
  )
}
