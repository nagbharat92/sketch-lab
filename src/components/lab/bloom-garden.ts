import { BLOOM_COMPOSITION, BLOOM_MOTION, BLOOM_PIGMENTS, BLOOM_SCENE, GARDEN_ROLES, type GardenRole } from "./bloom-tokens.ts"
import { branchCurve, curvePoint, sceneRandom, type Curve, type Point } from "./bloom-math.ts"
import { createGardenMonsteraPose, gardenMonsteraAnatomySeed, type GardenMonsteraPose } from "./bloom-monstera-pose.ts"
import { composeGardenMonsteras } from "./bloom-monstera-composition.ts"
export { branchCurve, curvePath, curvePoint, sceneRandom } from "./bloom-math.ts"
export type { Curve, Point } from "./bloom-math.ts"
export { GARDEN_ROLES } from "./bloom-tokens.ts"
export type { GardenRole } from "./bloom-tokens.ts"

export type LeafPlacement = Point & {
  angle: number
  length: number
  width: number
  ladybird: boolean
}

export type FlowerPlant = {
  id: string
  role: GardenRole
  curve: Curve
  diameter: number
  stemWidth: number
  leaves: LeafPlacement[]
  buds: { curve: Curve; tip: Point; scale: number }[]
}

export type MonsteraHole = {
  x: number; y: number; width: number; length: number; angle: number
}

export type MonsteraPlant = {
  id: string
  role: GardenRole
  root: Point
  // Placement is a composition guide; pose owns the physical attachment and rotation.
  placement: { tipTarget: Point; stalkLean: number }
  anatomySeed: number
  pose: GardenMonsteraPose
  size: number
  stemWidth: number
  fullness: number
  maturity: number
  splitCount?: number
  holeFamily: "paired" | "graduated" | "offset"
  holes: MonsteraHole[]
}

export type GardenScene = {
  king: FlowerPlant
  flowers: FlowerPlant[]
  monsteras: MonsteraPlant[]
  vine: Curve
}

const interpolate = (range: readonly [number, number], t: number) => range[0] + (range[1] - range[0]) * t
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export function gardenCharacter(seed: number) {
  const random = sceneRandom(seed, "garden-character")
  const age = seed === 0 ? 0.7 : 0.25 + random() * 0.75
  const time = ["morning", "afternoon", "evening"][Math.floor(random() * 3)]
  return {
    age, time,
    density: 0.35 + age * 0.55,
    lightX: random() < 0.5 ? 0 : 1,
    highlight: time === "afternoon" ? BLOOM_PIGMENTS.light.warm : BLOOM_PIGMENTS.light.cool,
    warm: time === "afternoon",
    dew: time === "morning",
    breezeCycle: BLOOM_MOTION.breeze.base + random() * BLOOM_MOTION.breeze.spread,
  }
}

type HeadZone = { x: readonly [number, number]; height: readonly [number, number] }

function makeFlower(seed: number, id: string, role: GardenRole, zone: HeadZone, planted: FlowerPlant[], diameterOverride?: number): FlowerPlant {
  const random = sceneRandom(seed, `plant:${id}`)
  const rules = GARDEN_ROLES[role]
  let vigor = diameterOverride === undefined ? random() : (diameterOverride - rules.bloom[0]) / (rules.bloom[1] - rules.bloom[0])
  const search = BLOOM_COMPOSITION.headSearch
  let diameter = diameterOverride ?? (role === "king" ? BLOOM_COMPOSITION.kingDiameters[Math.floor(vigor * BLOOM_COMPOSITION.kingDiameters.length)] : interpolate(rules.bloom, vigor))
  let bestHead = { x: interpolate(zone.x, random()), y: BLOOM_SCENE.baseline - interpolate(zone.height, vigor) }
  let bestClearance = -Infinity
  // Pick the most spacious candidate, rather than clamping several plants to one anchor.
  for (let attempt = 0; attempt < search.attempts; attempt++) {
    const boundary = attempt >= search.randomAttempts
    const candidateVigor = role === "king" ? vigor : boundary ? Math.floor((attempt - search.randomAttempts) / 9) / 2 : random()
    const candidateDiameter = role === "king" ? diameter : interpolate(rules.bloom, candidateVigor)
    const head = {
      x: interpolate(zone.x, boundary ? ((attempt - search.randomAttempts) % 3) / 2 : random()),
      y: BLOOM_SCENE.baseline - interpolate(zone.height, boundary && role !== "king"
        ? Math.floor(((attempt - search.randomAttempts) % 9) / 3) / 2
        : Math.max(0, Math.min(1, candidateVigor + (random() - 0.5) * 0.16))),
    }
    // Let petals interleave in a bouquet while keeping each smaller flower's centre readable.
    const clearance = Math.min(...planted.map((plant) => distance(head, plant.curve[3])
      - Math.max(candidateDiameter, plant.diameter) * (role === "king" || plant.role === "king" ? search.kingRadius : search.companionRadius)
      - Math.min(candidateDiameter, plant.diameter) * search.insetRadius))
    if (clearance > bestClearance) {
      bestClearance = clearance
      bestHead = head
      diameter = candidateDiameter
      vigor = candidateVigor
    }
    if (clearance >= search.clearance) break
  }
  const rootX = role === "king" ? BLOOM_SCENE.rootX + (random() - 0.5) * 34 : bestHead.x + (random() - 0.5) * 32
  const rootHalfWidth = BLOOM_COMPOSITION.bed.maxWidth / 2 - BLOOM_COMPOSITION.bed.rootInset
  const root = {
    x: role === "king" ? BLOOM_SCENE.centerX : Math.max(BLOOM_SCENE.centerX - rootHalfWidth,
      Math.min(BLOOM_SCENE.centerX + rootHalfWidth, rootX)),
    y: BLOOM_SCENE.baseline,
  }
  const height = root.y - bestHead.y
  const stemWidth = interpolate(rules.stem, vigor * 0.8 + random() * 0.2)
  const curve: Curve = [
    root,
    { x: root.x + (random() - 0.5) * 30, y: root.y - height * 0.3 },
    { x: bestHead.x + (random() - 0.5) * 30, y: bestHead.y + height * 0.3 },
    bestHead,
  ]
  return { id, role, curve, diameter, stemWidth, leaves: [], buds: [] }
}

type LeafEnvelope = {
  center: Point
  angle: number
  halfLength: number
  halfWidth: number
}

function leafEnvelope(leaf: LeafPlacement): LeafEnvelope {
  const angle = leaf.angle * Math.PI / 180
  return {
    center: { x: leaf.x + Math.sin(angle) * leaf.length * 0.5, y: leaf.y - Math.cos(angle) * leaf.length * 0.5 },
    angle, halfLength: leaf.length * 0.52, halfWidth: leaf.width * 0.95 + 4,
  }
}

function envelopeSamples(envelope: LeafEnvelope) {
  return Array.from({ length: BLOOM_COMPOSITION.leafSearch.samples }, (_, i) => {
    const t = i * Math.PI / 6
    const along = Math.cos(t) * envelope.halfLength
    const across = Math.sin(t) * envelope.halfWidth
    return {
      x: envelope.center.x + Math.sin(envelope.angle) * along + Math.cos(envelope.angle) * across,
      y: envelope.center.y - Math.cos(envelope.angle) * along + Math.sin(envelope.angle) * across,
    }
  })
}

function insideEnvelope(point: Point, envelope: LeafEnvelope) {
  const dx = point.x - envelope.center.x
  const dy = point.y - envelope.center.y
  const along = dx * Math.sin(envelope.angle) - dy * Math.cos(envelope.angle)
  const across = dx * Math.cos(envelope.angle) + dy * Math.sin(envelope.angle)
  return (along / envelope.halfLength) ** 2 + (across / envelope.halfWidth) ** 2 < 1
}

function dressFlowers(seed: number, plants: FlowerPlant[]) {
  const occupied: LeafEnvelope[] = []
  const character = gardenCharacter(seed)
  for (const plant of plants) {
    const random = sceneRandom(seed, `foliage:${plant.id}`)
    const main = plant.role === "king"
    const tall = plant.role === "general"
    const budget = BLOOM_COMPOSITION.leafBudget
    const search = BLOOM_COMPOSITION.leafSearch
    const count = main ? budget.king - 1 + (random() < character.density * 0.65 ? 1 : 0) : tall && random() < character.density ? budget.general : budget.other
    const perch = Math.floor(random() * 2)
    for (let i = 0; i < count; i++) {
      const t = (main ? 0.16 : 0.22) + i / Math.max(1, count - 1) * (main ? 0.43 : 0.3)
      const node = curvePoint(plant.curve, t)
      const height = plant.curve[0].y - plant.curve[3].y
      const length = Math.min(main ? 92 + random() * 34 : 36 + random() * 27, height * 0.5)
        * (main && count === 4 ? 0.9 : 1) * (i === count - 1 && count > 1 ? 0.88 : 1)
      const ratio = 0.4 + random() * 0.12
      const side = i % 2 === 0 ? -1 : 1
      const baseAngle = side * interpolate(search.uprightAngle, random())
      let best: LeafPlacement = { ...node, angle: baseAngle, length, width: length * ratio, ladybird: main && i === perch }
      let bestScore = Infinity
      for (const scale of search.scales) {
        for (const turn of [...search.turns, -baseAngle * 2]) {
          const mirrored = turn === -baseAngle * 2
          const angle = Math.max(-search.maxAngle, Math.min(search.maxAngle, mirrored ? -baseAngle : baseAngle + side * turn))
          const leaf = { ...best, angle, length: length * scale, width: length * scale * ratio }
          const envelope = leafEnvelope(leaf)
          const samples = envelopeSamples(envelope)
          const otherPlants = plants.filter((other) => other.id !== plant.id)
          const headHits = samples.filter((point) => otherPlants.some((other) =>
            distance(point, other.curve[3]) < other.diameter * BLOOM_COMPOSITION.headSearch.kingRadius + search.headPadding,
          )).length + otherPlants.reduce((hits, other) => {
            const head = other.curve[3]
            const radius = other.diameter * BLOOM_COMPOSITION.headSearch.kingRadius + search.headPadding
            return hits + (insideEnvelope(head, envelope) ? search.samples : 0)
              + Array.from({ length: search.samples }, (_, j) => ({
                x: head.x + Math.cos(j * Math.PI / 6) * radius,
                y: head.y + Math.sin(j * Math.PI / 6) * radius,
              })).filter((point) => insideEnvelope(point, envelope)).length
          }, 0)
          const leafHits = samples.filter((point) => occupied.some((other) => insideEnvelope(point, other))).length
            + occupied.filter((other) => insideEnvelope(other.center, envelope) || insideEnvelope(envelope.center, other)).length * 4
          const score = headHits * 10 + leafHits * 2 + (1 - scale) + (mirrored ? 0.35 : Math.abs(turn) * 0.002)
          if (score < bestScore) { best = leaf; bestScore = score }
        }
      }
      occupied.push(leafEnvelope(best))
      plant.leaves.push(best)
    }
    const budCount = main ? 1 + Math.floor(random() * 2) : tall && random() < 0.5 ? 1 : 0
    for (let i = 0; i < budCount; i++) {
      const buds = BLOOM_COMPOSITION.buds
      const start = curvePoint(plant.curve, buds.nodeStart + i * buds.nodeStep)
      const side = i % 2 === 0 ? 1 : -1
      const tip = { x: start.x + side * (22 + random() * 21), y: start.y - 28 - random() * 18 }
      plant.buds.push({ curve: branchCurve(start, tip), tip, scale: main ? buds.king[0] + random() * buds.kingSpread : buds.general[0] + random() * buds.generalSpread })
    }
  }
}

function makeMonstera(seed: number, role: GardenRole, index: number, count: number): MonsteraPlant {
  const id = `monstera-${index}`
  const random = sceneRandom(seed, id)
  const rules = GARDEN_ROLES[role]
  const vigor = random()
  const size = interpolate(rules.leaf, vigor)
  const maturity = interpolate(rules.maturity, random())
  const fullness = interpolate(rules.fullness, random())
  const bounds = BLOOM_COMPOSITION.monstera
  const root = { x: 150 + (index + 0.25 + random() * 0.5) / count * 250, y: BLOOM_SCENE.baseline }
  const spread = root.x - BLOOM_SCENE.rootX
  const base = { x: root.x + (random() - 0.5) * 20, y: root.y - interpolate(rules.attachmentHeight, random()) }
  const angle = Math.max(-bounds.angle, Math.min(bounds.angle, spread * 0.3 + (random() - 0.5) * 14))
  const radians = angle * Math.PI / 180
  const centerOffset = Math.sin(radians) * size * 0.52
  const horizontalRadius = Math.hypot(Math.sin(radians) * size * 0.54, Math.cos(radians) * size * fullness * 0.47)
  base.x = Math.max(bounds.left - centerOffset + horizontalRadius, Math.min(bounds.right - centerOffset - horizontalRadius, base.x))
  const holeFamily = (["paired", "graduated", "offset"] as const)[Math.floor(random() * 3)]
  const pairs = maturity < bounds.juvenileMaturity ? 0 : 1 + Math.floor((maturity - bounds.juvenileMaturity) / 0.72 * 3.8)
  const holes: MonsteraHole[] = []
  const spacing = pairs > 1 ? 54 / (pairs - 1) : 32
  for (let i = 0; i < pairs; i++) {
    const taper = holeFamily === "graduated" ? 1 - i / Math.max(1, pairs - 1) * 0.38 : 0.85 + random() * 0.15
    const length = Math.min(5 + random() * 7, spacing * 0.36) * taper
    const width = Math.min(5.2, length * (0.36 + random() * 0.1))
    const x = 11 + random() * 3
    for (const side of [-1, 1]) {
      holes.push({
        x: side * x, y: -32 - i * spacing + (holeFamily === "offset" ? side * 3 : 0),
        width: width * (0.92 + random() * 0.12),
        length: length * (0.92 + random() * 0.12),
        angle: side * (17 + random() * 12),
      })
    }
  }
  const placement = { tipTarget: base, stalkLean: angle }
  const stemWidth = interpolate(rules.stem, vigor) * 0.7
  const anatomySeed = gardenMonsteraAnatomySeed(seed, id)
  const pose = createGardenMonsteraPose(seed, index, { root, placement, size, stemWidth, fullness }, anatomySeed)
  return { id, role, root, placement, anatomySeed, pose, size, stemWidth, fullness, maturity, holeFamily, holes }
}

export function generateGarden(seed: number, kingDiameter?: number): GardenScene {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Garden seed must be a non-negative safe integer")
  const kingRange = GARDEN_ROLES.king.bloom
  if (kingDiameter !== undefined && (!Number.isFinite(kingDiameter) || kingDiameter < kingRange[0] || kingDiameter > kingRange[1])) throw new RangeError(`Generated king diameter must be between ${kingRange[0]} and ${kingRange[1]}`)
  const random = sceneRandom(seed, "cast")
  const count = BLOOM_COMPOSITION.flowers[0] + Math.floor(random() * (BLOOM_COMPOSITION.flowers[1] - BLOOM_COMPOSITION.flowers[0] + 1))
  const generalCount = count > 4 && random() < 0.55 ? 2 : 1
  const soldierCount = count === 6 ? 2 : 1
  const commonerCount = count - 1 - generalCount - soldierCount
  const zones = BLOOM_COMPOSITION.headZones
  const king = makeFlower(seed, "king", "king", { x: zones.king, height: GARDEN_ROLES.king.height }, [], kingDiameter)
  const flowers: FlowerPlant[] = []
  const leftFirst = random() < 0.5
  const add = (id: string, role: GardenRole, x: readonly [number, number]) => {
    flowers.push(makeFlower(seed, id, role, { x, height: GARDEN_ROLES[role].height }, [king, ...flowers]))
  }
  for (let i = 0; i < generalCount; i++) {
    const left = i === 0 ? leftFirst : !leftFirst
    add(`general-${i}`, "general", left ? zones.generalLeft : zones.generalRight)
  }
  for (let i = 0; i < soldierCount; i++) {
    const left = generalCount === 1 ? i === 0 ? !leftFirst : leftFirst : i === 0
    add(`soldier-${i}`, "soldier", left ? zones.soldierLeft : zones.soldierRight)
  }
  for (let i = 0; i < commonerCount; i++) {
    add(`commoner-${i}`, "commoner", zones.commoner)
  }
  dressFlowers(seed, [king, ...flowers])
  const monsteraCount = BLOOM_COMPOSITION.monsteras[0] + Math.floor(random() * (BLOOM_COMPOSITION.monsteras[1] - BLOOM_COMPOSITION.monsteras[0] + 1))
  const roles: GardenRole[] = ["king", "general", "soldier", "commoner",
    ...Array.from({ length: monsteraCount - 4 }, (): GardenRole => "soldier")]
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  const monsteras = composeGardenMonsteras(seed,
    roles.map((role, i) => makeMonstera(seed, role, i, monsteraCount)), [king, ...flowers])
  const vineRoot = { x: 335 + random() * 30, y: BLOOM_SCENE.baseline }
  const vineHead = { x: vineRoot.x + 10 + random() * 24, y: 427 + random() * 20 }
  const vine = branchCurve(vineRoot, vineHead)
  return { king, flowers, monsteras, vine }
}
