import { flowerTraits, leafAnatomy } from "./bloom-geometry.ts"
import { sceneRandom, studySeed } from "./bloom-math.ts"
import { createLadybirdAppearance, LADYBIRD_VARIETIES } from "./bloom-ladybird-geometry.ts"
import { ladybirdLanding } from "./bloom-ladybird-study-state.ts"
import { BLOOM_COMPOSITION, BLOOM_SCENE, FLOWER_STUDY, GROUND_STUDY, LEAF_FAMILIES, VARIEGATION_PATTERNS, type LEAF_MARKINGS } from "./bloom-tokens.ts"
import type { GardenScene } from "./bloom-garden.ts"

export function gardenGroundExtent(garden: GardenScene) {
  const roots = [garden.king.curve[0], ...garden.flowers.map((plant) => plant.curve[0]),
    ...garden.monsteras.map((plant) => plant.root), garden.vine[0]]
  const halfWidth = Math.min(BLOOM_COMPOSITION.bed.maxWidth / 2,
    Math.max((GROUND_STUDY.right - GROUND_STUDY.left) / 2,
      ...roots.map((root) => Math.abs(root.x - BLOOM_SCENE.centerX) + GROUND_STUDY.taper)))
  return {
    left: BLOOM_SCENE.centerX - halfWidth,
    right: BLOOM_SCENE.centerX + halfWidth,
  }
}

export function gardenFlowerRecipe(seed: number, identity: string) {
  const random = sceneRandom(seed, `garden-flower-study:${identity}`)
  const { min, step } = FLOWER_STUDY.length
  // Shorter study petals fit the existing cast's head envelopes without moving its plants.
  const petalLength = (min + Math.floor(random() * ((100 - min) / step + 1)) * step) / 100
  return { ...flowerTraits(seed, identity), petalLength }
}

export function gardenLeafRecipe(seed: number, label: string, defaultVariegated = false) {
  const random = sceneRandom(seed, `garden-leaf-study:${label}`)
  const family = LEAF_FAMILIES[Math.floor(random() * LEAF_FAMILIES.length)]
  const variegated = random() < 0.45 || defaultVariegated
  const pattern: typeof LEAF_MARKINGS[number] = variegated ? VARIEGATION_PATTERNS[Math.floor(random() * VARIEGATION_PATTERNS.length)] : "plain"
  return { family, pattern, coverage: variegated ? 0.15 + Math.floor(random() * 12) * 0.05 : 0,
    markingSeed: studySeed(seed % 4294967296 + 1, `garden-leaf-markings:${label}`) }
}

export function gardenLadybird(seed: number, label: string, family?: typeof LEAF_FAMILIES[number], override?: { variety?: string; seed?: number }) {
  const anatomy = leafAnatomy(seed, label, family)
  const chosen = override?.variety === undefined ? undefined
    : LADYBIRD_VARIETIES.find((variety) => variety.id === override.variety)
  if (override?.variety !== undefined && !chosen) throw new RangeError(`Unknown ladybird variety: ${override.variety}`)
  const appearanceSeed = override?.seed ?? studySeed(seed % 4294967296 + 1, `garden-ladybird:${label}`)
  const appearance = createLadybirdAppearance(appearanceSeed, chosen)
  const random = sceneRandom(override?.seed ?? seed, `garden-ladybird-landing:${label}`)
  return { ...ladybirdLanding(anatomy, appearance, random), angle: random() * 360 }
}
