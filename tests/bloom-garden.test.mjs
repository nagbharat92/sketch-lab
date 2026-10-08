import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"
import { curvePoint, generateGarden, GARDEN_ROLES, sceneRandom } from "../src/components/lab/bloom-garden.ts"
import { botanicalPetals, decorationVariation, flowerTraits, groundGeometry, leafAnatomy, monsteraAnatomy, plantMotion, pollenGeometry, variegationPaths } from "../src/components/lab/bloom-geometry.ts"
import { growBloom, initialBloomState } from "../src/components/lab/bloom-state.ts"
import { BLOOM_COMPOSITION, BLOOM_MOTION, BLOOM_SCENE, BLOOM_SCENE_STYLE, BLOOM_SWATCHES, PETAL_FAMILIES, POLLEN_TEXTURES, VARIEGATION_PATTERNS } from "../src/components/lab/bloom-tokens.ts"
import { DEFAULT_BLOOM } from "../src/lib/bloom.ts"
import { createFlowerSpecimen } from "../src/components/lab/bloom-flower-study-state.ts"
import { FLOWER_STUDY, MONSTERA_AGE, MONSTERA_MARKINGS } from "../src/components/lab/bloom-tokens.ts"
import { createLeafSpecimen, createMonsteraSpecimen, growMonsteraSpecimen, monsteraSpecimenPlant, monsteraStudyPalette, remixLeafMarkings, remixMonsteraSpecimen, sprigGeometry, studySeed } from "../src/components/lab/bloom-study-state.ts"
import { monsteraStudyStalk, organicMonstera, organicMonsteraBlade, organicMonsteraMarkingGeometry, organicMonsteraMarkings, organicMonsteraSilhouette } from "../src/components/lab/bloom-monstera-study-geometry.ts"
import { MONSTERA_STUDY_FRAME, MONSTERA_STUDY_STALK, MONSTERA_STUDY_VARIEGATION_COLOR } from "../src/components/lab/bloom-tokens.ts"
import { createMonsteraArtwork, gardenMonsteraRecipe, prepareGardenMonsteras } from "../src/components/lab/bloom-monstera-artwork.ts"
import { createStudyMonsteraPose, gardenMonsteraFacing, monsteraBladeTransform, monsteraProjection, monsteraStudyViewBox, projectMonsteraPoint } from "../src/components/lab/bloom-monstera-pose.ts"
import { createMonsteraPool } from "../src/components/lab/bloom-monstera-client.ts"
import { leafStudyVariegation } from "../src/components/lab/bloom-leaf-study-geometry.ts"
import { stalkDirection, studyBudGeometry } from "../src/components/lab/bloom-bud-study-geometry.ts"
import { GROUND_STUDY, LEAF_FAMILIES, LEAF_MARKINGS, LEAF_STUDY } from "../src/components/lab/bloom-tokens.ts"
import { groundBoundsOverlap, groundStudyGeometry } from "../src/components/lab/bloom-ground-study-geometry.ts"
import { createLadybirdSpecimen } from "../src/components/lab/bloom-ladybird-study-state.ts"
import { createLadybirdAppearance, LADYBIRD_VARIETIES } from "../src/components/lab/bloom-ladybird-geometry.ts"
import { boundaryClearance, pointInsidePolygon } from "../src/components/lab/bloom-math.ts"
import { leafBoundary } from "../src/components/lab/bloom-geometry.ts"
import { gardenFlowerRecipe, gardenGroundExtent, gardenLadybird, gardenLeafRecipe } from "../src/components/lab/bloom-garden-botany.ts"
import { FLOWER_PALETTE, isOverridden, NO_OVERRIDES, overriddenCount, overrideFor, randomizedOverride, SELECTION_KINDS, sameSelection, withOverride, withoutOverride } from "../src/components/lab/bloom-selection.ts"
import { prepareGardenMonsteras as prepareMonsteras } from "../src/components/lab/bloom-monstera-artwork.ts"
import { gardenStickerPaint, gardenStickerPalette, STICKER_CURSOR_INK, STICKER_PALETTES, stickerContrast } from "../src/components/lab/bloom-sticker-colors.ts"
import { stickerSizeFactor } from "../src/components/lab/bloom-sticker-size.ts"
import { createBloomHoverStore } from "../src/components/lab/bloom-hover-store.ts"
import { composeGardenMonsteras, gardenCompositionMetrics } from "../src/components/lab/bloom-monstera-composition.ts"

const SELECTIONS = [
  { kind: "flower", id: "king" }, { kind: "monstera", id: "monstera-0" },
  { kind: "leaf", id: "leaf:1:2:3" }, { kind: "bud", id: "bud:4:5" },
  { kind: "ground", id: "ground" }, { kind: "ladybird", id: "ladybird" },
]

test("hover notifications stay local, skip repeated targets and clean up subscriptions", () => {
  const store = createBloomHoverStore()
  let calls = 0
  const unsubscribe = store.subscribe(() => { calls++ })
  store.set(SELECTIONS[0])
  store.set({ ...SELECTIONS[0] })
  assert.equal(calls, 1)
  assert.deepEqual(store.get(), SELECTIONS[0])
  store.set(SELECTIONS[1])
  store.set(undefined)
  store.set(undefined)
  assert.equal(calls, 3)
  assert.equal(store.get(), undefined)
  unsubscribe()
  store.set(SELECTIONS[0])
  assert.equal(calls, 3)
})

test("sticker borders gently increase with artwork size and remain bounded", () => {
  const sizes = [8, 20, 45, 80, 150, 260, 500, 2000]
  const factors = sizes.map((size) => stickerSizeFactor(size, size))
  assert.equal(factors[0], 0.4)
  assert.equal(stickerSizeFactor(260, 260), 1)
  assert.equal(factors.at(-1), 1.1)
  assert(factors.every((factor, i) => i === 0 || factor >= factors[i - 1]))
  assert(stickerSizeFactor(400, 10) < stickerSizeFactor(200, 200), "Thin stalks need thinner paper than broad leaves")
  assert.equal(stickerSizeFactor(80, 150), stickerSizeFactor(150, 80))
  for (const size of [0, -1, NaN, Infinity]) assert.throws(() => stickerSizeFactor(size, 100), RangeError)
})

test("sticker shades stay bright with strong dark-ink and dark-theme contrast", () => {
  for (const palette of STICKER_PALETTES) {
    assert.deepEqual(Object.keys(palette), ["butter", "lilac", "peach", "sky"])
    for (const color of Object.values(palette)) {
      for (const background of ["#16171D", STICKER_CURSOR_INK]) {
        assert(stickerContrast(color, background) >= 5, `${color} needs 5:1 contrast against ${background}`)
      }
      assert(stickerContrast(color, "#000000") >= 10, `${color} must remain a light pastel`)
    }
  }
  assert.equal(stickerContrast("#FFFFFF", "#000000"), 21)
  assert.throws(() => stickerContrast("transparent", "#FFFFFF"), RangeError)
})

test("sticker palettes and artwork pairings are stable within each garden", () => {
  const palettes = new Set()
  const families = new Set()
  for (let seed = 0; seed < 48; seed++) {
    const palette = gardenStickerPalette(seed)
    palettes.add(JSON.stringify(palette))
    for (const selection of SELECTIONS) {
      const paint = gardenStickerPaint(seed, selection)
      assert.equal(paint.color, palette[paint.family])
      assert.deepEqual(paint, gardenStickerPaint(seed, { ...selection }))
      families.add(paint.family)
    }
    for (const color of FLOWER_PALETTE) {
      const paint = gardenStickerPaint(seed, SELECTIONS[0], color)
      assert.equal(paint.color, palette[paint.family])
    }
    assert(["lilac", "sky"].includes(gardenStickerPaint(seed, SELECTIONS[0], "#F3CE46").family))
    assert(["butter", "peach"].includes(gardenStickerPaint(seed, SELECTIONS[0], "#365CCD").family))
  }
  assert.equal(palettes.size, STICKER_PALETTES.length)
  assert.equal(families.size, 4)
  for (const seed of [-1, 0.5, NaN, Infinity]) assert.throws(() => gardenStickerPalette(seed), RangeError)
  assert.throws(() => gardenStickerPaint(0, SELECTIONS[0], "not-a-color"), RangeError)
})

test("Surprise retains the approved squeeze, dip, rebound and timing", () => {
  assert.deepEqual(BLOOM_MOTION.press, {
    scale: [1, 0.96, 1],
    y: [0, 2, 0],
    duration: 0.16,
    times: [0, 0.35, 1],
  })
})

test("tending one element never disturbs the others, and every change is reversible", () => {
  assert.deepEqual(SELECTIONS.map((selection) => selection.kind), [...SELECTION_KINDS])
  let overrides = NO_OVERRIDES
  for (let i = 0; i < SELECTIONS.length; i++) {
    const selection = SELECTIONS[i]
    const before = structuredClone(overrides)
    const random = sceneRandom(i + 1, `surprise:${selection.kind}`)
    const change = randomizedOverride(selection, random, i + 1)
    overrides = withOverride(overrides, selection, change)
    assert.deepEqual(before, structuredClone(before), "Override maps must not be mutated in place")
    assert.notDeepEqual(overrides, before)
    assert(isOverridden(overrides, selection))
    assert.equal(overriddenCount(overrides), i + 1)
    // Every other element still reports the garden's own choices.
    for (const other of SELECTIONS.filter((candidate) => candidate !== selection)) {
      if (SELECTIONS.indexOf(other) < i) continue
      assert.deepEqual(overrideFor(overrides, other.kind, other.id), {}, `${other.kind} should be untouched`)
    }
  }
  for (const selection of SELECTIONS) {
    overrides = withoutOverride(overrides, selection)
    assert(!isOverridden(overrides, selection))
  }
  assert.equal(overriddenCount(overrides), 0)
  assert(sameSelection(SELECTIONS[0], { kind: "flower", id: "king" }))
  assert(!sameSelection(SELECTIONS[0], { kind: "flower", id: "general-0" }))
  assert(!sameSelection(undefined, SELECTIONS[0]))
})

test("surprises stay inside the controls' own ranges and reject impossible edits", () => {
  for (let nonce = 1; nonce <= 48; nonce++) {
    for (const selection of SELECTIONS) {
      const random = sceneRandom(nonce, `surprise:${selection.kind}:${selection.id}`)
      const change = randomizedOverride(selection, random, nonce)
      // Round-tripping through the validator proves every generated value is legal.
      const stored = overrideFor(withOverride(NO_OVERRIDES, selection, change), selection.kind, selection.id)
      assert.deepEqual(stored, change, `${selection.kind} surprise produced a value its own controls reject`)
      if (selection.kind === "flower") {
        inRange(change.petals, [FLOWER_STUDY.petals.min, FLOWER_STUDY.petals.max])
        inRange(change.petalLength, [FLOWER_STUDY.length.min / 100, FLOWER_STUDY.length.max / 100])
        assert(FLOWER_PALETTE.includes(change.color))
      }
      if (selection.kind === "monstera") inRange(change.age, [MONSTERA_AGE.min, MONSTERA_AGE.max])
      if (selection.kind === "leaf" || selection.kind === "monstera") {
        assert.equal(change.coverage === 0, change[selection.kind === "leaf" ? "pattern" : "markings"] === "plain")
      }
      if (selection.kind === "ground") inRange(change.tufts, GROUND_STUDY.tufts)
    }
  }
  for (const nonce of [0, -1, 1.5, NaN]) {
    assert.throws(() => randomizedOverride(SELECTIONS[0], sceneRandom(1, "x"), nonce), RangeError)
  }
  const flower = SELECTIONS[0]
  for (const bad of [{ petals: 2 }, { petals: 99 }, { petals: 4.5 }, { family: "spiky" }, { color: "#000000" }]) {
    assert.throws(() => withOverride(NO_OVERRIDES, flower, bad), RangeError)
  }
  assert.throws(() => withOverride(NO_OVERRIDES, { kind: "stem", id: "x" }, {}), RangeError)
  assert.throws(() => withOverride(NO_OVERRIDES, SELECTIONS[1], { age: 9 }), RangeError)
  assert.throws(() => withOverride(NO_OVERRIDES, SELECTIONS[3], { stage: "wilted" }), RangeError)
  assert.throws(() => withOverride(NO_OVERRIDES, SELECTIONS[5], { variety: "ghost" }), RangeError)
})

test("a tended monstera reaches the generator while its neighbours keep the garden's own recipe", () => {
  const garden = generateGarden(5)
  const plants = garden.monsteras.map(({ id, role, maturity, splitCount, anatomySeed }) =>
    ({ id, role, maturity, splitCount, anatomySeed }))
  const plain = prepareMonsteras(5, plants)
  const tendedId = plants[1].id
  const edited = prepareMonsteras(5, plants.map((plant) => plant.id === tendedId
    ? { ...plant, edit: { age: 5, markings: "patches", coverage: 0.4 } } : plant))
  for (let i = 0; i < plain.length; i++) {
    if (plain[i].id === tendedId) continue
    assert.deepEqual(edited[i], plain[i], "Editing one leaf must not redraw another")
  }
  const changed = edited.find((item) => item.id === tendedId).artwork
  assert.equal(changed.age, 5)
  assert.equal(changed.markings, "patches")
  assert.equal(changed.anatomy.cuts.length, 10)
  assert.equal(changed.seed, plants[1].anatomySeed, "Tending must not reseed the plant's identity")
  // Clearing the markings drops the material rather than keeping an invisible coverage.
  const bare = prepareMonsteras(5, plants.map((plant) => plant.id === tendedId
    ? { ...plant, edit: { markings: "plain", coverage: 0.9 } } : plant))
  assert.deepEqual(bare.find((item) => item.id === tendedId).artwork.materials.paths, [])
})

test("choosing a grass count changes only the grass, and the soil keeps its seeded span", () => {
  const garden = generateGarden(9), extent = gardenGroundExtent(garden)
  const seeded = groundStudyGeometry(11, extent)
  for (let grass = GROUND_STUDY.tufts[0]; grass <= GROUND_STUDY.tufts[1]; grass++) {
    const chosen = groundStudyGeometry(11, extent, grass)
    assert.equal(chosen.tufts.length, grass)
    // The crest rides over a mud mound at every tuft, so it follows the grass by design;
    // what must not move is where the strip begins, ends and meets the baseline.
    assert.deepEqual([chosen.crestPoints[0], chosen.crestPoints.at(-1)],
      [seeded.crestPoints[0], seeded.crestPoints.at(-1)])
    assert.equal(chosen.crestPoints.length, seeded.crestPoints.length)
    assert.deepEqual(chosen.shadow, seeded.shadow)
    assert(chosen.tufts.every((tuft) => tuft.x > extent.left && tuft.x < extent.right))
    assert.deepEqual(chosen, groundStudyGeometry(11, extent, grass))
    for (let i = 0; i < chosen.footprints.length; i++) {
      for (const other of chosen.footprints.slice(i + 1)) {
        if (chosen.footprints[i].kind === "grass" && other.kind === "grass") continue
        assert(!groundBoundsOverlap(chosen.footprints[i].bounds, other.bounds, 2))
      }
    }
  }
  for (const grass of [GROUND_STUDY.tufts[0] - 1, GROUND_STUDY.tufts[1] + 1, 5.5, NaN]) {
    assert.throws(() => groundStudyGeometry(11, extent, grass), RangeError)
  }
})

test("choosing a ladybird keeps all six feet on its leaf", () => {
  for (let seed = 0; seed < 24; seed++) {
    const label = "leaf:0:0:0"
    for (const variety of LADYBIRD_VARIETIES) {
      const resident = gardenLadybird(seed, label, "broad", { variety: variety.id, seed: seed + 1 })
      assert.equal(resident.appearance.variety.id, variety.id)
      const boundary = leafBoundary(leafAnatomy(seed, label, "broad").edge)
      assert(pointInsidePolygon(resident, boundary))
      assert(boundaryClearance(resident, boundary) > resident.appearance.radius * resident.scale)
      assert.deepEqual(resident, gardenLadybird(seed, label, "broad", { variety: variety.id, seed: seed + 1 }))
    }
  }
  assert.throws(() => gardenLadybird(1, "leaf:0:0:0", "broad", { variety: "ghost" }), RangeError)
})

test("main garden reuses study flower and leaf variation without moving the seeded cast", () => {
  const families = new Set(), patterns = new Set(), petals = new Set(), lengths = new Set()
  for (let seed = 0; seed < 32; seed++) {
    const garden = generateGarden(seed), before = structuredClone(garden)
    for (const plant of [garden.king, ...garden.flowers]) {
      const flower = gardenFlowerRecipe(seed, plant.id)
      assert.deepEqual(flower, gardenFlowerRecipe(seed, plant.id))
      assert.equal(flower.family, flowerTraits(seed, plant.id).family)
      inRange(flower.petalLength, [FLOWER_STUDY.length.min / 100, 1])
      petals.add(flower.family); lengths.add(flower.petalLength)
      for (const leaf of plant.leaves) {
        const label = `leaf:${leaf.x}:${leaf.y}:${leaf.angle}`
        const recipe = gardenLeafRecipe(seed, label)
        assert.deepEqual(recipe, gardenLeafRecipe(seed, label))
        assert(LEAF_FAMILIES.includes(recipe.family) && LEAF_MARKINGS.includes(recipe.pattern))
        inRange(recipe.coverage, [0, 1])
        assert.equal(recipe.coverage === 0, recipe.pattern === "plain")
        families.add(recipe.family); patterns.add(recipe.pattern)
        if (leaf.ladybird) {
          const resident = gardenLadybird(seed, label, recipe.family)
          assert.deepEqual(resident, gardenLadybird(seed, label, recipe.family))
          const boundary = leafBoundary(leafAnatomy(seed, label, recipe.family).edge)
          assert(pointInsidePolygon(resident, boundary))
          assert(boundaryClearance(resident, boundary) > resident.appearance.radius * resident.scale)
        }
      }
    }
    assert.deepEqual(garden, before)
  }
  assert.equal(families.size, LEAF_FAMILIES.length)
  assert.equal(patterns.size, LEAF_MARKINGS.length)
  assert.equal(petals.size, PETAL_FAMILIES.length)
  assert(lengths.size > 1)
})

test("garden soil stays a single thin strip covering every plant root", () => {
  for (let seed = 0; seed < 32; seed++) {
    const garden = generateGarden(seed), extent = gardenGroundExtent(garden)
    const ground = groundStudyGeometry(seed, extent)
    assert.equal((extent.left + extent.right) / 2, BLOOM_SCENE.centerX)
    assert(extent.right - extent.left <= BLOOM_COMPOSITION.bed.maxWidth)
    samePoint(garden.king.curve[0], { x: BLOOM_SCENE.centerX, y: BLOOM_SCENE.baseline })
    assert.deepEqual(ground, groundStudyGeometry(seed, extent))
    assert.equal(ground.crestPoints[0].x, extent.left)
    assert.equal(ground.crestPoints.at(-1).x, extent.right)
    assert.equal(ground.crestPoints[0].y, BLOOM_SCENE.baseline)
    assert.equal(ground.crestPoints.at(-1).y, BLOOM_SCENE.baseline)
    const roots = [garden.king.curve[0], ...garden.flowers.map((plant) => plant.curve[0]),
      ...garden.monsteras.map((plant) => plant.root), garden.vine[0]]
    for (const root of roots) {
      assert(root.x > extent.left && root.x < extent.right)
      assert.equal(root.y, GROUND_STUDY.base)
    }
    assert(ground.crestPoints.every((point) => point.y >= GROUND_STUDY.base - 16))
    for (let i = 0; i < ground.footprints.length; i++) {
      const a = ground.footprints[i]
      for (const b of ground.footprints.slice(i + 1)) {
        if (a.kind === "grass" && b.kind === "grass") continue
        assert(!groundBoundsOverlap(a.bounds, b.bounds, 2), "Garden litter must not overlap")
      }
    }
  }
  for (const extent of [{ left: NaN, right: 500 }, { left: 400, right: 100 }, { left: 100, right: 110 }]) {
    assert.throws(() => groundStudyGeometry(0, extent), RangeError)
  }
})

const inRange = (value, [min, max]) => assert(value >= min - 1e-9 && value <= max + 1e-9, `${value} outside ${min}-${max}`)
const samePoint = (a, b) => assert(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8)
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const gardenIdentity = (garden) => ({ ...garden, monsteras: garden.monsteras.map((plant) => ({
  id: plant.id, role: plant.role, anatomySeed: plant.anatomySeed,
  size: plant.size, stemWidth: plant.stemWidth, fullness: plant.fullness, maturity: plant.maturity,
  holeFamily: plant.holeFamily, holes: plant.holes,
})) })

test("optimized variegation retains the exact approved cloud masks", () => {
  const snapshots = [
    [1, "marbled", "33e97cac5669dc5910e93b02469cbe82f8d64c92ec9e344380fcc7bac51f6eb4"],
    [2, "tips", "a5c80ee59d4732258a96b0b72a96fba5347a905851131d938272b52fecf14818"],
    [3, "streaks", "fcebcda4888563a846504ec19a8b64f27f93d119fb05c70bd69cc5696b49206b"],
    [4, "patches", "ff99f20c5446871c476dd533475946c988aeb5702d05e635aa71bdbe47ce8c4b"],
  ]
  for (const [seed, pattern, expected] of snapshots) {
    assert.equal(digest(organicMonsteraMarkingGeometry(studySeed(seed, "monstera-study"), pattern)), expected)
  }
})

test("garden monsteras reuse approved anatomy, attach at basal notches and preserve scene bounds", () => {
  let pink = 0, plain = 0
  for (let seed = 0; seed < 32; seed++) {
    const garden = generateGarden(seed), before = structuredClone(garden)
    const prepared = prepareGardenMonsteras(seed, garden.monsteras)
    let outward = 0
    assert.equal(prepared.length, garden.monsteras.length)
    assert.deepEqual(prepared, structuredClone(prepared))
    for (let i = 0; i < prepared.length; i++) {
      const { id, artwork } = prepared[i], plant = garden.monsteras[i]
      assert.equal(id, plant.id)
      const recipe = gardenMonsteraRecipe(seed, plant)
      assert.deepEqual([artwork.seed, artwork.age, artwork.markings], [recipe.seed, recipe.age, recipe.markings])
      assert.equal(artwork.anatomy.veins.filter((vein) => vein.depth === 1).length, 14)
      assert.equal(artwork.anatomy.cuts.length, artwork.age * 2)
      assert(!("boundaries" in artwork.materials), "Worker payload should omit diagnostic sampling data")
      assert(artwork.anatomy.holes.every((hole) => !("vertices" in hole)))
      const facing = plant.role === "king" || plant.role === "general" ? "outward" : "inward"
      const pose = plant.pose, frame = pose.blade, project = monsteraProjection(frame)
      assert.equal(pose.facing, facing)
      assert.equal(plant.anatomySeed, artwork.seed)
      assert(!("angle" in plant) && !("base" in plant), "Ambiguous pose fields must not remain in the model")
      const side = plant.root.x < BLOOM_SCENE.centerX ? -1 : 1
      const direction = (project(artwork.anatomy.tip).x - frame.attachment.x) * side
      assert(facing === "outward" ? direction > 0 : direction < 0, `Seed ${seed} leaf ${i} points the wrong way`)
      if (facing === "outward") outward++
      samePoint(project(artwork.anatomy.attachment), frame.attachment)
      samePoint(pose.petiole.curve[0], plant.root)
      samePoint(pose.petiole.curve[3], frame.attachment)
      samePoint(pose.petiole.end, frame.attachment)
      assert(project(artwork.anatomy.tip).y > frame.attachment.y, "Monsteras must retain the approved hanging orientation")
      assert(pose.petiole.width > pose.petiole.tipWidth)
      for (const point of organicMonsteraBlade(artwork.seed).boundary.map(project)) {
        inRange(point.x, [0, BLOOM_SCENE.width])
        inRange(point.y, [0, BLOOM_SCENE.baseline])
      }
      if (artwork.markings === "plain") { plain++; assert.deepEqual(artwork.materials.paths, []) }
      if (artwork.materials.pinkPaths.length) pink++
    }
    assert.equal(outward, 2, "Anchor and counterweight sweep out; connectors and young accent sweep in")
    assert.deepEqual(garden, before, "Preparing artwork must not move the composition")
  }
  assert(pink > 0 && plain > 0)
  const artwork = createMonsteraArtwork(7, 3, "marbled")
  assert.strictEqual(artwork, createMonsteraArtwork(7, 3, "marbled"))
})

test("standalone leaf-facing defaults remain reproducible for poses without a composition plan", () => {
  const plans = new Set()
  for (let seed = 0; seed < 64; seed++) {
    const plan = Array.from({ length: 5 }, (_, i) => gardenMonsteraFacing(seed, i))
    assert.notEqual(plan[0], plan[1])
    assert.notEqual(plan[1], plan[2])
    assert.deepEqual(plan, Array.from({ length: 5 }, (_, i) => gardenMonsteraFacing(seed, i)))
    plans.add(plan.join(","))
  }
  assert.equal(plans.size, 2, "Both facing phases should appear across generations")
  for (const index of [-1, 1.5, NaN, Infinity]) assert.throws(() => gardenMonsteraFacing(0, index), RangeError)
})

test("joint rotations keep inward and outward blades connected and unclipped across 256 gardens", () => {
  const angles = new Set()
  for (let seed = 0; seed < 256; seed++) {
    const garden = generateGarden(seed)
    garden.monsteras.forEach((plant) => {
      const recipe = gardenMonsteraRecipe(seed, plant)
      const blade = organicMonsteraBlade(recipe.seed)
      const facing = plant.role === "king" || plant.role === "general" ? "outward" : "inward"
      const frame = plant.pose.blade, project = monsteraProjection(frame)
      assert.equal(plant.pose.facing, facing)
      const side = plant.root.x < BLOOM_SCENE.centerX ? -1 : 1
      const tip = project(blade.tip)
      assert(tip.y > frame.attachment.y)
      assert(facing === "outward" ? (tip.x - frame.attachment.x) * side > 0 : (tip.x - frame.attachment.x) * side < 0)
      samePoint(project(blade.attachment), plant.pose.petiole.curve[3])
      samePoint(plant.pose.petiole.curve[0], plant.root)
      for (const point of blade.boundary.map(project)) {
        inRange(point.x, [BLOOM_COMPOSITION.monstera.left, BLOOM_COMPOSITION.monstera.right])
        inRange(point.y, [0, BLOOM_SCENE.baseline])
      }
      angles.add(frame.rotation.toFixed(2))
    })
  }
  assert(angles.size > 500, "Joint lean should vary continuously, not reuse a few fixed angles")
})

test("monstera groups frame the flower crown with staggered roots and role-related sweeps", () => {
  const plans = new Set()
  let crownIntrusion = 0
  for (let seed = 0; seed < 128; seed++) {
    const garden = generateGarden(seed)
    const anchor = garden.monsteras.find((plant) => plant.role === "king")
    const counterweight = garden.monsteras.find((plant) => plant.role === "general")
    const young = garden.monsteras.find((plant) => plant.role === "commoner")
    assert((anchor.root.x - BLOOM_SCENE.centerX) * (counterweight.root.x - BLOOM_SCENE.centerX) < 0)
    assert((anchor.root.x - BLOOM_SCENE.centerX) * (young.root.x - BLOOM_SCENE.centerX) > 0)
    assert(young.pose.blade.attachment.y - anchor.pose.blade.attachment.y > 40,
      "Tall anchors and short basal accents must keep a visibly staggered canopy")
    assert(gardenMonsteraRecipe(seed, young).age <= 1, "The young accent retains the approved simple juvenile anatomy")
    assert.equal(new Set(garden.monsteras.map((plant) => plant.root.x)).size, garden.monsteras.length)
    assert(Math.max(...garden.monsteras.map((plant) => plant.root.x))
      - Math.min(...garden.monsteras.map((plant) => plant.root.x)) <= 108)
    for (const plant of garden.monsteras) {
      const boundary = organicMonsteraBlade(plant.anatomySeed).boundary.map(monsteraProjection(plant.pose.blade))
      for (const flower of [garden.king, ...garden.flowers].filter((flower) => ["king", "general"].includes(flower.role))) {
        const head = flower.curve[3]
        const clearance = boundaryClearance(head, boundary) * (pointInsidePolygon(head, boundary) ? -1 : 1)
        crownIntrusion += Math.max(0, flower.diameter * 0.19 + 10 - clearance) ** 2
      }
    }
    plans.add(digest(garden.monsteras.map((plant) => plant.pose)))
  }
  // Taller foliage may interleave with petals; retain an 85% improvement over the original 732,587.
  assert(crownIntrusion < 100000, `Flower crown intrusion regressed: ${crownIntrusion}`)
  assert.equal(plans.size, 128)
})

test("whole gardens retain readable leaves, balanced mass and a varied canopy after foreground occlusion", () => {
  for (let seed = 0; seed < 256; seed++) {
    const garden = generateGarden(seed)
    const metrics = gardenCompositionMetrics(garden)
    assert(metrics.exposed.every((fraction) => fraction >= 0.22), `Buried foliage in seed ${seed}`)
    assert(metrics.maxOverlap <= 0.41, `Merged leaf mass in seed ${seed}`)
    assert(Math.abs(metrics.centerX - BLOOM_SCENE.centerX) < 40, `Unbalanced scene in seed ${seed}`)
    assert(metrics.heightSpan >= 100, `Foliage collapsed onto one shelf in seed ${seed}`)
    const anchor = garden.monsteras.find((plant) => plant.role === "king")
    const blade = organicMonsteraBlade(anchor.anatomySeed)
    const scale = anchor.pose.blade.scale
    const fullLengthScale = anchor.size * BLOOM_SCENE.monsteraAttachmentHeight
      / BLOOM_SCENE.monsteraLength / Math.abs(blade.tip.y)
    assert(scale.y <= fullLengthScale * 0.78 + 1e-9, "Supporting foliage must not regain its oversized focal weight")
    assert(Math.abs(scale.x / scale.y - anchor.fullness / blade.height) < 1e-9,
      "Composition scaling must preserve the approved flat blade proportions")
  }
})

test("composition responds to flowers without mutating or redrawing any plant", () => {
  const garden = generateGarden(7)
  const flowers = [garden.king, ...garden.flowers]
  const before = structuredClone(garden)
  assert.deepEqual(composeGardenMonsteras(7, garden.monsteras, flowers), garden.monsteras)
  const movedFlowers = flowers.map((plant) => ({ ...plant, curve: plant.curve.map((point) =>
    ({ ...point, x: BLOOM_SCENE.width - point.x })) }))
  const moved = composeGardenMonsteras(7, garden.monsteras, movedFlowers)
  assert.notDeepEqual(moved.map((plant) => plant.pose), garden.monsteras.map((plant) => plant.pose))
  assert.deepEqual(garden, before)
  assert.deepEqual(gardenIdentity({ ...garden, monsteras: moved }), gardenIdentity(garden))
})

test("blade rotation belongs to the generated pose and does not rotate or move its petiole", () => {
  const plant = generateGarden(7).monsteras[0]
  const before = structuredClone(plant.pose.petiole)
  const frame = { ...plant.pose.blade, rotation: plant.pose.blade.rotation + 24 }
  samePoint(projectMonsteraPoint(frame, { x: 0, y: 0 }), plant.pose.petiole.end)
  assert.notDeepEqual(projectMonsteraPoint(frame, { x: 0, y: -100 }),
    projectMonsteraPoint(plant.pose.blade, { x: 0, y: -100 }))
  assert.deepEqual(plant.pose.petiole, before)
  assert(monsteraBladeTransform(frame).includes(`rotate(${frame.rotation})`))
  assert.deepEqual(plant.pose, structuredClone(plant.pose), "Core poses must serialize without render functions")
})

test("the study uses the same blade-frame and petiole-end contract", () => {
  for (const seed of [1, 7, 55, 505]) {
    const anatomy = organicMonsteraBlade(seed)
    const pose = createStudyMonsteraPose(seed, anatomy.height)
    samePoint(projectMonsteraPoint(pose.blade, anatomy.attachment), pose.petiole.end)
    samePoint(pose.petiole.curve[3], pose.blade.attachment)
    assert(projectMonsteraPoint(pose.blade, anatomy.tip).y > pose.blade.attachment.y)
    assert.deepEqual(pose, createStudyMonsteraPose(seed, anatomy.height))
  }
  const specimen = createMonsteraSpecimen(7)
  assert.deepEqual(specimen.pose, createStudyMonsteraPose(specimen.anatomySeed, organicMonsteraBlade(specimen.anatomySeed).height))
  for (const height of [0, -1, NaN, Infinity]) assert.throws(() => createStudyMonsteraPose(7, height), RangeError)
})

test("monstera study frames centre the whole plant and contain root sway and leaf follow-through", () => {
  const rotate = (point, origin, degrees) => {
    const angle = degrees * Math.PI / 180, x = point.x - origin.x, y = point.y - origin.y
    return { x: origin.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: origin.y + x * Math.sin(angle) + y * Math.cos(angle) }
  }
  const maxFlex = BLOOM_MOTION.plant.flexBase + BLOOM_MOTION.plant.youngFlex + BLOOM_MOTION.plant.flexSpread
  const gustFlex = 1.25 * maxFlex
  for (let seed = 1; seed <= 128; seed++) {
    const specimen = createMonsteraSpecimen(seed), { pose, viewBox } = specimen
    const anatomy = organicMonsteraBlade(specimen.anatomySeed)
    assert.deepEqual(viewBox, monsteraStudyViewBox(anatomy.boundary, pose))
    assert(Math.abs(viewBox.width / viewBox.height - MONSTERA_STUDY_FRAME.aspectRatio) < 1e-9)
    const project = monsteraProjection(pose.blade)
    const rest = [...anatomy.boundary.map(project), ...pose.petiole.curve]
    samePoint({ x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 }, {
      x: (Math.min(...rest.map((p) => p.x)) + Math.max(...rest.map((p) => p.x))) / 2,
      y: (Math.min(...rest.map((p) => p.y)) + Math.max(...rest.map((p) => p.y))) / 2,
    })
    const stalk = monsteraStudyStalk(specimen.anatomySeed)
    const edges = stalk.edges.flatMap((curve) => Array.from({ length: 33 }, (_, i) => curvePoint(curve, i / 32)))
    for (const sway of [-1.1, 0, 1.4]) {
      for (const follow of [-2.2, 0, 1.8]) {
        const blade = anatomy.boundary.map((point) => project(rotate(point, { x: 0, y: 0 }, follow * gustFlex)))
        for (const point of [...blade, ...edges]) {
          const moved = rotate(point, pose.petiole.curve[0], sway * gustFlex)
          inRange(moved.x, [viewBox.x + 1, viewBox.x + viewBox.width - 1])
          inRange(moved.y, [viewBox.y + 1, viewBox.y + viewBox.height - 1])
        }
      }
    }
  }
  const specimen = createMonsteraSpecimen(1)
  assert.throws(() => monsteraStudyViewBox([], specimen.pose), RangeError)
  assert.throws(() => monsteraStudyViewBox([{ x: NaN, y: 0 }], specimen.pose), RangeError)
})

class FakeMonsteraWorker {
  messages = []
  terminated = 0
  onmessage = null
  onerror = null
  postMessage(message) { this.messages.push(structuredClone(message)) }
  reply(response) { this.onmessage?.({ data: response }) }
  terminate() { this.terminated++ }
}

test("shared monstera worker coalesces requests, rejects stale artwork and releases its last lease", () => {
  const worker = new FakeMonsteraWorker(), results = [], errors = []
  const pool = createMonsteraPool(worker)
  const garden = pool.acquire((result) => results.push(["garden", result.id]), (error) => errors.push(error))
  const study = pool.acquire((result) => results.push(["study", result.id]), (error) => errors.push(error))
  const first = garden.submit({ kind: "garden", seed: 0, plants: [] })
  garden.submit({ kind: "garden", seed: 1, plants: [] })
  const latest = garden.submit({ kind: "garden", seed: 2, plants: [] })
  const specimen = study.submit({ kind: "study", seed: 7, age: 3, markings: "plain" })
  assert.equal(worker.messages.length, 1)
  worker.reply({ id: first, artworks: [] })
  assert.deepEqual(results, [])
  assert.equal(worker.messages.at(-1).id, latest)
  worker.reply({ id: latest, artworks: [] })
  assert.equal(worker.messages.at(-1).id, specimen)
  worker.reply({ id: specimen, artwork: {} })
  assert.deepEqual(results, [["garden", latest], ["study", specimen]])
  assert.deepEqual(errors, [])
  garden.terminate()
  garden.terminate()
  assert.equal(worker.terminated, 0)
  assert.throws(() => garden.submit({ kind: "garden", seed: 3, plants: [] }), /closed/)
  study.terminate()
  assert.equal(worker.terminated, 1)
  assert.equal(worker.onmessage, null)
  assert.equal(worker.onerror, null)
})

test("monstera workers surface generation failures and do not notify closed consumers", () => {
  const worker = new FakeMonsteraWorker(), results = [], errors = []
  const pool = createMonsteraPool(worker)
  const first = pool.acquire((result) => results.push(result), (error) => errors.push(error.message))
  const second = pool.acquire((result) => results.push(result), (error) => errors.push(error.message))
  const abandoned = first.submit({ kind: "garden", seed: 0, plants: [] })
  const next = second.submit({ kind: "garden", seed: 1, plants: [] })
  first.terminate()
  worker.reply({ id: abandoned, error: "obsolete" })
  assert.deepEqual(errors, [])
  worker.reply({ id: next, error: "generation failed" })
  assert.deepEqual(errors, ["generation failed"])
  assert.deepEqual(results, [])
  worker.onerror({ message: "worker import failed" })
  assert.deepEqual(errors, ["generation failed", "worker import failed"])
  assert.throws(() => second.submit({ kind: "garden", seed: 2, plants: [] }), /worker import failed/)
  second.terminate()
})

test("study petioles vary coherently and connect hanging leaves within the complete viewport", () => {
  const identities = new Set(), tilts = [], thicknesses = [], lengths = []
  const box = MONSTERA_STUDY_STALK.viewBox
  for (let i = 1; i <= 128; i++) {
    const seed = studySeed(i, "monstera-study")
    const stalk = monsteraStudyStalk(seed)
    const blade = organicMonsteraBlade(seed)
    assert.deepEqual(stalk, monsteraStudyStalk(seed))
    identities.add(digest(stalk))
    tilts.push(stalk.leafRotation)
    thicknesses.push(stalk.width)
    lengths.push(stalk.root.y - stalk.curve[3].y)
    samePoint(stalk.curve[0], stalk.root)
    const anchor = stalk.curve[3]
    assert(stalk.width > stalk.tipWidth && stalk.tipWidth >= 1.8)
    assert(!/NaN|Infinity/.test(stalk.outline))
    assert.equal((stalk.outline.match(/ C/g) ?? []).length, 2, "Stalk edges should be two long curves, not sampled noise lines")
    const rotate = (p) => {
      const angle = stalk.leafRotation * Math.PI / 180, y = p.y * blade.height
      return { x: anchor.x + p.x * Math.cos(angle) - y * Math.sin(angle),
        y: anchor.y + p.x * Math.sin(angle) + y * Math.cos(angle) }
    }
    samePoint(rotate(blade.attachment), anchor)
    assert(rotate(blade.tip).y > anchor.y + 90, "The tip should hang below the basal attachment")
    const transformedBlade = blade.boundary.map(rotate)
    for (const p of transformedBlade) {
      inRange(p.x, [box.x + 3, box.x + box.width - 3])
      inRange(p.y, [box.y + 3, box.y + box.height - 3])
    }
    assert(stalk.root.y > Math.max(...transformedBlade.map((p) => p.y)) + 8, "A visible stalk must extend below the blade")
    for (const edge of stalk.edges) {
      for (let step = 0; step <= 24; step++) {
        const p = curvePoint(edge, step / 24)
        inRange(p.x, [box.x + 3, box.x + box.width - 3])
        inRange(p.y, [box.y + 3, box.y + box.height - 3])
      }
    }
    samePoint({ x: (stalk.edges[0][3].x + stalk.edges[1][3].x) / 2,
      y: (stalk.edges[0][3].y + stalk.edges[1][3].y) / 2 }, anchor)
  }
  assert.equal(identities.size, 128)
  assert(Math.min(...tilts) < 170 && Math.max(...tilts) > 190, "Poses should lean both ways")
  assert(Math.max(...thicknesses) - Math.min(...thicknesses) > 1)
  assert(Math.max(...lengths) - Math.min(...lengths) > 20)
  for (const seed of [-1, 1.5, NaN, Infinity]) assert.throws(() => monsteraStudyStalk(seed), RangeError)
})

test("monstera divisions and the complete vein network sweep toward the tip", () => {
  const cutAngles = [], veinAngles = []
  for (let i = 1; i <= 24; i++) {
    const leaf = organicMonstera(studySeed(i, "monstera-study"), 5)
    for (const cut of leaf.cuts.filter((c) => c.slot > 0 && c.slot < 4)) {
      const outerX = (cut.curves[0][0].x + cut.curves[2][3].x) / 2
      cutAngles.push(Math.atan2(cut.tip.y - cut.mouthY, Math.abs(outerX - cut.tip.x)) * 180 / Math.PI)
    }
    for (const vein of leaf.veins.filter((v) => v.depth === 1)) {
      const start = vein.curve[0], end = vein.curve[3]
      assert(end.y < start.y)
      assert(vein.width < 0.85, "Secondary veins should not become heavy spokes")
      veinAngles.push(Math.atan2(start.y - end.y, Math.abs(start.x - end.x)) * 180 / Math.PI)
    }
  }
  assert(cutAngles.reduce((a, b) => a + b, 0) / cutAngles.length > 20, "Slits need a meaningful upward outer sweep")
  assert(veinAngles.reduce((a, b) => a + b, 0) / veinAngles.length > 20, "Veins need a meaningful tipward sweep")
})

test("large monstera leaves retain seven secondary veins per side regardless of age", () => {
  const inside = (p, polygon) => {
    let result = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j]
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result
    }
    return result
  }
  let connections = 0
  for (let i = 1; i <= 24; i++) {
    const seed = studySeed(i, "monstera-study")
    const base = organicMonsteraBlade(seed)
    const complete = organicMonstera(seed, 0).veins.filter((v) => v.depth <= 1)
    for (let age = 0; age <= 5; age++) {
      const leaf = organicMonstera(seed, age)
      const primaries = leaf.veins.filter((vein) => vein.depth === 1)
      assert.equal(primaries.length, 14, "A lightly split leaf must not lose most of its veins")
      assert.equal(primaries.filter((v) => v.finger.startsWith("-1:")).length, 7)
      assert.equal(primaries.filter((v) => v.finger.startsWith("1:")).length, 7)
      assert.deepEqual(leaf.veins.filter((v) => v.depth <= 1), complete)
      assert.equal(new Set(primaries.map((vein) => vein.finger)).size, primaries.length)
      for (const vein of primaries) {
        const origin = vein.curve[0]
        const nearest = Math.min(...Array.from({ length: 1025 }, (_, k) => {
          const p = curvePoint(base.spine, k / 1024)
          return Math.hypot(p.x - origin.x, p.y - origin.y)
        }))
        assert(nearest < 0.1, "Supporting vein must originate on the actual midrib")
        const end = vein.curve[3]
        assert(Math.hypot(end.x - vein.rim.x, end.y - vein.rim.y) < 5.6)
      }
      for (const vein of leaf.veins.filter((v) => v.depth !== 0)) {
        connections += vein.depth === 2 ? 1 : 0
        for (const curve of [vein.curve]) {
          for (let t = 0; t <= 64; t++) {
            const p = curvePoint(curve, t / 64)
            assert(inside(p, base.boundary))
            assert(leaf.cuts.every((cut) => !inside(p, cut.polygon)), "Vein crosses a slit")
            assert(leaf.holes.every((hole) => !inside(p, hole.vertices)), "Vein crosses a hole")
          }
        }
      }
      assert(leaf.veins.filter((vein) => vein.depth === 2).length <= 24)
      assert.deepEqual(leaf.veins, organicMonstera(seed, age).veins)
    }
  }
  assert(connections > 0, "A few safe connecting veins should remain")
})

test("upright monstera anatomy starts at the heart notch and tapers toward the upper tip", () => {
  for (let i = 1; i <= 24; i++) {
    const seed = studySeed(i, "monstera-study")
    const base = organicMonsteraBlade(seed)
    samePoint(base.attachment, { x: 0, y: 0 })
    samePoint(base.spine[0], base.attachment)
    samePoint(base.spine[3], base.tip)
    assert(base.tip.y < -100)
    assert(Math.min(...base.boundary.map((p) => p.y)) >= base.tip.y - 0.01)
    assert(Math.max(...base.boundary.map((p) => p.y)) > 5, "Basal heart lobes surround the attachment")
    for (const age of [0, 2, 5]) {
      const leaf = organicMonstera(seed, age)
      samePoint(leaf.veins[0].curve[0], base.attachment)
      samePoint(leaf.veins[0].curve[3], base.tip)
      const points = leaf.veins[0].d.match(/-?\d+(?:\.\d+)?/g).map(Number)
      const firstWidth = Math.hypot(points[0] - points.at(-2), points[1] - points.at(-1))
      const tipWidth = Math.hypot(points[48] - points[50], points[49] - points[51])
      assert(firstWidth > tipWidth * 8, "Midrib must be thickest at attachment, not tip")
      leaf.cuts.forEach((cut) => assert(cut.tip.y > cut.mouthY, "Slits curve inward toward the base"))
      leaf.veins.filter((vein) => vein.depth === 1).forEach((vein) => {
        const end = vein.curve[3]
        if (end.y < -12) assert(end.y < vein.curve[0].y, "Secondary sweeps outward and tipward")
      })
    }
  }
})

test("monstera bases vary their proportions while retaining a connected heart-shaped blade", () => {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const identities = new Set(), aspects = []
  for (let i = 1; i <= 64; i++) {
    const seed = studySeed(i, "monstera-study")
    const base = organicMonsteraBlade(seed)
    assert.deepEqual(base, organicMonsteraBlade(seed))
    identities.add(base.edge)
    samePoint(base.blade[0][0], { x: 0, y: 0 })
    samePoint(base.blade.at(-1)[3], base.blade[0][0])
    base.blade.forEach((curve, index) => samePoint(curve[3], base.blade[(index + 1) % base.blade.length][0]))
    samePoint(base.spine[3], base.blade[1][3])
    const boundary = base.boundary.filter((p, index, points) => index === 0 || p.x !== points[index - 1].x || p.y !== points[index - 1].y)
    for (let a = 0; a < boundary.length - 1; a++) {
      for (let b = a + 2; b < boundary.length - 1; b++) {
        if (a === 0 && b === boundary.length - 2) continue
        const p = boundary[a], q = boundary[a + 1], r = boundary[b], s = boundary[b + 1]
        assert(!(cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0), `Blade self-intersects in seed ${i}`)
      }
    }
    const top = Math.min(...boundary.map((p) => p.y))
    const bottom = Math.max(...boundary.map((p) => p.y))
    assert(bottom > base.attachment.y + 5, "Heart lobes must extend below the attachment notch")
    const width = Math.max(...boundary.map((p) => p.x)) - Math.min(...boundary.map((p) => p.x))
    aspects.push(width / (-top * base.height))
    boundary.forEach((p) => {
      inRange(p.x, [-80, 80])
      inRange(p.y * base.height + base.offsetY, [-135, 40])
    })
    assert.equal(organicMonstera(seed, 0).outline, base.edge)
    assert.equal(organicMonstera(seed, 5).edge, base.edge)
  }
  assert.equal(identities.size, 64, "New drawings must not reuse one base outline")
  assert(Math.max(...aspects) - Math.min(...aspects) > 0.3, "Variation should include broad and slender silhouettes")
})

test("monstera colours deepen at every age while leaf and shadow share one green hue", () => {
  const parse = (color) => color.match(/-?\d+(?:\.\d+)?/g).map(Number)
  let previous
  for (let age = 0; age <= 5; age++) {
    const palette = monsteraStudyPalette(age)
    const tones = Object.fromEntries(Object.entries(palette).map(([name, color]) => [name, parse(color)]))
    assert.equal(new Set(Object.values(tones).map(([hue]) => hue)).size, 1)
    assert(tones.light[2] > tones.middle[2] && tones.middle[2] > tones.dark[2])
    assert(tones.dark[2] > tones.shadow[2])
    if (previous) {
      for (const name of ["light", "middle", "dark", "shadow"]) assert(tones[name][2] < previous[name][2])
      assert(tones.middle[1] > previous.middle[1])
    }
    assert.deepEqual(palette, monsteraStudyPalette(age))
    previous = tones
  }
  for (const age of [-1, 6, 1.5, NaN, Infinity]) assert.throws(() => monsteraStudyPalette(age), RangeError)
})

test("monstera shadow silhouette reuses the exact slit contour and rotated hole shapes", () => {
  for (const seed of [1, 7, 55, 505]) {
    for (let age = 0; age <= 5; age++) {
      const anatomy = organicMonstera(seed, age)
      const before = structuredClone(anatomy)
      const silhouette = organicMonsteraSilhouette(anatomy)
      assert(silhouette.startsWith(anatomy.outline))
      assert.equal((silhouette.match(/ Z/g) ?? []).length, anatomy.holes.length + 1)
      assert(!/NaN|Infinity/.test(silhouette))
      anatomy.holes.forEach((hole) => {
        assert(silhouette.includes(`a${hole.length} ${hole.width} ${hole.rotation}`))
      })
      assert.deepEqual(anatomy, before)
      assert.equal(silhouette, organicMonsteraSilhouette(anatomy))
    }
  }
})

test("pink material uses seeded hard cloud contours with coverage measured inside ivory", () => {
  assert.match(MONSTERA_STUDY_VARIEGATION_COLOR.ivory, /^#[0-9A-F]{6}$/)
  assert.match(MONSTERA_STUDY_VARIEGATION_COLOR.pink, /^#[0-9A-F]{6}$/)
  const modes = new Set()
  for (const pattern of VARIEGATION_PATTERNS) {
    const mixedShapes = new Set()
    for (let i = 1; i <= 12; i++) {
      const seed = studySeed(i, "monstera-study")
      const geometry = organicMonsteraMarkingGeometry(seed, pattern)
      const { pink } = geometry
      inRange(pink.coverage, [0, 1])
      assert(Math.abs(pink.coverage - pink.target) < 0.08,
        `${pattern} seed ${i}: rendered pink coverage ${pink.coverage} differs from target ${pink.target}`)
      if (pink.target === 0) {
        modes.add("ivory")
        assert.deepEqual(pink.paths, [])
        assert.equal(pink.coverage, 0)
      } else if (pink.target === 1) {
        modes.add("pink")
        assert.deepEqual(pink.paths, geometry.paths)
        assert.equal(pink.coverage, 1)
      } else {
        modes.add("mixed")
        assert(pink.paths.length > 0)
        assert.notDeepEqual(pink.paths, geometry.paths, "Pink must use a related field, not duplicate the white mask")
        assert(!/NaN|Infinity|gradient|rgb/.test(pink.paths.join(" ")))
        assert.equal((pink.paths[0].match(/ Z/g) ?? []).length, pink.boundaries.length)
        mixedShapes.add(digest(pink.paths))
      }
      if (i <= 3) assert.deepEqual(geometry, organicMonsteraMarkingGeometry(seed, pattern))
    }
    assert(mixedShapes.size > 4, `${pattern} should produce distinct mixed cloud masks`)
  }
  assert.deepEqual([...modes].sort(), ["ivory", "mixed", "pink"])
  assert.deepEqual(organicMonsteraMarkingGeometry(7, "plain").pink.paths, [])
})

test("age develops the same variegation fields subtly and reversibly in shared artwork", () => {
  const inside = (point, polygons) => {
    let result = false
    for (const polygon of polygons) {
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j]
        if ((a.y > point.y) !== (b.y > point.y)
          && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result
      }
    }
    return result
  }
  const modes = new Set()
  for (const pattern of VARIEGATION_PATTERNS) {
    for (const count of [1, 2, 3, 5, 6, 7, 11, 12]) {
      const seed = studySeed(count, "monstera-study")
      const young = organicMonsteraMarkingGeometry(seed, pattern, 0)
      const points = []
      const blade = organicMonsteraBlade(seed).boundary
      for (let y = -145; y <= 20; y += 2) {
        for (let x = -70; x <= 70; x += 2) {
          const point = { x, y }
          if (inside(point, [blade])) points.push(point)
        }
      }
      const youngWhite = points.map((point) => inside(point, young.boundaries))
      const youngPink = points.map((point, i) => youngWhite[i] && inside(point, young.pink.boundaries))
      let previous = young
      for (let age = 0; age <= 5; age++) {
        const geometry = age === 0 ? young : organicMonsteraMarkingGeometry(seed, pattern, age)
        assert(geometry.target >= previous.target && geometry.target - young.target <= 0.047)
        assert(geometry.pink.target >= previous.pink.target && geometry.pink.target - young.pink.target <= 0.06)
        assert(Math.abs(geometry.coverage - geometry.target) < 0.001)
        assert(Math.abs(geometry.pink.coverage - geometry.pink.target) < 0.08)
        assert(!/NaN|Infinity/.test([...geometry.paths, ...geometry.pink.paths].join(" ")))
        const artwork = createMonsteraArtwork(seed, age, pattern)
        assert.deepEqual(artwork.materials.paths, geometry.paths)
        assert.deepEqual(artwork.materials.pinkPaths, geometry.pink.paths)
        assert.equal(artwork.materials.pinkCoverage, geometry.pink.coverage)
        assert.equal(artwork.anatomy.edge, createMonsteraArtwork(seed, 0, pattern).anatomy.edge)
        if (young.pink.target === 0 || young.pink.target === 1) {
          modes.add(young.pink.target)
          assert.equal(geometry.pink.target, young.pink.target, "Age must preserve all-ivory and all-pink modes")
        }
        if (age === 5) {
          assert.notDeepEqual(geometry.paths, young.paths)
          const matureWhite = points.map((point) => inside(point, geometry.boundaries))
          const maturePink = points.map((point, i) => matureWhite[i] && inside(point, geometry.pink.boundaries))
          const overlap = (a, b) => a.filter((value, i) => value && b[i]).length / a.filter((value, i) => value || b[i]).length
          const retainedWhite = youngWhite.filter((value, i) => value && matureWhite[i]).length / youngWhite.filter(Boolean).length
          const changedWhite = youngWhite.filter((value, i) => value !== matureWhite[i]).length / points.length
          assert(overlap(youngWhite, matureWhite) > 0.78 && retainedWhite > 0.94,
            `${pattern} seed ${count} must retain the same ivory patch locations`)
          assert(changedWhite < 0.05, `${pattern} ivory development must affect less than 5% of the blade`)
          if (youngPink.some(Boolean)) {
            const retained = youngPink.filter((value, i) => value && maturePink[i]).length / youngPink.filter(Boolean).length
            const changed = youngPink.filter((value, i) => value !== maturePink[i]).length / points.length
            assert(retained > 0.95, `${pattern} must retain its existing pink regions`)
            assert(changed < 0.05, `${pattern} pink development must affect less than 5% of the blade`)
          }
        }
        previous = geometry
      }
      assert.deepEqual(organicMonsteraMarkingGeometry(seed, pattern, 0), young, "Returning to Age 0 restores the exact markings")
    }
  }
  assert.deepEqual([...modes].sort(), [0, 1])
  for (let age = 0; age <= 5; age++) {
    const plain = createMonsteraArtwork(7, age, "plain")
    assert.deepEqual(plain.materials, { paths: [], pinkPaths: [], pinkCoverage: 0 })
  }
  for (const age of [-1, 6, 1.5, NaN, Infinity]) {
    assert.throws(() => organicMonsteraMarkingGeometry(7, "plain", age), RangeError)
  }
})

test("noise-based monstera markings are closed, coverage-bounded seeded contours", () => {
  for (const pattern of VARIEGATION_PATTERNS) {
    const drawings = new Set()
    for (let seed = 1; seed <= 20; seed++) {
      const { paths, rings, coverage, target } = organicMonsteraMarkingGeometry(seed, pattern)
      assert.deepEqual(paths, organicMonsteraMarkings(seed, pattern))
      drawings.add(digest(paths))
      assert(paths.length > 0)
      assert(paths.every((d) => !/NaN|Infinity/.test(d)))
      assert(Math.abs(coverage - target) < 0.001)
      inRange(coverage, [0.09, 0.47])
      assert.equal((paths[0].match(/ Z/g) ?? []).length, rings.length)
      rings.forEach((ring) => assert(ring.area >= 0.8))
      if (pattern === "streaks") {
        const tip = organicMonsteraBlade(seed).tip
        assert(rings.every((ring) => ring.points.every((p) => p.y < 0 && p.y > tip.y)), "Streaks close before the actual blade ends")
        const top = Math.min(...rings.flatMap((ring) => ring.points.map((p) => p.y)))
        const bottom = Math.max(...rings.flatMap((ring) => ring.points.map((p) => p.y)))
        assert(bottom - top > 85, "Streaks should flow lengthwise rather than form random blobs")
      }
    }
    assert.equal(drawings.size, 20, `${pattern} repeats a static recipe drawing`)
  }
  assert.deepEqual(organicMonsteraMarkings(7, "plain"), [])
})

test("variegation uses fewer longer curves without materially changing rendered coverage", () => {
  const inside = (p, polygon) => {
    let result = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j]
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result
    }
    return result
  }
  for (const pattern of VARIEGATION_PATTERNS) {
    let rawPoints = 0, curves = 0
    for (const seed of [1, 7, 17, 55, 505, 1490]) {
      const geometry = organicMonsteraMarkingGeometry(seed, pattern)
      const rendered = geometry.paths[0].split(" Z").filter(Boolean).map((path) => {
        const values = path.match(/-?\d+(?:\.\d+)?/g).map(Number)
        let start = { x: values[0], y: values[1] }
        const polygon = [start]
        for (let i = 2; i < values.length; i += 4) {
          const control = { x: values[i], y: values[i + 1] }
          const end = { x: values[i + 2], y: values[i + 3] }
          for (let step = 1; step <= 8; step++) {
            const t = step / 8, u = 1 - t
            polygon.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
              y: u * u * start.y + 2 * u * t * control.y + t * t * end.y })
          }
          start = end
          curves++
        }
        return polygon
      })
      rawPoints += geometry.rings.reduce((sum, ring) => sum + ring.points.length, 0)
      const blade = organicMonsteraBlade(seed).boundary
      let samples = 0, cream = 0
      for (let y = -145; y <= 20; y += 3) {
        for (let x = -70; x <= 70; x += 3) {
          const p = { x, y }
          if (!inside(p, blade)) continue
          samples++
          if (rendered.filter((polygon) => inside(p, polygon)).length % 2 === 1) cream++
        }
      }
      assert(Math.abs(cream / samples - geometry.target) < 0.055,
        `${pattern} seed ${seed} lost its coverage after smoothing`)
    }
    assert(curves / rawPoints < 0.25, `${pattern} still traces too many sampled noise points`)
  }
})

test("growing a monstera changes both age and markings from every selected setting", () => {
  for (let seed = 1; seed <= 24; seed++) {
    const specimen = createMonsteraSpecimen(seed)
    for (let age = MONSTERA_AGE.min; age <= MONSTERA_AGE.max; age++) {
      for (const markings of MONSTERA_MARKINGS) {
        const current = { ...specimen, age, markings }
        const before = structuredClone(current)
        const next = growMonsteraSpecimen(current)
        assert.notEqual(next.age, age)
        assert.notEqual(next.markings, markings)
        inRange(next.age, [MONSTERA_AGE.min, MONSTERA_AGE.max])
        assert(Number.isInteger(next.age))
        assert(MONSTERA_MARKINGS.includes(next.markings))
        assert.equal(next.seed, seed + 1)
        assert.notEqual(next.anatomySeed, current.anatomySeed)
        assert.deepEqual(next, growMonsteraSpecimen(current))
        assert.deepEqual(current, before)
      }
    }
  }
  let current = createMonsteraSpecimen(1)
  const ages = new Set([current.age]), markings = new Set([current.markings])
  for (let i = 0; i < 100; i++) {
    const next = growMonsteraSpecimen(current)
    assert.notEqual(next.age, current.age)
    assert.notEqual(next.markings, current.markings)
    ages.add(next.age)
    markings.add(next.markings)
    current = next
  }
  assert.equal(ages.size, MONSTERA_AGE.max - MONSTERA_AGE.min + 1)
  assert.equal(markings.size, MONSTERA_MARKINGS.length)
})

test("monstera pattern choices remix drawings while age preserves the selected specimen", () => {
  let current = { ...createMonsteraSpecimen(1), age: 3, markings: "streaks" }
  const initial = structuredClone(current)
  const repeat = remixMonsteraSpecimen(current, { markings: "streaks" })
  assert.equal(repeat.age, 3)
  assert.equal(repeat.markings, "streaks")
  assert.notEqual(repeat.anatomySeed, current.anatomySeed)
  assert.deepEqual(current, initial)
  assert.notDeepEqual(organicMonsteraMarkings(repeat.anatomySeed, "streaks"), organicMonsteraMarkings(current.anatomySeed, "streaks"))
  current = repeat
  const selected = structuredClone(current)
  const materials = organicMonsteraMarkings(current.anatomySeed, current.markings)
  for (const age of [0, 1, 2, 3, 4, 5, 4, 3]) {
    const next = remixMonsteraSpecimen(current, { age })
    assert.equal(next.age, age)
    assert.equal(next.markings, current.markings)
    assert.equal(next.seed, selected.seed)
    assert.equal(next.anatomySeed, selected.anatomySeed)
    assert.strictEqual(next.pose, current.pose)
    assert.strictEqual(next.viewBox, current.viewBox)
    assert.strictEqual(next.plant, current.plant)
    assert.deepEqual({ ...next, age: selected.age }, selected)
    assert.deepEqual(organicMonsteraMarkings(next.anatomySeed, next.markings), materials)
    assert.equal(organicMonstera(next.anatomySeed, age).cuts.length, age * 2)
    current = next
  }
  for (const age of [-1, 6, 1.5, NaN]) assert.throws(() => remixMonsteraSpecimen(current, { age }), RangeError)
})

test("organic monstera study cuts preserve their identities and the whole blade at every age", () => {
  const gardenBefore = generateGarden(7)
  let holes = 0
  for (const seed of [1, 7, 17, 55, 505, 1490]) {
    const full = organicMonstera(seed, 5)
    assert.equal(full.cuts.length, 10)
    holes += full.holes.length
    assert.equal(full.edge, organicMonsteraBlade(seed).edge)
    for (let age = 0; age <= 5; age++) {
      const leaf = organicMonstera(seed, age)
      assert.deepEqual(leaf, organicMonstera(seed, age))
      assert.equal(leaf.edge, full.edge)
      assert.deepEqual(leaf.veins[0], full.veins[0], "Midrib stays tied to the same blade")
      assert.equal(leaf.cuts.length, age * 2)
      assert.equal(leaf.cuts.filter((cut) => cut.side === -1).length, age)
      assert.equal(leaf.cuts.filter((cut) => cut.side === 1).length, age)
      assert.deepEqual(leaf.cuts, full.cuts.filter((cut) => cut.rank < age))
      assert.deepEqual(leaf.holes, full.holes.filter((hole) => hole.rank < age))
      leaf.cuts.forEach((cut) => {
        assert(Math.abs(cut.tip.x) >= 10, "Cuts must protect the midrib")
        assert(!/NaN|Infinity/.test(cut.d))
      })
    }
  }
  assert(holes > 0, "Safe enclosed fenestrations must remain part of the drawing")
  assert.deepEqual(generateGarden(7), gardenBefore)
  for (const age of [-1, 6, 1.5, NaN]) assert.throws(() => organicMonstera(7, age), RangeError)
})

test("chunkier monstera slits preserve the approved blade, primary veins and division centres", () => {
  const identities = new Map([
    [1, "2b04e2385385b18769d2635d278a085b779fd49c54871ff4c9c6a1b81b0142b4"],
    [7, "d92c788dd2a94f86182d4935ee75f17de3d6ace0939e405f1d89f5e067eeea6f"],
    [16, "ae3725c1c602cdbb650094e93a97e65bc68bb700fb95c82d8b6e2f10bde6b613"],
    [24, "c55bf863b7bf1f8ac57aea3bdc43b6894d3b8ee7735bdb1b2cff517a13e82b12"],
  ])
  for (const [seed, expected] of identities) {
    const leaf = organicMonstera(studySeed(seed, "monstera-study"), 5)
    assert.equal(digest({
      edge: leaf.edge,
      veins: leaf.veins.filter((vein) => vein.depth <= 1),
      divisions: leaf.cuts.map(({ id, tip, penetration }) => ({ id, tip, penetration })),
    }), expected)
  }
  const areas = [1, 5].map((age) => Array.from({ length: 8 }, (_, i) => {
    const leaf = organicMonstera(studySeed(i + 1, "monstera-study"), age)
    return leaf.cuts.reduce((total, cut) => {
      const points = cut.polygon.slice(0, -2)
      return total + Math.abs(points.reduce((sum, p, j) => {
        const q = points[(j + 1) % points.length]
        return sum + p.x * q.y - q.x * p.y
      }, 0)) / 2
    }, 0)
  }).reduce((sum, area) => sum + area, 0))
  assert(areas[0] > 2412.815544863035 * 1.25, "Earliest slit bodies should be at least 25% larger than the approved narrow-slit baseline")
  assert(areas[1] > 11446.489316046122 * 1.3, "Mature slit bodies should be at least 30% larger than the approved narrow-slit baseline")
})

test("chunky organic slit polygons remain separated across seeded drawings", () => {
  const distance = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
  }
  const segmentIntersects = (a, b, c, d) => {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
  }
  for (let seed = 0; seed < 200; seed++) {
    const leaf = organicMonstera(studySeed(seed + 1, "collision-check"), 5)
    for (const vein of leaf.veins.filter((v) => v.depth <= 1)) {
      const points = Array.from({ length: 65 }, (_, i) => curvePoint(vein.curve, i / 64))
      for (const cut of leaf.cuts) {
        for (let p = 0; p < points.length; p++) {
          for (let q = 0; q < cut.polygon.length; q++) {
            const a = cut.polygon[q], b = cut.polygon[(q + 1) % cut.polygon.length]
            assert(distance(points[p], a, b) > 0.5, `Slit crowds a primary vein in seed ${seed}`)
            if (p > 0) assert(!segmentIntersects(points[p - 1], points[p], a, b), `Slit crosses a primary vein in seed ${seed}`)
          }
        }
      }
    }
    for (let i = 0; i < leaf.cuts.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = leaf.cuts[i].polygon, b = leaf.cuts[j].polygon
        for (let p = 0; p < a.length; p++) {
          for (let q = 0; q < b.length; q++) {
            const nextA = a[(p + 1) % a.length], nextB = b[(q + 1) % b.length]
            assert(!segmentIntersects(a[p], nextA, b[q], nextB), `Crossing cuts in seed ${seed}`)
            assert(distance(a[p], b[q], nextB) > 1.5, `Insufficient cut spacing in seed ${seed}: ${leaf.cuts[i].id} / ${leaf.cuts[j].id}`)
          }
        }
      }
    }
    assert(!/NaN|Infinity/.test(leaf.outline))
  }
})

test("monstera division rhythms remain asymmetric and proportioned to their vein gaps", () => {
  let totalOffset = 0
  for (let seed = 1; seed <= 32; seed++) {
    const leaf = organicMonstera(studySeed(seed, "monstera-study"), 5)
    const left = leaf.cuts.filter((cut) => cut.side === -1).sort((a, b) => a.slot - b.slot)
    const right = leaf.cuts.filter((cut) => cut.side === 1).sort((a, b) => a.slot - b.slot)
    const offsets = left.map((cut, i) => cut.mouthY - right[i].mouthY)
    assert(Math.max(...offsets) - Math.min(...offsets) > 0.75, "Sides must not be constant-offset copies")
    totalOffset += offsets.reduce((sum, value) => sum + Math.abs(value), 0) / offsets.length
    const widths = leaf.cuts.map((cut) => cut.mouth)
    leaf.cuts.forEach((cut) => {
      const a = leaf.veins.find((vein) => vein.finger === `${cut.side}:${cut.slot}`)
      const b = leaf.veins.find((vein) => vein.finger === `${cut.side}:${cut.slot + 1}`)
      inRange(cut.mouth, [1.5, Math.abs(a.rim.y - b.rim.y) * 0.42])
      assert(cut.radius > 0 && cut.radius < cut.mouth, "Slits retain a rounded inward taper")
    })
    assert(Math.max(...widths) - Math.min(...widths) > 0.15, "Chunkiness should visibly vary")
  }
  assert(totalOffset / 32 > 2.5, "Asymmetry must be more than tiny jitter")
})

test("monstera divisions preserve an uncut pointed crown, broad basal lobes and simple contours", () => {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  for (let seed = 1; seed <= 32; seed++) {
    const identity = studySeed(seed, "monstera-study")
    const base = organicMonsteraBlade(identity)
    const leaf = organicMonstera(identity, 5)
    const groups = [-1, 1].map((side) => leaf.cuts.filter((cut) => cut.side === side).sort((a, b) => a.slot - b.slot))
    for (const cuts of groups) {
      assert(cuts[2].penetration > cuts[0].penetration, "Basal lobes must retain more tissue")
      for (const cut of cuts) {
        assert(cut.reach > 0)
        inRange(cut.penetration, [0.38, 0.74])
        assert(cut.polygon.every((p) => p.y > base.tip.y + leaf.apexReserve), "Cuts must not flatten or detach the crown")
        assert(cut.tip.y < -4, "Cuts must not carve through the attachment notch")
        const polygon = cut.polygon.filter((p, i, points) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
        for (let a = 0; a < polygon.length; a++) {
          for (let b = a + 2; b < polygon.length; b++) {
            if (a === 0 && b === polygon.length - 1) continue
            const p = polygon[a], q = polygon[(a + 1) % polygon.length], r = polygon[b], s = polygon[(b + 1) % polygon.length]
            assert(!(cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0), `Slit self-intersection in seed ${seed}: ${cut.id}`)
          }
        }
      }
    }
    assert.equal(leaf.edge, base.edge, "Slit pass must not redesign the underlying blade")
  }
})

test("flower study generations reproduce bounded controls without affecting the garden", () => {
  const gardenBefore = generateGarden(7)
  const families = new Set()
  for (let seed = 1; seed <= 250; seed++) {
    const specimen = createFlowerSpecimen(seed)
    assert.deepEqual(specimen, createFlowerSpecimen(seed))
    families.add(specimen.family)
    for (const [key, range] of [["petalCount", FLOWER_STUDY.petals], ["petalLength", FLOWER_STUDY.length], ["centerSize", FLOWER_STUDY.center]]) {
      inRange(specimen[key], [range.min, range.max])
      assert.equal((specimen[key] - range.min) % range.step, 0)
    }
    assert.notEqual(specimen.colorIndex, createFlowerSpecimen(seed + 1).colorIndex)
  }
  assert.equal(families.size, 4)
  assert.deepEqual(generateGarden(7), gardenBefore)
  for (const seed of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => createFlowerSpecimen(seed), RangeError)
})

test("flower study tweaks change only the chosen geometry and preserve seeded personality", () => {
  const specimen = createFlowerSpecimen(7)
  const traits = flowerTraits(specimen.anatomySeed, "study")
  const shape = { ...DEFAULT_BLOOM, petals: 6 }
  const base = botanicalPetals(shape, traits.family, traits.individuality, traits.opening)
  const long = botanicalPetals(shape, traits.family, traits.individuality, traits.opening, 1.15)
  assert.equal(base.length, long.length)
  assert.deepEqual(base.map((petal) => petal.angle), long.map((petal) => petal.angle))
  assert.notEqual(base[0].d, long[0].d)
  assert.deepEqual(base, botanicalPetals(shape, traits.family, traits.individuality, traits.opening, 1))
  assert.deepEqual(flowerTraits(specimen.anatomySeed, "study"), traits)
  for (const family of PETAL_FAMILIES) {
    for (const petals of [FLOWER_STUDY.petals.min, FLOWER_STUDY.petals.max]) {
      for (const length of [FLOWER_STUDY.length.min, FLOWER_STUDY.length.max]) {
        const geometry = botanicalPetals({ ...shape, petals }, family, traits.individuality, traits.opening, length / 100)
        assert.equal(geometry.length, petals)
        assert(geometry.every((petal) => !/NaN|Infinity/.test(petal.d)))
      }
    }
  }
})

test("flower centres vary in both directions rather than following a shrinking counter", () => {
  const sizes = Array.from({ length: 24 }, (_, i) => createFlowerSpecimen(i + 1).centerSize)
  assert(new Set(sizes).size >= 12)
  const deltas = sizes.slice(1).map((size, i) => size - sizes[i])
  assert(deltas.filter((delta) => delta > 0).length >= 6)
  assert(deltas.filter((delta) => delta < 0).length >= 6)
  assert.equal(new Set(Array.from({ length: 250 }, (_, i) => studySeed(i + 1, "flower-study"))).size, 250)
})

test("leaf Cream controls actual seeded material coverage without changing anatomy", () => {
  const inside = (point, polygons) => {
    let result = false
    for (const polygon of polygons) {
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j]
        if ((a.y > point.y) !== (b.y > point.y)
          && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result
      }
    }
    return result
  }
  for (const family of LEAF_FAMILIES) {
    const identities = new Map(LEAF_MARKINGS.map((pattern) => [pattern, new Set()]))
    for (const seed of [1, 7, 55]) {
      const anatomy = leafAnatomy(seed, "leaf:0:0:0", family), before = structuredClone(anatomy)
      for (const pattern of LEAF_MARKINGS) {
        let previousCoverage = 0
        for (const coverage of [0, 0.05, 0.25, 0.5, 0.75, 0.95, 1]) {
          const markings = leafStudyVariegation(seed, anatomy, pattern, coverage)
          assert.equal(markings.target, pattern === "plain" ? 0 : coverage)
          assert(Math.abs(markings.coverage - markings.target) < 0.0015)
          assert(markings.coverage >= previousCoverage)
          assert.deepEqual(markings.pink.paths, [], "Cream must not introduce pink pigment")
          assert(!/NaN|Infinity/.test(markings.paths.join(" ")))
          if (pattern === "plain" || coverage === 0) {
            assert.deepEqual(markings.paths, [])
          } else if (coverage === 1) {
            assert.deepEqual(markings.paths, [anatomy.edge], "100% Cream must fill the exact existing silhouette")
          } else {
            assert(markings.paths.length > 0)
          }
          if (coverage === 0.5) {
            identities.get(pattern).add(digest(markings.paths))
            assert.deepEqual(markings, leafStudyVariegation(seed, anatomy, pattern, coverage))
          }
          if (pattern !== "plain" && [0.25, 0.5, 0.75].includes(coverage)) {
            const full = leafStudyVariegation(seed, anatomy, pattern, 1)
            let samples = 0, cream = 0
            for (let y = -110; y <= 10; y += 3) {
              for (let x = -50; x <= 50; x += 3) {
                const point = { x, y }
                if (!inside(point, full.boundaries)) continue
                samples++
                if (inside(point, markings.boundaries)) cream++
              }
            }
            assert(Math.abs(cream / samples - coverage) < 0.07,
              `${family}/${pattern} seed ${seed}: rendered Cream coverage must track its control`)
          }
          previousCoverage = markings.coverage
        }
        const medium = leafStudyVariegation(seed, anatomy, pattern, 0.5)
        leafStudyVariegation(seed, anatomy, pattern, 0.75)
        assert.deepEqual(leafStudyVariegation(seed, anatomy, pattern, 0.5), medium, "Cream reversals must restore exact markings")
      }
      assert.deepEqual(anatomy, before, "Variegation must not change the outline, fold or vein geometry")
    }
    for (const pattern of VARIEGATION_PATTERNS) {
      assert.equal(identities.get(pattern).size, 3, `${family}/${pattern} must vary coherently by seed`)
    }
  }
  const anatomy = leafAnatomy(7, "leaf:0:0:0", "broad")
  for (const coverage of [-0.1, 1.1, NaN, Infinity]) {
    assert.throws(() => leafStudyVariegation(7, anatomy, "plain", coverage), RangeError)
  }
})

test("larger leaf study framing retains all silhouettes at the maximum width and basal lean", () => {
  const [x, y, width, height] = LEAF_STUDY.viewBox.split(" ").map(Number)
  for (const family of LEAF_FAMILIES) {
    for (const seed of [1, 7, 55, 505]) {
      const anatomy = leafAnatomy(seed, "leaf:0:0:0", family)
      const boundary = leafStudyVariegation(seed, anatomy, "marbled", 1).boundaries[0]
      for (const turn of [-4.8, 0, 4.8]) {
        const radians = turn * Math.PI / 180
        for (const point of boundary) {
          const px = point.x * Math.cos(radians) - point.y * Math.sin(radians)
          const py = point.x * Math.sin(radians) + point.y * Math.cos(radians)
          inRange(px * LEAF_STUDY.width.max / 100, [x + 2, x + width - 2])
          inRange(py, [y + 2, y + height - 2])
        }
      }
    }
  }
})

test("leaf patches form separate islands and all marking edges use simplified smooth curves", () => {
  for (const family of LEAF_FAMILIES) {
    for (const seed of [1, 7, 55]) {
      const anatomy = leafAnatomy(seed, "leaf:0:0:0", family)
      for (const coverage of [0.35, 0.6]) {
        const patches = leafStudyVariegation(seed, anatomy, "patches", coverage)
        assert(patches.rings.length >= 3, `${family} seed ${seed}: patches must not become a single sector`)
      }
      for (const pattern of VARIEGATION_PATTERNS) {
        const markings = leafStudyVariegation(seed, anatomy, pattern, 0.5)
        const paths = markings.paths.join(" ")
        assert(!/ L| Q/.test(paths), "Cream edges must use continuous shared-tangent cubic curves, not short rounded line segments")
        const curves = (paths.match(/ C/g) ?? []).length
        const rawPoints = markings.rings.reduce((sum, ring) => sum + ring.points.length, 0)
        assert(curves / rawPoints < 0.25, "Contours must remain simplified rather than tracing fine noise bumps")
        for (const path of paths.split(" Z").filter(Boolean)) {
          const values = path.match(/-?\d+(?:\.\d+)?/g).map(Number)
          const segments = []
          let start = { x: values[0], y: values[1] }
          for (let i = 2; i < values.length; i += 6) {
            const curve = [start, { x: values[i], y: values[i + 1] },
              { x: values[i + 2], y: values[i + 3] }, { x: values[i + 4], y: values[i + 5] }]
            segments.push(curve)
            start = curve[3]
          }
          for (let i = 0; i < segments.length; i++) {
            const a = segments[i], b = segments[(i + 1) % segments.length]
            const incoming = { x: a[3].x - a[2].x, y: a[3].y - a[2].y }
            const outgoing = { x: b[1].x - b[0].x, y: b[1].y - b[0].y }
            const length = Math.hypot(incoming.x, incoming.y) * Math.hypot(outgoing.x, outgoing.y)
            assert(length > 0)
            assert((incoming.x * outgoing.x + incoming.y * outgoing.y) / length > 0.98,
              "Adjacent material curves must join smoothly")
          }
        }
      }
    }
  }
})

test("leaf marking clicks remix only material seeds and retain generated width and anatomy", () => {
  const widths = new Set()
  for (const seed of [1, 7, 55, 505]) {
    let current = createLeafSpecimen(seed)
    widths.add(current.width)
    for (const pattern of LEAF_MARKINGS) {
      for (let repeat = 0; repeat < 2; repeat++) {
        const before = structuredClone(current)
        const next = remixLeafMarkings(current, pattern)
        assert.equal(next.pattern, pattern)
        assert.equal(next.markingRevision, current.markingRevision + 1)
        assert.notEqual(next.markingSeed, current.markingSeed)
        assert.deepEqual({ ...next, pattern: before.pattern, markingRevision: before.markingRevision, markingSeed: before.markingSeed }, before)
        assert.deepEqual(current, before)
        if (pattern !== "plain") {
          const anatomy = leafAnatomy(current.anatomySeed, "leaf:0:0:0", current.family)
          assert.notDeepEqual(leafStudyVariegation(current.markingSeed, anatomy, pattern, 0.5).paths,
            leafStudyVariegation(next.markingSeed, anatomy, pattern, 0.5).paths)
        }
        current = next
      }
    }
  }
  assert(widths.size > 1, "Width must still vary by generation even without a slider")
})

test("monstera Coverage overrides material area without moving or regenerating the selected leaf", () => {
  const selected = { ...createMonsteraSpecimen(2), markings: "marbled" }
  for (const coverage of [0, 25, 50, 75, 100]) {
    const next = remixMonsteraSpecimen(selected, { coverage })
    assert.equal(next.anatomySeed, selected.anatomySeed)
    assert.strictEqual(next.pose, selected.pose)
    assert.strictEqual(next.viewBox, selected.viewBox)
    assert.equal(next.coverage, coverage)
    const artwork = createMonsteraArtwork(next.anatomySeed, next.age, next.markings, coverage / 100)
    const geometry = organicMonsteraMarkingGeometry(next.anatomySeed, next.markings, next.age, coverage / 100)
    assert.equal(geometry.target, coverage / 100)
    assert(Math.abs(geometry.coverage - geometry.target) < 0.001)
    assert.deepEqual(artwork.materials.paths, geometry.paths)
    assert.deepEqual(artwork.materials.pinkPaths, geometry.pink.paths)
    const aged = remixMonsteraSpecimen(next, { age: (next.age + 1) % 6 })
    assert.equal(aged.coverage, coverage)
    assert.equal(aged.anatomySeed, next.anatomySeed)
    if (coverage === 0) assert.deepEqual(artwork.materials.paths, [])
    if (coverage === 100) {
      assert.deepEqual(artwork.materials.paths, [organicMonsteraBlade(next.anatomySeed).edge])
      assert(artwork.materials.pinkPaths.length > 0, "Full variegation coverage must retain the selected pink pigment")
    }
  }
  const defaultArtwork = createMonsteraArtwork(selected.anatomySeed, selected.age, selected.markings)
  const half = createMonsteraArtwork(selected.anatomySeed, selected.age, selected.markings, 0.5)
  assert.notStrictEqual(half, defaultArtwork, "Artwork caching must distinguish Coverage")
  assert.strictEqual(half, createMonsteraArtwork(selected.anatomySeed, selected.age, selected.markings, 0.5))
  for (const coverage of [-1, 101, NaN, Infinity]) assert.throws(() => remixMonsteraSpecimen(selected, { coverage }), RangeError)
})

test("botanical chapters have independent, reproducible anatomy and connected branches", () => {
  const families = new Set(), patterns = new Set()
  for (let seed = 1; seed <= 100; seed++) {
    const leaf = createLeafSpecimen(seed)
    const monstera = createMonsteraSpecimen(seed)
    assert.deepEqual(leaf, createLeafSpecimen(seed))
    assert.deepEqual(monstera, createMonsteraSpecimen(seed))
    assert.equal(new Set([leaf.anatomySeed, monstera.anatomySeed]).size, 2)
    families.add(leaf.family)
    patterns.add(leaf.pattern)
    inRange(leaf.width, [85, 120])
    inRange(leaf.coverage, [0, 100])
    assert(LEAF_MARKINGS.includes(leaf.pattern))
    assert(!("age" in leaf), "Ordinary-leaf Age must be removed, not merely hidden")
    inRange(monstera.plant.maturity, [0.8, 1])
    for (const count of [2, 3, 4]) {
      const sprig = sprigGeometry(studySeed(seed, "sprig-study"), count)
      assert.equal(sprig.branches.length, count)
      sprig.branches.forEach((branch, i) => {
        assert.equal(branch.bud.anatomy.color, sprig.bud.anatomy.color, "Buds on one sprig should share a coherent pigment")
        samePoint(branch.curve[0], curvePoint(sprig.curve, 0.25 + i / count * 0.5))
        samePoint(branch.curve[3], branch.tip)
      })
    }
  }
  assert.equal(families.size, 4)
  assert.equal(patterns.size, 4)
  for (const seed of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => studySeed(seed, "test"), RangeError)
  for (const count of [0, 1, 5, 2.5]) assert.throws(() => sprigGeometry(7, count), RangeError)
})

test("bud study stalks flow from the main stem and meet tangent-aligned, varied buds within their frame", () => {
  const identities = new Set(), stages = new Set()
  const chordDistance = (point, curve) => {
    const a = curve[0], b = curve[3]
    return Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y)
  }
  for (let seed = 0; seed < 128; seed++) {
    for (const count of [2, 3, 4]) {
      const sprig = sprigGeometry(seed, count), frame = sprig.viewBox
      assert.deepEqual(sprig, sprigGeometry(seed, count))
      const poses = [{ curve: sprig.curve, bud: sprig.bud }, ...sprig.branches]
      for (const pose of poses) {
        samePoint(pose.curve[3], pose.bud.attachment)
        const direction = stalkDirection(pose.curve, 1), angle = pose.bud.angle * Math.PI / 180
        samePoint(direction, { x: Math.sin(angle), y: -Math.cos(angle) })
        assert(Math.max(chordDistance(pose.curve[1], pose.curve), chordDistance(pose.curve[2], pose.curve)) > 5,
          "Study stalks must bow naturally, not approximate straight lines")
        for (const p of pose.bud.anatomy.boundary) {
          const x = pose.bud.attachment.x + (p.x * Math.cos(angle) - p.y * Math.sin(angle)) * pose.bud.scale
          const y = pose.bud.attachment.y + (p.x * Math.sin(angle) + p.y * Math.cos(angle)) * pose.bud.scale
          inRange(x, [frame.x + 2, frame.x + frame.width - 2])
          inRange(y, [frame.y + 2, frame.y + frame.height - 2])
        }
        const anatomy = pose.bud.anatomy
        assert.equal(anatomy.panels.length, anatomy.stage === "opening" ? 4 : 1)
        assert.equal(anatomy.seams.length, 2)
        assert(!/NaN|Infinity/.test(anatomy.edge + anatomy.calyx + anatomy.seams.join("")))
        stages.add(anatomy.stage)
        assert(!("pollen" in anatomy), "Opening should read through layered petals, not a centre dot on a crown silhouette")
        for (const panel of anatomy.panels) {
          assert((panel.d.match(/ C/g) ?? []).length <= 4, "Petals should use a few flowing curves")
        }
      }
      sprig.branches.forEach((branch, i) => {
        const parent = stalkDirection(sprig.curve, 0.25 + i / count * 0.5)
        const direction = stalkDirection(branch.curve, 0)
        samePoint(parent, direction)
        assert(!/NaN|Infinity/.test(branch.outline))
      })
      assert.equal(new Set(poses.map((pose) => pose.bud.anatomy.stage)).size, 3, "Every sprig needs visibly distinct tight, full and half-open buds")
      const lengths = sprig.leaves.map((leaf) => leaf.length)
      assert(Math.max(...lengths) - Math.min(...lengths) > 5, "Supporting foliage needs size contrast")
      sprig.leaves.forEach((leaf) => {
        const parent = leaf.parentBranch === -1 ? sprig.curve : sprig.branches[leaf.parentBranch].curve
        samePoint(leaf.node, curvePoint(parent, leaf.t))
        samePoint(leaf.petiole[0], leaf.node)
        samePoint(leaf.petiole[3], leaf.attachment)
        assert(leaf.t < 0.7, "Foliage must leave a clear stalk below the bud")
        for (const point of leaf.boundary) {
          inRange(point.x, [frame.x + 2, frame.x + frame.width - 2])
          inRange(point.y, [frame.y + 2, frame.y + frame.height - 2])
        }
      })
    }
    identities.add(digest(studyBudGeometry(seed, "leader")))
  }
  assert.equal(identities.size, 128)
  assert.deepEqual([...stages].sort(), ["full", "opening", "tight"])
  for (const seed of [-1, 0.5, NaN, Infinity]) assert.throws(() => sprigGeometry(seed, 3), RangeError)
})

test("ground study is one minimal soil strip on the garden baseline with rooted grass and non-overlapping litter", () => {
  const identities = new Set()
  const crestAt = (samples, x) => {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1]
      if (x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x || 1)
    }
    throw new Error(`No crest sample at ${x}`)
  }
  for (let seed = 0; seed < 128; seed++) {
    const ground = groundStudyGeometry(seed), before = groundGeometry(seed)
    assert.deepEqual(ground, groundStudyGeometry(seed))
    identities.add(digest(ground.soil))
    assert(!/NaN|Infinity/.test(ground.soil + ground.crest + ground.base))
    const [left, top, width, height] = ground.viewBox.split(" ").map(Number)
    for (const p of ground.crestPoints) {
      inRange(p.y, [GROUND_STUDY.base - 9, GROUND_STUDY.base], "The soil must stay a thin strip on the garden baseline")
    }
    inRange(ground.tufts.length, GROUND_STUDY.tufts)
    const heights = ground.tufts.map((tuft) => tuft.height)
    assert(Math.max(...heights) - Math.min(...heights) > 18, "Grass needs varied lengths")
    for (const tuft of ground.tufts) {
      assert(tuft.mound.height > 0, "Every tuft needs a mud mound at its base")
      assert(crestAt(ground.crestPoints, tuft.x) < GROUND_STUDY.base - GROUND_STUDY.lift, "Mounds must rise from the soil line")
      for (const blade of tuft.blades) {
        assert(blade.curve[0].y > crestAt(ground.crestPoints, blade.curve[0].x) + 3, "Grass roots must be tucked into the soil")
      }
    }
    for (const stone of ground.stones) assert(stone.box.bottom > crestAt(ground.crestPoints, stone.x), "Pebbles must be partly buried")
    inRange(ground.leaves.length, [2, GROUND_STUDY.leaves[1]])
    for (const leaf of ground.leaves) {
      assert(LEAF_FAMILIES.includes(leaf.family))
      assert(leaf.veins.length > 1, "Fallen leaves must keep the system's actual venation")
      assert(GROUND_STUDY.litterColors.includes(leaf.fill))
    }
    const solid = ground.footprints.filter((item) => item.kind !== "grass")
    const grass = ground.footprints.filter((item) => item.kind === "grass")
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        assert(!groundBoundsOverlap(solid[i].bounds, solid[j].bounds, 2), `${solid[i].kind} and ${solid[j].kind} must not overlap`)
      }
      for (const blade of grass) assert(!groundBoundsOverlap(solid[i].bounds, blade.bounds, 1), `Grass must not overlap a ${solid[i].kind}`)
    }
    for (const item of ground.footprints) {
      inRange(item.bounds.left, [left, left + width])
      inRange(item.bounds.right, [left, left + width])
      inRange(item.bounds.top, [top, top + height])
      inRange(item.bounds.bottom, [top, top + height])
    }
    assert.deepEqual(groundGeometry(seed), before, "Study changes must not alter opening-garden ground geometry")
  }
  assert.equal(identities.size, 128)
  for (const seed of [-1, 0.5, NaN, Infinity]) assert.throws(() => groundStudyGeometry(seed), RangeError)
})

test("ladybird varieties stay legible at garden scale with few, bold, mirrored markings", () => {
  const counts = { "seven-spot": 4, "two-spot": 2, "two-spot-melanic": 4,
    "fourteen-spot": 4, "twenty-two-spot": 4, orange: 4, pine: 4 }
  const varieties = new Set(), specimens = new Set()
  for (let seed = 1; seed <= 256; seed++) {
    const generated = createLadybirdAppearance(seed)
    assert.deepEqual(generated, createLadybirdAppearance(seed))
    varieties.add(generated.variety.id)
    specimens.add(digest(generated))
    for (const variety of LADYBIRD_VARIETIES) {
      const appearance = createLadybirdAppearance(seed, variety)
      assert.equal(appearance.marks.length, counts[variety.id])
      assert.equal(appearance.variety, variety)
      assert.match(variety.reference, /^https:\/\/en.wikipedia.org\/wiki\//)
      inRange(appearance.rx / appearance.ry, [variety.ratio - 0.023, variety.ratio + 0.023])
      assert(appearance.ry + 2 < appearance.radius)
      for (let i = 0; i + 1 < appearance.marks.length; i += 2) {
        const a = appearance.marks[i], b = appearance.marks[i + 1]
        assert.equal(a.x, -b.x)
        assert.equal(a.y, b.y)
        assert.equal(a.rx, b.rx)
        assert.equal(a.ry, b.ry)
        assert.equal(a.rotation, -b.rotation)
      }
      for (const mark of appearance.marks) {
        assert((mark.x / appearance.rx) ** 2 + ((mark.y - 2) / appearance.ry) ** 2 < 1)
        assert(Math.hypot(mark.x, mark.y) + Math.max(mark.rx, mark.ry) < appearance.radius)
      }
    }
  }
  assert.equal(varieties.size, 7)
  assert.equal(specimens.size, 256)
  assert.equal(new Set(LADYBIRD_VARIETIES.map((variety) => variety.species)).size, 6)
  for (const seed of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => createLadybirdAppearance(seed), RangeError)
})

test("ladybird study randomizes leaves and interior landing poses without letting feet leave the blade", () => {
  const families = new Set(), positions = new Set(), identities = new Set()
  for (let seed = 1; seed <= 256; seed++) {
    const specimen = createLadybirdSpecimen(seed)
    assert.deepEqual(specimen, createLadybirdSpecimen(seed))
    families.add(specimen.family)
    positions.add(`${specimen.ladybird.x}:${specimen.ladybird.y}`)
    identities.add(specimen.anatomySeed)
    const anatomy = leafAnatomy(specimen.anatomySeed, "leaf:0:0:0", specimen.family)
    const boundary = leafBoundary(anatomy.edge)
    assert(pointInsidePolygon(specimen.ladybird, boundary))
    assert(boundaryClearance(specimen.ladybird, boundary) > specimen.radius)
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2
      assert(pointInsidePolygon({ x: specimen.ladybird.x + Math.cos(angle) * specimen.radius,
        y: specimen.ladybird.y + Math.sin(angle) * specimen.radius }, boundary))
    }
    inRange(specimen.ladybird.angle, [0, 360])
    inRange(specimen.width, [100, 115])
  }
  assert.equal(families.size, 4)
  assert(positions.size > 64, "Ladybirds must explore many landing positions")
  assert.equal(identities.size, 256)
  for (const seed of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => createLadybirdSpecimen(seed), RangeError)
})

test("every monstera age step adds one split per side without changing the specimen seed", () => {
  const ages = new Set(), markings = new Set()
  for (let seed = 1; seed <= 100; seed++) {
    const specimen = createMonsteraSpecimen(seed)
    ages.add(specimen.age)
    markings.add(specimen.markings)
    const before = structuredClone(specimen)
    for (let age = 0; age <= 5; age++) {
      const plant = monsteraSpecimenPlant({ ...specimen, age })
      const anatomy = monsteraAnatomy(specimen.anatomySeed, `anatomy:${plant.id}`, plant.maturity, plant.holes, plant.splitCount)
      assert.equal(anatomy.splits, age)
      assert(!/NaN|Infinity/.test(anatomy.edge))
      if (age === 0) assert.equal(anatomy.holes.length, 0)
      else assert(anatomy.holes.length > 0)
    }
    assert.deepEqual(specimen, before)
    assert.deepEqual(monsteraSpecimenPlant({ ...specimen, markings: "plain" }), monsteraSpecimenPlant({ ...specimen, markings: "patches" }))
  }
  assert.deepEqual([...ages].sort(), [0, 1, 2, 3, 4, 5])
  assert.deepEqual([...markings].sort(), ["marbled", "patches", "plain", "streaks", "tips"])
  const specimen = createMonsteraSpecimen(7)
  for (const age of [-1, 6, 1.5, NaN, Infinity]) {
    assert.throws(() => monsteraSpecimenPlant({ ...specimen, age }), RangeError)
    assert.throws(() => monsteraAnatomy(7, "invalid", 1, [], age), RangeError)
  }
})

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
    const bed = gardenGroundExtent(garden)
    assert.equal((bed.left + bed.right) / 2, BLOOM_SCENE.centerX)
    assert(bed.right - bed.left <= BLOOM_COMPOSITION.bed.maxWidth)
    samePoint(garden.king.curve[0], { x: BLOOM_SCENE.centerX, y: BLOOM_SCENE.baseline })
    for (const root of [...plants.map((plant) => plant.curve[0]), ...garden.monsteras.map((plant) => plant.root), garden.vine[0]]) {
      assert(root.x > bed.left && root.x < bed.right)
    }
    const composition = gardenCompositionMetrics(garden)
    assert(composition.exposed.every((fraction) => fraction >= 0.22), `Buried foliage in seed ${seed}`)
    assert(composition.maxOverlap <= 0.45, `Merged foliage in seed ${seed}`)
    assert(composition.heightSpan >= 90, `Flat foliage shelf in seed ${seed}`)
    flowerCounts.add(plants.length)
    monsteraCounts.add(garden.monsteras.length)
    inRange(plants.length, [4, 6])
    inRange(garden.monsteras.length, [4, 5])
    assert.equal(new Set(garden.monsteras.map((leaf) => leaf.role)).size, 4)
    const tallest = garden.monsteras.find((leaf) => leaf.role === "king")
    const shortest = garden.monsteras.find((leaf) => leaf.role === "commoner")
    assert(tallest.size - shortest.size >= 105)
    assert(shortest.pose.blade.attachment.y > tallest.pose.blade.attachment.y)
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
        assert(Math.abs(leaf.angle) <= BLOOM_COMPOSITION.leafSearch.maxAngle, "Supporting leaves must rise rather than point sideways")
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

// Centered-bed/upright-leaf fixtures include intentional posture changes; crowns retain their original digests.
test("centered beds reproduce seeded anatomy without moving the approved flower crowns", () => {
  const snapshots = [
    [0, "56453cb6d4ebe5f4d9e2e81d2191ca1b8c1f3be86fb4fc65f75e866fff769c24", "1c1b5aeea7e6f5b0fa41cf0868c771c86026dba08922e3af0e9b7553c7a3d43f", "dcb760716581ecfebf02e5a0f9ea9ec282f596f2607271b9e452ffaa34d7f9d5"],
    [1, "0bf0e33d66bc9649ed144b22c962118a74520c1fb6b179368f1218fd7caef926", "ddd44e9c086c62f7c22bde552c9cd8d2d9936784422c144f42a82afb70a17ce9", "706d89dcc5dc8fc56241b993b2421a14f7a4dd0272dedcffb404c21541f71de9"],
    [7, "8322ae60d11e877a6fd8ca26def15092e917595dba0d96de5597e5415a6294b5", "495b723d8aa758f860524de922a1f25e5b848b4d525fa23b91db5d0673814e54", "7b267217afe6b188dba5dbe68bf5515a08f33fdcddbb99225b95485b511c56cf"],
    [505, "a548e2a1e4ca6ba0de81b0330f407bbd032f707050b32f866196524da53be3a7", "1ed55385c6128f62a81eaffc9f52ed1714f285d62341697fd3969206c73f6356", "6be82dd7b4ed3473df53431963b195e5f3768675e040906400479e854720aa36"],
    [1490, "99f02a4552d2ec66eb7bb1b6479fe95215d1755f46c01aa8e4ad5b6af780cc1f", "e6698ea32993f9ed576d18c8177687014cf3df1fc2be702805465cbfe428f304", "fd6999f6c9e6c594debf51d0680b8d2fd19f945558c3d4b8aef34af4c7ef45aa"],
    [1985, "99f7aca3a3c423e9ba2e444280438826fcf124c292eb263bffe4c2f74e367252", "adabf463e9016dfdd27edfcbb79b60b33069b18bc8c7c08e9aff708a76202fc7", "363c5e68803a78ccf0afb99dea1b493ead976a031fa5443373f4f141cd3dfcd2"],
  ]
  for (const [seed, compositionDigest, anatomyDigest, crownDigest] of snapshots) {
    const garden = generateGarden(seed)
    assert.equal(digest(gardenIdentity(garden)), compositionDigest, `Centered planting changed for seed ${seed}`)
    assert.equal(digest([garden.king, ...garden.flowers].map((plant) => ({
      id: plant.id, role: plant.role, head: plant.curve[3], diameter: plant.diameter, stemWidth: plant.stemWidth,
    }))), crownDigest, `Flower crowns moved for seed ${seed}`)
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
  assert.equal(digest({ ...current, garden: gardenIdentity(current.garden) }), "19e8aaabf2e3229f6fe4666059effc9e4dbda1c6060789e90807d4e41115e3b5")
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
