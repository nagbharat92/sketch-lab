import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import rough from "roughjs"
import { Pause, Play, RotateCcw } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { CornerFrame } from "@/components/ui/corner-frame"
import { RoughSlider } from "@/components/lab/rough-slider"
import { RoughCheckbox } from "@/components/lab/rough-checkbox"
import { roughPathInfos, roundedPolygonPath } from "@/components/lab/rough"
import { INK } from "@/lib/ink"
import { cn } from "@/lib/utils"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

interface MotionLabProps {
  index: number
  props?: Record<string, unknown>
}

const fmtSec = (v: number) => `${v.toFixed(2)}s`
const fmtInt = (v: number) => `${Math.round(v)}`
const fmt1 = (v: number) => v.toFixed(1)

// ── Shapes ────────────────────────────────────────────────────────────────────
// Three cute silhouettes, each an SVG path in a shared 0..100 viewBox so they
// scale and centre identically. roughjs re-draws each from a changing seed every
// frame, so the outline "boils" — the classic hand-drawn wobble of 2-D animation.

const FOLDER_POINTS = [
  { x: 16, y: 36 }, // tab top-left
  { x: 40, y: 36 }, // tab top-right
  { x: 48, y: 46 }, // concave neck (tab meets body)
  { x: 86, y: 46 }, // body top-right
  { x: 86, y: 78 }, // bottom-right
  { x: 16, y: 78 }, // bottom-left
]

/** A regular star as an SVG path (alternating outer/inner radius). */
function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / points
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`
}

const FOLDER_D = roundedPolygonPath(FOLDER_POINTS, 4)
const STAR_D = starPath(50, 53, 36, 15)
const HEART_D =
  "M 50 30 C 43 18, 25 18, 22 33 C 19 45, 33 57, 50 72 C 67 57, 81 45, 78 33 C 75 18, 57 18, 50 30 Z"

// Each shape gets a fixed seed offset so the three don't boil in lock-step (they
// share the same frame beat, but each shows its own distinct wobble).
const SHAPES = [
  { name: "Folder", d: FOLDER_D, offset: 0 },
  { name: "Star", d: STAR_D, offset: 1300 },
  { name: "Heart", d: HEART_D, offset: 2600 },
] as const

/** Generate the roughjs paths for one shape at one seed. */
function shapeRoughPaths(
  d: string,
  seed: number,
  roughness: number,
  bowing: number,
  strokeWidth: number,
  fill: boolean,
) {
  return roughPathInfos(d, {
    roughness,
    bowing,
    strokeWidth,
    seed,
    // Non-exposed knobs come from the site-wide token so the default ink matches
    // the folder lab (preserveVertices keeps the corners crisp; no corner overshoot).
    disableMultiStroke: INK.disableMultiStroke,
    preserveVertices: INK.preserveVertices,
    stroke: "currentColor",
    ...(fill
      ? {
          fill: "currentColor",
          fillStyle: "hachure",
          hachureGap: 5,
          fillWeight: Math.max(0.6, strokeWidth * 0.5),
        }
      : { fill: "none" }),
  })
}

/**
 * One "boiling" shape. It double-buffers two layers (A / B): each frame the
 * hidden layer is regenerated with the new seed and then cross-faded in, so the
 * swap can be an instant cut (crossfadeMs = 0) or a soft dissolve. Colours are
 * `currentColor`, so the ink stays theme-aware.
 */
function BoilingShape({
  d,
  offset,
  seedA,
  seedB,
  active,
  crossfadeMs,
  roughness,
  bowing,
  strokeWidth,
  fill,
}: {
  d: string
  offset: number
  seedA: number
  seedB: number
  active: 0 | 1
  crossfadeMs: number
  roughness: number
  bowing: number
  strokeWidth: number
  fill: boolean
}) {
  const pathsA = useMemo(
    () => shapeRoughPaths(d, seedA + offset, roughness, bowing, strokeWidth, fill),
    [d, seedA, offset, roughness, bowing, strokeWidth, fill],
  )
  const pathsB = useMemo(
    () => shapeRoughPaths(d, seedB + offset, roughness, bowing, strokeWidth, fill),
    [d, seedB, offset, roughness, bowing, strokeWidth, fill],
  )

  const layer = (paths: ReturnType<typeof shapeRoughPaths>, visible: boolean, key: string) => (
    <g
      key={key}
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${crossfadeMs}ms linear` }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke}
          fill={p.fill && p.fill !== "none" ? p.fill : "none"}
          strokeWidth={p.strokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  )

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="absolute inset-0 block h-full w-full overflow-visible text-foreground"
    >
      {layer(pathsA, active === 0, "a")}
      {layer(pathsB, active === 1, "b")}
    </svg>
  )
}

// ── Mobile menu stamp (RoughMenuButton preview) ─────────────────────────────────
// A live copy of the real hamburger (src/components/ui/rough-menu-button.tsx) so
// its final animation values can be dialled in here against the lab's sliders.
// Its bars are real roughjs lines in an 18×6 viewBox rendered 1:1, so a stroke
// width of N reads as N px on screen — the same convention as the real button.

const menuGenerator = rough.generator()

/** One hamburger bar → SVG `d` strings, drawn with the lab's ink params. */
function menuBarPaths(seed: number, roughness: number, bowing: number): string[] {
  return menuGenerator
    .toPaths(
      menuGenerator.line(1.5, 3, 16.5, 3, {
        roughness,
        bowing,
        // Stroke weight is applied on the <g>, not baked into the path `d`.
        strokeWidth: 1,
        disableMultiStroke: INK.disableMultiStroke,
        preserveVertices: INK.preserveVertices,
        seed,
      }),
    )
    .map((p) => p.d)
}

/** Fixed per-bar seeds so the three bars wobble differently (match the real button). */
const MENU_BAR_SEEDS = [1, 2, 3]
/** Per-bar CSS modifiers driving the hover splay (top/bottom bars only move). */
const MENU_BAR_MODIFIERS = [
  "rough-menu__bar--top",
  "rough-menu__bar--mid",
  "rough-menu__bar--bot",
]

/**
 * A single hamburger stamp at the real 40px size. `boilSeed` advances (fed from
 * the lab's frame loop) to make the bars boil; `splayed` forces the hover "open"
 * gesture without a real pointer via the `.is-splayed` class (see index.css).
 */
function HamburgerStamp({
  roughness,
  bowing,
  strokeWidth,
  boilSeed,
  splayed,
}: {
  roughness: number
  bowing: number
  strokeWidth: number
  boilSeed: number
  splayed: boolean
}) {
  const bars = useMemo(
    () => MENU_BAR_SEEDS.map((s) => menuBarPaths(s + boilSeed, roughness, bowing)),
    [roughness, bowing, boilSeed],
  )
  return (
    <div
      className={cn(
        "rough-menu relative flex size-10 items-center justify-center rounded-xl bg-foreground text-background",
        splayed && "is-splayed",
      )}
    >
      <span className="flex flex-col items-center gap-0.5">
        {bars.map((ds, bar) => (
          <svg
            key={bar}
            aria-hidden="true"
            width={18}
            height={6}
            viewBox="0 0 18 6"
            className={cn("rough-menu__bar block overflow-visible", MENU_BAR_MODIFIERS[bar])}
          >
            <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
              {ds.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </svg>
        ))}
      </span>
    </div>
  )
}

/**
 * A titled card — a light, sidebar-coloured panel that groups one control
 * section, matching the Strokes / Type / Colour labs. Publishes `--lab-surface`
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
        {/* -mr-2 cancels the action button's own px-2 so its text/glyph right edge
            lands flush with the content (slider) right edge below. */}
        {action ? <div className="-mr-2">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Resets every parameter on the page to DEFAULTS (playback is left untouched). */
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
 * DEFAULTS pattern in folder-lab.tsx / type-lab.tsx / color-lab.tsx.)
 */
const DEFAULTS = {
  interval: 0.2, // seconds each seed is held before the next
  frames: 8, // number of seeds in the loop
  loop: true, // true = cycle N fixed seeds; false = a new random seed forever
  crossfade: false, // hard cut vs. soft dissolve between frames
  fill: false, // hachure "scribble" fill that boils with the outline
  roughness: INK.roughness,
  bowing: 0.5, // matches the site-wide animated-stroke bowing (rough-ink BOIL_BOWING)
  strokeWidth: INK.strokeWidth,
}

const BASE_SEED = 1

/**
 * MotionLab — a parametric playground for animating roughjs ink.
 *
 * The idea: roughjs generates deterministic geometry from a `seed`, so changing
 * the seed on a timer makes a hand-drawn outline "boil". Every `interval`
 * seconds the seed advances; in LOOP mode it cycles a fixed set of `frames`
 * seeds and repeats (a seamless looping boil), otherwise it jumps to a fresh
 * random seed forever. Three shapes boil together so the effect is easy to read.
 */
export function MotionLab({ index }: MotionLabProps) {
  const [interval, setInterval_] = useState(DEFAULTS.interval)
  const [frames, setFrames] = useState(DEFAULTS.frames)
  const [loop, setLoop] = useState(DEFAULTS.loop)
  const [crossfade, setCrossfade] = useState(DEFAULTS.crossfade)
  const [fill, setFill] = useState(DEFAULTS.fill)
  const [roughness, setRoughness] = useState(DEFAULTS.roughness)
  const [bowing, setBowing] = useState(DEFAULTS.bowing)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth)
  // Auto-play on mount: this is a motion demo, so the preview must be alive on
  // load — a frozen preview reads as broken (and the rest of the page animates
  // in regardless, so a still preview looks out of place). The Play/Pause control
  // lets anyone stop it. (Previously this started paused under prefers-reduced-
  // motion, which left the whole preview static while everything else moved.)
  const [playing, setPlaying] = useState(true)

  // Double buffer: two seed slots, `active` says which is shown. Each tick fills
  // the hidden slot with the next seed then flips, so the shown frame can
  // dissolve into the new one.
  const [seedA, setSeedA] = useState(BASE_SEED)
  const [seedB, setSeedB] = useState(BASE_SEED + 1)
  const [active, setActive] = useState<0 | 1>(0)
  const activeRef = useRef<0 | 1>(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      let next: number
      if (loop) {
        frameRef.current = (frameRef.current + 1) % Math.max(2, Math.round(frames))
        next = BASE_SEED + frameRef.current
      } else {
        next = 1 + Math.floor(Math.random() * 900000)
      }
      if (activeRef.current === 0) {
        setSeedB(next)
        activeRef.current = 1
        setActive(1)
      } else {
        setSeedA(next)
        activeRef.current = 0
        setActive(0)
      }
    }, Math.max(60, Math.round(interval * 1000)))
    return () => window.clearInterval(id)
  }, [playing, interval, loop, frames])

  const reset = () => {
    setInterval_(DEFAULTS.interval)
    setFrames(DEFAULTS.frames)
    setLoop(DEFAULTS.loop)
    setCrossfade(DEFAULTS.crossfade)
    setFill(DEFAULTS.fill)
    setRoughness(DEFAULTS.roughness)
    setBowing(DEFAULTS.bowing)
    setStrokeWidth(DEFAULTS.strokeWidth)
    frameRef.current = 0
    activeRef.current = 0
    setSeedA(BASE_SEED)
    setSeedB(BASE_SEED + 1)
    setActive(0)
  }

  const crossfadeMs = crossfade ? Math.max(80, Math.min(Math.round(interval * 1000 * 0.6), 300)) : 0
  // The currently-shown seed from the double buffer — feeds the hamburger boil.
  const boilSeed = active === 0 ? seedA : seedB

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
      {/* ── STAGE — the three shapes boiling together ─────────────────── */}
      <FadeInUp i={index} className="flex min-w-0 flex-1">
        <div
          style={{ "--lab-stage": "var(--surface)" } as CSSProperties}
          className="relative flex w-full flex-col rounded-2xl bg-(--lab-stage) p-10"
        >
          <CornerFrame hideTopRight />
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
            aria-label={playing ? "Pause animation" : "Play animation"}
            title={playing ? "Pause" : "Play"}
            className="absolute right-4 top-5 z-10 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {playing ? <Pause className="size-4 shrink-0" /> : <Play className="size-4 shrink-0" />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {playing ? "Pause" : "Play"}
            </span>
          </button>

          <div className="flex flex-col items-center gap-10 sm:gap-12 lg:min-h-0 lg:flex-1 lg:justify-around lg:gap-4 lg:py-2">
            {/* Mobile menu stamp — rest vs. hover, driven by the same params */}
            <div className="flex flex-col items-center gap-3 lg:min-h-0 lg:w-full lg:flex-1 lg:justify-center">
              <div className="flex items-start gap-10">
                {[
                  { label: "Rest", splayed: false, bowing: 0, seed: 0 },
                  { label: "Hover", splayed: true, bowing, seed: boilSeed },
                ].map((h) => (
                  <div key={h.label} className="flex flex-col items-center gap-2">
                    <HamburgerStamp
                      roughness={roughness}
                      bowing={h.bowing}
                      strokeWidth={strokeWidth}
                      boilSeed={h.seed}
                      splayed={h.splayed}
                    />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {h.label}
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Menu button
              </span>
            </div>
            {SHAPES.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-3 lg:min-h-0 lg:w-full lg:flex-1">
                <div className="relative aspect-square w-48 sm:w-60 lg:aspect-auto lg:min-h-0 lg:w-full lg:flex-1">
                  <BoilingShape
                    d={s.d}
                    offset={s.offset}
                    seedA={seedA}
                    seedB={seedB}
                    active={active}
                    crossfadeMs={crossfadeMs}
                    roughness={roughness}
                    bowing={bowing}
                    strokeWidth={strokeWidth}
                    fill={fill}
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </FadeInUp>

      {/* ── CONTROLS — a sticky rail beside the stage ─────────────────────── */}
      <FadeInUp i={index + 1} className="w-full shrink-0 lg:sticky lg:top-(--content-pt) lg:w-80">
        <div className="flex flex-col gap-4">
          <Card title="Timing" action={<ResetButton onReset={reset} />}>
            <RoughSlider label="Frame time" value={interval} min={0.08} max={2} step={0.02} onChange={setInterval_} format={fmtSec} seed={11} />
            <div className={loop ? "" : "pointer-events-none opacity-40"}>
              <RoughSlider label="Frames in loop" value={frames} min={2} max={12} step={1} onChange={setFrames} format={fmtInt} seed={12} />
            </div>
            <div className="pt-1">
              <RoughCheckbox label="Loop the frames" checked={loop} onChange={setLoop} seed={31} />
            </div>
            <JustifiedParagraph className="text-sm text-muted-foreground">
              {loop
                ? `Cycles ${Math.round(frames)} fixed seeds, then repeats.`
                : "A new random seed every frame — never repeats."}
            </JustifiedParagraph>
          </Card>

          <Card title="Ink">
            <RoughSlider label="Roughness" value={roughness} min={0} max={3} step={0.1} onChange={setRoughness} format={fmt1} seed={21} />
            <RoughSlider label="Bowing" value={bowing} min={0} max={6} step={0.2} onChange={setBowing} format={fmt1} seed={22} />
            <RoughSlider label="Stroke width" value={strokeWidth} min={1} max={4} step={0.5} onChange={setStrokeWidth} format={fmt1} seed={23} />
          </Card>

          <Card title="Style">
            <RoughCheckbox label="Scribble fill" checked={fill} onChange={setFill} seed={41} />
            <RoughCheckbox label="Crossfade frames" checked={crossfade} onChange={setCrossfade} seed={42} />
          </Card>
        </div>
      </FadeInUp>
    </div>
  )
}
