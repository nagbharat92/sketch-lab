import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { labPages, type PageNode } from "@/data/pages"
import { Bloom } from "@/components/lab/color-swatch"
import { SeattleSignature } from "@/components/seattle-signature"
import { circlePaths, linePaths, roughPathInfos, roundedPolygonPath, ROUGH_OPTIONS } from "@/components/lab/rough"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughBox, RoughLine } from "@/components/ui/rough-ink"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { SeattleSketch } from "@/components/lab/seattle-sketch"

const DESCRIPTIONS: Record<string, string> = {
  "folder-lab": "Find the character in a line. Tune ink, shape and perspective.",
  "type-pairing": "Try type pairings, scales and spacing on a live specimen.",
  backgrounds: "Build a palette that feels at home in daylight and after dark.",
  motion: "Explore the rhythm of hand-drawn strokes and hover gestures.",
  "flower-lab": "Turn colour selections into playful, parametric blooms.",
  "text-boil": "Give letters a little life with a hand-drawn wobble.",
  controls: "Sliders, checks and buttons, with the same ink in both themes.",
  seattle: "A little Space Needle, a little rain. A sketch for a personal signature.",
}

const folderPaths = roughPathInfos(
  roundedPolygonPath([
    { x: 12, y: 18 }, { x: 48, y: 18 }, { x: 62, y: 34 },
    { x: 124, y: 34 }, { x: 124, y: 94 }, { x: 12, y: 94 },
  ], 8),
  { ...ROUGH_OPTIONS, seed: 7, fill: "none", stroke: "currentColor" },
)
const controlPaths = [
  ...linePaths(14, 38, 126, 38, 41),
  ...circlePaths(82, 38, 20, 42),
  ...linePaths(46, 77, 88, 77, 43),
]

function LabPreview({ id, active }: { id: string; active: boolean }) {
  switch (id) {
    case "seattle":
      return <SeattleSketch raining={active} className="w-40 [--lab-surface:var(--surface-raised)]" />
    case "folder-lab":
      return (
        <svg width="136" height="108" viewBox="0 0 136 108">
          <g fill="none" stroke="currentColor" strokeWidth={ROUGH_OPTIONS.strokeWidth} strokeLinecap="round">
            {folderPaths.map((path, i) => <path key={i} d={path.d} />)}
          </g>
        </svg>
      )
    case "type-pairing":
      return (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-6xl">Aa</span>
          <span className="text-4xl text-muted-foreground">Bb</span>
        </div>
      )
    case "backgrounds":
      return (
        <div className="flex gap-3">
          {["var(--accent-yellow)", "var(--accent-blue)", "var(--accent-green)"].map((color, i) => (
            <div key={color} style={{ backgroundColor: color }} className="relative size-12 rounded-lg">
              <RoughBox seed={51 + i} />
            </div>
          ))}
        </div>
      )
    case "motion":
      return (
        <div className="flex w-32 flex-col gap-3">
          {[61, 62, 63].map((seed) => <RoughLine key={seed} seed={seed} boil={active} bowing={2} />)}
        </div>
      )
    case "flower-lab":
      return <Bloom size={112} radius={46} shape={DEFAULT_BLOOM} fill="var(--accent-primary)" seed={7} centerHole spin={active} />
    case "text-boil":
      return <span className={`${active ? "ink-boil-on " : ""}text-4xl font-bold`}>Hello.</span>
    case "controls":
      return (
        <svg width="140" height="108" viewBox="0 0 140 108">
          <g fill="none" stroke="currentColor" strokeWidth={ROUGH_OPTIONS.strokeWidth} strokeLinecap="round">
            {controlPaths.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>
      )
    default:
      return <RoughLine className="w-32" />
  }
}

function LabCard({ page, index }: { page: PageNode; index: number }) {
  const [active, setActive] = useState(false)

  return (
    <a
      href={`#/${page.id}`}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="group relative flex min-w-0 flex-col rounded-xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RoughBox seed={71 + index} className="z-10 text-border group-hover:text-muted-foreground group-focus-visible:text-muted-foreground" />
      <div aria-hidden="true" className="flex h-44 items-center justify-center rounded-t-xl bg-(--surface-raised) px-6">
        <LabPreview id={page.id} active={active} />
      </div>
      <div className="flex-1 rounded-b-xl bg-background p-6 transition-colors group-hover:bg-sidebar group-focus-visible:bg-sidebar">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">{page.name}</h2>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <JustifiedParagraph className="mt-2 text-base leading-relaxed text-muted-foreground">{DESCRIPTIONS[page.id]}</JustifiedParagraph>
      </div>
    </a>
  )
}

export function LabHome({ index }: { index: number; props?: Record<string, unknown> }) {
  return (
    <div>
      <FadeInUp i={index}>
        <div className="flex items-center justify-center gap-5 text-center">
          <Bloom size={64} radius={26} shape={DEFAULT_BLOOM} fill="var(--accent-primary)" seed={7} centerHole />
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Sketch Lab</h1>
        </div>
        <JustifiedParagraph className="mt-6 text-center text-xl">Experiments in hand-drawn interfaces.</JustifiedParagraph>
        <JustifiedParagraph className="mx-auto mt-3 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          A place to play with sketchy strokes, colour, type and motion.
          Open a lab, move a few sliders and see what happens.
        </JustifiedParagraph>
        <RoughLine seed={12} className="mx-auto mt-8 w-12 text-muted-foreground" />
      </FadeInUp>
      <FadeInUp i={index + 1}>
        <nav aria-label="Explore the labs" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {labPages.map((page, i) => <LabCard key={page.id} page={page} index={i} />)}
        </nav>
      </FadeInUp>
      <FadeInUp i={index + 2}>
        <RoughLine seed={23} className="mx-auto mt-12 w-16 text-muted-foreground/60" />
        <footer className="mx-auto mt-20 max-w-xl text-center sm:mt-24">
          <SeattleSignature />
          <a
            href="https://github.com/nagbharat92/sketch-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View source
          </a>
        </footer>
      </FadeInUp>
    </div>
  )
}
