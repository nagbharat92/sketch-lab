import { useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { RotateCcw, Shuffle } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { CornerFrame } from "@/components/ui/corner-frame"
import { RoughSlider } from "@/components/lab/rough-slider"
import { SwatchGrid, type Swatch } from "@/components/lab/rough-tiles"
import { Bloom, ColorSwatch } from "@/components/lab/color-swatch"
import { BLOOM_PRESETS, randomBloomIndex, type BloomShape } from "@/lib/bloom"

interface FlowerLabProps {
  index: number
  props?: Record<string, unknown>
}

// Bloom geometry, presets, and the swatch components now live in the SITE-WIDE
// framework: src/lib/bloom.ts (BloomShape, bloomPath, BLOOM_PRESETS, the
// no-repeat roll) and src/components/lab/color-swatch.tsx (<Bloom>,
// <ColorSwatch>, <ColorPicker>). This lab is the SANDBOX that tunes the bloom
// shape live from sliders, so it drives <ColorSwatch> directly with its shape
// instead of using the batteries-included <ColorPicker>.

// Bloom shows a SINGLE spanning row of the accent wheel — a demo of the
// selected-swatch bloom, not the full palette (the Strokes lab has the whole
// wheel). Eight hues sampled evenly across the spectrum; the site's brand
// Yellow is the default.
const BLOOM_SWATCHES: Swatch[] = [
  { name: "Rose", color: "var(--accent-rose)" },
  { name: "Orange", color: "var(--accent-orange)" },
  { name: "Yellow", color: "var(--accent-yellow-wheel)" },
  { name: "Green", color: "var(--accent-green-wheel)" },
  { name: "Teal", color: "var(--accent-teal)" },
  { name: "Azure", color: "var(--accent-azure)" },
  { name: "Indigo", color: "var(--accent-indigo)" },
  { name: "Magenta", color: "var(--accent-magenta)" },
]

/** The clickable colour chips: the selected one blooms in its own colour and
 *  drives the flower above. Uses the shared <ColorSwatch> atom, fed this lab's
 *  slider-driven `shape`. */
function SwatchRow({
  selectedIndex,
  shape,
  centerHoleRatio,
  onSelect,
}: {
  selectedIndex: number
  shape: BloomShape
  centerHoleRatio: number
  onSelect: (i: number) => void
}) {
  return (
    <SwatchGrid label="Swatch colour" cols="grid-cols-8" className="w-fit">
      {BLOOM_SWATCHES.map((s, i) => (
        <ColorSwatch key={s.name} color={s.color} name={s.name} selected={i === selectedIndex} shape={shape} centerHoleRatio={centerHoleRatio} onClick={() => onSelect(i)} />
      ))}
    </SwatchGrid>
  )
}

// ── Lab chrome (mirrors the other design-system labs) ─────────────────────────

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

function StageButton({ icon: Icon, label, onClick }: { icon: typeof RotateCcw; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </button>
  )
}

const DEFAULTS = {
  petals: 6,
  bulge: 0.4,
  round: 1.2,
  centerHole: 0.3, // punched-out centre-hole radius, as a fraction of the bloom radius
  colorIndex: 2, // Yellow — the site's brand accent
}

const fmtInt = (v: number) => `${Math.round(v)}`
const fmt2 = (v: number) => v.toFixed(2)

/**
 * FlowerLab — a playground for the parametric bloom that marks a selected
 * swatch. Side-by-side (like the Motion lab): the LEFT stage shows the flower
 * plus the swatch row, where the selected chip blooms (in its own colour) and
 * spins slowly and endlessly; the RIGHT rail holds the shape knobs (petals,
 * bulge, roundness). Randomize re-rolls the bloom; every real selection would
 * do the same.
 */
export function FlowerLab({ index }: FlowerLabProps) {
  const [petals, setPetals] = useState(DEFAULTS.petals)
  const [bulge, setBulge] = useState(DEFAULTS.bulge)
  const [round, setRound] = useState(DEFAULTS.round)
  const [centerHole, setCenterHole] = useState(DEFAULTS.centerHole)
  const [colorIndex, setColorIndex] = useState(DEFAULTS.colorIndex)
  // Remember the last preset we rolled so we never pick it twice in a row.
  const lastPresetRef = useRef(-1)

  // The bloom shape stays clean and symmetric — the selected bloom spins via CSS.
  const shape: BloomShape = useMemo(() => ({ petals, bulge, round }), [petals, bulge, round])
  const fill = BLOOM_SWATCHES[colorIndex].color

  const reset = () => {
    setPetals(DEFAULTS.petals)
    setBulge(DEFAULTS.bulge)
    setRound(DEFAULTS.round)
    setCenterHole(DEFAULTS.centerHole)
    setColorIndex(DEFAULTS.colorIndex)
  }

  // Re-roll only the bloom's SHAPE (the colour is left untouched). Never repeats
  // the previous preset, so every roll is a visible change.
  const rollShape = () => {
    const i = randomBloomIndex(lastPresetRef.current)
    lastPresetRef.current = i
    const s = BLOOM_PRESETS[i]
    setPetals(s.petals)
    setBulge(s.bulge)
    setRound(s.round)
  }

  // Selecting a swatch sets the colour AND blooms a fresh shape — exactly what a
  // real selection would do.
  const pickColor = (i: number) => {
    setColorIndex(i)
    rollShape()
  }

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
      {/* ── STAGE — the bloom + how it marks a selected swatch ─────────── */}
      <FadeInUp i={index} className="flex min-w-0 flex-1">
        <div
          style={{ "--lab-stage": "var(--surface)" } as CSSProperties}
          className="relative flex w-full flex-col gap-8 rounded-2xl bg-(--lab-stage) p-10"
        >
          <CornerFrame hideTopRight />
          {/* Aligned with the corner ornaments (it replaces the top-right one):
              right-4/top-5 land the glyph on the bracket's 24px stroke corner. */}
          <div className="absolute right-4 top-5 z-10">
            <StageButton icon={Shuffle} label="Randomize" onClick={rollShape} />
          </div>

          {/* The bloom */}
          <div className="flex flex-1 items-center justify-center lg:min-h-0">
            <Bloom size={240} radius={84} shape={shape} fill={fill} seed={7} strokeWidth={2} centerHole centerHoleRatio={centerHole} spin />
          </div>

          {/* The colour picker — the selected chip blooms and colours the flower above */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In the swatches</h3>
            <JustifiedParagraph className="text-sm text-muted-foreground">
              Pick a colour — the selected chip blooms in it, and the flower above takes the same colour. Every pick
              re-rolls a fresh shape.
            </JustifiedParagraph>
            <SwatchRow selectedIndex={colorIndex} shape={shape} centerHoleRatio={centerHole} onSelect={pickColor} />
          </div>
        </div>
      </FadeInUp>

      {/* ── CONTROLS — a sticky rail beside the stage ─────────────────────── */}
      <FadeInUp i={index + 1} className="w-full shrink-0 lg:sticky lg:top-(--content-pt) lg:w-80">
        <div className="flex flex-col gap-4">
          <Card title="Shape" action={<StageButton icon={RotateCcw} label="Reset" onClick={reset} />}>
            <RoughSlider label="Petals" value={petals} min={3} max={10} step={1} onChange={setPetals} format={fmtInt} seed={51} />
            <RoughSlider label="Bulge" value={bulge} min={0.1} max={0.55} step={0.01} onChange={setBulge} format={fmt2} seed={52} />
            <RoughSlider label="Roundness" value={round} min={0.6} max={2.4} step={0.05} onChange={setRound} format={fmt2} seed={53} />
            <RoughSlider label="Center hole" value={centerHole} min={0} max={0.4} step={0.01} onChange={setCenterHole} format={fmt2} seed={54} />
          </Card>
        </div>
      </FadeInUp>
    </div>
  )
}
