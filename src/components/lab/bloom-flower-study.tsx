import { useMemo, useState, type CSSProperties } from "react"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"
import { BotanicalFlower } from "./bloom-illustration"
import { botanicalPetals } from "./bloom-geometry"
import { createFlowerSpecimen, type FlowerSpecimen } from "./bloom-flower-study-state"
import { BLOOM_PROSE_POLICY, BLOOM_SWATCHES, FLOWER_STUDY, PETAL_FAMILIES } from "./bloom-tokens"
import { BloomStudySlider } from "./bloom-study-slider"
import { BloomStudyStage } from "./bloom-study-stage"
import { BloomStudyButton } from "./bloom-study-spread"

function PetalChoice({ family }: { family: typeof PETAL_FAMILIES[number] }) {
  const petal = useMemo(() => botanicalPetals(DEFAULT_BLOOM, family, 0.6, 1)[0], [family])
  return (
    <svg viewBox="-90 -155 180 180" aria-hidden="true">
      <path className="bloom-choice-fill" d={petal.d} fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={2.5} />
      <path d={petal.veins[2]} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.55} />
    </svg>
  )
}

export function BloomFlowerStudy() {
  const [specimen, setSpecimen] = useState(() => createFlowerSpecimen(1))
  const color = BLOOM_SWATCHES[specimen.colorIndex]
  const shape = useMemo(() => ({ ...DEFAULT_BLOOM, petals: specimen.petalCount }), [specimen.petalCount])
  const accent = { "--study-accent": color.color } as CSSProperties

  const tweak = <K extends keyof Pick<FlowerSpecimen, "family" | "petalCount" | "petalLength" | "centerSize">>(key: K, value: FlowerSpecimen[K]) =>
    setSpecimen((previous) => ({ ...previous, [key]: value }))

  return (
    <section id="bloom-flower" className="bloom-page bloom-study-spread bloom-flower-magazine" aria-label="The flower" style={accent}>
      <div className="bloom-study-copy">
        <JustifiedParagraph dropCap policy={BLOOM_PROSE_POLICY} className="bloom-story">
          One petal, turned around a single centre, becomes a flower. I nudge each petal's length and lean a little, so no two blooms come out stamped.
        </JustifiedParagraph>
        <div className="bloom-flower-controls">
          <fieldset className="bloom-shape-choices">
            <legend className="sr-only">Petal shape</legend>
            {PETAL_FAMILIES.map((family) => (
              <label key={family} className="bloom-shape-choice" title={family}>
                <input type="radio" name="bloom-petal-family" value={family} checked={specimen.family === family} onChange={() => tweak("family", family)} />
                <span className="bloom-shape-choice-art"><PetalChoice family={family} /></span>
                <span className="bloom-petal-name">{family}</span>
              </label>
            ))}
          </fieldset>
          <BloomStudySlider label="Petal count" value={specimen.petalCount} {...FLOWER_STUDY.petals} onChange={(value) => tweak("petalCount", value)} seed={681} thumbColor={color.color} />
          <BloomStudySlider label="Petal length" value={specimen.petalLength} {...FLOWER_STUDY.length} format={(value) => `${value}%`} onChange={(value) => tweak("petalLength", value)} seed={684} thumbColor={color.color} />
          <BloomStudySlider label="Centre size" value={specimen.centerSize} {...FLOWER_STUDY.center} format={(value) => `${value}%`} onChange={(value) => tweak("centerSize", value)} seed={687} thumbColor={color.color} />
        </div>
        <BloomStudyButton color={color.color} ink={color.ink} generate={() => setSpecimen((previous) => createFlowerSpecimen(previous.seed + 1))}>
          Draw me a flower
        </BloomStudyButton>
      </div>
      <div className="bloom-study-workbench">
        <BloomStudyStage seed={specimen.seed} label={`${specimen.family} flower with ${specimen.petalCount} petals`} sway={false} settle={false}>
          {(inkSeed, filter) => <figure className="bloom-study-specimen" data-specimen-seed={specimen.seed}>
            <BotanicalFlower
              shape={shape}
              fill={color.color}
              centerHole={specimen.centerSize / 100}
              centerLightness={0}
              seed={inkSeed}
              specimenSeed={specimen.anatomySeed}
              identity="study"
              family={specimen.family}
              petalLength={specimen.petalLength / 100}
              viewBox={FLOWER_STUDY.viewBox}
              inkFilter={filter}
            />
          </figure>}
        </BloomStudyStage>
      </div>
    </section>
  )
}
