import type { MonsteraPlant } from "./bloom-garden.ts"
import { decorationVariation } from "./bloom-geometry.ts"
import { organicMonstera, organicMonsteraMarkingGeometry } from "./bloom-monstera-study-geometry.ts"
import { MONSTERA_MARKINGS } from "./bloom-tokens.ts"

const anatomyCache = new Map<string, ReturnType<typeof prepareAnatomy>>()
const artworkCache = new Map<string, MonsteraArtwork>()

function boundedSet<K, V>(cache: Map<K, V>, key: K, value: V, limit: number) {
  if (cache.size >= limit) {
    const oldest = cache.keys().next()
    if (!oldest.done) cache.delete(oldest.value)
  }
  cache.set(key, value)
}

function prepareAnatomy(seed: number, age: number) {
  const anatomy = organicMonstera(seed, age)
  return {
    edge: anatomy.edge, outline: anatomy.outline, height: anatomy.height,
    offsetY: anatomy.offsetY, attachment: anatomy.attachment, tip: anatomy.tip,
    veins: anatomy.veins.map(({ d, depth, finger }) => ({ d, depth, finger })),
    cuts: anatomy.cuts.map(({ id, d }) => ({ id, d })),
    holes: anatomy.holes.map(({ id, d, rotation, center, width, length }) =>
      ({ id, d, rotation, center, width, length })),
  }
}

export type MonsteraArtwork = {
  seed: number
  age: number
  markings: typeof MONSTERA_MARKINGS[number]
  anatomy: ReturnType<typeof prepareAnatomy>
  materials: { paths: string[]; pinkPaths: string[]; pinkCoverage: number }
}

export function createMonsteraArtwork(seed: number, age: number, markings: typeof MONSTERA_MARKINGS[number], coverage?: number): MonsteraArtwork {
  const key = `${seed}:${age}:${markings}:${coverage ?? "seeded"}`
  const cached = artworkCache.get(key)
  if (cached) return cached
  const anatomyKey = `${seed}:${age}`
  let anatomy = anatomyCache.get(anatomyKey)
  if (!anatomy) {
    anatomy = prepareAnatomy(seed, age)
    boundedSet(anatomyCache, anatomyKey, anatomy, 16)
  }
  const masks = organicMonsteraMarkingGeometry(seed, markings, age, coverage)
  const artwork = { seed, age, markings, anatomy,
    materials: { paths: masks.paths, pinkPaths: masks.pink.paths, pinkCoverage: masks.pink.coverage } }
  boundedSet(artworkCache, key, artwork, 32)
  return artwork
}

export type MonsteraRecipePlant = Pick<MonsteraPlant, "id" | "role" | "maturity" | "splitCount" | "anatomySeed">

export function gardenMonsteraRecipe(sceneSeed: number, plant: MonsteraRecipePlant) {
  const seed = plant.anatomySeed
  const variation = decorationVariation(sceneSeed, plant.id, plant.role === "general")
  const age = plant.splitCount ?? Math.max(0, Math.min(5, Math.round((plant.maturity - 0.15) / 0.85 * 5)))
  const markings: MonsteraArtwork["markings"] = variation.variegated ? variation.pattern : "plain"
  return { seed, age, markings }
}

export type GardenMonsteraArtwork = { id: string; artwork: MonsteraArtwork }
export type MonsteraWorkerInput =
  | { kind: "garden"; seed: number; plants: MonsteraRecipePlant[] }
  | { kind: "study"; seed: number; age: number; markings: MonsteraArtwork["markings"]; coverage?: number; previewSeed?: number }
export type MonsteraWorkerRequest = MonsteraWorkerInput & { id: number }
export type MonsteraWorkerResponse =
  | { id: number; artworks: GardenMonsteraArtwork[] }
  | { id: number; artwork: MonsteraArtwork; previews?: MonsteraArtwork[] }
  | { id: number; error: string }

export function prepareGardenMonsteras(seed: number, plants: MonsteraRecipePlant[]): GardenMonsteraArtwork[] {
  return plants.map((plant) => {
    const recipe = gardenMonsteraRecipe(seed, plant)
    return { id: plant.id, artwork: createMonsteraArtwork(recipe.seed, recipe.age, recipe.markings) }
  })
}
