import { BLOOM_PRESETS, DEFAULT_BLOOM, randomBloomIndex, type BloomShape } from "../../lib/bloom.ts"
import { generateGarden, sceneRandom, type FlowerPlant, type GardenScene } from "./bloom-garden.ts"
import { BLOOM_DEFAULTS, BLOOM_PIGMENTS, BLOOM_SCENE, BLOOM_SWATCHES, BLOOM_VARIATION, type SteppedRange } from "./bloom-tokens.ts"

export type CompanionBloom = {
  id: string
  shape: BloomShape
  fill: string
  size: number
  centerHole: number
  centerLightness: number
  foliageLightness: number
}

export type CompanionBlooms = CompanionBloom[]

export type BloomState = {
  shape: BloomShape
  centerHole: number
  colorIndex: number
  flowerScale: number
  breeze: number
  companions: CompanionBlooms
  centerLightness: number
  foliageLightness: number
  backgroundShades: number[]
  sceneSeed: number
  garden: GardenScene
}

export function initialBloomState(): BloomState {
  const garden = generateGarden(BLOOM_DEFAULTS.sceneSeed, BLOOM_SCENE.flowerSize)
  return {
    shape: DEFAULT_BLOOM,
    centerHole: BLOOM_DEFAULTS.centerHole,
    colorIndex: BLOOM_DEFAULTS.colorIndex,
    flowerScale: BLOOM_DEFAULTS.flowerScale,
    breeze: BLOOM_DEFAULTS.breeze,
    companions: garden.flowers.map((plant, i) => ({
      id: plant.id, shape: BLOOM_PRESETS[i], fill: BLOOM_PIGMENTS.companions[i + 1],
      size: plant.diameter, centerHole: BLOOM_DEFAULTS.companionCenterHole,
      centerLightness: BLOOM_DEFAULTS.lightness, foliageLightness: BLOOM_DEFAULTS.lightness,
    })),
    centerLightness: BLOOM_DEFAULTS.lightness,
    foliageLightness: BLOOM_DEFAULTS.lightness,
    backgroundShades: Array.from({ length: BLOOM_DEFAULTS.backgroundShadeCount }, () => BLOOM_DEFAULTS.lightness),
    sceneSeed: BLOOM_DEFAULTS.sceneSeed,
    garden,
  }
}

function randomVariation(current: number, { min, max, step }: SteppedRange, random: () => number) {
  const ticks = Math.round((max - min) / step) + 1
  const currentTick = Math.round((current - min) / step)
  const exclude = currentTick >= 0 && currentTick < ticks && Math.abs(current - (min + currentTick * step)) < 0.0001
  let nextTick = Math.floor(random() * (ticks - (exclude ? 1 : 0)))
  if (exclude && nextTick >= currentTick) nextTick++
  return Number((min + nextTick * step).toFixed(4))
}

const sameShape = (a: BloomShape, b: BloomShape) =>
  a.petals === b.petals && a.bulge === b.bulge && a.round === b.round

function randomCompanion(current: CompanionBloom | undefined, plant: FlowerPlant, fill: string, random: () => number): CompanionBloom {
  const currentShapeIndex = current ? BLOOM_PRESETS.findIndex((preset) => sameShape(preset, current.shape)) : -1
  return {
    shape: {
      ...BLOOM_PRESETS[randomBloomIndex(currentShapeIndex, random)],
      petals: randomVariation(current?.shape.petals ?? DEFAULT_BLOOM.petals, BLOOM_VARIATION.petals, random),
    },
    id: plant.id, fill,
    size: plant.diameter,
    centerHole: randomVariation(current?.centerHole ?? BLOOM_DEFAULTS.companionCenterHole, BLOOM_VARIATION.centerHole, random),
    centerLightness: randomVariation(current?.centerLightness ?? BLOOM_DEFAULTS.lightness, BLOOM_VARIATION.centerLightness, random),
    foliageLightness: randomVariation(current?.foliageLightness ?? BLOOM_DEFAULTS.lightness, BLOOM_VARIATION.foliageLightness, random),
  }
}

function remixCompanions(garden: GardenScene, current: CompanionBlooms, kingFill: string, random: () => number): CompanionBlooms {
  const colors = BLOOM_PIGMENTS.companions.filter((fill) => fill !== kingFill)
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[colors[i], colors[j]] = [colors[j], colors[i]]
  }
  // Backtrack over at most five colours: a greedy last choice can strand a six-flower cast.
  const assign = (index: number, remaining: string[]): string[] | null => {
    if (index === garden.flowers.length) return []
    const previous = current.find((bloom) => bloom.id === garden.flowers[index].id)
    for (const fill of remaining) {
      if (fill === previous?.fill) continue
      const tail = assign(index + 1, remaining.filter((color) => color !== fill))
      if (tail) return [fill, ...tail]
    }
    return null
  }
  const assigned = assign(0, colors)
  if (!assigned) throw new Error("Unable to assign a unique garden palette")
  return garden.flowers.map((plant, i) => randomCompanion(current.find((bloom) => bloom.id === plant.id), plant, assigned[i], random))
}

/** Advance atomically, preserving the approved palette stream's draw order. */
export function growBloom(current: BloomState): BloomState {
  const sceneSeed = current.sceneSeed + 1
  const random = sceneRandom(sceneSeed, "flower-palette")
  const flowerScale = randomVariation(current.flowerScale, BLOOM_VARIATION.kingScale, random)
  const garden = generateGarden(sceneSeed, flowerScale * BLOOM_SCENE.flowerSize)
  const currentIndex = BLOOM_PRESETS.findIndex((preset) => sameShape(preset, current.shape))
  const shape = {
    ...BLOOM_PRESETS[randomBloomIndex(currentIndex, random)],
    petals: randomVariation(current.shape.petals, BLOOM_VARIATION.petals, random),
  }
  const breeze = randomVariation(current.breeze, BLOOM_VARIATION.breeze, random)
  const centerHole = randomVariation(current.centerHole, BLOOM_VARIATION.centerHole, random)
  const colorStep = 1 + Math.floor(random() * (BLOOM_SWATCHES.length - 1))
  const colorIndex = (current.colorIndex + colorStep) % BLOOM_SWATCHES.length
  const companions = remixCompanions(garden, current.companions, BLOOM_SWATCHES[colorIndex].color, random)
  const centerLightness = randomVariation(current.centerLightness, BLOOM_VARIATION.centerLightness, random)
  const foliageLightness = randomVariation(current.foliageLightness, BLOOM_VARIATION.foliageLightness, random)
  const backgroundShades = current.backgroundShades.map((shade) => randomVariation(shade, BLOOM_VARIATION.foliageLightness, random))
  return { shape, centerHole, colorIndex, flowerScale, breeze, companions, centerLightness, foliageLightness, backgroundShades, sceneSeed, garden }
}
