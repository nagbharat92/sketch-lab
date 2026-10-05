import { generateGarden, sceneRandom } from "./bloom-garden.ts"
import { decorationVariation, leafAnatomy } from "./bloom-geometry.ts"
import { LEAF_FAMILIES, LEAF_MARKINGS, MONSTERA_AGE, MONSTERA_MARKINGS, MONSTERA_STUDY_COLOR } from "./bloom-tokens.ts"
import { studySeed } from "./bloom-math.ts"
import { createStudyMonsteraPose, monsteraStudyViewBox } from "./bloom-monstera-pose.ts"
import { organicMonsteraBlade } from "./bloom-monstera-study-geometry.ts"
export { studySeed } from "./bloom-math.ts"
export { sprigGeometry } from "./bloom-bud-study-geometry.ts"

type MonsteraSpecimen = {
  seed: number; anatomySeed: number; plant: ReturnType<typeof generateGarden>["monsteras"][number]
  pose: ReturnType<typeof createStudyMonsteraPose>; viewBox: ReturnType<typeof monsteraStudyViewBox>
  age: number; markings: typeof MONSTERA_MARKINGS[number]; coverage?: number
}

export function createMonsteraSpecimen(seed: number): MonsteraSpecimen {
  const anatomySeed = studySeed(seed, "monstera-study")
  const garden = generateGarden(anatomySeed)
  const plant = garden.monsteras.find((candidate) => candidate.role === "king")
  if (!plant) throw new Error("Missing king monstera for study")
  const variation = decorationVariation(anatomySeed, plant.id)
  const random = sceneRandom(anatomySeed, "monstera-choices")
  const anatomy = organicMonsteraBlade(anatomySeed)
  const pose = createStudyMonsteraPose(anatomySeed, anatomy.height)
  return {
    seed, anatomySeed, plant,
    pose, viewBox: monsteraStudyViewBox(anatomy.boundary, pose),
    age: MONSTERA_AGE.min + Math.floor(random() * (MONSTERA_AGE.max - MONSTERA_AGE.min + 1)),
    markings: variation.variegated ? variation.pattern : "plain" as const,
  }
}

export function growMonsteraSpecimen(current: ReturnType<typeof createMonsteraSpecimen>) {
  const next = createMonsteraSpecimen(current.seed + 1)
  const random = sceneRandom(next.anatomySeed, "monstera-growth-choices")
  const ages = Array.from({ length: MONSTERA_AGE.max - MONSTERA_AGE.min + 1 }, (_, i) => MONSTERA_AGE.min + i)
    .filter((age) => age !== current.age)
  const markings = MONSTERA_MARKINGS.filter((pattern) => pattern !== current.markings)
  return {
    ...next,
    age: ages[Math.floor(random() * ages.length)],
    markings: markings[Math.floor(random() * markings.length)],
  }
}

export function monsteraStudyPalette(age: number, lightnessAdjustment = 0) {
  if (!Number.isInteger(age) || age < MONSTERA_AGE.min || age > MONSTERA_AGE.max) {
    throw new RangeError(`Monstera age must be between ${MONSTERA_AGE.min} and ${MONSTERA_AGE.max}`)
  }
  if (!Number.isFinite(lightnessAdjustment)) throw new RangeError("Monstera lightness must be finite")
  const t = (age - MONSTERA_AGE.min) / (MONSTERA_AGE.max - MONSTERA_AGE.min)
  const rules = MONSTERA_STUDY_COLOR
  const interpolate = ([start, end]: readonly [number, number]) => start + (end - start) * t
  const saturation = interpolate(rules.saturation), lightness = interpolate(rules.lightness)
  const color = (s: number, l: number) => `hsl(${rules.hue} ${s}% ${Math.max(0, Math.min(100, l + lightnessAdjustment))}%)`
  return {
    light: color(saturation + rules.highlight.saturation, lightness + rules.highlight.lightness),
    middle: color(saturation, lightness),
    dark: color(Math.min(50, saturation + rules.deep.saturation), lightness + rules.deep.lightness),
    shadow: color(rules.shadow.saturation, interpolate(rules.shadow.lightness)),
    button: color(saturation, Math.min(36, lightness + rules.deep.lightness)),
  }
}

export function remixMonsteraSpecimen(current: ReturnType<typeof createMonsteraSpecimen>, changes: {
  age?: number; markings?: typeof current.markings; coverage?: number
}) {
  const age = changes.age ?? current.age
  if (!Number.isInteger(age) || age < MONSTERA_AGE.min || age > MONSTERA_AGE.max) {
    throw new RangeError(`Monstera age must be between ${MONSTERA_AGE.min} and ${MONSTERA_AGE.max}`)
  }
  const coverage = changes.coverage ?? current.coverage
  if (coverage !== undefined && (!Number.isFinite(coverage) || coverage < 0 || coverage > 100)) {
    throw new RangeError("Monstera coverage must be between 0 and 100")
  }
  return {
    ...(changes.markings === undefined ? current : createMonsteraSpecimen(current.seed + 1)),
    age,
    markings: changes.markings ?? current.markings,
    ...(coverage === undefined ? {} : { coverage }),
  }
}

export function monsteraSpecimenPlant(specimen: ReturnType<typeof createMonsteraSpecimen>) {
  if (!Number.isInteger(specimen.age) || specimen.age < MONSTERA_AGE.min || specimen.age > MONSTERA_AGE.max) {
    throw new RangeError(`Monstera age must be between ${MONSTERA_AGE.min} and ${MONSTERA_AGE.max}`)
  }
  return {
    ...specimen.plant,
    maturity: 0.15 + specimen.age / MONSTERA_AGE.max * 0.85,
    splitCount: specimen.age,
    holes: specimen.plant.holes.slice(0, specimen.age * 2),
  }
}

export type LeafSpecimen = {
  seed: number; anatomySeed: number; family: typeof LEAF_FAMILIES[number]
  width: number; coverage: number; pattern: typeof LEAF_MARKINGS[number]
  markingSeed: number; markingRevision: number
}

export function createLeafSpecimen(seed: number): LeafSpecimen {
  const anatomySeed = studySeed(seed, "leaf-study")
  const random = sceneRandom(anatomySeed, "leaf-controls")
  const anatomy = leafAnatomy(anatomySeed, "leaf:0:0:0")
  const family = LEAF_FAMILIES.find((candidate) => candidate === anatomy.kind)
  if (!family) throw new Error("Unknown study leaf family")
  return {
    seed, anatomySeed, family,
    width: 85 + Math.floor(random() * 8) * 5,
    coverage: Math.floor(random() * 11) * 10,
    pattern: decorationVariation(anatomySeed, "leaf:0:0:0").pattern,
    markingSeed: anatomySeed, markingRevision: 0,
  }
}

export function remixLeafMarkings(current: LeafSpecimen, pattern: typeof LEAF_MARKINGS[number]) {
  const markingRevision = current.markingRevision + 1
  return { ...current, pattern, markingRevision,
    markingSeed: studySeed(markingRevision, `leaf-markings:${current.anatomySeed}`) }
}
