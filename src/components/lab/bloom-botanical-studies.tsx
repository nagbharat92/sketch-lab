import { useId, useMemo, useState, type ReactNode } from "react"
import { BotanicalSpecimen } from "./bloom-illustration"
import { leafAnatomy } from "./bloom-geometry"
import { createLeafSpecimen, createMonsteraSpecimen, growMonsteraSpecimen, monsteraStudyPalette, remixLeafMarkings, remixMonsteraSpecimen, studySeed } from "./bloom-study-state"
import { BloomStudySpread } from "./bloom-study-spread"
import { DeferredBloomStudy } from "./deferred-bloom-study"
import { BloomStudyStage } from "./bloom-study-stage"
import { BLOOM_PIGMENTS, BLOOM_SWATCHES, LEAF_FAMILIES, LEAF_MARKINGS, LEAF_STUDY, MONSTERA_AGE, MONSTERA_MARKINGS } from "./bloom-tokens"
import { BloomStudySlider } from "./bloom-study-slider"
import { OrganicMonsteraStudy } from "./bloom-monstera-study"
import { useMonsteraStudy } from "@/hooks/use-monstera-study"
import type { MonsteraArtwork } from "./bloom-monstera-artwork"
import { seededVariegationCoverage } from "./bloom-monstera-variegation"
import { createLadybirdSpecimen } from "./bloom-ladybird-study-state"

function BotanicalMarkingChoices<T extends string>({ label, choices, value, onChange, preview }: {
  label: string; choices: readonly T[]; value: T; onChange: (choice: T) => void; preview: (choice: T) => ReactNode
}) {
  const name = useId()
  return (
    <fieldset className="bloom-monstera-choices">
      <legend className="sr-only">{label}</legend>
      <div className="bloom-monstera-choice-options" data-count={choices.length}>
        {choices.map((choice) => <label key={choice} className="bloom-monstera-choice">
          <input type="radio" name={name} value={choice} checked={value === choice} onChange={() => onChange(choice)} onClick={() => { if (value === choice) onChange(choice) }} />
          <span className="bloom-monstera-choice-art">{preview(choice)}</span>
          <span className="bloom-monstera-choice-name">{choice}</span>
        </label>)}
      </div>
    </fieldset>
  )
}

function MonsteraPreview({ specimen, markings, prepared }: {
  specimen: ReturnType<typeof createMonsteraSpecimen>
  markings: typeof MONSTERA_MARKINGS[number]
  prepared: MonsteraArtwork | undefined
}) {
  return (
    prepared ? <OrganicMonsteraStudy seed={specimen.anatomySeed} age={0} markings={markings} inkSeed={7} prepared={prepared} />
      : <svg viewBox="-90 -135 180 180" aria-hidden="true" />
  )
}

function MonsteraStudy() {
  const [specimen, setSpecimen] = useState(() => createMonsteraSpecimen(1))
  const preview = useMemo(() => createMonsteraSpecimen(7), [])
  const prepared = useMonsteraStudy(specimen, preview.anatomySeed)
  const displayed = prepared?.specimen ?? specimen
  const colors = useMemo(() => monsteraStudyPalette(specimen.age), [specimen.age])
  return (
    <BloomStudySpread
      id="bloom-monstera" title="The monstera" magazine
      copy="A young leaf starts pale and whole. Each age step deepens its green, adds a split on either side and gently develops the same ivory and pink markings."
      button="Grow me a monstera"
      color={colors.button}
      generate={() => setSpecimen(growMonsteraSpecimen)}
      controls={<>
        <BotanicalMarkingChoices label="Markings" choices={MONSTERA_MARKINGS} value={specimen.markings} onChange={(markings) => setSpecimen((current) => remixMonsteraSpecimen(current, { markings }))} preview={(markings) => <MonsteraPreview specimen={preview} markings={markings} prepared={prepared?.previews.find((artwork) => artwork.markings === markings)} />} />
        <BloomStudySlider label="Age" value={specimen.age} {...MONSTERA_AGE} format={(age) => age === 0 ? "Whole leaf" : `${age} ${age === 1 ? "split" : "splits"} per side`} onChange={(age) => setSpecimen((current) => age === current.age ? current : remixMonsteraSpecimen(current, { age }))} seed={701} thumbColor={colors.middle} />
        <BloomStudySlider label="Coverage" disabled={specimen.markings === "plain"} value={specimen.coverage ?? Math.round(seededVariegationCoverage(specimen.anatomySeed, specimen.markings, specimen.age) * 100)} {...LEAF_STUDY.coverage} format={(coverage) => `${coverage}%`} onChange={(coverage) => setSpecimen((current) => remixMonsteraSpecimen(current, { coverage }))} seed={704} thumbColor={BLOOM_PIGMENTS.leaf.variegationWarm} />
      </>}
    >
      <BloomStudyStage seed={displayed.seed} label={`A monstera with ${displayed.age} splits per side and ${displayed.markings} markings`} sway={false} settle={false} displace={false}>
        {(inkSeed, _filter, active) => prepared
          ? <OrganicMonsteraStudy seed={displayed.anatomySeed} age={displayed.age} markings={displayed.markings} inkSeed={inkSeed} stalk prepared={prepared.artwork} pose={displayed.pose} viewBox={displayed.viewBox} animated={active} />
          : <svg viewBox="-105 -115 210 240" aria-hidden="true" aria-busy="true" />}
      </BloomStudyStage>
    </BloomStudySpread>
  )
}

function LeafChoice({ family }: { family: typeof LEAF_FAMILIES[number] }) {
  const leaf = useMemo(() => leafAnatomy(7, "leaf-choice", family), [family])
  return (
    <svg viewBox="-55 -115 110 130" aria-hidden="true">
      <path d={leaf.edge} fill={BLOOM_PIGMENTS.leaf.middle} stroke="currentColor" strokeWidth={2} />
      <path d={leaf.veins[0].d} fill={BLOOM_PIGMENTS.leaf.spine} opacity={0.7} />
    </svg>
  )
}

function LeafStudy() {
  const [specimen, setSpecimen] = useState(() => createLeafSpecimen(1))
  const preview = useMemo(() => createLeafSpecimen(7), [])
  return (
    <BloomStudySpread
      id="bloom-leaf" title={<>A curve<br />with veins.</>} magazine
      copy="I draw the blade around a curved midrib. Its veins sweep outwards, then turn towards the tip. Coverage grows the same seeded markings without changing the leaf."
      button="Grow me a leaf"
      generate={() => setSpecimen((current) => createLeafSpecimen(current.seed + 1))}
      controls={<>
        <fieldset className="bloom-shape-choices">
          <legend className="sr-only">Leaf shape</legend>
          {LEAF_FAMILIES.map((family) => <label className="bloom-shape-choice" key={family} title={family}>
            <input type="radio" name="bloom-leaf-family" checked={specimen.family === family} value={family} onChange={() => setSpecimen((current) => ({ ...current, family }))} />
            <span className="bloom-shape-choice-art"><LeafChoice family={family} /></span>
            <span className="bloom-petal-name">{family}</span>
          </label>)}
        </fieldset>
        <BotanicalMarkingChoices label="Leaf markings" choices={LEAF_MARKINGS} value={specimen.pattern} onChange={(pattern) => setSpecimen((current) => remixLeafMarkings(current, pattern))} preview={(pattern) =>
          <BotanicalSpecimen kind="leaf" seed={preview.anatomySeed} family="broad" width={100} coverage={LEAF_STUDY.previewCoverage} pattern={pattern} inkSeed={7} />} />
        <BloomStudySlider label="Coverage" disabled={specimen.pattern === "plain"} value={specimen.coverage} {...LEAF_STUDY.coverage} format={(coverage) => `${coverage}%`} onChange={(coverage) => setSpecimen((current) => ({ ...current, coverage }))} seed={714} thumbColor={BLOOM_PIGMENTS.leaf.variegationWarm} />
      </>}
    >
      <BloomStudyStage seed={specimen.seed} label={`A ${specimen.family} leaf with ${specimen.pattern} markings`} settle={false}>
        {(inkSeed, filter) => <BotanicalSpecimen kind="leaf" seed={specimen.anatomySeed} family={specimen.family} width={specimen.width} coverage={specimen.coverage / 100} pattern={specimen.pattern} markingSeed={specimen.markingSeed} inkSeed={inkSeed} filter={filter} />}
      </BloomStudyStage>
    </BloomStudySpread>
  )
}

function SprigStudy() {
  const [specimen, setSpecimen] = useState({ seed: 1, branches: 3 })
  const { seed, branches } = specimen
  const anatomySeed = useMemo(() => studySeed(seed, "sprig-study"), [seed])
  const color = BLOOM_SWATCHES[3]
  return (
    <BloomStudySpread
      id="bloom-sprig" title={<>Before<br />the bloom.</>} magazine
      copy="A sprig carries tight buds, fuller buds and petals starting to open. Each follows its curved stalk; smaller leaves grow from staggered nodes along the stems."
      button="Draw me a sprig" color={color.color} ink={color.ink}
      generate={() => setSpecimen((current) => ({
        seed: current.seed + 1, branches: 2 + studySeed(current.seed + 1, "branch-count") % 3,
      }))}
      controls={<BloomStudySlider label="Branches" value={branches} min={2} max={4} step={1} onChange={(branches) => setSpecimen((current) => ({ ...current, branches }))} seed={731} thumbColor={color.color} />}
    >
      <BloomStudyStage seed={seed} label={`A flowing sprig with ${branches + 1} buds and attached leaves`} settle={false}>
        {(inkSeed, filter) => <BotanicalSpecimen kind="sprig" seed={anatomySeed} branches={branches} inkSeed={inkSeed} filter={filter} />}
      </BloomStudyStage>
    </BloomStudySpread>
  )
}

function GroundStudy() {
  const [seed, setSeed] = useState(1)
  const anatomySeed = useMemo(() => studySeed(seed, "ground-study"), [seed])
  return (
    <BloomStudySpread
      id="bloom-ground" title="A little underfoot." magazine
      copy="Just a thin line of soil. Grass rises from little mounds of mud, and a few fallen leaves, twigs and pebbles rest in the gaps, never on top of each other."
      button="Draw a little ground"
      color={BLOOM_PIGMENTS.ground.stoneOutline}
      generate={() => setSeed((current) => current + 1)}
    >
      <BloomStudyStage seed={seed} label="A thin strip of soil with grass tufts, fallen leaves, twigs and pebbles" sway={false} settle={false}>
        {(inkSeed, filter) => <BotanicalSpecimen kind="ground" seed={anatomySeed} inkSeed={inkSeed} filter={filter} />}
      </BloomStudyStage>
    </BloomStudySpread>
  )
}

function LadybirdStudy() {
  const [specimen, setSpecimen] = useState(() => createLadybirdSpecimen(1))
  const variety = specimen.ladybird.appearance.variety
  return (
    <BloomStudySpread id="bloom-ladybird" title="A little visitor." magazine
      copy="Not every ladybird wears red. Some are yellow, orange or glossy black, with spots to match. Each click finds a new little visitor and a leaf for all six feet."
      button="Find me a leaf" color={BLOOM_PIGMENTS.ladybird.middle} ink={BLOOM_SWATCHES[0].ink}
      generate={() => setSpecimen((current) => createLadybirdSpecimen(current.seed + 1))}
      controls={<p className="bloom-ladybird-caption" aria-live="polite">
        <a href={variety.reference} target="_blank" rel="noreferrer" title={variety.species}>{variety.name}</a>
        <span>{variety.note}</span>
      </p>}>
      <BloomStudyStage seed={specimen.seed} label={`A ${variety.name.toLowerCase()} ladybird on a generated ${specimen.family} leaf`} settle={false} displace={false}>
        {(inkSeed) => <BotanicalSpecimen kind="ladybird" seed={specimen.anatomySeed} specimen={specimen} inkSeed={inkSeed} />}
      </BloomStudyStage>
    </BloomStudySpread>
  )
}

export function BloomBotanicalStudies() {
  return (
    <>
      <DeferredBloomStudy label="The monstera"><MonsteraStudy /></DeferredBloomStudy>
      <DeferredBloomStudy label="The leaf"><LeafStudy /></DeferredBloomStudy>
      <DeferredBloomStudy label="The sprig"><SprigStudy /></DeferredBloomStudy>
      <DeferredBloomStudy label="The ground"><GroundStudy /></DeferredBloomStudy>
      <DeferredBloomStudy label="The ladybird"><LadybirdStudy /></DeferredBloomStudy>
    </>
  )
}
