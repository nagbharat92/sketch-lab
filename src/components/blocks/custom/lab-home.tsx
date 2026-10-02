import { useState } from "react"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { labPages, type PageNode } from "@/data/pages"
import { Bloom } from "@/components/lab/color-swatch"
import { SeattleSignature } from "@/components/seattle-signature"
import { LabPreview } from "@/components/lab/lab-preview"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughBox, RoughLine } from "@/components/ui/rough-ink"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { roughPathInfos, ROUGH_OPTIONS } from "@/components/lab/rough"

const DESCRIPTIONS: Record<string, string> = {
  "folder-lab": "Give a tidy line a little character. Then peek inside the folder.",
  "type-pairing": "Same words, a different feeling. Find two typefaces that get along.",
  backgrounds: "A little warmer? A little cooler? Find a palette for day and night.",
  motion: "Find the moment a still drawing starts to feel alive.",
  "flower-lab": "Grow a hand-drawn garden. Every click plants a different mix.",
  "text-boil": "Give a few letters a gentle wobble. A little goes a long way.",
  controls: "Slide, tick and click. Familiar things with a hand-drawn twist.",
  seattle: "A familiar skyline and a little drizzle. My small Seattle sign-off.",
}

const invitationPaths = roughPathInfos(
  "M90 8 C74 7 80 30 58 30 C39 30 27 13 7 20 M7 20 L18 12 M7 20 L20 25",
  { ...ROUGH_OPTIONS, seed: 93, stroke: "currentColor", fill: "none" },
)

function LabCard({ page, index }: { page: PageNode; index: number }) {
  const [active, setActive] = useState(false)

  return (
    <a
      href={`#/${page.id}`}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="group relative flex w-full min-w-0 flex-col rounded-xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[calc((100%_-_1.25rem)/2)] lg:w-[calc((100%_-_2.5rem)/3)]"
    >
      <RoughBox seed={71 + index} className="z-10 text-muted-foreground/35 group-hover:text-muted-foreground group-focus-visible:text-muted-foreground" />
      <div aria-hidden="true" className="flex h-44 items-center justify-center rounded-t-xl bg-(--surface-raised) px-6">
        <LabPreview id={page.id} active={active} />
      </div>
      <div className="flex-1 rounded-b-xl bg-background p-6 transition-colors group-hover:bg-sidebar group-focus-visible:bg-sidebar">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">{page.name}</h2>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <JustifiedParagraph justify={false} className="mt-2 text-base leading-relaxed text-muted-foreground">{DESCRIPTIONS[page.id]}</JustifiedParagraph>
      </div>
    </a>
  )
}

export function LabHome({ index }: { index: number; props?: Record<string, unknown> }) {
  return (
    <div>
      <FadeInUp i={index}>
        <div className="flex items-center justify-center gap-3 text-center">
          <Bloom size={40} radius={16} shape={DEFAULT_BLOOM} fill="var(--accent-primary)" seed={7} centerHole />
          <span className="font-display text-2xl">Sketch Lab</span>
        </div>
        <h1 className="mx-auto mt-7 max-w-3xl text-center font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Small things,<br />drawn differently.
        </h1>
        <JustifiedParagraph className="mx-auto mt-5 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          I'm Bharat. This is my little playground for making interfaces feel more human.
          Pick an experiment and give it a nudge.
        </JustifiedParagraph>
        <div className="relative mx-auto mt-7 w-fit">
          <a
            href="#/flower-lab"
            className="ink-boil-parent relative inline-flex items-center gap-3 rounded-xl bg-(--accent-primary) px-6 py-3 text-base font-semibold text-(--accent-primary-ink) transition-colors hover:bg-(--accent-yellow) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <RoughBox seed={91} className="text-(--accent-primary-ink)/70" />
            <span>Start with a bloom</span>
            <ArrowRight aria-hidden="true" className="ink-boil size-4" />
          </a>
          <div aria-hidden="true" className="absolute left-full top-0 ml-5 hidden w-44 items-start gap-1 text-muted-foreground sm:flex">
            <svg viewBox="0 0 100 40" className="mt-3 w-16 shrink-0 overflow-visible" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
              {invitationPaths.map((path, i) => <path key={i} d={path.d} />)}
            </svg>
            <span className="text-sm italic leading-snug">a small happy place to start</span>
          </div>
        </div>
      </FadeInUp>
      <FadeInUp i={index + 1}>
        <div className="mt-14 text-center">
          <h2 className="font-sans text-lg font-semibold">A few things to play with</h2>
          <p className="mt-1 text-sm text-muted-foreground">No right settings. Just see what feels good.</p>
        </div>
        <nav aria-label="Explore the labs" className="mt-6 flex flex-wrap justify-center gap-5">
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
