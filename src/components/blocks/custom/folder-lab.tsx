import { useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { LabFolder, type LabFolderConfig } from "@/components/lab/lab-folder"
import { LabStage } from "@/components/lab/lab-stage"
import { RoughSlider } from "@/components/lab/rough-slider"
import { RoughCheckbox } from "@/components/lab/rough-checkbox"
import { SWATCHES } from "@/components/lab/rough-tiles"
import { ColorPicker } from "@/components/lab/color-swatch"
import { INK } from "@/lib/ink"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

interface FolderLabProps {
  index: number
  props?: Record<string, unknown>
}

const fmtScale = (v: number) => `${v.toFixed(1)}×`
const fmtAddPx = (v: number) => `+${Math.round(v)}px`
const fmtSignedPx = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v))}px`
const fmtPx = (v: number) => `${Math.round(v)}px`
const fmtDeg = (v: number) => `${Math.round(v)}°`
const fmt1 = (v: number) => v.toFixed(1)
const fmtInt = (v: number) => `${Math.round(v)}`

/**
 * A titled card — a light, sidebar-coloured panel that groups one control
 * section so the groups read as distinct blocks. The card publishes
 * `--lab-surface` (its own background) which descendant slider knobs inherit for
 * their mask, so the knob always matches whatever surface it sits on.
 */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{ "--lab-surface": "var(--color-sidebar)" } as CSSProperties}
      className="flex flex-col gap-3 rounded-2xl bg-(--lab-surface) p-5"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** A responsive slider grid that flows into as many columns as fit. */
function ControlGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-end gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
      {children}
    </div>
  )
}

/**
 * The default value of every control on the page — the SINGLE source of truth
 * for both the initial state and the Reset button, so the two can never drift.
 */
const DEFAULTS = {
  size: 1.4,
  width: 0,
  height: 0,
  tabWidth: 0,
  tabHeight: 0,
  cornerRadius: 8,
  roughness: INK.roughness,
  bowing: INK.bowing,
  strokeWidth: INK.strokeWidth,
  seed: 7,
  singleStroke: INK.disableMultiStroke,
  preserveVertices: INK.preserveVertices,
  lift: 0,
  tilt: 30,
  perspective: 840,
  backTilt: 15,
  swatchIndex: -1,
  fullFill: true,
  fillRoughness: 0,
  fillBowing: 0,
}

/** The stage's top-right control — resets every control on the page to DEFAULTS. */
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
 * FolderLab — a full playground for the hand-drawn folder. The folder (a fully
 * parametric LabFolder) sits on a stage up top; every roughjs + geometry +
 * perspective + colour + fill knob is exposed below as a hand-drawn control,
 * laid out in a responsive multi-column grid so it all fits without scrolling.
 */
export function FolderLab({ index }: FolderLabProps) {
  // Dimensions
  const [size, setSize] = useState(DEFAULTS.size)
  const [width, setWidth] = useState(DEFAULTS.width)
  const [height, setHeight] = useState(DEFAULTS.height)
  const [tabWidth, setTabWidth] = useState(DEFAULTS.tabWidth)
  const [tabHeight, setTabHeight] = useState(DEFAULTS.tabHeight)
  const [cornerRadius, setCornerRadius] = useState(DEFAULTS.cornerRadius)
  // Ink (roughjs)
  const [roughness, setRoughness] = useState(DEFAULTS.roughness)
  const [bowing, setBowing] = useState(DEFAULTS.bowing)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth)
  const [seed, setSeed] = useState(DEFAULTS.seed)
  const [singleStroke, setSingleStroke] = useState(DEFAULTS.singleStroke)
  const [preserveVertices, setPreserveVertices] = useState(DEFAULTS.preserveVertices)
  // Perspective (hover)
  const [lift, setLift] = useState(DEFAULTS.lift)
  const [tilt, setTilt] = useState(DEFAULTS.tilt)
  const [perspective, setPerspective] = useState(DEFAULTS.perspective)
  const [backTilt, setBackTilt] = useState(DEFAULTS.backTilt)
  // Colour
  const [swatchIndex, setSwatchIndex] = useState(DEFAULTS.swatchIndex)
  // Back-leaf fill — solid "full fill" with its OWN roughness/bowing (fills read
  // differently than strokes, so they get their own params)
  const [fullFill, setFullFill] = useState(DEFAULTS.fullFill)
  const [fillRoughness, setFillRoughness] = useState(DEFAULTS.fillRoughness)
  const [fillBowing, setFillBowing] = useState(DEFAULTS.fillBowing)

  // Resolve the theme ink colour (roughjs bakes fill colours at generate time).
  const inkRef = useRef<HTMLSpanElement>(null)
  const [ink, setInk] = useState("#161614")
  useLayoutEffect(() => {
    const el = inkRef.current
    if (el) setInk(getComputedStyle(el).color)
  }, [])

  // One control resets the whole page — every setter back to DEFAULTS.
  const reset = () => {
    setSize(DEFAULTS.size)
    setWidth(DEFAULTS.width)
    setHeight(DEFAULTS.height)
    setTabWidth(DEFAULTS.tabWidth)
    setTabHeight(DEFAULTS.tabHeight)
    setCornerRadius(DEFAULTS.cornerRadius)
    setRoughness(DEFAULTS.roughness)
    setBowing(DEFAULTS.bowing)
    setStrokeWidth(DEFAULTS.strokeWidth)
    setSeed(DEFAULTS.seed)
    setSingleStroke(DEFAULTS.singleStroke)
    setPreserveVertices(DEFAULTS.preserveVertices)
    setLift(DEFAULTS.lift)
    setTilt(DEFAULTS.tilt)
    setPerspective(DEFAULTS.perspective)
    setBackTilt(DEFAULTS.backTilt)
    setSwatchIndex(DEFAULTS.swatchIndex)
    setFullFill(DEFAULTS.fullFill)
    setFillRoughness(DEFAULTS.fillRoughness)
    setFillBowing(DEFAULTS.fillBowing)
  }

  const sw = swatchIndex >= 0 ? SWATCHES[swatchIndex] : null
  const config: LabFolderConfig = {
    seed,
    widthExtend: width,
    heightExtend: height,
    tabWidthExtend: tabWidth,
    tabHeightExtend: tabHeight,
    scale: size,
    cornerRadius,
    roughness,
    bowing,
    strokeWidth,
    disableMultiStroke: singleStroke,
    preserveVertices,
    lift,
    tilt,
    perspective,
    backTilt,
    backColor: sw ? sw.color : "currentColor",
    frontColor: sw ? sw.color : "currentColor",
    fillEnabled: fullFill,
    fillColor: sw ? sw.color : ink,
    fillRoughness,
    fillBowing,
  }

  return (
    <div className="flex w-full flex-col">
      <span ref={inkRef} aria-hidden className="pointer-events-none absolute h-0 w-0 text-foreground" />

      {/* Pinned — the folder stays in view while the controls scroll beneath it;
          a fade scrim dissolves controls at the seam. The folder is mounted on a
          recessed stage (its own surface) so it reads as the featured subject,
          distinct from the raised control cards below.

          STATIC + FLUSH + NO BLEED, all at once:
          • `top-0` pins to the scroll container's TOP, so the opaque wrapper
            covers all the way up — controls scrolling up vanish cleanly under it
            instead of bleeding out in the band above the stage.
          • `-mt-(--content-pt)` cancels the content column's top padding so the
            wrapper's REST position already equals its stuck position (top-0):
            zero pre-scroll travel, the stage never slides up then snaps.
          • `pt-(--content-pt)` then insets the visible stage back down so it
            sits flush with the sidebar's top edge; bg-background fills the whole
            wrapper (padding band included) so nothing shows through above it.
          One token throughout ⇒ responsive (40px desktop / 80px mobile).

          ENTRANCE: the stage RISES in with the standard fade-in-up (--i 0, so it
          leads), exactly like the control cards below — the whole page enters with
          one staggered motion. The translateY sits on the sticky element ITSELF,
          which does NOT break sticky: only a transform on an ANCESTOR creates a
          containing block that changes the scroll reference; a transform on the
          sticky box just offsets it visually and it ends at translateY(0). Because
          the cards rise too, the stage never overlaps them on the way in. Sticky-
          on-scroll still pins correctly (verified). */}
      <div className="sticky top-0 z-10 -mt-(--content-pt) animate-fade-in-up bg-background pt-(--content-pt)">
        <LabStage action={<ResetButton onReset={reset} />}>
          <LabFolder config={config} />
        </LabStage>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 translate-y-full bg-linear-to-b from-background to-background/0"
        />
      </div>

      {/* Controls — scroll beneath the pinned folder. Each section is its own
          card (a light sidebar-coloured panel) so the groups read distinctly.
          Every card is wrapped in FadeInUp so it rises in with the same staggered
          entrance the rest of the site uses (the stage above fades — see note). */}
      <div className="flex flex-col gap-4 pt-7">
        <FadeInUp i={index + 1}>
          <Card title="Dimensions">
            <ControlGrid>
              <RoughSlider label="Size" value={size} min={0.6} max={2} step={0.1} onChange={setSize} format={fmtScale} seed={11} />
              <RoughSlider label="Width" value={width} min={0} max={160} step={2} onChange={setWidth} format={fmtAddPx} seed={12} />
              <RoughSlider label="Height" value={height} min={0} max={120} step={2} onChange={setHeight} format={fmtAddPx} seed={13} />
              <RoughSlider label="Corner radius" value={cornerRadius} min={0} max={12} step={1} onChange={setCornerRadius} format={fmtInt} seed={14} />
              <RoughSlider label="Tab width" value={tabWidth} min={-20} max={48} step={2} onChange={setTabWidth} format={fmtSignedPx} seed={15} />
              <RoughSlider label="Tab height" value={tabHeight} min={-10} max={40} step={2} onChange={setTabHeight} format={fmtSignedPx} seed={16} />
            </ControlGrid>
          </Card>
        </FadeInUp>

        <FadeInUp i={index + 2}>
          <Card title="Ink (roughjs)">
            <ControlGrid>
              <RoughSlider label="Roughness" value={roughness} min={0} max={4} step={0.1} onChange={setRoughness} format={fmt1} seed={21} />
              <RoughSlider label="Bowing" value={bowing} min={0} max={6} step={0.1} onChange={setBowing} format={fmt1} seed={22} />
              <RoughSlider label="Stroke width" value={strokeWidth} min={0.5} max={5} step={0.1} onChange={setStrokeWidth} format={fmt1} seed={23} />
              <RoughSlider label="Seed" value={seed} min={1} max={60} step={1} onChange={setSeed} format={fmtInt} seed={24} />
            </ControlGrid>
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              <RoughCheckbox label="Single stroke" checked={singleStroke} onChange={setSingleStroke} seed={31} />
              <RoughCheckbox label="Preserve vertices" checked={preserveVertices} onChange={setPreserveVertices} seed={32} />
            </div>
          </Card>
        </FadeInUp>

        <FadeInUp i={index + 3}>
          <Card title="Perspective (hover)">
            <ControlGrid>
              <RoughSlider label="Lift" value={lift} min={0} max={24} step={1} onChange={setLift} format={fmtPx} seed={41} />
              <RoughSlider label="Front tilt" value={tilt} min={0} max={60} step={1} onChange={setTilt} format={fmtDeg} seed={42} />
              <RoughSlider label="Perspective" value={perspective} min={200} max={1200} step={20} onChange={setPerspective} format={fmtPx} seed={43} />
              <RoughSlider label="Back tilt" value={backTilt} min={0} max={40} step={1} onChange={setBackTilt} format={fmtDeg} seed={44} />
            </ControlGrid>
          </Card>
        </FadeInUp>

        <FadeInUp i={index + 4}>
          <Card title="Colour">
            <ColorPicker
              swatches={SWATCHES}
              value={swatchIndex}
              onChange={setSwatchIndex}
              ink
              label="Folder colour"
              cols="grid-cols-8 sm:grid-cols-[repeat(16,minmax(0,1fr))]"
            />
          </Card>
        </FadeInUp>

        <FadeInUp i={index + 5}>
          <Card title="Back-leaf fill">
            <div className="flex flex-col gap-4">
              <RoughCheckbox label="Full fill" checked={fullFill} onChange={setFullFill} seed={71} />
              <div
                aria-disabled={!fullFill}
                className={`transition-opacity ${fullFill ? "" : "pointer-events-none opacity-40"}`}
              >
                <ControlGrid>
                  <RoughSlider label="Fill roughness" value={fillRoughness} min={0} max={4} step={0.1} onChange={setFillRoughness} format={fmt1} seed={72} />
                  <RoughSlider label="Fill bowing" value={fillBowing} min={0} max={6} step={0.1} onChange={setFillBowing} format={fmt1} seed={73} />
                </ControlGrid>
              </div>
            </div>
          </Card>
        </FadeInUp>

        <FadeInUp i={index + 6}>
          <JustifiedParagraph className="pt-2 text-center text-sm text-muted-foreground">
            Hover the folder to see it open. Every control redraws the real roughjs sketch.
          </JustifiedParagraph>
        </FadeInUp>
      </div>
    </div>
  )
}
