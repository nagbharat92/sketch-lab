import type { FlowerPlant, GardenScene, MonsteraPlant } from "./bloom-garden.ts"
import { boundaryClearance, pointInsidePolygon, sceneRandom, type Point } from "./bloom-math.ts"
import { createGardenMonsteraPose, monsteraProjection } from "./bloom-monstera-pose.ts"
import { organicMonsteraBlade } from "./bloom-monstera-study-geometry.ts"
import { BLOOM_COMPOSITION, BLOOM_SCENE } from "./bloom-tokens.ts"

type Footprint = { boundary: Point[]; samples: Point[]; center: Point; area: number }
type SampleMask = readonly [number, number]
type Candidate = Footprint & { plant: MonsteraPlant; score: number; visible: SampleMask }
const coverageCache = new WeakMap<Candidate, WeakMap<Candidate, SampleMask>>()
const rules = BLOOM_COMPOSITION.monsteraGrouping
const roles = ["king", "general", "soldier", "commoner"] as const
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function sampleMask(samples: Point[], contains: (point: Point) => boolean): SampleMask {
  // The fixed 6x8 sampling grid fits in two words, so cached overlap checks stay cheap.
  let low = 0, high = 0
  samples.forEach((point, i) => {
    if (!contains(point)) return
    if (i < 32) low |= 1 << i
    else high |= 1 << (i - 32)
  })
  return [low, high]
}

function countBits(value: number) {
  value -= (value >>> 1) & 0x55555555
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333)
  return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

function coveredSamples(candidate: Candidate, other: Candidate): SampleMask {
  let cache = coverageCache.get(candidate)
  if (!cache) { cache = new WeakMap(); coverageCache.set(candidate, cache) }
  const previous = cache.get(other)
  if (previous) return previous
  const covered = sampleMask(candidate.samples, (point) => pointInsidePolygon(point, other.boundary))
  cache.set(other, covered)
  return covered
}

function localFootprint(plant: MonsteraPlant) {
  const boundary = organicMonsteraBlade(plant.anatomySeed).boundary.filter((_, i) => i % 8 === 0)
  const xs = boundary.map((p) => p.x), ys = boundary.map((p) => p.y)
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
  const samples: Point[] = []
  for (let x = 0; x < 6; x++) for (let y = 0; y < 8; y++) {
    const point = { x: left + (x + 0.5) / 6 * (right - left), y: top + (y + 0.5) / 8 * (bottom - top) }
    if (pointInsidePolygon(point, boundary)) samples.push(point)
  }
  return { boundary, samples, center: { x: (left + right) / 2, y: (top + bottom) / 2 },
    area: (right - left) * (bottom - top) }
}

function footprint(plant: MonsteraPlant, local: Footprint): Footprint {
  const project = monsteraProjection(plant.pose.blade)
  return { boundary: local.boundary.map(project), samples: local.samples.map(project),
    center: project(local.center), area: local.area * plant.pose.blade.scale.x * plant.pose.blade.scale.y }
}

function flowerCovers(point: Point, flowers: FlowerPlant[]) {
  return flowers.some((flower) => distance(point, flower.curve[3]) < flower.diameter * 0.36
    || flower.leaves.some((leaf) => {
      const angle = leaf.angle * Math.PI / 180
      const x = point.x - leaf.x, y = point.y - leaf.y
      const along = x * Math.sin(angle) - y * Math.cos(angle)
      const across = x * Math.cos(angle) + y * Math.sin(angle)
      return ((along - leaf.length / 2) / (leaf.length / 2)) ** 2 + (across / (leaf.width * 0.8)) ** 2 < 1
    }))
}

function evaluateGroup(group: Candidate[], flowers: FlowerPlant[]) {
  let score = group.reduce((sum, candidate) => sum + candidate.score, 0)
  const exposed = group.map((candidate, i) => {
    let [low, high] = candidate.visible
    for (const other of group.slice(i + 1)) {
      const covered = coveredSamples(candidate, other)
      low &= ~covered[0]; high &= ~covered[1]
    }
    return (countBits(low) + countBits(high)) / candidate.samples.length
  })
  for (const fraction of exposed) score += Math.max(0, rules.minVisible - fraction) ** 2 * 1000000
  let maxOverlap = 0
  for (let i = 0; i < group.length; i++) {
    for (const other of group.slice(i + 1)) {
      const a = coveredSamples(group[i], other), b = coveredSamples(other, group[i])
      const overlap = Math.max((countBits(a[0]) + countBits(a[1])) / group[i].samples.length,
        (countBits(b[0]) + countBits(b[1])) / other.samples.length)
      maxOverlap = Math.max(maxOverlap, overlap)
      score += Math.max(0, overlap - rules.maxPairOverlap) ** 2 * 1000000
      score += Math.max(0, 64 - distance(group[i].center, other.center)) ** 2 * 0.25
    }
  }
  const flowerMass = flowers.reduce((sum, flower) => sum + flower.diameter ** 2, 0)
  const mass = flowerMass + group.reduce((sum, candidate) => sum + candidate.area * 0.65, 0)
  const centerX = (flowers.reduce((sum, flower) => sum + flower.curve[3].x * flower.diameter ** 2, 0)
    + group.reduce((sum, candidate) => sum + candidate.center.x * candidate.area * 0.65, 0)) / mass
  score += (centerX - BLOOM_SCENE.centerX) ** 2 * 0.08
  const heightSpan = Math.max(...group.map((candidate) => candidate.center.y))
    - Math.min(...group.map((candidate) => candidate.center.y))
  if (group.length >= 4) score += Math.max(0, 110 - heightSpan) ** 2 * 30
  return { score, exposed, maxOverlap, centerX, heightSpan }
}

export function gardenCompositionMetrics(garden: GardenScene) {
  const flowers = [garden.king, ...garden.flowers]
  const group = [...garden.monsteras].sort((a, b) => b.size - a.size).map((plant) => {
    const shape = footprint(plant, localFootprint(plant))
    return { ...shape, plant, score: 0, visible: sampleMask(shape.samples, (point) => !flowerCovers(point, flowers)) }
  })
  return evaluateGroup(group, flowers)
}

// Keep several whole-garden arrangements alive so a good anchor cannot strand the smaller leaves.
export function composeGardenMonsteras(seed: number, plants: MonsteraPlant[], flowers: FlowerPlant[]) {
  const random = sceneRandom(seed, "monstera-composition")
  const flowerWeight = (side: number) => flowers.reduce((weight, flower) =>
    weight + flower.diameter ** 2 * Math.max(0, 1 - Math.abs(flower.curve[3].x - (BLOOM_SCENE.centerX + side * rules.sideOffset)) / 220), 0)
  const leftWeight = flowerWeight(-1), rightWeight = flowerWeight(1)
  const anchorSide = Math.abs(leftWeight - rightWeight) < 1000 ? (random() < 0.5 ? -1 : 1)
    : leftWeight < rightWeight ? -1 : 1
  const sweep = rules.lean[0] + random() * (rules.lean[1] - rules.lean[0])
  const ordered = [...plants].sort((a, b) => b.size - a.size)
  let beam: { group: Candidate[]; score: number }[] = [{ group: [], score: 0 }]
  const pools: Candidate[][] = []
  const expand: (() => Candidate[])[] = []
  let connector = 0
  for (const plant of ordered) {
    const secondary = plant.role === "general" || (plant.role === "soldier" && connector++ > 0)
    const side = secondary ? -anchorSide : anchorSide
    const rank = roles.indexOf(plant.role)
    const root = { x: BLOOM_SCENE.centerX + side * (rules.rootOffset - rank * rules.rootStep), y: BLOOM_SCENE.baseline }
    const [height, jitter] = rules.centers[plant.role]
    // Connectors rise into the gap below the flower crown rather than sharing a basal shelf.
    const connectorHeight = plant.role === "soldier" ? (secondary ? 458 : 412) : height
    const center = {
      x: BLOOM_SCENE.centerX + side * (plant.role === "soldier" ? 46 : plant.role === "commoner" ? 94 : rules.sideOffset)
        + (random() - 0.5) * jitter,
      y: connectorHeight + (random() - 0.5) * jitter,
    }
    const facing = plant.role === "king" || plant.role === "general" ? "outward" : "inward"
    const local = localFootprint(plant)
    const search = (offsets: readonly number[], fits: readonly number[]) => {
      const candidates: Candidate[] = []
      for (const dx of offsets) for (const dy of offsets) for (const turn of rules.turns) for (const fit of fits) {
        const scale = rules.scale[plant.role] * fit
        const targetY = plant.role === "commoner" ? Math.max(480, center.y + dy) : center.y + dy
        const pose = createGardenMonsteraPose(seed, plants.indexOf(plant), { ...plant, root }, plant.anatomySeed,
          { center: { x: center.x + dx, y: targetY }, facing, lean: sweep + turn + rank * 2, scale })
        const attachment = pose.blade.attachment
        const stalkLean = Math.atan2(attachment.x - root.x, root.y - attachment.y) * 180 / Math.PI
        const radians = stalkLean * Math.PI / 180
        const attachmentHeight = plant.size * BLOOM_SCENE.monsteraAttachmentHeight / BLOOM_SCENE.monsteraLength * scale
        const placement = { stalkLean, tipTarget: {
          x: attachment.x - Math.sin(radians) * attachmentHeight,
          y: attachment.y + Math.cos(radians) * attachmentHeight,
        } }
        const composed = { ...plant, root, placement, pose }
        const shape = footprint(composed, local)
        let core = 0
        for (const flower of flowers.filter((flower) => flower.role === "king" || flower.role === "general")) {
          const head = flower.curve[3]
          const clearance = boundaryClearance(head, shape.boundary) * (pointInsidePolygon(head, shape.boundary) ? -1 : 1)
          core += Math.max(0, flower.diameter * rules.coreRadius + rules.corePadding - clearance) ** 2 * 3
        }
        // Reward foliage that actually bridges to a flower, without filling its centre.
        const nearestFlower = Math.min(...flowers.map((flower) =>
          distance(shape.center, flower.curve[3]) - flower.diameter * 0.36 - Math.sqrt(shape.area) * 0.38))
        const score = core + Math.max(0, nearestFlower - 18) ** 2 * 0.2
          + (dx ** 2 + dy ** 2) / 450 + Math.abs(turn) * 0.1 + (1 - fit) * 200
        candidates.push({ ...shape, plant: composed, score,
          visible: sampleMask(shape.samples, (point) => !flowerCovers(point, flowers)) })
      }
      return candidates
    }
    const candidates = search(rules.offsets, [1, 0.9])
    pools.push(candidates)
    expand.push(() => search([-112, -64, 0, 64, 112], [1, 0.9, 0.8]))
    beam = beam.flatMap((previous) => candidates.map((candidate) => {
      const group = [...previous.group, candidate]
      return { group, score: evaluateGroup(group, flowers).score }
    })).sort((a, b) => a.score - b.score).slice(0, rules.beamWidth)
  }
  const best = beam[0]
  if (!best) throw new Error("No whole-garden composition candidates")
  // Revisit earlier choices after every foreground leaf is present.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < pools.length; i++) {
    for (const candidate of pools[i]) {
      const group = best.group.map((current, index) => index === i ? candidate : current)
      const score = evaluateGroup(group, flowers).score
      if (score < best.score) { best.group = group; best.score = score }
    }
    // Crowded flower casts get a wider search instead of leaving one leaf almost buried.
    const quality = evaluateGroup(best.group, flowers)
    if (quality.exposed.some((fraction) => fraction < 0.22) || quality.maxOverlap > rules.maxPairOverlap
      || quality.heightSpan < 100) {
      for (let i = 0; i < expand.length; i++) for (const candidate of expand[i]()) {
        const group = best.group.map((current, index) => index === i ? candidate : current)
        const score = evaluateGroup(group, flowers).score
        if (score < best.score) { best.group = group; best.score = score }
      }
    }
  }
  const composed = new Map(best.group.map((candidate) => [candidate.plant.id, candidate.plant]))
  return plants.map((plant) => {
    const result = composed.get(plant.id)
    if (!result) throw new Error(`Missing composed monstera ${plant.id}`)
    return result
  })
}
