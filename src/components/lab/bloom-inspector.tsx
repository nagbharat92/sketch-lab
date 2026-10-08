import { useId, useMemo, type FocusEvent, type ReactNode } from "react"
import type { CSSProperties } from "react"
import { DEFAULT_BLOOM } from "@/lib/bloom"
import { BotanicalSpecimen } from "./bloom-illustration"
import { botanicalPetals, leafAnatomy } from "./bloom-geometry"
import { gardenFlowerRecipe, gardenGroundExtent, gardenLadybird, gardenLeafRecipe } from "./bloom-garden-botany"
import { gardenMonsteraRecipe } from "./bloom-monstera-artwork"
import { seededVariegationCoverage } from "./bloom-monstera-variegation"
import { studyBudGeometry, type BudStage } from "./bloom-bud-study-geometry"
import { groundStudyGeometry } from "./bloom-ground-study-geometry"
import { createLadybirdAppearance, LADYBIRD_VARIETIES, type LadybirdVariety } from "./bloom-ladybird-geometry"
import { LadybirdDrawing } from "./bloom-ladybird-drawing"
import { BloomStudySlider } from "./bloom-study-slider"
import { BloomSurpriseButton } from "./bloom-surprise-button"
import type { BloomState } from "./bloom-state"
import type { FlowerPlant, LeafPlacement, MonsteraPlant } from "./bloom-garden"
import {
  BLOOM_PIGMENTS,
  BLOOM_SWATCHES,
  FLOWER_STUDY,
  GROUND_STUDY,
  LEAF_FAMILIES,
  LEAF_MARKINGS,
  LEAF_STUDY,
  MONSTERA_AGE,
  MONSTERA_MARKINGS,
  PETAL_FAMILIES,
} from "./bloom-tokens"
import {
  FLOWER_PALETTE,
  overrideFor,
  type GardenOverrides,
  type GardenSelection,
} from "./bloom-selection"
import "./bloom-inspector.css"

export { LADYBIRD_JOKES } from "./bloom-ladybird-jokes"

type BloomInspectorProps = {
  selection: GardenSelection
  scene: BloomState
  overrides: GardenOverrides
  onChange: (change: Record<string, unknown>) => void
  onRegenerate: () => void
}

type IndexedPlantPart<T> = { plant: FlowerPlant; item: T; index: number }
type ControlProps = Pick<BloomInspectorProps, "scene" | "selection" | "overrides" | "onChange">

const BUD_STAGES = ["tight", "full", "opening"] as const satisfies readonly BudStage[]
const pct = (value: number) => Math.round(value * 100)
const fraction = (value: number) => Number((value / 100).toFixed(4))
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const revealChoice = (event: FocusEvent<HTMLLabelElement>) =>
  event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })
const partIdPattern = (plantId: string, part: "leaf" | "bud", index: number) =>
  new RegExp(`(^|[-_:./])${plantId}([-_:./]|$).*${part}[-_:./]?${index}($|[-_:./])|(^|[-_:./])${part}[-_:./]?${index}([-_:./]|$).*${plantId}($|[-_:./])`)

function plants(scene: BloomState) {
  return [scene.garden.king, ...scene.garden.flowers]
}

function findFlower(scene: BloomState, id: string) {
  return plants(scene).find((plant) => plant.id === id) ?? scene.garden.king
}

function findMonstera(scene: BloomState, id: string) {
  return scene.garden.monsteras.find((plant) => plant.id === id) ?? scene.garden.monsteras[0]
}

function findIndexedPart<T extends "leaves" | "buds">(scene: BloomState, id: string, key: T): IndexedPlantPart<FlowerPlant[T][number]> | undefined {
  const part = key === "leaves" ? "leaf" : "bud"
  for (const plant of plants(scene)) {
    for (const [index, item] of plant[key].entries()) {
      if (id === `${plant.id}-${part}-${index}` || id === `${plant.id}:${part}:${index}` || id === `${plant.id}.${part}.${index}` || partIdPattern(plant.id, part, index).test(id)) {
        return { plant, item, index }
      }
    }
  }
  return undefined
}

function leafLabel(leaf: LeafPlacement) {
  return `leaf:${leaf.x}:${leaf.y}:${leaf.angle}`
}

function PetalChoice({ family }: { family: typeof PETAL_FAMILIES[number] }) {
  const petal = useMemo(() => botanicalPetals(DEFAULT_BLOOM, family, 0.6, 1)[0], [family])
  return (
    <svg viewBox="-90 -155 180 180" aria-hidden="true">
      <path className="bloom-choice-fill" d={petal.d} fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={2.5} />
      <path d={petal.veins[2]} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.55} />
    </svg>
  )
}

function LeafChoice({ family }: { family: typeof LEAF_FAMILIES[number] }) {
  const leaf = useMemo(() => leafAnatomy(7, "inspector-leaf-choice", family), [family])
  return (
    <svg viewBox="-55 -115 110 130" aria-hidden="true">
      <path d={leaf.edge} fill={BLOOM_PIGMENTS.leaf.middle} stroke="currentColor" strokeWidth={2} />
      <path d={leaf.veins[0].d} fill={BLOOM_PIGMENTS.leaf.spine} opacity={0.7} />
    </svg>
  )
}

function ShapeChoices<T extends string>({ label, choices, value, onChange, preview }: {
  label: string
  choices: readonly T[]
  value: T
  onChange: (choice: T) => void
  preview: (choice: T) => ReactNode
}) {
  const name = useId()
  return (
    <fieldset className="bloom-shape-choices">
      <legend className="sr-only">{label}</legend>
      {choices.map((choice) => (
        <label key={choice} className="bloom-shape-choice" title={choice} onFocus={revealChoice}>
          <input type="radio" name={name} value={choice} checked={value === choice} onChange={() => onChange(choice)} />
          <span className="bloom-shape-choice-art">{preview(choice)}</span>
          <span className="bloom-petal-name">{choice}</span>
        </label>
      ))}
    </fieldset>
  )
}

function BotanicalMarkingChoices<T extends string>({ label, choices, value, onChange, preview }: {
  label: string
  choices: readonly T[]
  value: T
  onChange: (choice: T) => void
  preview: (choice: T) => ReactNode
}) {
  const name = useId()
  return (
    <fieldset className="bloom-monstera-choices">
      <legend className="sr-only">{label}</legend>
      <div className="bloom-monstera-choice-options" data-count={choices.length}>
        {choices.map((choice) => (
          <label key={choice} className="bloom-monstera-choice" onFocus={revealChoice}>
            <input type="radio" name={name} value={choice} checked={value === choice} onChange={() => onChange(choice)} />
            <span className="bloom-monstera-choice-art">{preview(choice)}</span>
            <span className="bloom-monstera-choice-name">{choice}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function MarkingPreview({ pattern }: { pattern: typeof LEAF_MARKINGS[number] }) {
  return <BotanicalSpecimen kind="leaf" seed={7} family="broad" width={100} coverage={LEAF_STUDY.previewCoverage} pattern={pattern} inkSeed={7} />
}

function FlowerControls({ scene, selection, overrides, onChange }: ControlProps) {
  const plant = findFlower(scene, selection.id)
  const companion = scene.companions.find((bloom) => bloom.id === plant.id)
  const generated = gardenFlowerRecipe(scene.sceneSeed, plant.id)
  const current = overrideFor(overrides, "flower", selection.id)
  const color = current.color ?? (plant.id === "king" ? BLOOM_SWATCHES[scene.colorIndex].color : companion?.fill ?? FLOWER_PALETTE[0])
  const family = current.family ?? generated.family
  const petals = current.petals ?? (plant.id === "king" ? scene.shape.petals : companion?.shape.petals ?? scene.shape.petals)
  const petalLength = current.petalLength ?? generated.petalLength
  const centerHole = current.centerHole ?? (plant.id === "king" ? scene.centerHole : companion?.centerHole ?? scene.centerHole)

  return (
    <div className="bloom-inspector-controls" style={{ "--study-accent": color } as CSSProperties}>
      <ShapeChoices label="Petal family" choices={PETAL_FAMILIES} value={family} onChange={(next) => onChange({ family: next })} preview={(choice) => <PetalChoice family={choice} />} />
      <BloomStudySlider label="Petal count" value={petals} {...FLOWER_STUDY.petals} onChange={(value) => onChange({ petals: value })} seed={681} thumbColor={color} />
      <BloomStudySlider label="Petal length" value={pct(petalLength)} {...FLOWER_STUDY.length} format={(value) => `${value}%`} onChange={(value) => onChange({ petalLength: fraction(value) })} seed={684} thumbColor={color} />
      <BloomStudySlider label="Centre size" value={pct(centerHole)} {...FLOWER_STUDY.center} format={(value) => `${value}%`} onChange={(value) => onChange({ centerHole: fraction(value) })} seed={687} thumbColor={color} />
      <fieldset className="bloom-colour-choices">
        <legend className="sr-only">Flower colour</legend>
        {FLOWER_PALETTE.map((swatch) => (
          <label key={swatch} className="bloom-colour-choice" title={swatch} onFocus={revealChoice} style={{ "--bloom-swatch": swatch } as CSSProperties}>
            <input type="radio" name={`flower-colour-${selection.id}`} value={swatch} checked={color === swatch} onChange={() => onChange({ color: swatch })} />
            <span aria-hidden="true" />
          </label>
        ))}
      </fieldset>
    </div>
  )
}

function MonsteraControls({ scene, selection, overrides, onChange }: ControlProps) {
  const plant = findMonstera(scene, selection.id) as MonsteraPlant
  const generated = gardenMonsteraRecipe(scene.sceneSeed, plant)
  const current = overrideFor(overrides, "monstera", selection.id)
  const markings = current.markings ?? generated.markings
  const age = current.age ?? generated.age
  const coverage = markings === "plain" ? 0 : current.coverage ?? seededVariegationCoverage(generated.seed, markings, age)

  return (
    <div className="bloom-inspector-controls">
      <BotanicalMarkingChoices label="Monstera markings" choices={MONSTERA_MARKINGS} value={markings} onChange={(next) => onChange({ markings: next })} preview={(choice) => <MarkingPreview pattern={choice} />} />
      <BloomStudySlider label="Age" value={age} {...MONSTERA_AGE} format={(value) => value === 0 ? "Whole leaf" : `${value} ${value === 1 ? "split" : "splits"} per side`} onChange={(value) => onChange({ age: value })} seed={701} thumbColor={BLOOM_PIGMENTS.monstera.middle} />
      <BloomStudySlider label="Coverage" disabled={markings === "plain"} value={pct(coverage)} {...LEAF_STUDY.coverage} format={(value) => `${value}%`} onChange={(value) => onChange({ coverage: fraction(value) })} seed={704} thumbColor={BLOOM_PIGMENTS.leaf.variegationWarm} />
    </div>
  )
}

function LeafControls({ scene, selection, overrides, onChange }: ControlProps) {
  const match = findIndexedPart(scene, selection.id, "leaves")
  const recipe = gardenLeafRecipe(scene.sceneSeed, match ? leafLabel(match.item) : selection.id, match?.item.ladybird)
  const current = overrideFor(overrides, "leaf", selection.id)
  const family = current.family ?? recipe.family
  const pattern = current.pattern ?? recipe.pattern
  const coverage = pattern === "plain" ? 0 : current.coverage ?? recipe.coverage

  return (
    <div className="bloom-inspector-controls">
      <ShapeChoices label="Leaf family" choices={LEAF_FAMILIES} value={family} onChange={(next) => onChange({ family: next })} preview={(choice) => <LeafChoice family={choice} />} />
      <BotanicalMarkingChoices label="Leaf markings" choices={LEAF_MARKINGS} value={pattern} onChange={(next) => onChange({ pattern: next })} preview={(choice) => <MarkingPreview pattern={choice} />} />
      <BloomStudySlider label="Coverage" disabled={pattern === "plain"} value={pct(coverage)} {...LEAF_STUDY.coverage} format={(value) => `${value}%`} onChange={(value) => onChange({ coverage: fraction(value) })} seed={714} thumbColor={BLOOM_PIGMENTS.leaf.variegationWarm} />
    </div>
  )
}

function BudControls({ scene, selection, overrides, onChange }: ControlProps) {
  const match = findIndexedPart(scene, selection.id, "buds")
  const generated = match ? studyBudGeometry(scene.sceneSeed, `bud:${match.item.tip.x}:${match.item.tip.y}`) : studyBudGeometry(scene.sceneSeed, selection.id)
  const current = overrideFor(overrides, "bud", selection.id)
  const stage = current.stage ?? generated.stage
  const name = useId()

  return (
    <div className="bloom-inspector-controls">
      <fieldset className="bloom-stage-choices">
        <legend className="sr-only">Bud stage</legend>
        {BUD_STAGES.map((choice) => (
          <label key={choice} className="bloom-stage-choice" onFocus={revealChoice}>
            <input type="radio" name={name} value={choice} checked={stage === choice} onChange={() => onChange({ stage: choice })} />
            <span>{capitalize(choice)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}

function GroundControls({ scene, selection, overrides, onChange }: ControlProps) {
  const current = overrideFor(overrides, "ground", selection.id)
  const generatedTufts = useMemo(() => groundStudyGeometry(current.seed ?? scene.sceneSeed, gardenGroundExtent(scene.garden)).tufts.length, [current.seed, scene])
  const tufts = current.tufts ?? generatedTufts
  return (
    <div className="bloom-inspector-controls">
      <BloomStudySlider label="Grass" value={tufts} min={GROUND_STUDY.tufts[0]} max={GROUND_STUDY.tufts[1]} step={1} onChange={(value) => onChange({ tufts: value })} seed={731} thumbColor={BLOOM_PIGMENTS.ground.grasses[0]} />
    </div>
  )
}

function defaultLadybirdAppearance(scene: BloomState, variety?: LadybirdVariety) {
  const leaf = plants(scene).flatMap((plant) => plant.leaves).find((candidate) => candidate.ladybird)
  if (!leaf) return createLadybirdAppearance(scene.sceneSeed + 1, variety)
  const recipe = gardenLeafRecipe(scene.sceneSeed, leafLabel(leaf), true)
  return variety
    ? createLadybirdAppearance(scene.sceneSeed + 1, variety)
    : gardenLadybird(scene.sceneSeed, leafLabel(leaf), recipe.family).appearance
}

function LadybirdVarietyChoices({ value, seed, onChange }: { value: LadybirdVariety["id"]; seed: number; onChange: (variety: LadybirdVariety["id"]) => void }) {
  const name = useId()
  return (
    <fieldset className="bloom-ladybird-choices">
      <legend className="sr-only">Ladybird variety</legend>
      <div className="bloom-ladybird-choice-options">
        {LADYBIRD_VARIETIES.map((variety) => {
          const appearance = createLadybirdAppearance(seed, variety)
          return (
            <label key={variety.id} className="bloom-ladybird-choice" title={variety.name} onFocus={revealChoice}>
              <input type="radio" name={name} aria-label={variety.name} value={variety.id} checked={value === variety.id} onChange={() => onChange(variety.id)} />
              <span className="bloom-ladybird-choice-art">
                <svg viewBox="-22 -22 44 48" aria-hidden="true"><LadybirdDrawing appearance={appearance} /></svg>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function LadybirdControls({ scene, selection, overrides, onChange }: ControlProps) {
  const current = overrideFor(overrides, "ladybird", selection.id)
  const fallback = defaultLadybirdAppearance(scene)
  const variety = LADYBIRD_VARIETIES.find((item) => item.id === (current.variety ?? fallback.variety.id)) ?? fallback.variety
  const seed = current.seed ?? scene.sceneSeed + 1

  return (
    <div className="bloom-inspector-controls">
      <LadybirdVarietyChoices value={variety.id} seed={seed} onChange={(next) => onChange({ variety: next })} />
    </div>
  )
}

function inspectorContent(kind: GardenSelection["kind"], props: ControlProps) {
  switch (kind) {
    case "flower":
      return {
        title: "Flower",
        controls: <FlowerControls {...props} />,
        thing: "flower",
      }
    case "monstera":
      return {
        title: "Monstera",
        controls: <MonsteraControls {...props} />,
        thing: "monstera",
      }
    case "leaf":
      return {
        title: "Leaf",
        controls: <LeafControls {...props} />,
        thing: "leaf",
      }
    case "bud":
      return {
        title: "Bud",
        controls: <BudControls {...props} />,
        thing: "bud",
      }
    case "ground":
      return {
        title: "Ground",
        controls: <GroundControls {...props} />,
        thing: "ground",
      }
    case "ladybird":
      return {
        title: "Ladybird",
        controls: <LadybirdControls {...props} />,
        thing: "visitor",
      }
  }
}

export function BloomInspector({ selection, scene, overrides, onChange, onRegenerate }: BloomInspectorProps) {
  const content = inspectorContent(selection.kind, { scene, selection, overrides, onChange })

  return (
    <section className="bloom-inspector" aria-label={`${content.title} playground`}>
      <div className="bloom-inspector-heading" data-panel-part="heading" aria-live="polite">
        <h2>{content.title}</h2>
      </div>
      <div className="bloom-inspector-scroll" data-panel-part="controls">{content.controls}</div>
      <div className="bloom-inspector-actions" data-panel-part="actions">
        <BloomSurpriseButton onClick={onRegenerate} className="bloom-inspector-surprise">Surprise this {content.thing}</BloomSurpriseButton>
      </div>
    </section>
  )
}
