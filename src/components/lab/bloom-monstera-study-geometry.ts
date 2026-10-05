import { boundaryClearance as clearance, curvePoint, distanceToSegment, pointInsidePolygon as inside, sceneRandom, type Curve, type Point } from "./bloom-math.ts"
import { noise, noiseVariegation } from "./bloom-monstera-variegation.ts"
import { MONSTERA_MARKINGS, MONSTERA_STUDY_STALK } from "./bloom-tokens.ts"

const BLADE: readonly Curve[] = [
  [{ x: 0, y: 0 }, { x: -30, y: -12 }, { x: -64, y: -46 }, { x: -51, y: -86 }],
  [{ x: -51, y: -86 }, { x: -44, y: -116 }, { x: -11, y: -135 }, { x: 2, y: -116 }],
  [{ x: 2, y: -116 }, { x: 16, y: -139 }, { x: 48, y: -117 }, { x: 55, y: -85 }],
  [{ x: 55, y: -85 }, { x: 64, y: -43 }, { x: 30, y: -10 }, { x: 0, y: 0 }],
]
const SPINE: Curve = [{ x: 0, y: 0 }, { x: -4, y: -42 }, { x: 3, y: -75 }, { x: 2, y: -116 }]
const ORDER = [2, 1, 3, 0, 4]
const point = (p: Point) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`
const sample = (curve: Curve, steps = 32) => Array.from({ length: steps + 1 }, (_, i) => curvePoint(curve, i / steps))
const mixPoint = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const curveCommands = (curves: readonly Curve[]) => curves.map(([, b, c, d]) => `C${point(b)} ${point(c)} ${point(d)}`).join(" ")
type BladeBoundary = (Point & { position: number })[]

export function organicMonsteraBlade(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Monstera blade seed must be a non-negative safe integer")
  const random = sceneRandom(seed, "monstera-base-shape")
  const slender = random()
  const width = 1.15 - slender * 0.32
  const height = 0.94 + slender * 0.14
  const shoulders = (random() - 0.5) * 10
  const lobeFullness = 0.91 + random() * 0.18
  const notchDepth = (random() - 0.5) * 9
  const tipLength = 0.82 + random() * 0.36
  const bend = (random() - 0.5) * 9
  const asymmetry = (random() - 0.5) * 0.12
  const deform = (p: Point): Point => {
    const t = Math.max(0, Math.min(1, -p.y / 139))
    const side = p.x < 0 ? -1 : 1
    const shoulderWeight = Math.exp(-(((t - 0.6) / 0.24) ** 2))
    const lobeWeight = Math.max(0, (t - 0.62) / 0.38)
    const edgeNoise = noise(seed + 311, t * 1.4 + 0.37, side * 1.3 + 2.15) * 0.035
    return {
      x: p.x * width * (1 + side * asymmetry + shoulderWeight * (lobeFullness - 1) + edgeNoise) + bend * t * t,
      y: p.y + shoulders * shoulderWeight * Math.min(1, Math.abs(p.x) / 35)
        + notchDepth * lobeWeight * Math.max(0, 1 - Math.abs(p.x) / 25)
        + (p.y > -46 ? p.y * (tipLength - 1) * (1 - t) : 0),
    }
  }
  const attachment = deform(BLADE[1][3])
  const upright = (p: Point): Point => ({ x: p.x - attachment.x, y: attachment.y - p.y })
  const reverseUpright = ([a, b, c, d]: Curve): Curve =>
    [upright(deform(d)), upright(deform(c)), upright(deform(b)), upright(deform(a))]
  const blade: readonly Curve[] = [BLADE[1], BLADE[0], BLADE[3], BLADE[2]].map(reverseUpright)
  const spine = reverseUpright(SPINE)
  const boundary: BladeBoundary = blade.flatMap((curve, index) => sample(curve).map((p, i) => ({ ...p, position: index + i / 32 })))
  const edge = `M0 0 ${curveCommands(blade)} Z`
  const top = Math.min(...boundary.map((p) => p.y)), bottom = Math.max(...boundary.map((p) => p.y))
  const offsetY = -45 - (top + bottom) * height / 2
  return { blade, spine, boundary, edge, height, offsetY, attachment: spine[0], tip: spine[3],
    parameters: { width, shoulders, lobeFullness, notchDepth, tipLength, bend, asymmetry } }
}

function margin(side: number, y: number, base: ReturnType<typeof organicMonsteraBlade>) {
  const { blade, boundary } = base
  const candidates = boundary.slice(1).flatMap((b, i) => {
    const a = boundary[i]
    if ((a.y > y) === (b.y > y)) return []
    const index = Math.floor((a.position + b.position) / 2)
    let lo = a.position - index, hi = b.position - index
    for (let j = 0; j < 24; j++) {
      const mid = (lo + hi) / 2
      if ((curvePoint(blade[index], mid).y < y) === (b.y > a.y)) lo = mid
      else hi = mid
    }
    const t = (lo + hi) / 2
    const p = curvePoint(blade[index], t)
    return p.x * side > 0 ? [{ ...p, position: index + t }] : []
  })
  if (!candidates.length) throw new Error(`Missing monstera margin at ${y}`)
  return candidates.reduce((best, p) => side * p.x > side * best.x ? p : best)
}

function spineAtY(spine: Curve, y: number) {
  let lo = 0, hi = 1
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2
    if (curvePoint(spine, t).y > y) lo = t
    else hi = t
  }
  return curvePoint(spine, (lo + hi) / 2)
}

function splitCurve([a, b, c, d]: Curve, t: number): [Curve, Curve] {
  const ab = mixPoint(a, b, t), bc = mixPoint(b, c, t), cd = mixPoint(c, d, t)
  const abc = mixPoint(ab, bc, t), bcd = mixPoint(bc, cd, t), center = mixPoint(abc, bcd, t)
  return [[a, ab, abc, center], [center, bcd, cd, d]]
}

function perimeterBetween(start: number, end: number, blade: readonly Curve[]): Curve[] {
  return blade.flatMap((curve, i) => {
    const lo = Math.max(0, start - i), hi = Math.min(1, end - i)
    if (hi <= lo) return []
    const before = splitCurve(curve, hi)[0]
    return [lo === 0 ? before : splitCurve(before, lo / hi)[1]]
  })
}

function normal(a: Point, b: Point) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length === 0) throw new Error("Degenerate monstera curve")
  return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length }
}
const offset = (p: Point, v: Point, amount: number): Point => ({ x: p.x + v.x * amount, y: p.y + v.y * amount })

export function monsteraStudyStalk(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Monstera stalk seed must be a non-negative safe integer")
  const random = sceneRandom(seed, "monstera-study-stalk")
  const rules = MONSTERA_STUDY_STALK
  const pick = ([min, max]: readonly [number, number]) => min + (max - min) * random()
  const angle = pick(rules.angle)
  const anchor = { x: pick(rules.anchorX), y: pick(rules.anchorY) }
  const side = random() < 0.5 ? -1 : 1
  const root = { x: anchor.x + side * pick(rules.rootSpread), y: pick(rules.rootY) }
  const bend = side * (12 + random() * 18)
  const curve: Curve = [root,
    { x: root.x - bend * 0.35, y: root.y - 55 },
    { x: anchor.x + bend, y: anchor.y + 38 }, anchor]
  const width = pick(rules.width), tipWidth = pick(rules.tipWidth)
  const outline = petioleOutline(curve, width, tipWidth)
  const edges = petioleEdges(curve, width, tipWidth)
  return { leafRotation: angle, root, curve, outline, width, tipWidth, edges }
}

function petioleEdges(curve: Curve, width: number, tipWidth: number) {
  const edge = (side: number): Curve => {
    const at = (i: number) => {
      const t = i / 3
      const axis = normal(curvePoint(curve, Math.max(0, t - 0.01)), curvePoint(curve, Math.min(1, t + 0.01)))
      return offset(curve[i], axis, side * (tipWidth + (width - tipWidth) * (1 - t)) / 2)
    }
    return [at(0), at(1), at(2), at(3)]
  }
  return [edge(1), edge(-1)]
}

export function petioleOutline(curve: Curve, width: number, tipWidth: number) {
  const [left, right] = petioleEdges(curve, width, tipWidth)
  return `M${point(left[0])} C${point(left[1])} ${point(left[2])} ${point(left[3])}`
    + ` L${point(right[3])} C${point(right[2])} ${point(right[1])} ${point(right[0])} Z`
}

function tangentAt(position: number, blade: readonly Curve[]) {
  const index = Math.min(blade.length - 1, Math.floor(position)), t = position - index
  const a = curvePoint(blade[index], Math.max(0, t - 0.001)), b = curvePoint(blade[index], Math.min(1, t + 0.001))
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length === 0) throw new Error("Missing monstera margin tangent")
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
}

function taperedVein(curve: Curve, width: number) {
  const left: Point[] = [], right: Point[] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const axis = normal(curvePoint(curve, Math.max(0, t - 0.01)), curvePoint(curve, Math.min(1, t + 0.01)))
    const half = (0.07 + width * (1 - t) ** 1.5) / 2
    left.push(offset(curvePoint(curve, t), axis, half))
    right.unshift(offset(curvePoint(curve, t), axis, -half))
  }
  return `M${[...left, ...right].map(point).join(" L")} Z`
}

export function organicMonsteraMarkingGeometry(seed: number, pattern: typeof MONSTERA_MARKINGS[number], age = 0, coverage?: number) {
  const base = organicMonsteraBlade(seed)
  const width = Math.max(...base.boundary.map((p) => p.x)) - Math.min(...base.boundary.map((p) => p.x))
  const markings = noiseVariegation(seed, pattern, base.boundary, { spine: base.spine, width }, age, { coverage })
  if (coverage !== 1 || pattern === "plain") return markings
  return { ...markings, paths: [base.edge],
    pink: markings.pink.target === 1 ? { ...markings.pink, paths: [base.edge] } : markings.pink }
}
export function organicMonsteraMarkings(seed: number, pattern: typeof MONSTERA_MARKINGS[number], age = 0) {
  return organicMonsteraMarkingGeometry(seed, pattern, age).paths
}

export function organicMonstera(seed: number, age: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Monstera seed must be a non-negative safe integer")
  if (!Number.isInteger(age) || age < 0 || age > 5) throw new RangeError("Monstera age must be between 0 and 5")
  const base = organicMonsteraBlade(seed)
  const { spine, boundary, blade } = base

  // Venation is a complete anatomical scaffold, independent of the number of cuts.
  const stagger = sceneRandom(seed, "monstera-sector-stagger")() < 0.5 ? -1 : 1
  const fields = [-1, 1].map((side) => Array.from({ length: 7 }, (_, i) => {
    const wave = noise(seed + 503, i * 0.55 + 0.23, side * 1.4 + 2.7)
    const nominal = 0.16 + i * 0.12
    const progress = nominal + stagger * side * Math.sin(Math.PI * nominal) * 0.025 + wave * 0.026
    const y = base.tip.y * progress
    const rim = margin(side, y, base)
    const axis = spineAtY(spine, y)
    const start = curvePoint(spine, progress ** 2.15)
    const end = { x: axis.x + (rim.x - axis.x) * 0.92, y }
    const rise = start.y - end.y
    const curve: Curve = [start,
      { x: start.x + (end.x - start.x) * 0.38, y: start.y - rise * 0.16 },
      { x: start.x + (end.x - start.x) * 0.82, y: end.y + rise * 0.25 }, end]
    return { curve, rim, width: 0.65 + wave * 0.09, finger: `${side}:${i}` }
  }))

  const allCuts = [-1, 1].flatMap((side, s) => Array.from({ length: 5 }, (_, slot) => {
    const a = fields[s][slot], b = fields[s][slot + 1]
    const random = sceneRandom(seed, `monstera-division:${side}:${slot}`)
    const balance = 0.4 + random() * 0.2
    const guide: Curve = [mixPoint(a.curve[0], b.curve[0], balance), mixPoint(a.curve[1], b.curve[1], balance),
      mixPoint(a.curve[2], b.curve[2], balance), mixPoint(a.curve[3], b.curve[3], balance)]
    const mouthY = a.rim.y + (b.rim.y - a.rim.y) * balance
    const space = Math.abs(a.rim.y - b.rim.y)
    const fullMouth = Math.min(space * (0.34 + random() * 0.08), space * Math.min(balance, 1 - balance) - 1.5)
    const u = slot === 0 ? 0.49 + random() * 0.12 : 0.27 + random() * 0.25
    const tip = curvePoint(guide, u)
    const before = curvePoint(guide, u - 0.015), after = curvePoint(guide, u + 0.015)
    const forwardLength = Math.hypot(after.x - before.x, after.y - before.y)
    const forward = { x: (after.x - before.x) / forwardLength, y: (after.y - before.y) / forwardLength }
    const rawNormal = normal(before, after)
    const upperNormal = rawNormal.y < 0 ? rawNormal : { x: -rawNormal.x, y: -rawNormal.y }
    const gap = Math.hypot(curvePoint(a.curve, u).x - curvePoint(b.curve, u).x, curvePoint(a.curve, u).y - curvePoint(b.curve, u).y)
    const adjacentCurves = [a, b].map((vein) => sample(vein.curve, 64))
    const fullRadius = Math.min(2.4 + random() * 0.9, gap * 0.29)
    const shapeAt = (scale: number) => {
      const mouth = fullMouth * scale, radius = fullRadius * scale
      const top = margin(side, mouthY - mouth, base), bottom = margin(side, mouthY + mouth, base)
      const upperEnd = offset(tip, upperNormal, radius), lowerEnd = offset(tip, upperNormal, -radius)
      const length = Math.hypot((top.x + bottom.x) / 2 - tip.x, mouthY - tip.y)
      const handle = Math.min(3.1, mouth * 0.72)
      const upper: Curve = [top, offset(top, tangentAt(top.position, blade), side === -1 ? -handle : handle),
        offset(offset(upperEnd, forward, length * 0.38), upperNormal, mouth * 0.22), upperEnd]
      const cap: Curve = [upperEnd, offset(upperEnd, forward, -radius * 1.33), offset(lowerEnd, forward, -radius * 1.33), lowerEnd]
      const lower: Curve = [lowerEnd, offset(offset(lowerEnd, forward, length * 0.38), upperNormal, -mouth * 0.22),
        offset(bottom, tangentAt(bottom.position, blade), side === -1 ? handle : -handle), bottom]
      const curves = [upper, cap, lower]
      return { mouth, radius, top, bottom, length, curves, interior: curves.flatMap((curve) => sample(curve, 24)) }
    }
    const adjacentVeins = adjacentCurves.flat()
    const fits = (shape: ReturnType<typeof shapeAt>) => adjacentVeins.every((p) =>
      !inside(p, shape.interior) && clearance(p, shape.interior) > 0.7)
    let shape = shapeAt(1)
    if (!fits(shape)) {
      // Widen the slit only as far as the unchanged neighbouring veins allow.
      let lo = 0, hi = 1
      shape = shapeAt(lo)
      if (!fits(shape)) throw new Error(`No tissue-safe monstera division at ${side}:${slot}`)
      for (let i = 0; i < 8; i++) {
        const scale = (lo + hi) / 2, candidate = shapeAt(scale)
        if (fits(candidate)) { lo = scale; shape = candidate }
        else hi = scale
      }
    }
    const { mouth, radius, top, bottom, length, curves } = shape
    const outsideBottom = { x: side * 82, y: bottom.y }, outsideTop = { x: side * 82, y: top.y }
    return {
      id: `${side}:${slot}`, side, slot, rank: ORDER.indexOf(slot), tip, mouthY, mouth, radius, curves,
      penetration: 1 - u, sweep: tip.y - mouthY, reach: length,
      polygon: [...shape.interior, outsideBottom, outsideTop],
      entry: Math.min(top.position, bottom.position), exit: Math.max(top.position, bottom.position),
      d: `M${point(top)} ${curveCommands(curves)} L${point(outsideBottom)} L${point(outsideTop)} Z`,
    }
  }))
  const cuts = allCuts.filter((cut) => cut.rank < age)
  const contour: Curve[] = []
  let cursor = 0
  for (const cut of [...cuts].sort((a, b) => a.entry - b.entry)) {
    contour.push(...perimeterBetween(cursor, cut.entry, blade))
    contour.push(...(cut.side === 1 ? cut.curves : [...cut.curves].reverse().map(([a, b, c, d]): Curve => [d, c, b, a])))
    cursor = cut.exit
  }
  contour.push(...perimeterBetween(cursor, blade.length, blade))
  const outline = `M0 0 ${curveCommands(contour)} Z`

  const primaryCurves = [spine, ...fields.flatMap((side) => side.map((vein) => vein.curve))]
  const primarySamples = primaryCurves.map((curve) => sample(curve, 24))
  const allHoles = fields.flatMap((side, s) => Array.from({ length: 5 }, (_, slot) => {
    const random = sceneRandom(seed, `monstera-opening:${s}:${slot}`)
    if (random() > 0.65) return []
    for (const u of [0.21, 0.28, 0.35]) {
      const a = curvePoint(side[slot].curve, u), b = curvePoint(side[slot + 1].curve, u)
      const center = mixPoint(a, b, 0.5)
      const guide: Curve = [mixPoint(side[slot].curve[0], side[slot + 1].curve[0], 0.5),
        mixPoint(side[slot].curve[1], side[slot + 1].curve[1], 0.5),
        mixPoint(side[slot].curve[2], side[slot + 1].curve[2], 0.5),
        mixPoint(side[slot].curve[3], side[slot + 1].curve[3], 0.5)]
      const before = curvePoint(guide, u - 0.01), after = curvePoint(guide, u + 0.01)
      const angle = Math.atan2(after.y - before.y, after.x - before.x)
      const length = 2.4 + random() * 1.8, width = 1 + random() * 0.7
      const vertices = Array.from({ length: 24 }, (_, j) => {
        const t = j / 24 * Math.PI * 2
        return {
          x: center.x + Math.cos(angle) * Math.cos(t) * length - Math.sin(angle) * Math.sin(t) * width,
          y: center.y + Math.sin(angle) * Math.cos(t) * length + Math.cos(angle) * Math.sin(t) * width,
        }
      })
      const safe = vertices.every((p) => inside(p, boundary) && clearance(p, boundary) > 2
        && allCuts.every((cut) => !inside(p, cut.polygon) && clearance(p, cut.polygon) > 1.3)
        && primarySamples.every((points) => {
          for (let i = 1; i < points.length; i++) {
            if (distanceToSegment(p, points[i - 1], points[i]) <= 0.65) return false
          }
          return true
        }))
      if (!safe) continue
      const rotation = angle * 180 / Math.PI
      return [{ id: `${s}:${slot}`, rank: 1 + Math.floor(random() * 3), center, vertices, rotation, length, width,
        d: `M${point({ x: center.x - length, y: center.y })} a${length} ${width} 0 1 0 ${length * 2} 0 a${length} ${width} 0 1 0 ${-length * 2} 0 Z` }]
    }
    return []
  }).flat())
  const holes = allHoles.filter((hole) => hole.rank < age)

  const veins = [{ d: taperedVein(spine, 1.8), depth: 0, curve: spine, width: 1.8, finger: "midrib", rim: base.tip }]
  fields.forEach((side) => side.forEach((vein) => {
    veins.push({ d: taperedVein(vein.curve, vein.width), depth: 1, ...vein })
  }))
  const safeDetail = (curve: Curve) => sample(curve, 32).every((p) => inside(p, boundary)
    && cuts.every((cut) => !inside(p, cut.polygon) && clearance(p, cut.polygon) > 0.4)
    && holes.every((hole) => !inside(p, hole.vertices)))
  fields.forEach((side, s) => side.slice(0, -1).forEach((vein, i) => {
    for (const u of [0.43, 0.67]) {
      const a = curvePoint(vein.curve, u), b = curvePoint(side[i + 1].curve, u * 0.94)
      const bow = s === 0 ? -0.6 : 0.6
      const curve: Curve = [a, { ...mixPoint(a, b, 0.3), x: mixPoint(a, b, 0.3).x + bow },
        { ...mixPoint(a, b, 0.7), x: mixPoint(a, b, 0.7).x + bow }, b]
      if (safeDetail(curve)) veins.push({ d: taperedVein(curve, 0.13), depth: 2, curve, width: 0.13, finger: `detail:${s}:${i}:${u}`, rim: b })
    }
  }))
  return { edge: base.edge, height: base.height, offsetY: base.offsetY, attachment: base.attachment, tip: base.tip,
    outline, veins, cuts, holes, splits: age, apexReserve: Math.abs(base.tip.y) * 0.2 }
}

export function organicMonsteraSilhouette(anatomy: {
  outline: string; holes: readonly { rotation: number; center: Point; length: number; width: number }[]
}) {
  return [anatomy.outline, ...anatomy.holes.map((hole) => {
    const radians = hole.rotation * Math.PI / 180
    const dx = Math.cos(radians) * hole.length * 2, dy = Math.sin(radians) * hole.length * 2
    const start = { x: hole.center.x - dx / 2, y: hole.center.y - dy / 2 }
    return `M${point(start)} a${hole.length} ${hole.width} ${hole.rotation} 1 0 ${dx} ${dy} a${hole.length} ${hole.width} ${hole.rotation} 1 0 ${-dx} ${-dy} Z`
  })].join(" ")
}
