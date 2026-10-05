import { sceneRandom, studySeed, type Point } from "./bloom-math.ts"
import { BLOOM_PIGMENTS, BLOOM_SWATCHES } from "./bloom-tokens.ts"

const colors = BLOOM_PIGMENTS.ladybird
const reference = (species: string) => `https://en.wikipedia.org/wiki/${species}`

export const LADYBIRD_VARIETIES = [
  { id: "seven-spot", name: "Seven-spot", species: "Coccinella septempunctata",
    reference: reference("Coccinella_septempunctata"), note: "Scarlet with black spots.",
    shell: colors.middle, marking: colors.black, collar: colors.black, size: 1.04, ratio: 0.79 },
  { id: "two-spot", name: "Two-spot", species: "Adalia bipunctata",
    reference: reference("Adalia_bipunctata"), note: "Red with one black spot a side.",
    shell: colors.middle, marking: colors.black, collar: colors.black, size: 0.92, ratio: 0.8 },
  { id: "two-spot-melanic", name: "Two-spot, black form", species: "Adalia bipunctata",
    reference: reference("Adalia_bipunctata"), note: "The same species, black with red spots.",
    shell: colors.black, marking: colors.middle, collar: colors.black, size: 0.92, ratio: 0.8 },
  { id: "fourteen-spot", name: "Fourteen-spot", species: "Propylea quatuordecimpunctata",
    reference: reference("Propylea_quatuordecimpunctata"), note: "Pale lemon with bold black blocks.",
    shell: colors.lemon, marking: colors.black, collar: colors.cream, size: 0.82, ratio: 0.86 },
  { id: "twenty-two-spot", name: "Twenty-two-spot", species: "Psyllobora vigintiduopunctata",
    reference: reference("Psyllobora_vigintiduopunctata"), note: "Bright yellow with little black dots.",
    shell: BLOOM_SWATCHES[0].color, marking: colors.black, collar: colors.cream, size: 0.8, ratio: 0.78 },
  { id: "orange", name: "Orange", species: "Halyzia sedecimguttata",
    reference: reference("Halyzia_sedecimguttata"), note: "Warm orange with cream spots.",
    shell: BLOOM_SWATCHES[4].color, marking: colors.cream, collar: colors.cream, size: 0.97, ratio: 0.8 },
  { id: "pine", name: "Pine", species: "Exochomus quadripustulatus",
    reference: reference("Exochomus_quadripustulatus"), note: "Glossy black with red spots.",
    shell: colors.black, marking: colors.middle, collar: colors.black, size: 0.88, ratio: 0.98 },
] as const

export type LadybirdVariety = typeof LADYBIRD_VARIETIES[number]
export type LadybirdMark = Point & { rx: number; ry: number; rotation: number }

// At garden scale colour carries identity, so every form keeps at most two bold mirrored pairs.
const pairedMarks: Record<LadybirdVariety["id"], readonly (readonly [number, number, number, number])[]> = {
  "seven-spot": [[0.45, -0.3, 0.2, 0.19], [0.45, 0.45, 0.2, 0.19]],
  "two-spot": [[0.43, 0.1, 0.27, 0.26]],
  "two-spot-melanic": [[0.43, -0.4, 0.26, 0.25], [0.43, 0.45, 0.22, 0.22]],
  "fourteen-spot": [[0.42, -0.35, 0.3, 0.25], [0.42, 0.42, 0.3, 0.25]],
  "twenty-two-spot": [[0.42, -0.35, 0.16, 0.15], [0.42, 0.42, 0.16, 0.15]],
  "orange": [[0.42, -0.35, 0.21, 0.19], [0.42, 0.42, 0.21, 0.19]],
  "pine": [[0.45, -0.25, 0.23, 0.23], [0.4, 0.5, 0.17, 0.17]],
}

export function createLadybirdAppearance(seed: number, variety?: LadybirdVariety) {
  const anatomySeed = studySeed(seed, "ladybird-appearance")
  const random = sceneRandom(anatomySeed, "ladybird-body")
  const chosen = variety ?? LADYBIRD_VARIETIES[Math.floor(random() * LADYBIRD_VARIETIES.length)]
  const ry = 9.7 + random() * 0.5
  const rx = ry * (chosen.ratio + (random() - 0.5) * 0.045)
  const marks: LadybirdMark[] = []
  for (const [x, y, width, height] of pairedMarks[chosen.id]) {
    const offsetX = (random() - 0.5) * 0.035
    const offsetY = (random() - 0.5) * 0.04
    const size = 0.9 + random() * 0.18
    const rotation = (random() - 0.5) * 16
    for (const side of [-1, 1]) marks.push({
      x: side * (x + offsetX) * rx, y: 2 + (y + offsetY) * ry,
      rx: width * rx * size, ry: height * ry * size, rotation: rotation * side,
    })
  }
  return { variety: chosen, rx, ry, marks, lightness: (random() - 0.5) * 6, radius: 18 }
}

export type LadybirdAppearance = ReturnType<typeof createLadybirdAppearance>
