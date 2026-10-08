import { createContext, memo, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { CSSProperties } from "react"
import { roughPathInfos, ROUGH_OPTIONS, type RoughPathInfo } from "@/components/lab/rough"
import { useBoilSeed } from "@/hooks/use-boil-seed"
import { useBloomVisibility } from "@/hooks/use-bloom-visibility"
import { useMonsteraGarden } from "@/hooks/use-monstera-garden"
import { useGardenGust } from "@/hooks/use-garden-gust"
import type { BloomShape } from "@/lib/bloom"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { curvePath, curvePoint, gardenCharacter, type Curve, type FlowerPlant, type GardenScene, type MonsteraPlant } from "./bloom-garden"
import { botanicalPetals, decorationVariation, flowerTraits, leafAnatomy, pigment, plantMotion, pollenGeometry } from "./bloom-geometry"
import { BLOOM_FLOWER_VIEWBOX, BLOOM_MOTION, BLOOM_OUTLINE, BLOOM_PIGMENTS as PIGMENTS, BLOOM_SCENE, BLOOM_SCENE_STYLE, BLOOM_VIEWBOX, GROUND_STUDY, LEAF_FAMILIES, LEAF_MARKINGS, LEAF_STUDY, PETAL_FAMILIES, POLLEN_TEXTURES, VARIEGATION_PATTERNS } from "./bloom-tokens"
import { sprigGeometry } from "./bloom-study-state"
import type { BloomState, CompanionBloom } from "./bloom-state"
import { createMonsteraArtwork, gardenMonsteraRecipe, type MonsteraArtwork, type GardenMonsteraArtwork } from "./bloom-monstera-artwork"
import { OrganicMonsteraDrawing } from "./bloom-monstera-drawing"
import { leafStudyVariegation } from "./bloom-leaf-study-geometry"
import { stalkDirection, studyBudGeometry, type StudyBud } from "./bloom-bud-study-geometry"
import { gardenFlowerRecipe, gardenGroundExtent, gardenLadybird, gardenLeafRecipe } from "./bloom-garden-botany"
import { GroundStudyDrawing } from "./bloom-ground-study"
import { groundStudyGeometry } from "./bloom-ground-study-geometry"
import type { createLadybirdSpecimen } from "./bloom-ladybird-study-state"
import { LadybirdDrawing } from "./bloom-ladybird-drawing"
import { LADYBIRD_VARIETIES, type LadybirdAppearance } from "./bloom-ladybird-geometry"
import { NO_OVERRIDES, overrideFor, type GardenOverrides, type GardenSelection } from "./bloom-selection"
import { useSelectable } from "./bloom-selectable"
import { SelectionHalo, shellHaloPath, type HaloState } from "./bloom-halo"
import { LADYBIRD_JOKES } from "./bloom-ladybird-jokes"
import { BloomHoverGrow } from "./bloom-hover-grow"
import { BloomFocusStage } from "./bloom-focus-stage"
export type { CompanionBloom, CompanionBlooms } from "./bloom-state"
import "./bloom-illustration.css"

const BOTANICAL_INK = PIGMENTS.ink
const GardenSeed = createContext(0)
const GardenInkFilter = createContext<string | undefined>(undefined)
const SpecimenInkSeed = createContext<number | undefined>(undefined)
const GardenOverrides = createContext<GardenOverrides>(NO_OVERRIDES)

function useGardenCharacter() {
  const seed = useContext(GardenSeed)
  return useMemo(() => gardenCharacter(seed), [seed])
}

function useDecorationVariation(label: string, defaultVariegated = false) {
  const seed = useContext(GardenSeed)
  return useMemo(() => decorationVariation(seed, label, defaultVariegated), [seed, label, defaultVariegated])
}

function outline(d: string, seed: number, strokeWidth: number = BLOOM_OUTLINE.leaf.width, roughness: number = BLOOM_OUTLINE.leaf.roughness) {
  return roughPathInfos(d, {
    ...ROUGH_OPTIONS, roughness, bowing: BLOOM_OUTLINE.bowing, seed,
    stroke: "currentColor", strokeWidth, fill: "none",
  })
}

function InkDrawing({ paths, opacity = 0.75, nonScaling = false }: { paths: RoughPathInfo[]; opacity?: number; nonScaling?: boolean }) {
  return (
    <g opacity={opacity} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path, i) => (
        <path key={i} d={path.d} stroke={path.stroke} fill="none" strokeWidth={path.strokeWidth} vectorEffect={nonScaling ? "non-scaling-stroke" : undefined} />
      ))}
    </g>
  )
}

const ParametricLeafVariegation = memo(function ParametricLeafVariegation({ seed, anatomy, pattern, coverage, inkSeed, fill }: {
  seed: number; anatomy: ReturnType<typeof leafAnatomy>; pattern: typeof LEAF_MARKINGS[number]; coverage: number; inkSeed: number; fill: string
}) {
  const markings = useMemo(() => leafStudyVariegation(seed, anatomy, pattern, coverage), [seed, anatomy, pattern, coverage])
  const ink = useMemo(() => markings.paths.flatMap((path) => outline(path, inkSeed, 0.4, 0.45)), [markings, inkSeed])
  return (
    <g data-leaf-variegation="true" data-variegation-pattern={pattern} data-cream-coverage={markings.coverage} data-marking-seed={seed}>
      <g fill={fill} fillRule="evenodd">
        {markings.paths.map((path, i) => <path key={i} d={path} />)}
      </g>
      <g color={PIGMENTS.leaf.dark}><InkDrawing paths={ink} opacity={0.45} /></g>
    </g>
  )
})

function BotanicalLeaf({ x, y, angle, length, width, pale = false, variegated = false, ladybird = false, lightness = 0, family, coverage, pattern, markingSeed, ladybirdPose }: {
  x: number; y: number; angle: number; length: number; width: number; pale?: boolean; variegated?: boolean; ladybird?: boolean; lightness?: number
  family?: typeof LEAF_FAMILIES[number]; coverage?: number; pattern?: typeof LEAF_MARKINGS[number]; markingSeed?: number
  ladybirdPose?: ReturnType<typeof createLadybirdSpecimen>["ladybird"]
}) {
  const id = useId().replace(/:/g, "")
  const sceneSeed = useContext(GardenSeed)
  const label = `leaf:${x}:${y}:${angle}`
  const variation = useDecorationVariation(label, variegated)
  const character = useGardenCharacter()
  const recipe = useMemo(() => gardenLeafRecipe(sceneSeed, label, variegated), [sceneSeed, label, variegated])
  const overrides = useContext(GardenOverrides)
  const edit = overrideFor(overrides, "leaf", label)
  const visitor = overrideFor(overrides, "ladybird", "ladybird")
  const selectedFamily = family ?? edit.family ?? recipe.family
  const anatomy = useMemo(() => leafAnatomy(sceneSeed, label, selectedFamily), [sceneSeed, label, selectedFamily])
  const inkSeed = useContext(SpecimenInkSeed) ?? BLOOM_OUTLINE.leaf.seed
  const ink = useMemo(() => outline(anatomy.edge, inkSeed), [anatomy.edge, inkSeed])
  const study = pattern !== undefined
  const selectedPattern = pattern ?? edit.pattern ?? recipe.pattern
  const selectedCoverage = coverage ?? edit.coverage ?? recipe.coverage
  const resident = useMemo(() => ladybirdPose ?? (ladybird ? gardenLadybird(sceneSeed, label, selectedFamily, visitor) : undefined),
    [ladybirdPose, ladybird, sceneSeed, label, selectedFamily, visitor])
  const inkFilter = useContext(GardenInkFilter)
  const { halo, props: selectable } = useSelectable("leaf", label, `${anatomy.kind} leaf`,
    pale ? PIGMENTS.leaf.paleMiddle : PIGMENTS.leaf.middle)
  const haloPaths = useMemo(() => [anatomy.edge], [anatomy.edge])
  return (
    <g {...selectable} transform={`translate(${x} ${y}) rotate(${angle}) scale(${width / BLOOM_SCENE.leafWidth} ${length / BLOOM_SCENE.leafLength})`} color={BOTANICAL_INK}>
      <defs>
        <linearGradient id={`leaf-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="0.65">
          <stop offset="0" stopColor={pigment(pale ? PIGMENTS.leaf.paleLight : PIGMENTS.leaf.light, lightness)} />
          <stop offset="0.45" stopColor={pigment(pale ? PIGMENTS.leaf.paleMiddle : PIGMENTS.leaf.middle, lightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.leaf.dark, lightness)} />
        </linearGradient>
        <clipPath id={`leaf-edge-${id}`}><path d={anatomy.edge} /></clipPath>
      </defs>
      <g className="bloom-leaf-follow bloom-regular-leaf-angle" data-growth-stage={study || character.age >= 0.45 ? "open" : "unfurling"} data-leaf-kind={anatomy.kind} data-variegated={selectedPattern !== "plain" && selectedCoverage > 0} style={{ rotate: `${variation.angle * 0.4}deg`, scale: `${study || character.age >= 0.45 ? 1 : 0.94} 1`, animationDelay: `${-0.6 - (length % 7) * 0.23 - (Math.abs(angle) % 11) * 0.08}s` }}>
        <BloomHoverGrow state={halo}>
        <SelectionHalo paths={haloPaths} state={halo} />
        <g filter={inkFilter}>
        <path d={anatomy.edge} fill={`url(#leaf-${id})`} />
        <g clipPath={`url(#leaf-edge-${id})`}>
          <path d={anatomy.fold} transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={PIGMENTS.leaf.fold} opacity={study || character.age >= 0.45 ? 0.17 : 0.3} />
          <path d="M-3 -5 C-10 -28 -12 -53 -1 -80 C-7 -49 -4 -28 -3 -5 Z" transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={character.highlight} opacity={0.25} />
          {selectedPattern !== "plain" && selectedCoverage > 0 && <ParametricLeafVariegation seed={markingSeed ?? (study ? sceneSeed : recipe.markingSeed)} anatomy={anatomy} pattern={selectedPattern} coverage={selectedCoverage} inkSeed={inkSeed} fill={character.warm ? PIGMENTS.leaf.variegationWarm : PIGMENTS.leaf.variegationCool} />}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={curvePath(anatomy.spine)} stroke={PIGMENTS.leaf.spine} strokeWidth={1.65} opacity={0.7} />
            <g fill={PIGMENTS.leaf.veins} stroke="none" opacity={0.62}>
              {anatomy.veins.map((vein, i) => <path key={i} data-vein-depth={vein.depth} d={vein.d} opacity={PIGMENTS.leaf.veinOpacity[vein.depth]} />)}
            </g>
            {character.dew && <g className="bloom-dew" fill={PIGMENTS.leaf.dew} stroke={PIGMENTS.leaf.dewOutline} strokeWidth={0.4} opacity={0.75}>
              {[0.34, 0.57].map((t, i) => {
                const point = curvePoint(anatomy.spine, t)
                const x = point.x + (i === 0 ? -6 : 6)
                return <path key={i} d={`M${x} ${point.y - 3} C${x - 4} ${point.y + 2} ${x + 4} ${point.y + 3} ${x} ${point.y - 3} Z`} />
              })}
            </g>}
          </g>
        </g>
        <InkDrawing paths={ink} />
        </g>
        {resident && <Ladybird {...resident} exactPose />}
        </BloomHoverGrow>
      </g>
    </g>
  )
}

function StudyBudDrawing({ x, y, angle, scale, anatomy, halo }: {
  x: number; y: number; angle: number; scale: number; anatomy: StudyBud; halo?: HaloState
}) {
  const id = useId().replace(/:/g, "")
  const inkFilter = useContext(GardenInkFilter)
  const seed = useContext(SpecimenInkSeed) ?? BLOOM_OUTLINE.bud.seed
  const ink = useMemo(() => ({
    petals: anatomy.panels.map((panel, i) => outline(panel.d, seed + i * 17, 0.6, 0.25)),
    sepals: outline(anatomy.calyx, seed + 91, 0.45, 0.25),
  }), [anatomy, seed])
  const haloPaths = useMemo(() => [anatomy.edge, anatomy.calyx], [anatomy.edge, anatomy.calyx])
  const color = anatomy.color
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} color={BOTANICAL_INK} data-study-bud="true">
      <defs>
        <clipPath id={`study-bud-${id}`}>{anatomy.panels.map((panel, i) => <path key={i} d={panel.d} />)}</clipPath>
      </defs>
      <g className="bloom-bud-angle" data-growth-stage={anatomy.stage}>
        <BloomHoverGrow state={halo}>
        <SelectionHalo paths={haloPaths} state={halo} />
        <g filter={inkFilter}>
        {anatomy.panels.map((panel, i) => <g key={i} data-bud-petal="true">
          <path d={panel.d} fill={pigment(color, panel.lightness)} />
          <InkDrawing paths={ink.petals[i]} opacity={0.55} />
        </g>)}
        {anatomy.stage !== "opening" && <g clipPath={`url(#study-bud-${id})`} fill="none"
          stroke={pigment(color, -15)} strokeWidth={0.45} strokeLinecap="round" opacity={0.55}>
          {anatomy.seams.map((seam, i) => <path key={i} d={seam} />)}
        </g>}
        <path d={anatomy.calyx} fill={PIGMENTS.bud.calyx} />
        <g color={PIGMENTS.bud.calyxOutline}><InkDrawing paths={ink.sepals} opacity={0.65} /></g>
        </g>
        </BloomHoverGrow>
      </g>
    </g>
  )
}

function BotanicalBud({ x, y, angle = 0, scale = 1, study }: {
  x: number; y: number; angle?: number; scale?: number; study?: StudyBud
}) {
  const sceneSeed = useContext(GardenSeed)
  const label = `bud:${x}:${y}`
  const edit = overrideFor(useContext(GardenOverrides), "bud", label)
  const anatomy = useMemo(() => study ?? studyBudGeometry(sceneSeed, label, edit.stage),
    [study, sceneSeed, label, edit.stage])
  const { halo, props: selectable } = useSelectable("bud", label, `${anatomy.stage} bud`, anatomy.color)
  return (
    <g {...selectable}>
      <StudyBudDrawing x={x} y={y} angle={angle} scale={scale} anatomy={anatomy} halo={halo} />
    </g>
  )
}

function SprigStalkDrawing({ sprig }: { sprig: ReturnType<typeof sprigGeometry> }) {
  const id = useId().replace(/:/g, "")
  const seed = useContext(SpecimenInkSeed) ?? BLOOM_OUTLINE.leaf.seed
  const character = useGardenCharacter()
  const stalks = useMemo(() => [
    { curve: sprig.curve, outline: sprig.outline },
    ...sprig.branches.map((branch) => ({ curve: branch.curve, outline: branch.outline })),
    ...sprig.leaves.map((leaf) => ({ curve: leaf.petiole, outline: leaf.outline })),
  ], [sprig])
  const ink = useMemo(() => stalks.map((stalk, i) => outline(stalk.outline, seed + i * 17, 0.45, 0.4)), [stalks, seed])
  const frame = sprig.viewBox
  return (
    <g data-blended-stalks="true" strokeLinecap="round">
      <defs>
        <linearGradient id={`sprig-stalk-${id}`} gradientUnits="userSpaceOnUse"
          x1={character.lightX === 0 ? frame.x : frame.x + frame.width} y1={0}
          x2={character.lightX === 0 ? frame.x + frame.width : frame.x} y2={0}>
          <stop offset="0" stopColor={PIGMENTS.stem.light} />
          <stop offset="0.5" stopColor={PIGMENTS.leaf.dark} />
          <stop offset="1" stopColor={PIGMENTS.stem.dark} />
        </linearGradient>
        {stalks.map((stalk, i) => <path key={i} id={`sprig-stalk-shape-${id}-${i}`} d={stalk.outline} />)}
        {stalks.map((_, i) => <mask key={i} id={`sprig-stalk-exposed-${id}-${i}`}
          maskUnits="userSpaceOnUse" x={frame.x} y={frame.y} width={frame.width} height={frame.height}
          style={{ maskType: "luminance" }}>
          <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill="white" />
          {stalks.map((_, j) => i === j ? null : <use key={j} href={`#sprig-stalk-shape-${id}-${j}`}
            fill="black" stroke="black" strokeWidth={0.25} />)}
        </mask>)}
      </defs>
      <g fill={`url(#sprig-stalk-${id})`} data-stalk-union="true">
        {stalks.map((_, i) => <use key={i} href={`#sprig-stalk-shape-${id}-${i}`} />)}
      </g>
      {stalks.map((stalk, i) => <g key={i} mask={`url(#sprig-stalk-exposed-${id}-${i})`}
        color={PIGMENTS.stem.outline} data-exposed-stalk={i}>
        <path d={curvePath(stalk.curve)} fill="none" stroke={PIGMENTS.stem.middle} strokeWidth={i === 0 ? 0.75 : 0.4} opacity={0.3} />
        <InkDrawing paths={ink[i]} opacity={0.65} />
      </g>)}
    </g>
  )
}

function BotanicalStem({ curve, width = 3, lightness = 0 }: { curve: Curve; width?: number; lightness?: number }) {
  const id = useId().replace(/:/g, "")
  const character = useGardenCharacter()
  const d = curvePath(curve)
  return (
    <g fill="none" strokeLinecap="round">
      <defs>
        <linearGradient id={`stem-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="0">
          <stop offset="0" stopColor={pigment(PIGMENTS.stem.light, lightness)} />
          <stop offset="0.45" stopColor={pigment(PIGMENTS.stem.middle, lightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.stem.dark, lightness)} />
        </linearGradient>
      </defs>
      <path d={d} stroke={PIGMENTS.stem.outline} strokeWidth={width + 1.2} />
      <path d={d} stroke={`url(#stem-${id})`} strokeWidth={width} />
    </g>
  )
}

function MonsteraLeaf({ plant, lightness = 0, inkSeed, coverage, pattern, prepared, stalk = true }: {
  plant: MonsteraPlant; lightness?: number; inkSeed: number; coverage?: number; pattern?: typeof VARIEGATION_PATTERNS[number]; prepared?: MonsteraArtwork; stalk?: boolean
}) {
  const sceneSeed = useContext(GardenSeed)
  const character = useGardenCharacter()
  const inkFilter = useContext(GardenInkFilter)
  const artwork = useMemo(() => {
    if (prepared) return prepared
    const recipe = gardenMonsteraRecipe(sceneSeed, plant)
    const markings = coverage === 0 ? "plain" : pattern ?? recipe.markings
    return createMonsteraArtwork(recipe.seed, recipe.age, markings)
  }, [prepared, sceneSeed, plant, coverage, pattern])
  if (artwork.seed !== plant.anatomySeed) throw new Error("Monstera artwork does not match its generated pose")
  const frame = useMemo(() => stalk ? plant.pose.blade
    : { attachment: { x: 0, y: artwork.anatomy.offsetY }, rotation: 0, scale: { x: 1, y: artwork.anatomy.height } },
  [stalk, plant.pose.blade, artwork.anatomy.offsetY, artwork.anatomy.height])
  const { halo, props: selectable } = useSelectable("monstera", plant.id,
    artwork.age === 0 ? "whole monstera leaf" : `monstera leaf with ${artwork.age} splits a side`, PIGMENTS.leaf.middle)
  return (
    <g {...selectable} data-role={plant.role} data-size={plant.size} data-fullness={plant.fullness} data-maturity={plant.maturity} data-splits={artwork.age} data-variegated={artwork.markings !== "plain"} data-facing={stalk ? plant.pose.facing : undefined} data-blade-rotation={frame.rotation}>
      <OrganicMonsteraDrawing artwork={artwork} inkSeed={inkSeed} frame={frame} halo={halo} inkFilter={inkFilter}
        petiole={stalk ? plant.pose.petiole : undefined} lightness={lightness} lightX={character.lightX} follow={stalk} />
    </g>
  )
}

function Ladybird({ x, y, angle, scale, exactPose = false, appearance }: {
  x: number; y: number; angle: number; scale: number; exactPose?: boolean; appearance: LadybirdAppearance
}) {
  const inkFilter = useContext(GardenInkFilter)
  const variation = useDecorationVariation("ladybird-facing")
  const { halo, props: selectable } = useSelectable("ladybird", "ladybird", `${appearance.variety.name.toLowerCase()} ladybird`, appearance.variety.shell)
  const haloPaths = useMemo(() => [shellHaloPath(2, appearance.rx, appearance.ry)], [appearance.rx, appearance.ry])
  const [open, setOpen] = useState(false)
  const [jokeIndex, setJokeIndex] = useState(0)
  const changeOpen = (nextOpen: boolean) => {
    if (nextOpen && !open) {
      const step = 1 + Math.floor(Math.random() * (LADYBIRD_JOKES.length - 1))
      setJokeIndex((current) => (current + step) % LADYBIRD_JOKES.length)
    }
    setOpen(nextOpen)
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + (exactPose ? 0 : variation.angle)}) scale(${scale})`} color={BOTANICAL_INK} data-study-ladybird={exactPose || undefined}>
      <Tooltip open={open} onOpenChange={changeOpen} delayDuration={0} disableHoverableContent>
        <TooltipTrigger asChild>
          <g {...selectable}>
            <ellipse cy={-1} rx={appearance.rx + 5} ry={appearance.ry + 5} fill="transparent" pointerEvents="all" />
            <g className="bloom-ladybird-body" pointerEvents="none">
              <BloomHoverGrow state={halo} y={2}>
              <SelectionHalo paths={haloPaths} state={halo} />
              <g filter={inkFilter}><LadybirdDrawing appearance={appearance} /></g>
              </BloomHoverGrow>
            </g>
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={10} updatePositionStrategy="always">
          {LADYBIRD_JOKES[jokeIndex]}
        </TooltipContent>
      </Tooltip>
    </g>
  )
}

function BotanicalGround({ garden }: { garden: GardenScene }) {
  const seed = useContext(GardenSeed)
  const inkFilter = useContext(GardenInkFilter)
  const edit = overrideFor(useContext(GardenOverrides), "ground", "ground")
  const extent = useMemo(() => gardenGroundExtent(garden), [garden])
  const geometry = useMemo(() => groundStudyGeometry(edit.seed ?? seed, extent, edit.tufts),
    [edit.seed, seed, extent, edit.tufts])
  const { halo, props: selectable } = useSelectable("ground", "ground", "the soil and its grass", PIGMENTS.ground.soil)
  const haloPaths = useMemo(() => [geometry.soil], [geometry.soil])
  return (
    <g {...selectable} className={`bloom-ground${selectable.className ? ` ${selectable.className}` : ""}`} color={BOTANICAL_INK}>
      <BloomHoverGrow state={halo} x={(extent.left + extent.right) / 2} y={BLOOM_SCENE.baseline}>
      <SelectionHalo paths={haloPaths} state={halo} />
      <g filter={inkFilter}><GroundStudyDrawing seed={edit.seed ?? seed} extent={extent} geometry={geometry} /></g>
      </BloomHoverGrow>
    </g>
  )
}

function GardenBackdrop({ shades, garden, inkSeed, monsteras }: { shades: number[]; garden: GardenScene; inkSeed: number; monsteras: Map<string, MonsteraArtwork> }) {
  const seed = useContext(GardenSeed)
  const character = useGardenCharacter()
  const uprightCurve = garden.vine
  const vineShade = shades[shades.length - 1]
  return (
    <g className="bloom-background">
      {garden.monsteras.map((leaf, i) => ({ leaf, i })).sort((a, b) => b.leaf.size - a.leaf.size).map(({ leaf, i }) => {
        const prepared = monsteras.get(leaf.id)
        if (!prepared) throw new Error(`Missing prepared monstera ${leaf.id}`)
        return (
        <g key={leaf.id} className="bloom-monstera-plant" data-plant-id={leaf.id} data-plant-role={leaf.role} style={{ ...plantMotion(seed, leaf.id, BLOOM_MOTION.cycles.monstera), transformOrigin: `${leaf.root.x}px ${leaf.root.y}px` }}>
          <MonsteraLeaf plant={leaf} prepared={prepared} lightness={shades[i]} inkSeed={inkSeed + BLOOM_OUTLINE.monstera.seedOffset + i * BLOOM_OUTLINE.monstera.seedStep} />
        </g>
      )})}
      <BotanicalStem curve={uprightCurve} width={1.8} lightness={vineShade} />
      {(character.density > 0.72 ? [0.25, 0.55, 0.8] : [0.2, 0.4, 0.6, 0.8]).map((t, i) => {
        const node = curvePoint(uprightCurve, t)
        return (
          <g key={i}>
            <BotanicalLeaf x={node.x} y={node.y} angle={i % 2 === 0 ? -28 : 32} length={48 - i * 5} width={23 - i * 2} variegated={i % 2 === 0} pale={i % 2 !== 0} lightness={vineShade} />
          </g>
        )
      })}
    </g>
  )
}

export function BotanicalFlower({ shape, fill, centerHole, centerLightness, seed, size = BLOOM_SCENE.flowerSize, className, identity = "king", specimenSeed, family, petalLength = 1, viewBox = BLOOM_FLOWER_VIEWBOX, inkFilter, halo }: {
  shape: BloomShape; fill: string; centerHole: number; centerLightness: number; seed: number; size?: number; className?: string; identity?: string
  specimenSeed?: number; family?: typeof PETAL_FAMILIES[number]; petalLength?: number; viewBox?: string; inkFilter?: string; halo?: HaloState
}) {
  const uid = useId().replace(/:/g, "")
  const gardenSeed = useContext(GardenSeed)
  const gardenInkFilter = useContext(GardenInkFilter)
  const sceneSeed = specimenSeed ?? gardenSeed
  const character = useMemo(() => gardenCharacter(sceneSeed), [sceneSeed])
  const traits = useMemo(() => {
    const generated = flowerTraits(sceneSeed, identity)
    return { ...generated, family: family ?? generated.family }
  }, [sceneSeed, identity, family])
  const centerRadius = BLOOM_SCENE.centerRadius * centerHole
  const petals = useMemo(() => botanicalPetals(shape, traits.family, traits.individuality, traits.opening, petalLength), [shape, traits, petalLength])
  const petalInk = useMemo(() => petals.map((petal, i) =>
    outline(petal.d, seed + i * BLOOM_OUTLINE.flower.seedStep, BLOOM_OUTLINE.flower.width, size < BLOOM_OUTLINE.flower.smallThreshold ? BLOOM_OUTLINE.flower.smallRoughness : BLOOM_OUTLINE.flower.roughness),
  ), [petals, seed, size])
  // Keep the existing useId-labelled stream, so extraction does not change speckled pollen.
  const pollenLabel = specimenSeed === undefined ? uid : identity
  const haloContours = useMemo(() => [
    ...petals.map((petal) => ({
      d: petal.d,
      transform: `translate(${BLOOM_SCENE.flowerCenter} ${BLOOM_SCENE.flowerCenter}) rotate(${petal.angle})`,
    })),
    ...(centerRadius > 0 ? [{
      d: shellHaloPath(BLOOM_SCENE.pollenCenterY, centerRadius, centerRadius * 0.92),
      transform: `translate(${BLOOM_SCENE.flowerCenter} 0)`,
    }] : []),
  ], [petals, centerRadius])
  const seeds = useMemo(() => pollenGeometry(sceneSeed, pollenLabel, centerRadius, traits.texture), [centerRadius, sceneSeed, pollenLabel, traits.texture])
  const artwork = useMemo(() => (
    <g filter={inkFilter ?? gardenInkFilter}>
      {petals.map((petal, i) => (
        <g key={i} data-petal={i} transform={`translate(${BLOOM_SCENE.flowerCenter} ${BLOOM_SCENE.flowerCenter}) rotate(${petal.angle})`}>
          <path d={petal.d} fill={fill} />
          <path d={petal.d} fill={`url(#bloom-light-${uid})`} />
          <g clipPath={`url(#petal-${uid}-${i})`}>
            <path d={petal.fold} transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={PIGMENTS.flower.fold} opacity={0.12} />
            <g fill="none" stroke="currentColor" strokeWidth={0.55} opacity={0.24} strokeLinecap="round">
              {petal.veins.map((d, j) => <path key={j} d={d} />)}
            </g>
          </g>
          <InkDrawing paths={petalInk[i]} opacity={0.85} nonScaling />
        </g>
      ))}
      {centerRadius > 0 && <FlowerCenter uid={uid} radius={centerRadius} lightness={centerLightness} lightX={character.lightX} texture={traits.texture} points={seeds} />}
    </g>
  ), [inkFilter, gardenInkFilter, petals, fill, uid, character.lightX, petalInk, centerRadius, centerLightness, traits.texture, seeds])

  return (
    <svg aria-hidden="true" data-petal-family={traits.family} data-petal-length={petalLength} data-pollen-texture={traits.texture} width={size} height={size} viewBox={viewBox} className={className} color={BOTANICAL_INK} overflow="visible">
      <defs>
        <linearGradient id={`bloom-light-${uid}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="1">
          <stop offset="0" stopColor={character.highlight} stopOpacity={0.45} />
          <stop offset="0.48" stopColor={character.highlight} stopOpacity={0.04} />
          <stop offset="1" stopColor={PIGMENTS.flower.shade} stopOpacity={0.22} />
        </linearGradient>
        {petals.map((petal, i) => <clipPath key={i} id={`petal-${uid}-${i}`}><path d={petal.d} /></clipPath>)}
      </defs>
      <BloomHoverGrow state={halo} x={BLOOM_SCENE.flowerCenter} y={BLOOM_SCENE.flowerCenter}>
      <SelectionHalo contours={haloContours} state={halo} />
      {artwork}
      </BloomHoverGrow>
    </svg>
  )
}

function FlowerCenter({ uid, radius, lightness, lightX, texture, points }: {
  uid: string; radius: number; lightness: number; lightX: number
  texture: typeof POLLEN_TEXTURES[number]; points: ReturnType<typeof pollenGeometry>
}) {
  return (
    <g data-pollen-texture={texture}>
      <defs>
        <radialGradient id={`bloom-center-${uid}`} cx={lightX === 0 ? 0.36 : 0.64} cy="0.3">
          <stop offset="0" stopColor={pigment(PIGMENTS.flower.centerLight, lightness)} />
          <stop offset="0.65" stopColor={pigment(PIGMENTS.flower.centerMiddle, lightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.flower.centerDark, lightness)} />
        </radialGradient>
      </defs>
      <ellipse cx={BLOOM_SCENE.flowerCenter} cy={BLOOM_SCENE.pollenCenterY} rx={radius} ry={radius * 0.92} fill={`url(#bloom-center-${uid})`} stroke="currentColor" strokeWidth={0.8} />
      {texture === "rings" && <g className="bloom-pollen-rings" fill="none" stroke="currentColor" strokeWidth={0.45} opacity={0.2}>
        {[0.25, 0.5, 0.75].map((r) => <ellipse key={r} cx={BLOOM_SCENE.flowerCenter} cy={BLOOM_SCENE.pollenCenterY} rx={radius * r} ry={radius * r * 0.92} />)}
      </g>}
      <g fill="currentColor" opacity={0.7}>
        {points.map((point, i) => <g key={i}>
          <ellipse cx={point.x} cy={point.y} rx={0.75} ry={1.2} transform={`rotate(${point.angle} ${point.x} ${point.y})`} />
          <circle cx={point.x - 0.6} cy={point.y - 0.7} r={0.38} fill={PIGMENTS.flower.pollenHighlight} />
        </g>)}
      </g>
    </g>
  )
}

type BotanicalSpecimenProps = { seed: number; inkSeed: number; filter?: string } & (
  | { kind: "monstera"; plant: MonsteraPlant; coverage: number; pattern?: typeof VARIEGATION_PATTERNS[number] }
  | { kind: "leaf"; family: typeof LEAF_FAMILIES[number]; width: number; coverage: number; pattern?: typeof LEAF_MARKINGS[number]; markingSeed?: number }
  | { kind: "sprig"; branches: number }
  | { kind: "ground" }
  | { kind: "ladybird"; specimen: ReturnType<typeof createLadybirdSpecimen> }
)

export function BotanicalSpecimen(props: BotanicalSpecimenProps) {
  const branchCount = props.kind === "sprig" ? props.branches : undefined
  const sprig = useMemo(() => branchCount === undefined ? undefined : sprigGeometry(props.seed, branchCount), [props.seed, branchCount])
  let viewBox: string
  let drawing
  switch (props.kind) {
    case "monstera": {
      viewBox = "-90 -135 180 180"
      drawing = <MonsteraLeaf plant={props.plant} coverage={props.coverage} pattern={props.pattern} inkSeed={props.inkSeed} stalk={false} />
      break
    }
    case "leaf":
      viewBox = props.pattern === undefined ? "-85 -125 170 170" : LEAF_STUDY.viewBox
      drawing = <BotanicalLeaf x={0} y={0} angle={0} length={104} width={48 * props.width / 100} family={props.family} coverage={props.coverage} pattern={props.pattern} markingSeed={props.markingSeed} />
      break
    case "sprig": {
      if (!sprig) throw new Error("Missing prepared bud study")
      viewBox = Object.values(sprig.viewBox).join(" ")
      drawing = <g>
        <SprigStalkDrawing sprig={sprig} />
        <BotanicalBud x={sprig.bud.attachment.x} y={sprig.bud.attachment.y} angle={sprig.bud.angle} scale={sprig.bud.scale} study={sprig.bud.anatomy} />
        {sprig.branches.map((branch, i) => <g key={i}>
          <BotanicalBud x={branch.bud.attachment.x} y={branch.bud.attachment.y} angle={branch.bud.angle} scale={branch.bud.scale} study={branch.bud.anatomy} />
        </g>)}
        {sprig.leaves.map((leaf, i) => <g key={i} data-study-leaf="true">
          <BotanicalLeaf x={leaf.attachment.x} y={leaf.attachment.y} angle={leaf.angle} length={leaf.length} width={leaf.width} family="lance" coverage={0} />
        </g>)}
      </g>
      break
    }
    case "ground":
      viewBox = GROUND_STUDY.viewBox
      drawing = <GroundStudyDrawing seed={props.seed} />
      break
    case "ladybird":
      viewBox = LEAF_STUDY.viewBox
      drawing = <BotanicalLeaf x={0} y={0} angle={0} length={104} width={48 * props.specimen.width / 100}
        family={props.specimen.family} pattern="plain" coverage={0} ladybirdPose={props.specimen.ladybird} />
      break
  }
  return (
    <GardenSeed.Provider value={props.seed}>
      <SpecimenInkSeed.Provider value={props.inkSeed}>
        <svg aria-hidden={props.kind === "ladybird" ? undefined : true}
          role={props.kind === "ladybird" ? "group" : undefined}
          aria-label={props.kind === "ladybird" ? "A leaf with an interactive ladybird" : undefined}
          viewBox={viewBox} color={BOTANICAL_INK} data-botanical-piece={props.kind}>
          <g filter={props.filter}>{drawing}</g>
        </svg>
      </SpecimenInkSeed.Provider>
    </GardenSeed.Provider>
  )
}

/** Resolve one flower's look: the generated personality first, then anything the reader changed. */
function useGardenFlower(plant: FlowerPlant, base: { shape: BloomShape; fill: string; centerHole: number }) {
  const sceneSeed = useContext(GardenSeed)
  const recipe = useMemo(() => gardenFlowerRecipe(sceneSeed, plant.id), [sceneSeed, plant.id])
  const edit = overrideFor(useContext(GardenOverrides), "flower", plant.id)
  const shape = useMemo(() => edit.petals === undefined ? base.shape : { ...base.shape, petals: edit.petals },
    [base.shape, edit.petals])
  return {
    shape,
    fill: edit.color ?? base.fill,
    centerHole: edit.centerHole ?? base.centerHole,
    family: edit.family ?? recipe.family,
    petalLength: edit.petalLength ?? recipe.petalLength,
  }
}

function FlowerSprig({ plant, shape, fill, size, centerHole, centerLightness, foliageLightness, seed }: CompanionBloom & {
  plant: FlowerPlant; seed: number
}) {
  const sceneSeed = useContext(GardenSeed)
  const flower = useGardenFlower(plant, { shape, fill, centerHole })
  const head = plant.curve[3]
  const { halo, props: selectable } = useSelectable("flower", plant.id, `${plant.role} flower`, flower.fill)
  return (
    <g {...selectable} className={`bloom-small-plant bloom-sprig-pose${selectable.className ? ` ${selectable.className}` : ""}`} data-plant-id={plant.id} data-role={plant.role} data-diameter={size} data-height={plant.curve[0].y - head.y} data-stem-width={plant.stemWidth} data-leaf-count={plant.leaves.length} style={{ ...selectable.style, ...plantMotion(sceneSeed, plant.id, BLOOM_MOTION.cycles.plant + size / BLOOM_MOTION.cycles.companionSizeDivisor), transformOrigin: `${plant.curve[0].x}px ${plant.curve[0].y}px` }}>
      <BotanicalStem curve={plant.curve} width={plant.stemWidth} lightness={foliageLightness} />
      {plant.buds.map((branch, i) => (
        <g key={i}>
          <BotanicalStem curve={branch.curve} width={1.8} lightness={foliageLightness} />
          <BotanicalBud x={branch.tip.x} y={branch.tip.y} angle={budAngle(branch.curve)} scale={branch.scale} />
        </g>
      ))}
      {plant.leaves.map((leaf, i) => <BotanicalLeaf key={i} {...leaf} pale={i % 2 === 0} lightness={foliageLightness} />)}
      <g transform={`translate(${head.x - size / 2} ${head.y - size / 2})`}>
        <BotanicalFlower shape={flower.shape} fill={flower.fill} centerHole={flower.centerHole} centerLightness={centerLightness} seed={seed} size={size} identity={plant.id} family={flower.family} petalLength={flower.petalLength} halo={halo} />
      </g>
    </g>
  )
}

function MainBloomPlant({ shape, fill, centerHole, centerLightness, foliageLightness, seed, moving, style, plant }: Pick<BloomIllustrationProps, "shape" | "fill" | "centerHole" | "centerLightness" | "foliageLightness"> & {
  seed: number; moving: boolean; style: CSSProperties; plant: FlowerPlant
}) {
  const head = plant.curve[3]
  const sceneSeed = useContext(GardenSeed)
  const flower = useGardenFlower(plant, { shape, fill, centerHole })
  const { halo, props: selectable } = useSelectable<HTMLDivElement>("flower", plant.id, "the tallest flower", flower.fill)
  const plantStyle: CSSProperties & { "--bloom-head-left": string; "--bloom-head-top": string } = {
    ...selectable.style,
    ...style,
    ...plantMotion(sceneSeed, "main", BLOOM_MOTION.cycles.plant),
    transformOrigin: `${(plant.curve[0].x / BLOOM_SCENE.width) * 100}% ${(plant.curve[0].y / BLOOM_SCENE.height) * 100}%`,
    "--bloom-head-left": `${((head.x - BLOOM_SCENE.flowerCenter) / BLOOM_SCENE.width) * 100}%`,
    "--bloom-head-top": `${((head.y - BLOOM_SCENE.flowerCenter) / BLOOM_SCENE.height) * 100}%`,
  }
  return (
    <div {...selectable} data-animated={moving} data-role="king" data-plant-id={plant.id} data-stem-width={plant.stemWidth} data-height={plant.curve[0].y - head.y} data-leaf-count={plant.leaves.length} data-head-x={head.x} data-head-y={head.y} style={plantStyle} className={`bloom-plant bloom-context${selectable.className ? ` ${selectable.className}` : ""}`}>
      <svg role="group" aria-label="Garden foliage" width={BLOOM_SCENE.width} height={BLOOM_SCENE.height} viewBox={BLOOM_VIEWBOX} color={BOTANICAL_INK}>
        <BotanicalStem curve={plant.curve} width={plant.stemWidth} lightness={foliageLightness} />
        {plant.buds.map((branch, i) => (
          <g key={i}>
            <BotanicalStem curve={branch.curve} width={2} lightness={foliageLightness} />
            <BotanicalBud x={branch.tip.x} y={branch.tip.y} angle={budAngle(branch.curve)} scale={branch.scale} />
          </g>
        ))}
        {plant.leaves.map((leaf, i) => <BotanicalLeaf key={i} {...leaf} pale={i % 2 === 0} lightness={foliageLightness} />)}
      </svg>
      <div className="bloom-flower">
        <BotanicalFlower shape={flower.shape} fill={flower.fill} centerHole={flower.centerHole} centerLightness={centerLightness} seed={seed} className="block h-auto w-full" family={flower.family} petalLength={flower.petalLength} halo={halo} />
      </div>
    </div>
  )
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(BLOOM_MOTION.reducedQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const reducedMotionSnapshot = () => window.matchMedia(BLOOM_MOTION.reducedQuery).matches

interface BloomIllustrationProps extends Omit<BloomState, "colorIndex"> {
  fill: string
  animated: boolean
  overrides: GardenOverrides
  selection?: GardenSelection
  onReady?: () => void
}

export function BloomIllustration(props: BloomIllustrationProps) {
  const { ref, active } = useBloomVisibility()
  const prepared = useMonsteraGarden(props, props.overrides.monstera)
  const current = prepared?.scene.sceneSeed === props.sceneSeed && prepared.edits === props.overrides.monstera
  const snapshot = current ? props : prepared?.scene
  const onReady = props.onReady
  useEffect(() => {
    if (prepared) onReady?.()
  }, [prepared, onReady])
  return (
    <div ref={ref} data-preparing={!current} aria-busy={!current}>
      {snapshot && prepared
        ? <BloomIllustrationDrawing {...snapshot} overrides={props.overrides} selection={props.selection}
            animated={props.animated && active} monsteraArtworks={prepared.artworks} />
        : <div className="bloom-illustration" data-animated="false" />}
    </div>
  )
}

const StaticGround = memo(BotanicalGround)
const StaticBackdrop = memo(GardenBackdrop)
const StableFlowerSprig = memo(FlowerSprig)
const StableMainBloomPlant = memo(MainBloomPlant)

function budAngle(curve: Curve) {
  const direction = stalkDirection(curve, 1)
  return Math.atan2(direction.x, -direction.y) * 180 / Math.PI
}

function GardenInkDefinitions({ id, moving, paused }: { id: string; moving: boolean; paused: boolean }) {
  const seed = useBoilSeed(BLOOM_MOTION.inkSeed, moving && !paused)
  return moving && <defs>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={BLOOM_MOTION.inkFrequency} numOctaves={BLOOM_MOTION.inkOctaves} seed={seed} result="ink" />
      <feDisplacementMap in="SourceGraphic" in2="ink" scale={BLOOM_MOTION.inkDisplacement} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
}

export const BloomIllustrationDrawing = memo(function BloomIllustrationDrawing({ shape, fill, centerHole, animated, flowerScale, breeze, companions, centerLightness, foliageLightness, backgroundShades, sceneSeed, garden, monsteraArtworks, overrides, selection }: BloomIllustrationProps & { monsteraArtworks: GardenMonsteraArtwork[] }) {
  const inkFilterId = `garden-ink-${useId().replace(/:/g, "")}`
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false)
  const moving = animated && !reducedMotion
  const mainMoving = moving && breeze > 0
  const gardenRef = useRef<HTMLDivElement>(null)
  useGardenGust(gardenRef, moving)
  const seed = BLOOM_MOTION.inkSeed
  const monsteras = useMemo(() => new Map(monsteraArtworks.map(({ id, artwork }) => [id, artwork])), [monsteraArtworks])
  const mainSeed = mainMoving ? seed : BLOOM_MOTION.inkSeed
  const character = useMemo(() => gardenCharacter(sceneSeed), [sceneSeed])
  const style: CSSProperties & { "--bloom-scale": number; "--bloom-gust-cycle": string } = {
    ...BLOOM_SCENE_STYLE,
    "--bloom-scale": flowerScale,
    "--bloom-gust-cycle": `${character.breezeCycle}s`,
  }
  const mainStyle = useMemo<CSSProperties & { "--bloom-breeze": number }>(() => ({
    "--bloom-breeze": breeze,
    rotate: `${foliageLightness * 0.35}deg`,
  }), [breeze, foliageLightness])
  const focusRevision = useMemo(() => ({
    overrides, monsteraArtworks, garden, shape, fill, centerHole, centerLightness, foliageLightness,
  }), [overrides, monsteraArtworks, garden, shape, fill, centerHole, centerLightness, foliageLightness])

  return (
    <GardenSeed.Provider value={sceneSeed}>
      <GardenOverrides.Provider value={overrides}>
      <GardenInkFilter.Provider value={moving ? `url(#${inkFilterId})` : undefined}>
      <div ref={gardenRef} data-animated={moving} data-scene-seed={sceneSeed} data-flower-count={garden.flowers.length + 1} data-monstera-count={garden.monsteras.length} data-garden-age={character.age} data-garden-time={character.time} data-inspecting={selection ? "true" : undefined} style={style} className="bloom-illustration">
        <svg className="bloom-context" role="group" aria-label="The garden" width={BLOOM_SCENE.width} height={BLOOM_SCENE.height} viewBox={BLOOM_VIEWBOX}>
          <GardenInkDefinitions id={inkFilterId} moving={moving} paused={!!selection} />
          <StaticGround garden={garden} />
          <StaticBackdrop shades={backgroundShades} garden={garden} inkSeed={seed} monsteras={monsteras} />
          {garden.flowers.map((plant, i) => {
            const companion = companions.find((bloom) => bloom.id === plant.id)
            if (!companion) throw new Error(`Missing bloom for garden plant ${plant.id}`)
            return <StableFlowerSprig key={plant.id} plant={plant} {...companion} seed={seed + BLOOM_OUTLINE.companion.seedOffset + i * BLOOM_OUTLINE.companion.seedStep} />
          })}
        </svg>
        <StableMainBloomPlant shape={shape} fill={fill} centerHole={centerHole} centerLightness={centerLightness} foliageLightness={foliageLightness} seed={mainSeed} moving={mainMoving} style={mainStyle} plant={garden.king} />
        <BloomFocusStage selection={selection} revision={focusRevision} reducedMotion={reducedMotion} />
      </div>
      </GardenInkFilter.Provider>
      </GardenOverrides.Provider>
    </GardenSeed.Provider>
  )
})
