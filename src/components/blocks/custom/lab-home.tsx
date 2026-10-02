import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { labPages, type PageNode } from "@/data/pages"
import { Bloom } from "@/components/lab/color-swatch"
import { SeattleSignature } from "@/components/seattle-signature"
import { LabPreview } from "@/components/lab/lab-preview"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughBox, RoughLine } from "@/components/ui/rough-ink"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

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
        <nav aria-label="Explore the labs" className="mt-10 flex flex-wrap justify-center gap-5">
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
