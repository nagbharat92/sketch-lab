import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"
import { curvePoint, generateGarden, GARDEN_ROLES, sceneRandom } from "../src/components/lab/bloom-garden.ts"
import { botanicalPetals, decorationVariation, flowerTraits, groundGeometry, leafAnatomy, monsteraAnatomy, plantMotion, pollenGeometry, variegationPaths } from "../src/components/lab/bloom-geometry.ts"
import { growBloom, initialBloomState } from "../src/components/lab/bloom-state.ts"
import { BLOOM_COMPOSITION, BLOOM_MOTION, BLOOM_SCENE, BLOOM_SCENE_STYLE, BLOOM_SWATCHES, PETAL_FAMILIES, POLLEN_TEXTURES, VARIEGATION_PATTERNS } from "../src/components/lab/bloom-tokens.ts"
import { DEFAULT_BLOOM } from "../src/lib/bloom.ts"

const inRange = (value, [min, max]) => assert(value >= min - 1e-9 && value <= max + 1e-9, `${value} outside ${min}-${max}`)
const samePoint = (a, b) => assert(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8)
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

test("seeds reproduce the same geometry, including the generated king's starting size", () => {
  for (const seed of [0, 1, 7, 505, 1490, 1985]) {
    for (const diameter of [306, 323, 340]) {
      assert.deepEqual(generateGarden(seed, diameter), generateGarden(seed, diameter))
      assert.equal(generateGarden(seed, diameter).king.diameter, diameter)
    }
  }
  assert.notDeepEqual(generateGarden(1), generateGarden(2))
})

test("two thousand casts obey role bounds, crown spacing, leaf budgets and hole anatomy", () => {
  const flowerCounts = new Set()
  const monsteraCounts = new Set()
  const holeFamilies = new Set()
  const holeCounts = new Set()
  for (let seed = 0; seed < 2000; seed++) {
    const garden = generateGarden(seed)
    const plants = [garden.king, ...garden.flowers]
    flowerCounts.add(plants.length)
    monsteraCounts.add(garden.monsteras.length)
    inRange(plants.length, [4, 6])
    inRange(garden.monsteras.length, [4, 5])
    assert.equal(new Set(garden.monsteras.map((leaf) => leaf.role)).size, 4)
    const tallest = garden.monsteras.find((leaf) => leaf.role === "king")
    const shortest = garden.monsteras.find((leaf) => leaf.role === "commoner")
    assert(tallest.size - shortest.size >= 105)
    assert(shortest.base.y - tallest.base.y >= 54)
    assert.equal(plants.filter((plant) => plant.role === "king").length, 1)
    assert.equal(plants.flatMap((plant) => plant.leaves).filter((leaf) => leaf.ladybird).length, 1)
    assert.equal(new Set(plants.map((plant) => plant.id)).size, plants.length)
    assert(plants.flatMap((plant) => plant.leaves).length <= 11)
    for (const plant of plants) {
      const rules = GARDEN_ROLES[plant.role]
      inRange(plant.diameter, rules.bloom)
      inRange(plant.curve[0].y - plant.curve[3].y, rules.height)
      inRange(plant.stemWidth, rules.stem)
      assert(plant.leaves.length <= (plant.role === "king" ? 4 : plant.role === "general" ? 2 : 1))
      plant.leaves.forEach((leaf, i) => {
        inRange(leaf.width / leaf.length, [0.4, 0.52])
        const t = (plant.role === "king" ? 0.16 : 0.22)
          + i / Math.max(1, plant.leaves.length - 1) * (plant.role === "king" ? 0.43 : 0.3)
        samePoint(leaf, curvePoint(plant.curve, t))
      })
      plant.buds.forEach((bud, i) => {
        samePoint(bud.curve[0], curvePoint(plant.curve, 0.6 + i * 0.13))
        samePoint(bud.tip, bud.curve[3])
        assert(plant.role === "king" || plant.role === "general")
        inRange(bud.scale, plant.role === "king" ? [0.5, 0.7] : [0.35, 0.5])
      })
      assert(plant.buds.length <= (plant.role === "king" ? 2 : plant.role === "general" ? 1 : 0))
    }
    for (let i = 0; i < plants.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = plants[i], b = plants[j]
        const clearance = Math.hypot(a.curve[3].x - b.curve[3].x, a.curve[3].y - b.curve[3].y)
          - Math.max(a.diameter, b.diameter) * (a.role === "king" || b.role === "king" ? 0.43 : 0.36)
          - Math.min(a.diameter, b.diameter) * 0.1
        assert(clearance >= 8, `Crowded crowns in seed ${seed}: ${a.id}, ${b.id}`)
      }
    }
    for (const leaf of garden.monsteras) {
      const rules = GARDEN_ROLES[leaf.role]
      inRange(leaf.size, rules.leaf)
      assert(leaf.size >= 125)
      inRange(leaf.fullness, rules.fullness)
      inRange(leaf.maturity, rules.maturity)
      holeFamilies.add(leaf.holeFamily)
      holeCounts.add(leaf.holes.length)
      assert.equal(leaf.holes.length % 2, 0)
      assert(leaf.holes.length <= 8)
      if (leaf.maturity < 0.28) assert.equal(leaf.holes.length, 0)
      for (const hole of leaf.holes) {
        inRange(hole.width, [1, 5.5])
        inRange(hole.length, [2, 13])
        assert(Math.abs(hole.x) - hole.width > 4)
      }
    }
  }
  assert.deepEqual([...flowerCounts].sort(), [4, 5, 6])
  assert.deepEqual([...monsteraCounts].sort(), [4, 5])
  assert.equal(holeFamilies.size, 3)
  assert(holeCounts.has(0) && holeCounts.has(8))
})

test("invalid seeds and generated king sizes fail explicitly", () => {
  for (const seed of [-1, 1.5, NaN, Infinity]) assert.throws(() => generateGarden(seed), RangeError)
  for (const diameter of [289, 341, NaN, Infinity]) assert.throws(() => generateGarden(1, diameter), RangeError)
})

// Digests captured against the approved pre-cleanup geometry, not recomputed fixtures.
test("composition and extracted anatomy retain the approved seeded identity", () => {
  const snapshots = [
    [0, "c44931d2e804f8187620453db6fa80201bdddf9bf0058c42adef182f22123524", "a3ec565b99a03dbaf99b79cdc194a5014daf21bed254136b322c748fc3150930"],
    [1, "0ec5f24639c6fbea80123fbfdcdc6b64de2703e2bf8bdc74491760724b9c2dca", "a478fe8e1730ae418c437c7e40630a4c53735031eb49fa2e249cf3dc6e4b69ae"],
    [7, "a90afa178cd84efa1a34c8c0121a3f1f8f3687f82d5c3b8d77549fa4d70d1cfd", "04682110c485b7efdb6b254cec40e751006966abf58fb76800e4e28badc70878"],
    [505, "e748d11aaaa17fc13e7dda1d423ca67bbec527e8757b7a4685f7c1cd30972fb8", "8bd2ed8576abf4330c3706f5467146ee8bfe050d33eff7ccda18a4c5c39538be"],
    [1490, "2b7d04f5acb8782c1f876c4866bea5b83ab46b66a25059fa4a9164c3005d64ca", "fadc3e9f7bf018826636ae317a9a231f023c78154782327f6e45d059886851b3"],
    [1985, "ab3f833de3c16c05adae07499ffc405791c2c0d119056f2943f87a27fc69ce7c", "af52794491d3e445492d86266df5604e8bc94499e35ca0e5dee0ef6091634f9a"],
  ]
  for (const [seed, compositionDigest, anatomyDigest] of snapshots) {
    const garden = generateGarden(seed)
    assert.equal(digest(garden), compositionDigest, `Composition changed for seed ${seed}`)
    const traits = flowerTraits(seed, "king")
    const anatomy = {
      leaves: [garden.king, ...garden.flowers].flatMap((plant) => plant.leaves.map((leaf) =>
        leafAnatomy(seed, `leaf:${leaf.x}:${leaf.y}:${leaf.angle}`))),
      monsteras: garden.monsteras.map((plant) => monsteraAnatomy(seed, `anatomy:${plant.id}`, plant.maturity, plant.holes)),
      ground: groundGeometry(seed),
      petals: botanicalPetals(DEFAULT_BLOOM, traits.family, traits.individuality, traits.opening),
    }
    assert.equal(digest(anatomy), anatomyDigest, `Anatomy changed for seed ${seed}`)
  }
})

test("atomic grows preserve palette allocation, non-repeats and the original draw order", () => {
  let current = initialBloomState()
  const counts = new Set()
  for (let i = 0; i < 250; i++) {
    const before = structuredClone(current)
    const next = growBloom(current)
    assert.deepEqual(current, before, "Growing must not mutate the previous scene")
    assert.deepEqual(next, growBloom(current))
    assert.equal(next.sceneSeed, current.sceneSeed + 1)
    assert.notEqual(next.colorIndex, current.colorIndex)
    for (const key of ["flowerScale", "breeze", "centerHole", "centerLightness", "foliageLightness"]) {
      assert.notEqual(next[key], current[key], `${key} repeated`)
    }
    next.backgroundShades.forEach((shade, index) => assert.notEqual(shade, current.backgroundShades[index]))
    const fills = [BLOOM_SWATCHES[next.colorIndex].color, ...next.companions.map((bloom) => bloom.fill)]
    assert.equal(new Set(fills).size, fills.length)
    counts.add(fills.length)
    assert.equal(next.garden.king.diameter, next.flowerScale * BLOOM_SCENE.flowerSize)
    next.companions.forEach((bloom, index) => {
      const previous = current.companions.find((other) => other.id === bloom.id)
      assert.notEqual(bloom.fill, previous?.fill)
      assert.equal(bloom.id, next.garden.flowers[index].id)
      assert.equal(bloom.size, next.garden.flowers[index].diameter)
    })
    current = next
  }
  assert.deepEqual([...counts].sort(), [4, 5, 6])
  assert.equal(digest(current), "73f856579fd9f24d96b6b94028628bba1c175f174e705617177b5c145d62f2e3")
})

test("ink frames and decoration streams cannot change flat botanical anatomy", () => {
  for (const seed of [0, 1, 7, 505]) {
    const garden = generateGarden(seed)
    const leaf = leafAnatomy(seed, "leaf:34:78:-28")
    const ground = groundGeometry(seed)
    const traits = flowerTraits(seed, "king")
    const petals = botanicalPetals(DEFAULT_BLOOM, traits.family, traits.individuality, traits.opening)
    const holesBefore = structuredClone(garden.monsteras.map((plant) => plant.holes))
    const monsteras = garden.monsteras.map((plant) => monsteraAnatomy(seed, `anatomy:${plant.id}`, plant.maturity, plant.holes))
    for (let frame = 0; frame < 8; frame++) {
      const inkRandom = sceneRandom(BLOOM_MOTION.inkSeed + frame, "ink")
      Array.from({ length: 20 }, () => inkRandom())
      decorationVariation(seed, "leaf:34:78:-28", frame % 2 === 0)
      plantMotion(seed, "king", BLOOM_MOTION.cycles.plant)
      assert.deepEqual(leafAnatomy(seed, "leaf:34:78:-28"), leaf)
      assert.deepEqual(groundGeometry(seed), ground)
      assert.deepEqual(flowerTraits(seed, "king"), traits)
      assert.deepEqual(botanicalPetals(DEFAULT_BLOOM, traits.family, traits.individuality, traits.opening), petals)
      garden.monsteras.forEach((plant, index) => assert.deepEqual(monsteraAnatomy(seed, `anatomy:${plant.id}`, plant.maturity, plant.holes), monsteras[index]))
    }
    assert.deepEqual(garden.monsteras.map((plant) => plant.holes), holesBefore)
    assert(!("ink" in leaf) && !("ink" in ground))
    for (const point of leaf.spine) assert.deepEqual(Object.keys(point).sort(), ["x", "y"])
    for (const family of PETAL_FAMILIES) {
      const shaped = botanicalPetals(DEFAULT_BLOOM, family, 0.7, 1)
      assert.equal(shaped.length, DEFAULT_BLOOM.petals)
      shaped.forEach((petal) => {
        assert.deepEqual(Object.keys(petal).sort(), ["angle", "d", "fold", "veins"])
        assert(petal.d.endsWith("Z"))
        assert(!/NaN|Infinity/.test(petal.d))
        assert(Number.isFinite(petal.angle))
      })
    }
    monsteras.forEach((anatomy) => {
      assert.equal(anatomy.veins[0].depth, 0)
      assert(anatomy.veins.some((vein) => vein.depth === 1))
      assert(anatomy.veins.every((vein) => vein.d.endsWith("Z") && !/NaN|Infinity/.test(vein.d)))
      anatomy.holes.forEach((hole) => {
        assert(Object.values(hole).every(Number.isFinite))
        assert(hole.width > 0 && hole.length > 0)
        if (anatomy.splits > 0) assert(Math.abs(hole.x) - hole.width > 2)
      })
    })
  }
})

test("ground budgets, pattern families, pollen and shared scene dimensions remain bounded", () => {
  for (const seed of [0, 1, 7, 505, 1490, 1985]) {
    const ground = groundGeometry(seed)
    const budget = BLOOM_COMPOSITION.ground
    inRange(ground.rocks.length, budget.rocks)
    inRange(ground.grasses.length, budget.clumps)
    ground.grasses.forEach((clump) => inRange(clump.blades.length, budget.blades))
    inRange(ground.marks.length, budget.marks)
    inRange(ground.grains.length, budget.grains)
    inRange(ground.sprigs.length, budget.sprigs)
  }
  assert.equal(BLOOM_SCENE_STYLE["--bloom-scene-width"] / BLOOM_SCENE_STYLE["--bloom-scene-height"], 27 / 31)
  assert.equal(BLOOM_SCENE_STYLE["--bloom-head-width"], "62.963%")
  assert.equal(BLOOM_MOTION.inkDisplacement, 1.5)
  assert.deepEqual(BLOOM_MOTION.press.scale, [1, 0.96, 1])
  assert.deepEqual(BLOOM_MOTION.press.y, [0, 2, 0])
  assert.equal(BLOOM_MOTION.press.duration, 0.16)
  assert.deepEqual(VARIEGATION_PATTERNS.map((pattern) => variegationPaths(pattern, 55, 132).length), [2, 1, 3, 3])
  for (const texture of POLLEN_TEXTURES) {
    assert.deepEqual(pollenGeometry(7, "r0", 36, texture), pollenGeometry(7, "r0", 36, texture))
    assert.deepEqual(pollenGeometry(7, "r0", 0, texture), [])
    pollenGeometry(7, "r0", 36, texture).forEach((point) =>
      assert(Math.hypot(point.x - BLOOM_SCENE.flowerCenter, (point.y - BLOOM_SCENE.pollenCenterY) / 0.92) <= 32))
  }
})
