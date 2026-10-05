import type { BloomShape } from "../../lib/bloom.ts"
import { curvePath, curvePoint, gardenCharacter, sceneRandom, type Curve, type MonsteraHole, type Point } from "./bloom-garden.ts"
import { BLOOM_COMPOSITION, BLOOM_MOTION, BLOOM_PIGMENTS, BLOOM_SCENE, LEAF_FAMILIES, MONSTERA_AGE, PETAL_FAMILIES, POLLEN_TEXTURES, VARIEGATION_PATTERNS } from "./bloom-tokens.ts"

export function plantMotion(seed: number, label: string, cycle: number) {
  const random = sceneRandom(seed, `motion:${label}`)
  const age = gardenCharacter(seed).age
  const motion = BLOOM_MOTION.plant
  const duration = cycle * (motion.cycleBase + random() * motion.cycleSpread) * (motion.ageBase + age * motion.ageGain)
  return {
    "--bloom-leaf-cycle": `${duration}s`,
    "--bloom-flex": motion.flexBase + (1 - age) * motion.youngFlex + random() * motion.flexSpread,
    animationDuration: `${duration}s`,
    animationDelay: `${-random() * duration}s`,
  }
}

export function decorationVariation(seed: number, label: string, defaultVariegated = false) {
  const random = sceneRandom(seed, label)
  const character = gardenCharacter(seed)
  return {
    angle: seed === 0 ? 0 : (random() - 0.5) * 24,
    variegated: seed === 0 ? defaultVariegated : random() < 0.45,
    budColor: seed === 0 ? null : BLOOM_PIGMENTS.buds[Math.floor(random() * BLOOM_PIGMENTS.buds.length)],
    coverage: seed === 0 ? 1 : 0.5 + random() * 0.8,
    fullness: seed === 0 ? 1 : 0.75 + random() * 0.5,
    pattern: VARIEGATION_PATTERNS[Math.floor(random() * VARIEGATION_PATTERNS.length)],
    opening: seed === 0 ? 0.35 : Math.max(0, Math.min(1, character.age + (random() - 0.5) * 0.7)),
  }
}

export function variegationPaths(pattern: typeof VARIEGATION_PATTERNS[number], width: number, height: number): string[] {
  if (pattern === "tips") {
    return [`M${-width} ${-height} L${width} ${-height} L${width} ${-height * 0.7} C${width * 0.6} ${-height * 0.55} ${-width * 0.2} ${-height * 0.82} ${-width} ${-height * 0.63} Z`]
  }
  if (pattern === "streaks") {
    return [-0.55, 0, 0.55].map((offset, i) => {
      const x = offset * width
      return `M${x} -6 C${x - width * 0.2} ${-height * 0.3} ${x + width * 0.18} ${-height * 0.6} ${x + width * 0.07} ${-height * (0.8 + i * 0.08)} C${x + width * 0.35} ${-height * 0.58} ${x + width * 0.05} ${-height * 0.25} ${x + width * 0.12} -6 Z`
    })
  }
  if (pattern === "patches") {
    return [0.24, 0.53, 0.82].map((t, i) => {
      const x = (i % 2 === 0 ? -0.35 : 0.38) * width
      const y = -height * t
      const r = width * 0.42
      return `M${x - r} ${y} C${x - r * 1.3} ${y - height * 0.12} ${x + r * 0.6} ${y - height * 0.15} ${x + r} ${y - height * 0.05} C${x + r * 1.4} ${y + height * 0.08} ${x - r * 0.7} ${y + height * 0.13} ${x - r} ${y} Z`
    })
  }
  return [-0.3, 0.35].map((offset) => {
    const x = width * offset
    return `M${x} 0 C${x - width * 0.7} ${-height * 0.2} ${x + width * 0.5} ${-height * 0.3} ${x - width * 0.1} ${-height * 0.5} C${x - width * 0.5} ${-height * 0.7} ${x + width * 0.5} ${-height * 0.85} ${x + width * 0.1} ${-height} L${x + width * 0.35} ${-height} C${x + width * 0.8} ${-height * 0.8} ${x - width * 0.2} ${-height * 0.65} ${x + width * 0.3} ${-height * 0.46} C${x + width * 0.8} ${-height * 0.25} ${x - width * 0.15} ${-height * 0.18} ${x + width * 0.3} 0 Z`
  })
}

export function pigment(hex: string, lightness: number) {
  if (lightness === 0) return hex
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  const hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return `hsl(${((hue * 60 + 360) % 360).toFixed(2)} ${(saturation * 100).toFixed(2)}% ${Math.max(0, Math.min(100, l * 100 + lightness)).toFixed(2)}%)`
}

const LEAF_EDGE = "M0 0 C-12 -9 -24 -25 -22 -43 C-26 -54 -20 -66 -15 -76 C-11 -88 -1 -96 4 -104 C4 -87 16 -77 20 -65 C27 -54 24 -43 26 -35 C24 -18 11 -5 0 0 Z"
const LEAF_FOLD = "M0 0 C-4 -29 -2 -61 4 -104 C5 -77 24 -61 26 -35 C24 -18 11 -5 0 0 Z"
const LEAF_SPINE: Curve = [{ x: 0, y: 0 }, { x: -5, y: -29 }, { x: -3, y: -63 }, { x: 4, y: -104 }]
const MONSTERA_SPINE: Curve = [{ x: 0, y: 0 }, { x: -4, y: -42 }, { x: 3, y: -75 }, { x: 2, y: -116 }]
export const BUD_EDGE = "M0 0 C-12 -4 -17 -17 -12 -29 C-10 -40 -3 -46 1 -49 C3 -42 12 -37 13 -26 C17 -14 10 -3 0 0 Z"
export const OPEN_BUD_EDGE = "M0 0 C-20 -4 -24 -24 -21 -35 C-15 -39 -11 -27 -7 -25 C-7 -37 -1 -42 3 -32 C8 -24 12 -38 20 -35 C26 -19 17 -3 0 0 Z"

type Vein = { d: string; depth: number }

const spineAtY = (spine: Curve, y: number) => {
  let lo = 0, hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (curvePoint(spine, mid).y > y) lo = mid
    else hi = mid
  }
  return curvePoint(spine, (lo + hi) / 2)
}

// Tapered filled ribbon: veins thin from the midrib outward, unlike a constant SVG stroke.
function veinRibbon(curve: Curve, base: number, tip: number) {
  const left: Point[] = [], right: Point[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const p = curvePoint(curve, t)
    const a = curvePoint(curve, Math.max(0, t - 0.01)), b = curvePoint(curve, Math.min(1, t + 0.01))
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const half = (tip + (base - tip) * (1 - t) ** 1.3) / 2
    const nx = -(b.y - a.y) / length * half, ny = (b.x - a.x) / length * half
    left.push({ x: p.x + nx, y: p.y + ny })
    right.unshift({ x: p.x - nx, y: p.y - ny })
  }
  return `M${[...left, ...right].map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L")} Z`
}

// A secondary vein leaves the midrib outward, then bends tipward near the margin.
function lateralVein(start: Point, end: Point, side: number, leave: number, arrive: number): Curve {
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  const out = { x: side * Math.sin(leave), y: -Math.cos(leave) }
  const into = { x: side * Math.sin(arrive), y: -Math.cos(arrive) }
  return [start, { x: start.x + out.x * length * 0.42, y: start.y + out.y * length * 0.42 }, { x: end.x - into.x * length * 0.4, y: end.y - into.y * length * 0.4 }, end]
}

const degrees = (value: number) => value * Math.PI / 180

export function leafBoundary(edge: string): Point[] {
  const tokens = edge.match(/[MCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
  if (!tokens) throw new Error("Missing leaf outline")
  const boundary: Point[] = []
  let cursor = { x: 0, y: 0 }
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++]
    if (command === "Z") break
    if (command === "M") {
      cursor = { x: Number(tokens[i++]), y: Number(tokens[i++]) }
      boundary.push(cursor)
    } else if (command === "C") {
      const curve: Curve = [cursor,
        { x: Number(tokens[i++]), y: Number(tokens[i++]) },
        { x: Number(tokens[i++]), y: Number(tokens[i++]) },
        { x: Number(tokens[i++]), y: Number(tokens[i++]) }]
      for (let j = 1; j <= 40; j++) boundary.push(curvePoint(curve, j / 40))
      cursor = curve[3]
    } else {
      throw new Error(`Unsupported leaf outline command: ${command}`)
    }
  }
  return boundary
}

// Pinnate, camptodromous venation guided by the actual outline (Runions et al. 2005; Mündermann et al. 2003).
function pinnateVeins(spine: Curve, edge: string, random: () => number, fullBase: boolean, scale = 1): Vein[] {
  const boundary = leafBoundary(edge)
  const tipY = spine[3].y
  const margin = (side: number, y: number) => {
    const axis = spineAtY(spine, y).x
    const reach = boundary.filter((p) => Math.abs(p.y - y) < 3 && side * (p.x - axis) > 0)
      .reduce((best, p) => Math.max(best, side * (p.x - axis)), 0)
    return { axis, reach }
  }
  const veins: Vein[] = [{ d: veinRibbon(spine, 1.7 * scale, 0.3 * scale), depth: 0 }]
  const count = 5 + Math.floor(random() * 3)
  const stagger = (0.25 + random() * 0.5) / count
  for (const side of [-1, 1]) {
    const laterals: Curve[] = []
    for (let i = 0; i < count; i++) {
      const t = 0.05 + (i + (side === 1 ? stagger * count : 0)) / count * 0.66 + (random() - 0.5) * 0.03
      const start = curvePoint(spine, Math.min(0.74, t))
      const basal = fullBase && i === 0
      const { reach } = margin(side, start.y - 6)
      const rise = basal ? reach * 0.35 : reach * (0.75 + t * 0.7)
      // Near the apex a full sweep would hook back over the midrib.
      const endY = Math.max(tipY + 10 + (start.y - tipY) * 0.15, start.y - rise)
      const target = margin(side, endY)
      if (target.reach < 3) continue
      const end = { x: target.axis + side * target.reach * (0.84 - random() * 0.05), y: endY }
      const curve = lateralVein(start, end, side, degrees(basal ? 78 : 58 - t * 18 + (random() - 0.5) * 8), degrees(basal ? 40 : 22 - t * 6))
      laterals.push(curve)
      veins.push({ d: veinRibbon(curve, (0.85 - t * 0.35) * scale, 0.12 * scale), depth: 1 })
    }
    // Faint percurrent tertiaries knit neighbouring secondaries.
    for (let i = 0; i < laterals.length - 1; i++) {
      for (const u of [0.38, 0.66]) {
        const a = curvePoint(laterals[i], u + (random() - 0.5) * 0.08), b = curvePoint(laterals[i + 1], u * 0.82 + (random() - 0.5) * 0.08)
        const bow = side * 1.5
        veins.push({ d: veinRibbon([a, { x: a.x + (b.x - a.x) * 0.3 + bow, y: a.y + (b.y - a.y) * 0.3 }, { x: a.x + (b.x - a.x) * 0.7 + bow, y: a.y + (b.y - a.y) * 0.7 }, b], 0.22 * scale, 0.14 * scale), depth: 2 })
      }
    }
  }
  return veins
}

export function leafAnatomy(seed: number, label: string, family?: typeof LEAF_FAMILIES[number]) {
  const random = sceneRandom(seed, `anatomy:${label}`)
  const generatedKind = seed === 0 ? 0 : Math.floor(random() * 4)
  const kind = family === undefined ? generatedKind : LEAF_FAMILIES.indexOf(family)
  const width = seed === 0 ? 23 : [30, 25, 36, 34][kind] * (0.92 + random() * 0.2)
  const bend = seed === 0 ? 4 : (random() - 0.5) * 16
  const spine: Curve = seed === 0 ? LEAF_SPINE : [{ x: 0, y: 0 }, { x: bend * 0.3 - 3, y: -29 }, { x: bend, y: -69 }, { x: bend * 0.5, y: -104 }]
  const edge = seed === 0 ? LEAF_EDGE : kind === 2
    ? `M0 0 C${-width * 0.65} 12 ${-width * 1.3} -3 ${-width} -34 C${-width * 0.9} -64 ${bend - width * 0.3} -87 ${bend * 0.5} -104 C${bend + width * 0.35} -84 ${width * 0.95} -65 ${width} -34 C${width * 1.3} -3 ${width * 0.65} 12 0 0 Z`
    : kind === 3
      ? `M0 0 C${-width * 0.2} -18 ${-width} -17 ${-width} -52 C${-width} -84 ${bend - width * 0.45} -98 ${bend * 0.5} -104 C${bend + width * 0.5} -97 ${width} -84 ${width} -52 C${width} -17 ${width * 0.2} -18 0 0 Z`
      : kind === 0
        ? `M0 0 C${-width * 0.8} -8 ${-width * 1.1} -29 ${-width} -53 C${-width * 0.9} -78 ${bend - width * 0.25} -92 ${bend * 0.5} -104 C${bend + width * 0.35} -90 ${width} -76 ${width} -51 C${width * 1.1} -25 ${width * 0.65} -6 0 0 Z`
        : `M0 0 C${-width * 0.55} -12 ${-width} -39 ${-width * 0.8 + bend * 0.3} -65 C${-width * 0.6 + bend} -86 ${bend} -95 ${bend * 0.5} -104 C${bend + width * 0.3} -88 ${width + bend * 0.3} -67 ${width} -43 C${width * 0.8} -18 ${width * 0.3} -5 0 0 Z`
  const veins = pinnateVeins(spine, edge, random, kind === 2 || kind === 0 || seed === 0)
  return {
    kind: ["broad", "lance", "heart", "oval"][kind], width, edge, spine, veins,
    fold: seed === 0 ? LEAF_FOLD : `${curvePath(spine)} C${width * 0.8} -78 ${width} -40 0 0 Z`,
  }
}

export function monsteraAnatomy(seed: number, label: string, maturity: number, holes: MonsteraHole[], splitCount?: number) {
  if (splitCount !== undefined && (!Number.isInteger(splitCount) || splitCount < MONSTERA_AGE.min || splitCount > MONSTERA_AGE.max)) {
    throw new RangeError(`Monstera split count must be between ${MONSTERA_AGE.min} and ${MONSTERA_AGE.max}`)
  }
  const random = sceneRandom(seed, label)
  const splits = splitCount ?? (maturity < BLOOM_COMPOSITION.monstera.juvenileMaturity ? 0 : 2 + Math.floor(maturity * 2))
  // Broad curved lobes and rounded incisions keep a heart-shaped blade, not a sawtooth edge.
  const side = (direction: number): Curve[] => {
    const breadth = 50 + random() * 6
    const curves: Curve[] = [[
      { x: 0, y: 0 }, { x: direction * 22, y: -5 },
      { x: direction * breadth, y: -13 }, { x: direction * breadth, y: -28 },
    ]]
    const step = 78 / splits
    for (let i = 0; i < splits; i++) {
      const start = curves[curves.length - 1][3]
      const y = -28 - i * step
      const outer = breadth * (1 - i * 0.045)
      const inner = 25 + (1 - maturity) * 8 + random() * 3
      const notch = { x: direction * inner, y: y - step * 0.52 }
      const end = { x: direction * outer, y: y - step }
      curves.push(
        [start, { x: direction * (outer + 5), y: y - step * 0.4 }, { x: direction * inner, y: notch.y + 4 }, notch],
        [notch, { x: direction * inner, y: notch.y - 4 }, { x: direction * outer, y: y - step * 0.55 }, end],
      )
    }
    const shoulder = curves[curves.length - 1][3]
    curves.push([shoulder, { x: direction * breadth, y: -133 }, { x: direction * 18, y: -142 }, { x: 2, y: -116 }])
    return curves
  }
  const left = splits > 0 ? side(-1) : []
  const rightSide = splits > 0 ? side(1) : []
  const right = [...rightSide].reverse().map(([a, b, c, d]): Curve => [d, c, b, a])
  const lobedEdge = `M0 0 ${[...left, ...right].map(([, b, c, d]) => `C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`).join(" ")} Z`
  const edge = splits === 0
    ? "M0 0 C-30 -12 -64 -46 -51 -86 C-44 -116 -11 -135 2 -116 C16 -139 48 -117 55 -85 C64 -43 30 -10 0 0 Z"
    : lobedEdge
  if (splits === 0) return { edge, holes, maturity, splits, veins: pinnateVeins(MONSTERA_SPINE, edge, random, true, 1.4) }
  // Each lobe has a primary vein; fenestrations sit between primaries.
  const veins: Vein[] = [{ d: veinRibbon(MONSTERA_SPINE, 2.8, 0.5), depth: 0 }]
  const laterals = [left, rightSide].map((curves, s) => {
    const direction = s === 0 ? -1 : 1
    const tips = [...curves.filter((_, i) => i % 2 === 0 && i < curves.length - 1).map((curve) => curve[3]), curvePoint(curves[curves.length - 1], 0.3)]
    return tips.map((tip, i) => {
      const end = { x: tip.x * (0.87 - random() * 0.04), y: tip.y + 1 }
      const start = spineAtY(MONSTERA_SPINE, Math.min(-2, end.y + Math.abs(end.x) * (0.5 + random() * 0.14)))
      const curve = lateralVein(start, end, direction, degrees(66 - i * 4 + (random() - 0.5) * 6), degrees(46 - i * 5))
      veins.push({ d: veinRibbon(curve, 1.7, 0.3), depth: 1 })
      return curve
    })
  })
  const placed = holes.flatMap((hole, index) => {
    const pair = laterals[hole.x < 0 ? 0 : 1]
    const gap = Math.floor(index / 2)
    if (gap >= pair.length - 1) return []
    const u = 0.32 + ((index * 37) % 13) / 100
    const a = curvePoint(pair[gap], u), b = curvePoint(pair[gap + 1], u)
    const before = curvePoint(pair[gap], u - 0.02), after = curvePoint(pair[gap], u + 0.02)
    const room = Math.hypot(a.x - b.x, a.y - b.y)
    return [{
      ...hole, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      width: Math.min(hole.width, room * 0.17), length: Math.min(hole.length * 1.15, room * 0.75),
      angle: Math.atan2(after.x - before.x, -(after.y - before.y)) * 180 / Math.PI,
    }]
  })
  return { edge, holes: placed, maturity, splits, veins }
}

export function grassBladeGeometry(curve: Curve, width: number, fill: string) {
  return { d: veinRibbon(curve, width, 0.04), spine: curvePath(curve), fill }
}

export function groundGeometry(seed: number) {
  const character = gardenCharacter(seed)
  const random = sceneRandom(seed, "ground")
  const budget = BLOOM_COMPOSITION.ground
  const scatter = 0.45 + random() * 0.55
  const rockCount = budget.rocks[0] + Math.floor(random() * (budget.rocks[1] - budget.rocks[0] + 1))
  const rocks = Array.from({ length: rockCount }, (_, i) => {
    const width = 7 + random() * 7
    const height = 3 + random() * 5
    const points = Array.from({ length: 7 }, (_, j) => {
      const angle = j / 7 * Math.PI * 2
      const fullness = 0.82 + random() * 0.24
      return { x: Math.cos(angle) * width * fullness, y: Math.sin(angle) * height * fullness }
    })
    const d = `M${points[0].x} ${points[0].y} ` + points.map((a, j) => {
      const before = points[(j + 6) % 7], b = points[(j + 1) % 7], after = points[(j + 2) % 7]
      return `C${a.x + (b.x - before.x) / 6} ${a.y + (b.y - before.y) / 6} ${b.x - (after.x - a.x) / 6} ${b.y - (after.y - a.y) / 6} ${b.x} ${b.y}`
    }).join(" ") + " Z"
    return {
      d, width, height,
      x: 65 + ((i + 0.25 + random() * 0.5) / rockCount) * 410,
      y: 574 + random() * 13,
      scale: 0.4 + random() * 0.95,
      angle: (random() - 0.5) * 35,
      lightness: (random() - 0.5) * 24,
    }
  })
  const clumpCount = budget.clumps[0] + Math.floor(random() * (budget.clumps[1] - budget.clumps[0] + 1))
  const grasses = Array.from({ length: clumpCount }, (_, i) => {
    const x = 68 + (i + 0.2 + random() * 0.6) / clumpCount * 398
    const y = 563 + random() * 9
    const height = 25 + random() * 19
    const lean = (random() - 0.5) * 14
    const bladeCount = budget.blades[0] + Math.floor(random() * (budget.blades[1] - budget.blades[0] + 1))
    const blades = Array.from({ length: bladeCount }, (_, j) => {
      const spread = (j / (bladeCount - 1) - 0.5) * (22 + random() * 17)
      const length = height * (0.65 + random() * 0.4)
      const root = { x: x + (random() - 0.5) * 4, y }
      const curve: Curve = [
        root, { x: root.x + spread * 0.1, y: y - length * 0.42 },
        { x: root.x + spread * 0.65 + lean, y: y - length * 0.82 },
        { x: root.x + spread + lean, y: y - length },
      ]
      return grassBladeGeometry(curve, 2.2 + random() * 2.2, BLOOM_PIGMENTS.ground.grasses[Math.floor(random() * BLOOM_PIGMENTS.ground.grasses.length)])
    })
    return { x, y, blades }
  })
  const marks = Array.from({ length: budget.marks[0] + Math.floor(random() * (budget.marks[1] - budget.marks[0] + 1)) }, (_, i) => {
    const x = 60 + i / 5 * 390 + random() * 25
    const y = 570 + random() * 12
    const length = 12 + random() * 35
    return `M${x} ${y} Q${x + length * 0.5} ${y + (random() - 0.5) * 6} ${x + length} ${y + (random() - 0.5) * 3}`
  })
  const grains = Array.from({ length: budget.grains[0] + Math.floor(random() * (budget.grains[1] - budget.grains[0] + 1)) }, () => ({
    x: 75 + random() * 385, y: 574 + random() * 12, width: 0.7 + random() * 1.1, height: 0.3 + random() * 0.4,
  }))
  const sprigCount = seed === 0 ? budget.sprigs[0] : budget.sprigs[0] + Math.floor(random() * (budget.sprigs[1] - budget.sprigs[0] + 1))
  const sprigs = Array.from({ length: sprigCount }, (_, i) => {
    const x = BLOOM_SCENE.centerX + (((i + 0.25 + random() * 0.5) / sprigCount) - 0.5) * 410 * scatter
    const y = 560 + random() * 10
    const height = 22 + random() * 44
    const lean = (random() - 0.5) * 32
    const curve: Curve = [
      { x, y }, { x: x - lean * 0.4, y: y - height * 0.35 },
      { x: x + lean, y: y - height * 0.7 }, { x: x + lean, y: y - height },
    ]
    return { curve, angle: lean * 1.4, scale: 0.2 + random() * 0.22, blue: random() < 0.5, pod: character.age > 0.75 && random() < 0.3 }
  })
  const fallenPetals = Array.from({ length: character.age > 0.65 ? 1 + Math.floor(random() * 3) : random() < 0.3 ? 1 : 0 }, (_, i) => ({
    x: 90 + ((i + random()) / 3) * 355,
    y: 576 + random() * 15,
    angle: random() * 180,
    scale: 0.7 + random() * 0.6,
    fill: BLOOM_PIGMENTS.buds[Math.floor(random() * BLOOM_PIGMENTS.buds.length)],
  }))
  return {
    rocks, grasses, marks, grains, sprigs, scatter, fallenPetals,
    width: seed === 0 ? 222 : 192 + random() * 40,
    depth: seed === 0 ? 28 : 20 + random() * 14,
    lightness: seed === 0 ? 0 : (random() - 0.5) * 16,
  }
}

export function flowerTraits(seed: number, identity: string) {
  const random = sceneRandom(seed, `flower-traits:${identity}`)
  return {
    family: seed === 0 ? PETAL_FAMILIES[0] : PETAL_FAMILIES[Math.floor(random() * PETAL_FAMILIES.length)],
    texture: POLLEN_TEXTURES[Math.floor(random() * POLLEN_TEXTURES.length)],
    individuality: 0.4 + random() * 0.6,
    opening: seed === 0 ? 1 : 0.78 + gardenCharacter(seed).age * 0.22,
  }
}

// Individually shaped, flat petals overlap at the base; no posture/depth projection.
export function botanicalPetals(shape: BloomShape, family: typeof PETAL_FAMILIES[number], individuality: number, opening: number, lengthScale = 1) {
  return Array.from({ length: shape.petals }, (_, i) => {
    const variation = Math.sin(i * 2.39 + 0.8)
    const length = (132 + variation * 12 * individuality) * opening * lengthScale
    const width = Math.min(84, 139 * Math.sin(Math.PI / shape.petals))
      * (1.12 - shape.bulge * 0.48) * (1.15 - shape.round * 0.14)
    const lean = Math.cos(i * 1.71) * 12 * individuality
    const shoulder = 0.58 + shape.round * 0.085
    const tip = -length
    let d = [
      "M -8 9",
      `C ${-width * 0.38} -28 ${-width} ${tip * 0.48} ${-width * shoulder + lean} ${tip * 0.8}`,
      `C ${-width * 0.56 + lean} ${tip - 7} ${-width * 0.15 + lean} ${tip - 11} ${lean + 2} ${tip + 3}`,
      `C ${width * 0.26 + lean} ${tip - 10} ${width * 0.68 + lean} ${tip + 1} ${width * shoulder + lean} ${tip * 0.79}`,
      `C ${width * 0.97} ${tip * 0.43} ${width * 0.31} -20 9 10`,
      "Q 0 18 -8 9 Z",
    ].join(" ")
    const start = `M -8 9 C ${-width * 0.38} -28 ${-width} ${tip * 0.48} ${-width * shoulder + lean} ${tip * 0.8}`
    const end = `C ${width * 0.97} ${tip * 0.43} ${width * 0.31} -20 9 10 Q 0 18 -8 9 Z`
    if (family === "pointed") {
      d = `${start} Q ${-width * 0.4 + lean} ${tip * 0.95} ${lean} ${tip - 8} Q ${width * 0.4 + lean} ${tip * 0.95} ${width * shoulder + lean} ${tip * 0.79} ${end}`
    } else if (family === "curled") {
      d = `${start} C ${-width * 0.45 + lean} ${tip - 8} ${lean + width * 0.55} ${tip - 17} ${lean + width * 0.18} ${tip + 3} C ${lean + width * 0.1} ${tip + 14} ${width * 0.85 + lean} ${tip - 3} ${width * shoulder + lean} ${tip * 0.79} ${end}`
    } else if (family === "ruffled") {
      d = `${start} C ${-width * 0.7 + lean} ${tip - 13} ${-width * 0.32 + lean} ${tip - 13} ${-width * 0.25 + lean} ${tip + 1} C ${-width * 0.15 + lean} ${tip - 13} ${width * 0.14 + lean} ${tip - 13} ${width * 0.22 + lean} ${tip + 1} C ${width * 0.34 + lean} ${tip - 12} ${width * 0.68 + lean} ${tip - 5} ${width * shoulder + lean} ${tip * 0.79} ${end}`
    }
    const veins = [-0.48, -0.23, 0, 0.24, 0.5].map((offset, j) =>
      `M ${offset * 10} -6 C ${offset * width * 0.6} -43 ${offset * width + lean * 0.8} ${tip * 0.67} ${offset * width * 0.74 + lean} ${tip * (j === 2 ? 0.91 : 0.8)}`,
    )
    const fold = `M 4 9 C ${width * 0.5} ${tip * 0.32} ${width * 0.9 + lean} ${tip * 0.64} ${width * shoulder + lean} ${tip * 0.79} C ${width * 0.48 + lean} ${tip * 0.61} ${width * 0.19} -22 4 9 Z`
    return { d, veins, fold, angle: (i * 360) / shape.petals - 13 + variation * 4 }
  })
}

export function pollenGeometry(seed: number, label: string, centerRadius: number, texture: typeof POLLEN_TEXTURES[number]) {
  const random = sceneRandom(seed, `pollen:${label}`)
  const count = Math.floor(centerRadius * centerRadius / 18)
  return Array.from({ length: count }, (_, i) => {
    const angle = texture === "speckled" ? random() * Math.PI * 2 : i * Math.PI * (3 - Math.sqrt(5))
    const unitRadius = texture === "rings" ? (Math.floor(Math.sqrt((i + 0.5) / count) * 5) + 1) / 6 : Math.sqrt(texture === "speckled" ? random() : (i + 0.5) / count)
    const radius = unitRadius * Math.max(0, centerRadius - 4)
    return { x: BLOOM_SCENE.flowerCenter + Math.cos(angle) * radius, y: BLOOM_SCENE.pollenCenterY + Math.sin(angle) * radius * 0.92, angle: (angle * 180) / Math.PI }
  })
}
