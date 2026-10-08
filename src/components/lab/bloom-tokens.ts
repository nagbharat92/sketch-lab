import type { CSSProperties } from "react"

// Bloom-local presentation and composition tokens. Global theme/ink defaults stay shared;
// botanical path control points live in bloom-geometry.ts, not in this design vocabulary.
export type GardenRole = "king" | "general" | "soldier" | "commoner"
export type Range = readonly [number, number]
export type SteppedRange = Readonly<{ min: number; max: number; step: number }>
type RoleRules = Readonly<Record<"bloom" | "height" | "stem" | "leaf" | "fullness" | "maturity" | "attachmentHeight", Range>>
type Swatch = Readonly<{ name: string; color: string; ink: string }>

export const BLOOM_SWATCHES: readonly Swatch[] = [
  { name: "Yellow", color: "#F3CE46", ink: "#241F1A" },
  { name: "Tomato", color: "#E56245", ink: "#241F1A" },
  { name: "Cobalt", color: "#365CCD", ink: "#FFF8E8" },
  { name: "Rose", color: "#D86992", ink: "#241F1A" },
  { name: "Orange", color: "#ED9646", ink: "#241F1A" },
]

export const BLOOM_PIGMENTS = {
  ink: "#3C3429",
  companions: [...BLOOM_SWATCHES.map((swatch) => swatch.color), "#9784BB"],
  buds: ["#E56245", "#D86992", "#9784BB", "#ED9646", "#7487C0", "#D8AC59"],
  light: { warm: "#FFF0BD", cool: "#E7F1EF" },
  leaf: {
    light: "#9AAE6E", middle: "#6D914F", dark: "#416445",
    paleLight: "#B1BC7B", paleMiddle: "#8CA564", fold: "#254D3F",
    variegationWarm: "#EEE6C5", variegationCool: "#E4EBDD",
    spine: "#DBD8A0", veins: "#294D35", veinOpacity: [1, 0.9, 0.42],
    dew: "#E5F3EE", dewOutline: "#A4C5BD",
  },
  bud: {
    light: "#EEAA7C", middle: "#D97558", dark: "#A64F44",
    blueLight: "#A5B5DA", blueMiddle: "#788EB8", blueDark: "#475C86",
    pollen: "#E0BD70", calyx: "#53744A", calyxOutline: "#374E36", calyxVein: "#B6BF83",
  },
  stem: { light: "#416347", middle: "#A7B877", dark: "#3F6549", outline: "#3E5939" },
  monstera: {
    ink: "#435E61", light: "#B7CCBF", middle: "#8CAEA6", dark: "#608E91",
    creamLight: "#F2F0D8", creamDark: "#DAE4CC", fold: "#43656B",
    veins: "#DDE8D5", veinOpacity: [0.85, 0.62, 0.3],
  },
  ladybird: {
    light: "#F69871", middle: "#D95540", dark: "#9C3D31", underside: "#203D30",
    black: "#292923", cream: "#FFF0CE", amber: "#9E753B", lemon: "#EEDD86",
  },
  ground: {
    soil: "#CAB58A", grasses: ["#718756", "#A5AF72", "#698652"],
    grassOutline: "#465F40", grassVein: "#D0D6A0", pod: "#AC956C", podOutline: "#6D6148",
    stoneLight: "#E3D7B7", stoneMiddle: "#C3B294", stoneDark: "#9E9077",
    stoneUnderside: "#5C523E", stoneOutline: "#706550", stoneHighlight: "#F5EAD2",
    petalUnderside: "#5B4933", petalHighlight: "#FFF1D0", grain: "#887D60",
  },
  flower: {
    shade: "#4B3025", fold: "#543A2A", centerLight: "#F3D18A",
    centerMiddle: "#D7A04C", centerDark: "#A57333", centerUnderside: "#463525", pollenHighlight: "#FFF0BA",
  },
} as const

export const GARDEN_ROLES = {
  king: { bloom: [290, 340], height: [330, 370], stem: [5, 6], leaf: [245, 270], fullness: [0.94, 1.06], maturity: [0.8, 1], attachmentHeight: [82, 102] },
  general: { bloom: [190, 220], height: [245, 285], stem: [3.8, 4.7], leaf: [190, 215], fullness: [0.88, 1.02], maturity: [0.62, 0.85], attachmentHeight: [53, 70] },
  soldier: { bloom: [150, 180], height: [180, 220], stem: [3, 3.7], leaf: [145, 165], fullness: [0.88, 1.04], maturity: [0.35, 0.62], attachmentHeight: [32, 45] },
  commoner: { bloom: [115, 140], height: [85, 150], stem: [2.2, 2.8], leaf: [125, 140], fullness: [0.98, 1.1], maturity: [0.12, 0.27], attachmentHeight: [18, 28] },
} as const satisfies Record<GardenRole, RoleRules>

export const BLOOM_SCENE = {
  width: 540, height: 620, baseline: 566, centerX: 270, rootX: 285,
  flowerSize: 340, flowerCenter: 170, pollenCenterY: 167, centerRadius: 120,
  leafWidth: 48, leafLength: 104, monsteraLength: 132, monsteraAttachmentHeight: 116,
  mask: { x: -80, y: -150, width: 160, height: 155 },
} as const

export const BLOOM_COMPOSITION = {
  flowers: [4, 6], monsteras: [4, 5], kingDiameters: [306, 323, 340],
  bed: { maxWidth: 360, rootInset: 32 },
  headSearch: { attempts: 91, randomAttempts: 64, clearance: 16, kingRadius: 0.43, companionRadius: 0.36, insetRadius: 0.1 },
  headZones: { king: [265, 305], generalLeft: [95, 175], generalRight: [365, 455], soldierLeft: [110, 275], soldierRight: [285, 430], commoner: [100, 440] },
  leafBudget: { king: 4, general: 2, other: 1, total: 11 },
  leafSearch: { scales: [1, 0.9, 0.8, 0.65], turns: [0, 12, -12, 24, -24], samples: 12, headPadding: 8,
    uprightAngle: [24, 36], maxAngle: 44 },
  buds: { king: [0.5, 0.7], general: [0.35, 0.5], kingSpread: 0.2, generalSpread: 0.15, nodeStart: 0.6, nodeStep: 0.13 },
  monstera: { juvenileMaturity: 0.28, maxHoles: 8, angle: 48, left: 18, right: 522 },
  monsteraGrouping: {
    sideOffset: 120, rootOffset: 54, rootStep: 14,
    centers: { king: [354, 28], general: [412, 32], soldier: [480, 24], commoner: [516, 10] },
    offsets: [-64, 0, 64], turns: [-8, 0, 8], lean: [22, 30],
    coreRadius: 0.19, corePadding: 10,
    scale: { king: 0.78, general: 0.84, soldier: 0.82, commoner: 0.72 },
    beamWidth: 8, minVisible: 0.3, maxPairOverlap: 0.4,
  },
  ground: { rocks: [4, 8], clumps: [3, 5], blades: [2, 4], marks: [3, 5], grains: [4, 7], sprigs: [3, 7] },
} as const

export const BLOOM_VARIATION = {
  petals: { min: 3, max: 10, step: 1 },
  breeze: { min: 0, max: 3, step: 0.1 },
  centerHole: { min: 0.2, max: 0.4, step: 0.01 },
  centerLightness: { min: -14, max: 12, step: 2 },
  foliageLightness: { min: -10, max: 10, step: 2 },
  kingScale: { min: 0.9, max: 1, step: 0.05 },
} as const satisfies Record<string, SteppedRange>

export const BLOOM_DEFAULTS = {
  centerHole: 0.3, companionCenterHole: 0.26, colorIndex: 0, flowerScale: 1,
  // Keep all eight shade draws even in shorter casts: their order is part of seed identity.
  breeze: 1, lightness: 0, sceneSeed: 0, backgroundShadeCount: 8,
} as const

export const VARIEGATION_PATTERNS = ["marbled", "tips", "streaks", "patches"] as const
export const MONSTERA_AGE = { min: 0, max: 5, step: 1 } as const
export const MONSTERA_MARKINGS = ["plain", ...VARIEGATION_PATTERNS] as const
export const LEAF_MARKINGS = ["plain", ...VARIEGATION_PATTERNS] as const
export const PETAL_FAMILIES = ["rounded", "pointed", "curled", "ruffled"] as const
export const POLLEN_TEXTURES = ["spiral", "rings", "speckled"] as const
export const LEAF_FAMILIES = ["broad", "lance", "heart", "oval"] as const

export const BLOOM_STUDY_MOTION = {
  displacement: 0.65,
  settleDuration: "460ms",
  swayDuration: "8s",
} as const

export const MONSTERA_STUDY_SHADOW = {
  x: 5.5, y: 6.5, opacity: 0.16, darkOpacity: 0.25,
  blur: 1.3,
} as const

export const MONSTERA_STUDY_STALK = {
  viewBox: { x: -105, y: -115, width: 210, height: 240 },
  angle: [158, 202], anchorX: [-10, 10], anchorY: [-66, -54],
  rootY: [94, 110], rootSpread: [18, 48],
  width: [3.4, 4.8], tipWidth: [1.8, 2.4],
  inkWidth: 0.55, roughness: 0.35, bowing: 0.35,
} as const

export const MONSTERA_STUDY_FRAME = {
  padding: 20, aspectRatio: 0.9,
} as const

export const MONSTERA_GARDEN_POSE = {
  lean: [14, 36], verticalInset: 12,
} as const

export const MONSTERA_STUDY_VARIEGATION_OUTLINE = {
  width: 0.45, opacity: 0.65,
  roughness: 0.45, bowing: 0.35, seedStep: 17,
} as const

export const MONSTERA_STUDY_VARIEGATION_COLOR = {
  ivory: "#F5F1E6", pink: "#E08FA4",
  ivoryOutline: "#A4AF8B", pinkOutline: "#AD657D",
  frequency: [1.8, 3], minIslandArea: 5,
  endpointChance: 0.12,
} as const

export const MONSTERA_STUDY_VARIEGATION_AGE = {
  ivoryGrowth: 0.08, pinkDevelopment: 0.04,
} as const

export const MONSTERA_STUDY_COLOR = {
  hue: 140,
  saturation: [18, 28],
  lightness: [64, 34],
  highlight: { saturation: -8, lightness: 14 },
  deep: { saturation: 4, lightness: -12 },
  shadow: { saturation: 22, lightness: [17, 12] },
} as const

export const FLOWER_STUDY = {
  petals: { min: 3, max: 12, step: 1 },
  length: { min: 70, max: 115, step: 5 },
  center: { min: 15, max: 45, step: 1 },
  viewBox: "-15 -15 370 370",
} as const

export const LEAF_STUDY = {
  viewBox: "-65 -115 130 130",
  width: { min: 85, max: 120, step: 5 },
  coverage: { min: 0, max: 100, step: 5 },
  previewCoverage: 0.35,
  markingRounding: 4,
} as const

// One thin side-on soil strip on the garden's own baseline, so it can return to the garden.
export const GROUND_STUDY = {
  viewBox: "100 482 340 104",
  base: 566, left: 108, right: 432, center: 270, depth: 8, taper: 56, wave: 1.6, lift: 2,
  tufts: [5, 8], spacing: 14, inset: 44,
  grassHeights: { short: [10, 18], medium: [20, 32], tall: [36, 54] },
  mound: { height: [2.5, 4.5], width: [8, 12] },
  stones: [1, 3], leaves: [3, 6], twigs: [0, 1],
  soil: { top: "#CDB58B", bottom: "#A98C62" },
  litterColors: ["#C9A64F", "#C88A43", "#A16D42", "#77543D", "#564334"],
} as const

export const BLOOM_OUTLINE = {
  bowing: 0.5,
  leaf: { width: 1.15, roughness: 0.7, seed: 402 },
  bud: { width: 1.1, roughness: 0.7, seed: 421 },
  monstera: { width: 1.5, roughness: 0.9, seedOffset: 464, seedStep: 17 },
  flower: { width: 1.5, roughness: 0.9, smallRoughness: 2.4, smallThreshold: 150, seedStep: 17 },
  ground: { width: 0.55, roughness: 0.7, seed: 451 },
  companion: { seedOffset: 51, seedStep: 30 },
  button: { seed: 271, inset: 3, radius: 30 },
} as const

export const BLOOM_MOTION = {
  // Cadence stays owned by the shared useBoilSeed timer (200ms / eight frames).
  inkSeed: 7, inkDisplacement: 1.5, inkFrequency: "0.075", inkOctaves: 2,
  cycles: { plant: 8, flower: 6.5, small: 7, monstera: 10, ground: 11, companionSizeDivisor: 50 },
  plant: { cycleBase: 0.85, cycleSpread: 0.3, ageBase: 0.9, ageGain: 0.2, flexBase: 0.7, youngFlex: 0.45, flexSpread: 0.15 },
  breeze: { base: 18, spread: 10 },
  press: { scale: [1, 0.96, 1], y: [0, 2, 0], duration: 0.16, times: [0, 0.35, 1] },
  reducedQuery: "(prefers-reduced-motion: reduce)",
  hoverQuery: "(hover: hover) and (prefers-reduced-motion: no-preference)",
} as const

export const BLOOM_PROSE_POLICY = { mode: "strict", tracking: 0.5, stretch: 1.5, shrink: 0.35 } as const

// Scene dimensions are injected rather than mirrored in CSS; path control points belong to anatomy.
export const BLOOM_SCENE_STYLE: CSSProperties & Record<`--bloom-${string}`, number | string> = {
  "--bloom-scene-width": BLOOM_SCENE.width,
  "--bloom-scene-height": BLOOM_SCENE.height,
  "--bloom-ground-anchor": `${BLOOM_SCENE.baseline / BLOOM_SCENE.height * 100}%`,
  "--bloom-head-width": `${(BLOOM_SCENE.flowerSize / BLOOM_SCENE.width * 100).toFixed(3)}%`,
  "--bloom-plant-cycle": `${BLOOM_MOTION.cycles.plant}s`,
  "--bloom-flower-cycle": `${BLOOM_MOTION.cycles.flower}s`,
  "--bloom-small-cycle": `${BLOOM_MOTION.cycles.small}s`,
  "--bloom-monstera-cycle": `${BLOOM_MOTION.cycles.monstera}s`,
  "--bloom-ground-cycle": `${BLOOM_MOTION.cycles.ground}s`,
}

export const BLOOM_VIEWBOX = `0 0 ${BLOOM_SCENE.width} ${BLOOM_SCENE.height}`
export const BLOOM_FLOWER_VIEWBOX = `0 0 ${BLOOM_SCENE.flowerSize} ${BLOOM_SCENE.flowerSize}`
