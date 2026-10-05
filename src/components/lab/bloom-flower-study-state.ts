import { sceneRandom } from "./bloom-garden.ts"
import { flowerTraits } from "./bloom-geometry.ts"
import { BLOOM_SWATCHES, FLOWER_STUDY, type SteppedRange } from "./bloom-tokens.ts"
import { studySeed } from "./bloom-study-state.ts"

export type FlowerSpecimen = ReturnType<typeof createFlowerSpecimen>

export function createFlowerSpecimen(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 1) {
    throw new RangeError("Flower specimen seed must be a positive safe integer")
  }
  const anatomySeed = studySeed(seed, "flower-study")
  const random = sceneRandom(anatomySeed, "flower-study")
  const pick = ({ min, max, step }: SteppedRange) =>
    min + Math.floor(random() * ((max - min) / step + 1)) * step
  return {
    seed, anatomySeed,
    family: flowerTraits(anatomySeed, "study").family,
    petalCount: pick(FLOWER_STUDY.petals),
    petalLength: pick(FLOWER_STUDY.length),
    centerSize: pick(FLOWER_STUDY.center),
    colorIndex: (seed - 1) % BLOOM_SWATCHES.length,
  }
}
