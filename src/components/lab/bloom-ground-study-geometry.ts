import { grassBladeGeometry, groundGeometry, leafAnatomy, leafBoundary } from "./bloom-geometry.ts"
import { curvePoint, sceneRandom, type Curve, type Point } from "./bloom-math.ts"
import { noise } from "./bloom-monstera-variegation.ts"
import { BLOOM_PIGMENTS, GROUND_STUDY, LEAF_FAMILIES } from "./bloom-tokens.ts"

export type GroundBounds = { left: number; right: number; top: number; bottom: number }
type Footprint = { kind: "grass" | "stone" | "leaf" | "twig"; bounds: GroundBounds }

export function groundBoundsOverlap(a: GroundBounds, b: GroundBounds, padding = 2) {
  return a.left < b.right + padding && a.right + padding > b.left
    && a.top < b.bottom + padding && a.bottom + padding > b.top
}

function bounds(points: readonly Point[]): GroundBounds {
  return { left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)) }
}

const fmt = (value: number) => Number(value.toFixed(2))

// Catmull-Rom through samples keeps the soil line smooth without visible sampling corners.
function smoothSegments(points: readonly Point[]) {
  let d = ""
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)]
    d += ` C${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)}`
      + ` ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ${fmt(p2.x)} ${fmt(p2.y)}`
  }
  return d
}

function transformPoints(points: readonly Point[], scale: number, angle: number, squash = 1) {
  const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians)
  return points.map((p) => ({ x: (p.x * cos - p.y * sin) * scale, y: (p.x * sin + p.y * cos) * scale * squash }))
}

const pick = (random: () => number, [min, max]: readonly [number, number]) => min + random() * (max - min)
const count = (random: () => number, [min, max]: readonly [number, number]) => min + Math.floor(random() * (max - min + 1))
const curveD = (curve: Curve) => `M${fmt(curve[0].x)} ${fmt(curve[0].y)} C${curve.slice(1).map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(" ")}`

export function groundStudyGeometry(seed: number, extent?: { left: number; right: number }, grass?: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Ground study seed must be a non-negative safe integer")
  if (extent && (!Number.isFinite(extent.left) || !Number.isFinite(extent.right) || extent.right - extent.left < GROUND_STUDY.right - GROUND_STUDY.left)) {
    throw new RangeError("Ground extent must be finite and at least as wide as the study strip")
  }
  if (grass !== undefined && (!Number.isInteger(grass) || grass < GROUND_STUDY.tufts[0] || grass > GROUND_STUDY.tufts[1])) {
    throw new RangeError(`Grass count must be between ${GROUND_STUDY.tufts[0]} and ${GROUND_STUDY.tufts[1]}`)
  }
  const rules = { ...GROUND_STUDY, ...extent }
  const random = sceneRandom(seed, "ground-study-strip")
  const source = groundGeometry(seed)
  const phase = random() * 40
  const lo = rules.left + rules.inset, hi = rules.right - rules.inset

  // Grass gathers in tight drifts, leaving open soil between them for litter.
  const driftCount = 2 + Math.floor(random() * 2)
  const span = (hi - lo - 64) / driftCount
  const drifts = Array.from({ length: driftCount }, (_, i) => lo + 32 + span * (i + 0.5) + (random() - 0.5) * span * 0.3)
  // Draw the seeded count either way, so choosing a grass count does not reshuffle the soil itself.
  const drawn = count(random, rules.tufts)
  const target = grass ?? drawn
  const xs: number[] = []
  for (let attempt = 0; attempt < 600 && xs.length < target; attempt++) {
    const x = drifts[attempt % driftCount] + (random() - 0.5) * 56
    if (x < lo || x > hi || xs.some((other) => Math.abs(other - x) < rules.spacing)) continue
    xs.push(x)
  }
  if (xs.length < rules.tufts[0]) throw new Error("Ground study could not plant its grass")
  xs.sort((a, b) => a - b)
  const plans = xs.map((x, i) => {
    const draw = random()
    const forced = i === Math.floor(xs.length / 2) ? "tall" : i === 0 ? "short" : undefined
    const kind = forced ?? (draw < 0.4 ? "short" : draw < 0.75 ? "medium" : "tall")
    return { x, height: pick(random, rules.grassHeights[kind]),
      mound: { height: pick(random, rules.mound.height), width: pick(random, rules.mound.width) } }
  })

  // A thin lens of soil: pointed ends, a quiet crest, and a small mud mound under every tuft.
  const envelope = (x: number) => {
    const t = Math.max(0, Math.min(1, Math.min(x - rules.left, rules.right - x) / rules.taper))
    return t * t * (3 - 2 * t)
  }
  const top = (x: number) => {
    const wave = noise(seed + 211, x / 60 + phase, 1.7) * rules.wave
    const mounds = plans.reduce((sum, tuft) => sum + tuft.mound.height * Math.exp(-(((x - tuft.x) / tuft.mound.width) ** 2)), 0)
    return rules.base - (rules.lift + wave + mounds) * envelope(x)
  }
  const bottom = (x: number) => rules.base + rules.depth * envelope(x)

  const footprints: Footprint[] = []
  const palette = BLOOM_PIGMENTS.ground.grasses
  const tufts = plans.map((tuft, i) => {
    const tuftRandom = sceneRandom(seed, `ground-study-tuft:${i}`)
    const bladeCount = 7 + Math.floor(tuftRandom() * 6)
    const spread = 40 + tuftRandom() * 30
    const blades = Array.from({ length: bladeCount }, (_, j) => {
      const u = j / (bladeCount - 1) - 0.5
      const angle = (u * spread + (tuftRandom() - 0.5) * 9) * Math.PI / 180
      const length = tuft.height * (0.6 + tuftRandom() * 0.4) * (1 - Math.abs(u) * 0.4)
      const rootX = tuft.x + (tuftRandom() - 0.5) * 6
      const root = { x: rootX, y: top(rootX) + 4 }
      const direction = { x: Math.sin(angle), y: -Math.cos(angle) }
      const arch = u * length * (0.3 + tuftRandom() * 0.6)
      const curve: Curve = [root,
        { x: root.x + direction.x * length * 0.38, y: root.y + direction.y * length * 0.38 },
        { x: root.x + direction.x * length * 0.78 + arch * 0.45, y: root.y + direction.y * length * 0.8 },
        { x: root.x + direction.x * length + arch, y: root.y + direction.y * length + Math.abs(arch) * 0.5 }]
      return { ...grassBladeGeometry(curve, 1.8 + tuftRandom() * 1.2, palette[Math.floor(tuftRandom() * palette.length)]), curve }
    })
    const canopy = bounds(blades.flatMap((blade) => Array.from({ length: 9 }, (_, k) => curvePoint(blade.curve, k / 8))))
    const box = { left: Math.min(canopy.left, tuft.x - tuft.mound.width) - 1.5,
      right: Math.max(canopy.right, tuft.x + tuft.mound.width) + 1.5, top: canopy.top - 1.5, bottom: rules.base + 1 }
    // Blades fan apart above the soil, so collide with each blade segment rather than the whole canopy box.
    footprints.push({ kind: "grass", bounds: { left: tuft.x - tuft.mound.width * 0.75, right: tuft.x + tuft.mound.width * 0.75,
      top: top(tuft.x) - 6, bottom: rules.base + 1 } })
    for (const blade of blades) {
      const samples = Array.from({ length: 5 }, (_, k) => curvePoint(blade.curve, k / 4))
      for (let k = 0; k < samples.length - 1; k++) {
        const segment = bounds([samples[k], samples[k + 1]])
        footprints.push({ kind: "grass", bounds: { left: segment.left - 1.2, right: segment.right + 1.2, top: segment.top - 1.2, bottom: segment.bottom + 1.2 } })
      }
    }
    return { ...tuft, blades, box }
  })

  const clear = (box: GroundBounds) => footprints.every((item) => !groundBoundsOverlap(item.bounds, box, 2))
  const surfaceAt = (left: number, right: number) => {
    let y = -Infinity
    for (let x = left; ; x = Math.min(right, x + 2)) {
      y = Math.max(y, top(x))
      if (x >= right) break
    }
    return y
  }

  // Fallen leaves lie flat on the soil, so the side-on view sees them strongly foreshortened.
  type Leaf = { x: number; y: number; scale: number; angle: number; squash: number; family: typeof LEAF_FAMILIES[number]
    edge: string; veins: ReturnType<typeof leafAnatomy>["veins"]; fill: string; box: GroundBounds }
  const leaves: Leaf[] = []
  for (let i = 0, total = count(random, rules.leaves); i < total; i++) {
    const family = LEAF_FAMILIES[Math.floor(random() * LEAF_FAMILIES.length)]
    const anatomy = leafAnatomy(seed, `fallen-leaf:${i}`, family)
    const outline = leafBoundary(anatomy.edge)
    const fill = rules.litterColors[Math.floor(random() * rules.litterColors.length)]
    for (let attempt = 0; attempt < 120; attempt++) {
      const scale = 0.17 + random() * 0.09
      const angle = (random() < 0.5 ? -1 : 1) * (74 + random() * 32)
      const squash = 0.3 + random() * 0.12
      const local = bounds(transformPoints(outline, scale, angle, squash))
      const x = pick(random, [rules.left + 18 - local.left, rules.right - 18 - local.right])
      const rest = surfaceAt(x + local.left, x + local.right) + 1.5
      const y = rest - local.bottom
      const box = { left: x + local.left, right: x + local.right, top: y + local.top, bottom: rest + 0.5 }
      if (!clear(box)) continue
      footprints.push({ kind: "leaf", bounds: box })
      leaves.push({ x, y, scale, angle, squash, family, edge: anatomy.edge, veins: anatomy.veins, fill, box })
      break
    }
  }

  // Pebbles sit on the soil line, a little sunk into it.
  const stones: { d: string; x: number; y: number; scale: number; angle: number; width: number; height: number; lightness: number; box: GroundBounds }[] = []
  for (let i = 0, total = count(random, rules.stones); i < total; i++) {
    const rock = source.rocks[i % source.rocks.length]
    const outline = leafBoundary(rock.d)
    for (let attempt = 0; attempt < 60; attempt++) {
      const scale = 0.9 + random() * 0.6, angle = (random() - 0.5) * 20
      const local = bounds(transformPoints(outline, scale, angle))
      const x = pick(random, [lo - local.left, hi - local.right]), crest = top(x)
      const y = crest + (local.bottom - local.top) * 0.35 - local.bottom
      const box = { left: x + local.left, right: x + local.right, top: y + local.top, bottom: crest + 2 }
      if (!clear(box)) continue
      footprints.push({ kind: "stone", bounds: box })
      stones.push({ d: rock.d, x, y, scale, angle, width: rock.width, height: rock.height, lightness: rock.lightness, box })
      break
    }
  }

  const twigs: { x: number; y: number; main: string; branch: string; width: number; box: GroundBounds }[] = []
  for (let i = 0, total = count(random, rules.twigs); i < total; i++) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const length = 18 + random() * 16, tilt = (random() - 0.5) * 0.2, bow = (random() - 0.5) * 3, width = 1 + random() * 0.6
      const along = { x: Math.cos(tilt), y: Math.sin(tilt) }
      const start = { x: -along.x * length / 2, y: -along.y * length / 2 }
      const main: Curve = [start, { x: start.x + along.x * length * 0.33, y: start.y + along.y * length * 0.33 - bow },
        { x: start.x + along.x * length * 0.66, y: start.y + along.y * length * 0.66 - bow }, { x: -start.x, y: -start.y }]
      const fork = curvePoint(main, 0.55), side = random() < 0.5 ? -1 : 1, twigLength = 4 + random() * 4
      const tip = { x: fork.x + side * twigLength * 0.8, y: fork.y - twigLength * 0.5 }
      const branch: Curve = [fork, { x: fork.x + side * twigLength * 0.3, y: fork.y - 1 }, { x: tip.x - side, y: tip.y + 1 }, tip]
      const raw = bounds([...Array.from({ length: 9 }, (_, k) => curvePoint(main, k / 8)), tip])
      const local = { left: raw.left - width, right: raw.right + width, top: raw.top - width, bottom: raw.bottom + width }
      const x = pick(random, [lo - local.left, hi - local.right])
      const rest = surfaceAt(x + local.left, x + local.right) + 1
      const y = rest - local.bottom
      const box = { left: x + local.left, right: x + local.right, top: y + local.top, bottom: rest }
      if (!clear(box)) continue
      footprints.push({ kind: "twig", bounds: box })
      twigs.push({ x, y, main: curveD(main), branch: curveD(branch), width, box })
      break
    }
  }

  // A few specks on the soil face; texture only.
  const specks = Array.from({ length: 10 + Math.floor(random() * 8) }, () => {
    const x = pick(random, [rules.left + rules.taper, rules.right - rules.taper])
    return { x, y: pick(random, [top(x) + 2, bottom(x) - 1.5]), rx: 0.5 + random() * 0.8, ry: 0.35 + random() * 0.3 }
  })

  const crestPoints: Point[] = [], basePoints: Point[] = []
  for (let x = rules.left; x < rules.right; x += 4) crestPoints.push({ x, y: top(x) })
  crestPoints.push({ x: rules.right, y: top(rules.right) })
  for (let x = rules.right; x > rules.left; x -= 8) basePoints.push({ x, y: bottom(x) })
  basePoints.push({ x: rules.left, y: bottom(rules.left) })
  const crest = `M${fmt(crestPoints[0].x)} ${fmt(crestPoints[0].y)}${smoothSegments(crestPoints)}`
  const base = `M${fmt(basePoints[0].x)} ${fmt(basePoints[0].y)}${smoothSegments(basePoints)}`
  return {
    soil: `${crest} L${fmt(basePoints[0].x)} ${fmt(basePoints[0].y)}${smoothSegments(basePoints)} Z`,
    crest, base, crestPoints, tufts, stones, leaves, twigs, specks, footprints,
    shadow: { cx: (rules.left + rules.right) / 2, cy: rules.base + rules.depth + 2, rx: (rules.right - rules.left) / 2 - 20, ry: 3.5 },
    viewBox: rules.viewBox,
  }
}
