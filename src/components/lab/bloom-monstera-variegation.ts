import { curvePoint, sceneRandom, type Curve, type Point } from "./bloom-math.ts"
import { MONSTERA_AGE, MONSTERA_MARKINGS, MONSTERA_STUDY_VARIEGATION_AGE, MONSTERA_STUDY_VARIEGATION_COLOR } from "./bloom-tokens.ts"

type Pattern = typeof MONSTERA_MARKINGS[number]
type Ring = { points: Point[]; area: number }
const GRID = { x: -70, y: -145, step: 1.25, columns: 112, rows: 120 } as const
const COVERAGE = {
  marbled: [0.25, 0.4],
  patches: [0.28, 0.46],
  streaks: [0.14, 0.26],
  tips: [0.1, 0.19],
} as const

export function seededVariegationCoverage(seed: number, pattern: Pattern, age = 0) {
  if (pattern === "plain") return 0
  const range = COVERAGE[pattern], random = sceneRandom(seed, `variegation-coverage:${pattern}`)
  const target = range[0] + (range[1] - range[0]) * random()
  return target * (1 + age / MONSTERA_AGE.max * MONSTERA_STUDY_VARIEGATION_AGE.ivoryGrowth)
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const pointText = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`
const DIRECTIONS = Array.from({ length: 8 }, (_, i) => {
  const angle = i * Math.PI / 4
  return { x: Math.cos(angle), y: Math.sin(angle) }
})

function hash(seed: number, x: number, y: number) {
  let value = seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(y, 0x27d4eb2d)
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  return (value ^ (value >>> 16)) >>> 0
}

export function noise(seed: number, x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy
  const dot = (dx: number, dy: number) => {
    const direction = DIRECTIONS[hash(seed, ix + dx, iy + dy) % 8]
    return direction.x * (tx - dx) + direction.y * (ty - dy)
  }
  return mix(mix(dot(0, 0), dot(1, 0), fade(tx)), mix(dot(0, 1), dot(1, 1), fade(tx)), fade(ty)) * 1.4
}

function fbm(seed: number, x: number, y: number) {
  return noise(seed, x, y) * 0.65 + noise(seed + 71, x * 2.03, y * 2.03) * 0.25
    + noise(seed + 139, x * 4.11, y * 4.11) * 0.1
}

function rasterize(boundaries: readonly (readonly Point[])[], rows: number) {
  const { columns, step, x, y } = GRID
  const stride = columns + 1
  const mask = new Uint8Array(stride * (rows + 1))
  for (let row = 0; row <= rows; row++) {
    const sampleY = y + row * step
    const intersections: number[] = []
    for (const boundary of boundaries) {
      for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
        const a = boundary[i], b = boundary[j]
        if ((a.y > sampleY) !== (b.y > sampleY)) {
          intersections.push((b.x - a.x) * (sampleY - a.y) / (b.y - a.y) + a.x)
        }
      }
    }
    intersections.sort((a, b) => a - b)
    let crossing = 0
    for (let column = 0; column <= columns; column++) {
      const sampleX = x + column * step
      while (crossing < intersections.length && intersections[crossing] <= sampleX) crossing++
      mask[row * stride + column] = crossing % 2
    }
  }
  return mask
}

// Thresholds select coverage, while low-frequency fields determine connected shapes.
function field(seed: number, pattern: Exclude<Pattern, "plain">, profile?: "leaf") {
  const random = sceneRandom(seed, `variegation-field:${pattern}`)
  const ox = random() * 60, oy = random() * 60
  const frequency = 2.2 + random() * 1.1
  const side = random() < 0.5 ? -1 : 1
  const sector = (random() - 0.5) * 0.25
  const phase = random() * Math.PI * 2
  const streaks = Array.from({ length: 3 + Math.floor(random() * 2) }, (_, i) => ({
    lane: (i - 1.5) * (17 + random() * 5) + (random() - 0.5) * 10,
    width: 4 + random() * 4,
    phase: random() * Math.PI * 2,
  }))
  const patchRandom = sceneRandom(seed, "leaf-variegation-patches")
  const patches = profile === "leaf" ? Array.from({ length: 4 }, (_, i) => ({
    x: (i % 2 === 0 ? 0.26 : 0.74) + (patchRandom() - 0.5) * 0.06,
    y: 0.18 + i * 0.22 + (patchRandom() - 0.5) * 0.035,
    rx: 0.15 + patchRandom() * 0.025, ry: 0.09 + patchRandom() * 0.02,
  })) : []
  const pigmentRandom = sceneRandom(seed, "variegation-pigment")
  const amount = pigmentRandom()
  const rules = MONSTERA_STUDY_VARIEGATION_COLOR
  const pinkTarget = amount < rules.endpointChance ? 0 : amount > 1 - rules.endpointChance ? 1
    : mix(0.12, 0.88, fade((amount - rules.endpointChance) / (1 - rules.endpointChance * 2)))
  const pinkFrequency = mix(rules.frequency[0], rules.frequency[1], pigmentRandom())
  const pinkX = pigmentRandom() * 60, pinkY = pigmentRandom() * 60
  const coordinates = (x: number, y: number) => {
    const u = x / 112 + 0.5, v = -y / 124
    const warpX = noise(seed + 11, u * 2 + ox, v * 2 + oy) * 0.07
    const warpY = noise(seed + 23, u * 2 + ox + 14, v * 2 + oy) * 0.055
    const a = u + warpX, b = v + warpY
    return { u, v, a, b }
  }
  const white = (x: number, y: number) => {
    const { u, v, a, b } = coordinates(x, y)
    const coarse = profile === "leaf"
      ? noise(seed, a * frequency + ox, b * frequency + oy)
        + noise(seed + 71, a * frequency * 1.65 + ox, b * frequency * 1.65 + oy) * 0.1
      : fbm(seed, a * frequency + ox, b * frequency + oy)
    const detail = profile === "leaf" ? noise(seed + 41, a * 4 + ox, b * 4 + oy)
      : fbm(seed + 41, a * 13 + ox, b * 13 + oy)
    switch (pattern) {
      case "marbled":
        if (profile === "leaf") return coarse + detail * 0.06
        return coarse + detail * 0.18 + noise(seed + 81, a * 29 + ox, b * 29 + oy) * 0.055
      case "patches":
        if (profile === "leaf") {
          return Math.max(...patches.map((patch) =>
            1 - ((a - patch.x) / patch.rx) ** 2 - ((b - patch.y) / patch.ry) ** 2)) + coarse * 0.12
        }
        return side * (a - 0.5 - sector) * 1.5 + coarse * 0.6 + detail * 0.085
      case "tips":
        if (profile === "leaf") return (v - 0.72) * 2.3 + coarse * 0.25 + detail * 0.03 + side * (u - 0.5) * 0.18
        return (v - 0.72) * 2.3 + coarse * 0.38 + detail * 0.07 + side * (u - 0.5) * 0.18
      case "streaks": {
        if (v <= 0 || v >= 1) return -2
        const envelope = Math.sin(Math.PI * v) ** 0.7
        const bend = noise(seed + 53, v * 2 + oy, ox) * 4 * envelope
        return Math.max(...streaks.map((streak) => {
          const center = streak.lane * envelope + bend
            + Math.sin(v * 3 + streak.phase) * 2 * envelope
          const width = streak.width * envelope * (1 + noise(seed + 67, v * 3 + streak.phase, phase) * (profile === "leaf" ? 0.12 : 0.3))
          return 1 - Math.abs(x - center) / width + detail * (profile === "leaf" ? 0.03 : 0.12)
        }))
      }
    }
  }
  const pink = (x: number, y: number) => {
    const { a, b } = coordinates(x, y)
    return noise(seed + 817, a * pinkFrequency + pinkX, b * pinkFrequency + pinkY)
      + noise(seed + 929, a * pinkFrequency * 2 + pinkX, b * pinkFrequency * 2 + pinkY) * 0.14
  }
  return { white, pink, pinkTarget }
}

function contours(values: Float64Array, threshold: number, rows: number, minArea = 0.8): Ring[] {
  const { columns, step, x: left, y: top } = GRID
  const stride = columns + 1
  const adjacency = new Map<string, string[]>()
  const positions = new Map<string, Point>()
  const connect = (a: string, b: string) => {
    const from = adjacency.get(a) ?? [], to = adjacency.get(b) ?? []
    from.push(b); to.push(a)
    adjacency.set(a, from); adjacency.set(b, to)
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * stride + column
      const first = values[index] > threshold
      if ((values[index + 1] > threshold) === first && (values[index + stride + 1] > threshold) === first
        && (values[index + stride] > threshold) === first) continue
      const corners = [values[index], values[index + 1], values[index + stride + 1], values[index + stride]]
      const edges = [
        { key: `h:${column}:${row}`, a: 0, b: 1, x: column, y: row, dx: 1, dy: 0 },
        { key: `v:${column + 1}:${row}`, a: 1, b: 2, x: column + 1, y: row, dx: 0, dy: 1 },
        { key: `h:${column}:${row + 1}`, a: 3, b: 2, x: column, y: row + 1, dx: 1, dy: 0 },
        { key: `v:${column}:${row}`, a: 0, b: 3, x: column, y: row, dx: 0, dy: 1 },
      ]
      const crossings = edges.flatMap((edge) => {
        const a = corners[edge.a], b = corners[edge.b]
        if ((a > threshold) === (b > threshold)) return []
        const t = Math.max(0.0001, Math.min(0.9999, (threshold - a) / (b - a)))
        positions.set(edge.key, { x: left + (edge.x + edge.dx * t) * step, y: top + (edge.y + edge.dy * t) * step })
        return [edge.key]
      })
      if (crossings.length === 2) connect(crossings[0], crossings[1])
      else if (crossings.length === 4) {
        // Consistent saddle resolution keeps every contour node at degree two.
        const centerAbove = corners.reduce((sum, value) => sum + value, 0) / 4 > threshold
        if ((corners[0] > threshold) === centerAbove) {
          connect(crossings[0], crossings[1]); connect(crossings[2], crossings[3])
        } else {
          connect(crossings[0], crossings[3]); connect(crossings[1], crossings[2])
        }
      }
    }
  }
  const visited = new Set<string>(), rings: Ring[] = []
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue
    const points: Point[] = []
    let current = start, previous: string | undefined
    do {
      if (visited.has(current)) throw new Error("Variegation contour intersects another ring")
      visited.add(current)
      const p = positions.get(current), neighbours = adjacency.get(current)
      if (!p || !neighbours || neighbours.length !== 2) throw new Error("Open variegation contour")
      points.push(p)
      const next: string = neighbours[0] === previous ? neighbours[1] : neighbours[0]
      previous = current; current = next
    } while (current !== start)
    const area = Math.abs(points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length]
      return sum + p.x * q.y - q.x * p.y
    }, 0)) / 2
    if (area >= minArea) rings.push({ points, area })
  }
  return rings
}

function simplifyRing({ points, area }: Ring) {
  const tolerance = Math.min(1.6, Math.sqrt(area) * 0.12)
  const distanceSquared = (p: Point, a: Point, b: Point) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const length = dx * dx + dy * dy
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
    return (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2
  }
  // Split the closed ring into two arcs so simplification cannot collapse its seam.
  const opposite = points.reduce((best, p, i) =>
    distanceSquared(p, points[0], points[0]) > distanceSquared(points[best], points[0], points[0]) ? i : best, 0)
  const closed = [...points, points[0]]
  const keep = new Set([0, opposite, points.length])
  const simplify = (start: number, end: number) => {
    let farthest = -1, distance = tolerance ** 2
    for (let i = start + 1; i < end; i++) {
      const candidate = distanceSquared(closed[i], closed[start], closed[end])
      if (candidate > distance) { farthest = i; distance = candidate }
    }
    if (farthest === -1) return
    keep.add(farthest)
    simplify(start, farthest)
    simplify(farthest, end)
  }
  simplify(0, opposite)
  simplify(opposite, points.length)
  const simplified = points.filter((_, i) => keep.has(i))
  return simplified.length >= 3 ? simplified : points
}

function roundedRing(ring: Ring, rounding?: number) {
  const points = simplifyRing(ring)
  if (rounding !== undefined) {
    // Shared tangents remove corners without shrinking narrow material regions.
    const tangents = points.map((p, i) => {
      const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length]
      const dx = next.x - previous.x, dy = next.y - previous.y, length = Math.hypot(dx, dy)
      if (length === 0) throw new Error("Degenerate variegation contour tangent")
      const handle = Math.min(rounding, Math.hypot(p.x - previous.x, p.y - previous.y) * 0.3,
        Math.hypot(next.x - p.x, next.y - p.y) * 0.3)
      return { x: dx / length * handle, y: dy / length * handle }
    })
    const boundary: Point[] = [points[0]]
    let path = `M${pointText(points[0])}`
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length, start = points[i], end = points[next]
      const c1 = { x: start.x + tangents[i].x, y: start.y + tangents[i].y }
      const c2 = { x: end.x - tangents[next].x, y: end.y - tangents[next].y }
      path += ` C${pointText(c1)} ${pointText(c2)} ${pointText(end)}`
      for (let step = 1; step <= 8; step++) {
        boundary.push(curvePoint([start, c1, c2, end], step / 8))
      }
    }
    return { path: `${path} Z`, boundary }
  }
  const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  let start = middle(points[points.length - 1], points[0])
  let path = `M${pointText(start)}`
  const boundary: Point[] = [start]
  for (let i = 0; i < points.length; i++) {
    const control = points[i], end = middle(control, points[(i + 1) % points.length])
    path += ` Q${pointText(control)} ${pointText(end)}`
    for (let step = 1; step <= 8; step++) {
      const t = step / 8, u = 1 - t
      boundary.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y })
    }
    start = end
  }
  return { path: `${path} Z`, boundary }
}

export function noiseVariegation(seed: number, pattern: Pattern, blade: readonly Point[], frame?: { spine: Curve; width: number }, age: number = MONSTERA_AGE.min, options: { coverage?: number; pink?: boolean; rounding?: number; profile?: "leaf" } = {}) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Variegation seed must be a non-negative safe integer")
  if (blade.length < 3) throw new RangeError("Variegation requires a blade boundary")
  if (!Number.isInteger(age) || age < MONSTERA_AGE.min || age > MONSTERA_AGE.max) {
    throw new RangeError(`Variegation age must be between ${MONSTERA_AGE.min} and ${MONSTERA_AGE.max}`)
  }
  if (options.coverage !== undefined && (!Number.isFinite(options.coverage) || options.coverage < 0 || options.coverage > 1)) {
    throw new RangeError("Variegation coverage must be between 0 and 1")
  }
  if (options.rounding !== undefined && (!Number.isFinite(options.rounding) || options.rounding <= 0)) {
    throw new RangeError("Variegation rounding must be positive and finite")
  }
  const emptyPink = { paths: [] as string[], boundaries: [] as Point[][], target: 0, coverage: 0 }
  if (pattern === "plain" || options.coverage === 0) return { paths: [] as string[], rings: [] as Ring[], boundaries: [] as Point[][], coverage: 0, target: 0, pink: emptyPink }
  if (options.coverage === 1 && options.pink === false) {
    const path = `M${blade.map(pointText).join(" L")} Z`
    return { paths: [path], rings: [] as Ring[], boundaries: [Array.from(blade)], coverage: 1, target: 1, pink: emptyPink }
  }
  const { columns, step, x, y } = GRID
  const rows = Math.max(GRID.rows, Math.ceil((Math.max(...blade.map((p) => p.y)) + 5 - y) / step))
  const fields = field(seed, pattern, options.profile)
  const maturity = (age - MONSTERA_AGE.min) / (MONSTERA_AGE.max - MONSTERA_AGE.min)
  const development = MONSTERA_STUDY_VARIEGATION_AGE
  const rowCoordinates = Array.from({ length: rows + 1 }, (_, row) => {
    const sampleY = y + row * step
    if (!frame) return { centerX: 0, y: sampleY }
    const progress = (frame.spine[0].y - sampleY) / (frame.spine[0].y - frame.spine[3].y)
    return { centerX: curvePoint(frame.spine, Math.max(0, Math.min(1, progress))).x, y: -progress * 124 }
  })
  const values = new Float64Array((columns + 1) * (rows + 1))
  const inBlade: number[] = []
  const bladeMask = rasterize([blade], rows)
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const sampleX = x + column * step, coordinates = rowCoordinates[row]
      // Direct coverage needs unique ranks even on a streak's constant endcap.
      const tieBreak = options.coverage === undefined ? 0 : noise(seed + 977, sampleX / 112, coordinates.y / 124) * 1e-7
      const value = fields.white(frame ? (sampleX - coordinates.centerX) * 112 / frame.width : sampleX, coordinates.y) + tieBreak
      values[row * (columns + 1) + column] = row === 0 || column === 0 || row === rows || column === columns ? -100 : value
      if (bladeMask[row * (columns + 1) + column]) {
        inBlade.push(value)
      }
    }
  }
  if (!inBlade.length) throw new Error("Variegation grid does not contain the blade")
  // Age moves thresholds over the same fields; it never reseeds or shifts the pattern.
  const juvenileTarget = options.coverage ?? seededVariegationCoverage(seed, pattern)
  const target = options.coverage ?? juvenileTarget * (1 + maturity * development.ivoryGrowth)
  const sorted = [...inBlade].sort((a, b) => a - b)
  const threshold = sorted[Math.min(sorted.length - 1, Math.floor((1 - target) * sorted.length))]
  const rings = options.coverage === 1 ? [] : contours(values, threshold, rows)
  if (!rings.length && options.coverage !== 1) throw new Error("Variegation produced no contours")
  const rounded = rings.map((ring) => roundedRing(ring, options.rounding))
  const paths = options.coverage === 1 ? [`M${blade.map(pointText).join(" L")} Z`] : [rounded.map((ring) => ring.path).join(" ")]
  const boundaries = options.coverage === 1 ? [Array.from(blade)] : rounded.map((ring) => ring.boundary)
  const pinkTarget = options.pink === false ? 0 : fields.pinkTarget === 0 || fields.pinkTarget === 1 ? fields.pinkTarget
    : fields.pinkTarget * (1 + maturity * development.pinkDevelopment)
  let pink = emptyPink
  if (pinkTarget === 1) {
    pink = { paths, boundaries, target: 1, coverage: 1 }
  } else if (pinkTarget > 0) {
    const whiteMask = rasterize(boundaries, rows)
    // Anchor pink quantiles to the juvenile ivory region so expanding ivory cannot relocate pink.
    const juvenileThreshold = sorted[Math.min(sorted.length - 1, Math.floor((1 - juvenileTarget) * sorted.length))]
    const referenceMask = age === MONSTERA_AGE.min || options.coverage === 1 ? whiteMask
      : rasterize(contours(values, juvenileThreshold, rows).map((ring) => roundedRing(ring, options.rounding).boundary), rows)
    const insideWhite: number[] = []
    const insideReference: number[] = []
    for (let index = 0; index < whiteMask.length; index++) {
      if (whiteMask[index] && bladeMask[index]) insideWhite.push(index)
      if (referenceMask[index] && bladeMask[index]) insideReference.push(index)
    }
    if (!insideWhite.length || !insideReference.length) throw new Error("Variegation pigment mask contains no white samples")
    const pinkValues = new Float64Array(values.length)
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const index = row * (columns + 1) + column
        const sampleX = x + column * step, coordinates = rowCoordinates[row]
        pinkValues[index] = row === 0 || column === 0 || row === rows || column === columns ? -100
          : fields.pink(frame ? (sampleX - coordinates.centerX) * 112 / frame.width : sampleX, coordinates.y)
      }
    }
    // Choose coverage inside the reference ivory mask, not across the whole blade.
    const sortedPink = insideReference.map((index) => pinkValues[index]).sort((a, b) => a - b)
    const pinkThreshold = sortedPink[Math.floor((1 - pinkTarget) * sortedPink.length)]
    const pinkRings = contours(pinkValues, pinkThreshold, rows, MONSTERA_STUDY_VARIEGATION_COLOR.minIslandArea).map((ring) => roundedRing(ring, options.rounding))
    if (!pinkRings.length) throw new Error("Variegation pigment field produced no contours")
    const pinkBoundaries = pinkRings.map((ring) => ring.boundary)
    const pinkMask = rasterize(pinkBoundaries, rows)
    let pinkSamples = 0
    for (const index of insideWhite) pinkSamples += pinkMask[index]
    pink = {
      paths: [pinkRings.map((ring) => ring.path).join(" ")],
      boundaries: pinkBoundaries, target: pinkTarget,
      coverage: pinkSamples / insideWhite.length,
    }
  }
  return {
    paths, boundaries, pink,
    rings, coverage: options.coverage === 1 ? 1 : inBlade.filter((value) => value > threshold).length / inBlade.length, target,
  }
}
