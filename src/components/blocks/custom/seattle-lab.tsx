import { useState } from "react"
import { Pause, Play } from "lucide-react"
import { SeattleSketch } from "@/components/lab/seattle-sketch"
import { RoughSlider } from "@/components/lab/rough-slider"
import { LabStage } from "@/components/lab/lab-stage"
import { SeattleSignature } from "@/components/seattle-signature"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

export function SeattleLab({ index }: { index: number; props?: Record<string, unknown> }) {
  const [raining, setRaining] = useState(true)
  const [speed, setSpeed] = useState(1)

  return (
    <div className="flex flex-col gap-8">
      <FadeInUp i={index}>
        <h1 className="font-display text-3xl text-foreground">A little Seattle</h1>
        <JustifiedParagraph className="mt-3 max-w-xl text-muted-foreground">
          A familiar silhouette, a little rain. A first sketch for a small signature
          at the bottom of things I make.
        </JustifiedParagraph>
      </FadeInUp>
      <FadeInUp i={index + 1}>
        <LabStage action={
          <button
            type="button"
            onClick={() => setRaining((value) => !value)}
            aria-label={raining ? "Pause animation" : "Resume animation"}
            className="flex items-center gap-2 rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {raining ? <Pause className="size-4" /> : <Play className="size-4" />}
            {raining ? "Pause" : "Play"}
          </button>
        }>
          <SeattleSketch raining={raining} speed={speed} className="max-w-sm" />
        </LabStage>
        <div className="mx-auto mt-5 max-w-xs">
          <RoughSlider label="Rain speed" value={speed} min={0.5} max={2} step={0.1} onChange={setSpeed} format={(value) => `${value.toFixed(1)}x`} seed={141} />
        </div>
      </FadeInUp>
      <FadeInUp i={index + 2}>
        <section aria-label="Footer-sized preview" className="pt-6 text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">At footer size</h2>
          <div className="mt-4">
            <SeattleSignature animated={raining} speed={speed} />
          </div>
        </section>
      </FadeInUp>
    </div>
  )
}
