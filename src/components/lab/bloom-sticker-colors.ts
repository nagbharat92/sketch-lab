import { sceneRandom } from "./bloom-math.ts"
import { BLOOM_PIGMENTS } from "./bloom-tokens.ts"
import type { GardenSelection } from "./bloom-selection.ts"

export const STICKER_PALETTES = [
  { butter: "#F8DF83", lilac: "#CDB8F2", peach: "#FFC3A3", sky: "#AADAF5" },
  { butter: "#F9E596", lilac: "#DFC0EE", peach: "#FFBDB2", sky: "#A9DFEC" },
  { butter: "#F3E69A", lilac: "#C7C2F5", peach: "#FFCAA8", sky: "#B7D5FA" },
] as const

export const STICKER_CURSOR_INK = "#2E3428"
export type StickerFamily = keyof typeof STICKER_PALETTES[number]

function rgb(hex: string) {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new RangeError(`Invalid sticker pigment: ${hex}`)
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

export function stickerContrast(a: string, b: string) {
  const first = luminance(a), second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export function gardenStickerPalette(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Sticker seed must be a non-negative safe integer")
  const random = sceneRandom(seed, "garden-sticker-palette")
  return STICKER_PALETTES[Math.floor(random() * STICKER_PALETTES.length)]
}

const DEFAULT_PIGMENTS = {
  flower: BLOOM_PIGMENTS.companions[0], bud: BLOOM_PIGMENTS.bud.middle,
  leaf: BLOOM_PIGMENTS.leaf.middle, monstera: BLOOM_PIGMENTS.monstera.middle,
  ground: BLOOM_PIGMENTS.ground.soil, ladybird: BLOOM_PIGMENTS.ladybird.middle,
}

export function gardenStickerPaint(seed: number, selection: GardenSelection, pigment: string = DEFAULT_PIGMENTS[selection.kind]) {
  const palette = gardenStickerPalette(seed)
  const [r, g, b] = rgb(pigment)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
  const hue = delta === 0 ? 0 : ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360
  // Warm flowers get cool paper; foliage gets warm paper. Identity breaks ties,
  // but only a new garden or a changed artwork pigment can change the pairing.
  const partners: readonly StickerFamily[] = delta < 0.08 ? ["butter", "lilac", "peach", "sky"]
    : hue >= 35 && hue < 85 ? ["lilac", "sky"]
    : hue >= 85 && hue < 175 ? ["butter", "peach", "lilac"]
    : hue >= 175 && hue < 330 ? ["butter", "peach"]
    : ["sky", "butter"]
  const random = sceneRandom(seed, `sticker-pairing:${selection.kind}:${selection.id}`)
  const ranked = partners.map((family) => ({
    family, color: palette[family],
    score: stickerContrast(palette[family], pigment) + random() * 0.65,
  })).sort((a, b) => b.score - a.score)
  return { family: ranked[0].family, color: ranked[0].color }
}
