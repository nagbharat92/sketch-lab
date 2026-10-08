import { BLOOM_PIGMENTS, FLOWER_STUDY, GROUND_STUDY, LEAF_FAMILIES, LEAF_MARKINGS, MONSTERA_AGE, MONSTERA_MARKINGS, PETAL_FAMILIES, type SteppedRange } from "./bloom-tokens.ts"
import { LADYBIRD_VARIETIES, type LadybirdVariety } from "./bloom-ladybird-geometry.ts"
import type { BudStage } from "./bloom-bud-study-geometry.ts"

/** Every plant, leaf, bud, the soil and the visitor can be opened and tuned. */
export const SELECTION_KINDS = ["flower", "monstera", "leaf", "bud", "ground", "ladybird"] as const
export type SelectionKind = typeof SELECTION_KINDS[number]
export type GardenSelection = { kind: SelectionKind; id: string }

export const FLOWER_PALETTE = BLOOM_PIGMENTS.companions

export type FlowerOverride = {
  family?: typeof PETAL_FAMILIES[number]
  petals?: number
  /** Fraction of the generated petal length, not a percentage. */
  petalLength?: number
  centerHole?: number
  color?: string
}
export type MonsteraOverride = {
  age?: number
  markings?: typeof MONSTERA_MARKINGS[number]
  /** Fraction of the blade covered by ivory material. */
  coverage?: number
}
export type LeafOverride = {
  family?: typeof LEAF_FAMILIES[number]
  pattern?: typeof LEAF_MARKINGS[number]
  coverage?: number
}
export type BudOverride = { stage?: BudStage }
export type GroundOverride = { seed?: number; tufts?: number }
export type LadybirdOverride = { variety?: LadybirdVariety["id"]; seed?: number }

export type GardenOverrides = {
  flower: Record<string, FlowerOverride>
  monstera: Record<string, MonsteraOverride>
  leaf: Record<string, LeafOverride>
  bud: Record<string, BudOverride>
  ground?: GroundOverride
  ladybird?: LadybirdOverride
}

export type GardenOverrideFor<K extends SelectionKind> =
  K extends "flower" ? FlowerOverride : K extends "monstera" ? MonsteraOverride
  : K extends "leaf" ? LeafOverride : K extends "bud" ? BudOverride
  : K extends "ground" ? GroundOverride : LadybirdOverride

export const NO_OVERRIDES: GardenOverrides = Object.freeze({
  flower: Object.freeze({}), monstera: Object.freeze({}),
  leaf: Object.freeze({}), bud: Object.freeze({}),
}) as GardenOverrides

export function sameSelection(a: GardenSelection | undefined, b: GardenSelection | undefined) {
  return a?.kind === b?.kind && a?.id === b?.id
}

function stepped(value: number, { min, max, step }: SteppedRange, name: string) {
  if (!Number.isFinite(value) || value < min - 1e-9 || value > max + 1e-9) {
    throw new RangeError(`${name} must be between ${min} and ${max}`)
  }
  const ticks = Math.round((value - min) / step)
  if (Math.abs(min + ticks * step - value) > 1e-9) throw new RangeError(`${name} must follow its ${step} step`)
  return Number((min + ticks * step).toFixed(4))
}

const member = <T extends string>(value: T, allowed: readonly T[], name: string) => {
  if (!allowed.includes(value)) throw new RangeError(`Unknown ${name}: ${value}`)
  return value
}

const seedValue = (seed: number, name: string) => {
  if (!Number.isSafeInteger(seed) || seed < 1) throw new RangeError(`${name} must be a positive safe integer`)
  return seed
}

/** Fractions are stored in the model; percentages belong to the controls that display them. */
const FRACTION_RANGES = {
  petalLength: { min: FLOWER_STUDY.length.min / 100, max: FLOWER_STUDY.length.max / 100, step: FLOWER_STUDY.length.step / 100 },
  centerHole: { min: FLOWER_STUDY.center.min / 100, max: FLOWER_STUDY.center.max / 100, step: FLOWER_STUDY.center.step / 100 },
  coverage: { min: 0, max: 1, step: 0.05 },
} as const satisfies Record<string, SteppedRange>

export { FRACTION_RANGES }

function validateFlower(change: FlowerOverride): FlowerOverride {
  const next: FlowerOverride = {}
  if (change.family !== undefined) next.family = member(change.family, PETAL_FAMILIES, "petal family")
  if (change.petals !== undefined) next.petals = stepped(change.petals, FLOWER_STUDY.petals, "Petal count")
  if (change.petalLength !== undefined) next.petalLength = stepped(change.petalLength, FRACTION_RANGES.petalLength, "Petal length")
  if (change.centerHole !== undefined) next.centerHole = stepped(change.centerHole, FRACTION_RANGES.centerHole, "Centre size")
  if (change.color !== undefined) next.color = member(change.color, FLOWER_PALETTE, "flower colour")
  return next
}

function validateMonstera(change: MonsteraOverride): MonsteraOverride {
  const next: MonsteraOverride = {}
  if (change.age !== undefined) next.age = stepped(change.age, MONSTERA_AGE, "Age")
  if (change.markings !== undefined) next.markings = member(change.markings, MONSTERA_MARKINGS, "monstera markings")
  if (change.coverage !== undefined) next.coverage = stepped(change.coverage, FRACTION_RANGES.coverage, "Coverage")
  return next
}

function validateLeaf(change: LeafOverride): LeafOverride {
  const next: LeafOverride = {}
  if (change.family !== undefined) next.family = member(change.family, LEAF_FAMILIES, "leaf family")
  if (change.pattern !== undefined) next.pattern = member(change.pattern, LEAF_MARKINGS, "leaf markings")
  if (change.coverage !== undefined) next.coverage = stepped(change.coverage, FRACTION_RANGES.coverage, "Coverage")
  return next
}

function validateBud(change: BudOverride): BudOverride {
  const next: BudOverride = {}
  if (change.stage !== undefined) next.stage = member(change.stage, ["tight", "full", "opening"] as const, "bud stage")
  return next
}

function validateGround(change: GroundOverride): GroundOverride {
  const next: GroundOverride = {}
  if (change.seed !== undefined) next.seed = seedValue(change.seed, "Soil seed")
  if (change.tufts !== undefined) {
    next.tufts = stepped(change.tufts, { min: GROUND_STUDY.tufts[0], max: GROUND_STUDY.tufts[1], step: 1 }, "Grass")
  }
  return next
}

function validateLadybird(change: LadybirdOverride): LadybirdOverride {
  const next: LadybirdOverride = {}
  if (change.variety !== undefined) {
    next.variety = member(change.variety, LADYBIRD_VARIETIES.map((item) => item.id), "ladybird variety")
  }
  if (change.seed !== undefined) next.seed = seedValue(change.seed, "Ladybird seed")
  return next
}

const VALIDATORS = {
  flower: validateFlower, monstera: validateMonstera, leaf: validateLeaf,
  bud: validateBud, ground: validateGround, ladybird: validateLadybird,
} as const

/** Merge one change into the override map, leaving every other element untouched. */
export function withOverride(current: GardenOverrides, selection: GardenSelection, change: Record<string, unknown>): GardenOverrides {
  const kind = member(selection.kind, SELECTION_KINDS, "selection kind")
  const validated = VALIDATORS[kind](change)
  if (kind === "ground" || kind === "ladybird") {
    return { ...current, [kind]: { ...current[kind], ...validated } }
  }
  const group = current[kind]
  return { ...current, [kind]: { ...group, [selection.id]: { ...group[selection.id], ...validated } } }
}

/** Reset one element to the generated garden's own choices. */
export function withoutOverride(current: GardenOverrides, selection: GardenSelection): GardenOverrides {
  const kind = member(selection.kind, SELECTION_KINDS, "selection kind")
  if (kind === "ground" || kind === "ladybird") {
    const next = { ...current }
    delete next[kind]
    return next
  }
  const group = { ...current[kind] }
  delete group[selection.id]
  return { ...current, [kind]: group }
}

export function overrideFor<K extends SelectionKind>(current: GardenOverrides, kind: K, id: string): Partial<GardenOverrideFor<K>> {
  const value = kind === "ground" || kind === "ladybird" ? current[kind] : current[kind as "flower"][id]
  return (value ?? {}) as Partial<GardenOverrideFor<K>>
}

export function isOverridden(current: GardenOverrides, selection: GardenSelection) {
  return Object.keys(overrideFor(current, selection.kind, selection.id)).length > 0
}

const pick = <T,>(items: readonly T[], random: () => number) => items[Math.floor(random() * items.length)]

const pickStep = ({ min, max, step }: SteppedRange, random: () => number) =>
  Number((min + Math.floor(random() * ((max - min) / step + 1)) * step).toFixed(4))

/** "Surprise this one" — re-roll a single element without disturbing the rest of the cast. */
export function randomizedOverride(selection: GardenSelection, random: () => number, nonce: number): Record<string, unknown> {
  if (!Number.isSafeInteger(nonce) || nonce < 1) throw new RangeError("Surprise nonce must be a positive safe integer")
  switch (member(selection.kind, SELECTION_KINDS, "selection kind")) {
    case "flower":
      return {
        family: pick(PETAL_FAMILIES, random),
        petals: pickStep(FLOWER_STUDY.petals, random),
        petalLength: pickStep(FRACTION_RANGES.petalLength, random),
        centerHole: pickStep(FRACTION_RANGES.centerHole, random),
        color: pick(FLOWER_PALETTE, random),
      }
    case "monstera": {
      const markings = pick(MONSTERA_MARKINGS, random)
      return { age: pickStep(MONSTERA_AGE, random), markings,
        coverage: markings === "plain" ? 0 : pickStep(FRACTION_RANGES.coverage, random) }
    }
    case "leaf": {
      const pattern = pick(LEAF_MARKINGS, random)
      return { family: pick(LEAF_FAMILIES, random), pattern,
        coverage: pattern === "plain" ? 0 : pickStep(FRACTION_RANGES.coverage, random) }
    }
    case "bud":
      return { stage: pick(["tight", "full", "opening"] as const, random) }
    case "ground":
      return { seed: nonce, tufts: pickStep({ min: GROUND_STUDY.tufts[0], max: GROUND_STUDY.tufts[1], step: 1 }, random) }
    case "ladybird":
      return { variety: pick(LADYBIRD_VARIETIES, random).id, seed: nonce }
  }
}

export function overriddenCount(current: GardenOverrides) {
  return Object.keys(current.flower).length + Object.keys(current.monstera).length
    + Object.keys(current.leaf).length + Object.keys(current.bud).length
    + (current.ground ? 1 : 0) + (current.ladybird ? 1 : 0)
}
