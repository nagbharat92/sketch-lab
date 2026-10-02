import { createContext, useContext, useId, useMemo, useState, useSyncExternalStore } from "react"
import type { CSSProperties } from "react"
import { roughPathInfos, ROUGH_OPTIONS, type RoughPathInfo } from "@/components/lab/rough"
import { useBoilSeed } from "@/hooks/use-boil-seed"
import type { BloomShape } from "@/lib/bloom"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { branchCurve, curvePath, curvePoint, gardenCharacter, type Curve, type FlowerPlant, type GardenScene, type MonsteraPlant } from "./bloom-garden"
import { botanicalPetals, BUD_EDGE, decorationVariation, flowerTraits, groundGeometry, leafAnatomy, monsteraAnatomy, OPEN_BUD_EDGE, pigment, plantMotion, pollenGeometry, variegationPaths } from "./bloom-geometry"
import { BLOOM_FLOWER_VIEWBOX, BLOOM_MOTION, BLOOM_OUTLINE, BLOOM_PIGMENTS as PIGMENTS, BLOOM_SCENE, BLOOM_SCENE_STYLE, BLOOM_VIEWBOX, VARIEGATION_PATTERNS } from "./bloom-tokens"
import type { BloomState, CompanionBloom } from "./bloom-state"
export type { CompanionBloom, CompanionBlooms } from "./bloom-state"
import "./bloom-illustration.css"

const BOTANICAL_INK = PIGMENTS.ink
const GardenSeed = createContext(0)
const GardenInkFilter = createContext<string | undefined>(undefined)

function useGardenCharacter() {
  const seed = useContext(GardenSeed)
  return useMemo(() => gardenCharacter(seed), [seed])
}

function useDecorationVariation(label: string, defaultVariegated = false) {
  const seed = useContext(GardenSeed)
  return useMemo(() => decorationVariation(seed, label, defaultVariegated), [seed, label, defaultVariegated])
}

function Variegation({ pattern, coverage, width, height, fill }: {
  pattern: typeof VARIEGATION_PATTERNS[number]; coverage: number; width: number; height: number; fill: string
}) {
  const inkFilter = useContext(GardenInkFilter)
  const paths = useMemo(() => variegationPaths(pattern, width, height), [pattern, width, height])
  return (
    <g data-variegation-pattern={pattern} fill={fill} opacity={0.88} filter={inkFilter}>
      <g transform={`scale(${coverage} 1)`}>
        {paths.map((d, i) => <path key={i} d={d} />)}
      </g>
    </g>
  )
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

function BotanicalLeaf({ x, y, angle, length, width, pale = false, variegated = false, ladybird = false, lightness = 0 }: {
  x: number; y: number; angle: number; length: number; width: number; pale?: boolean; variegated?: boolean; ladybird?: boolean; lightness?: number
}) {
  const id = useId().replace(/:/g, "")
  const sceneSeed = useContext(GardenSeed)
  const variation = useDecorationVariation(`leaf:${x}:${y}:${angle}`, variegated)
  const character = useGardenCharacter()
  const anatomy = useMemo(() => leafAnatomy(sceneSeed, `leaf:${x}:${y}:${angle}`), [sceneSeed, x, y, angle])
  const ink = useMemo(() => outline(anatomy.edge, BLOOM_OUTLINE.leaf.seed), [anatomy.edge])
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${width / BLOOM_SCENE.leafWidth} ${length / BLOOM_SCENE.leafLength})`} color={BOTANICAL_INK}>
      <defs>
        <linearGradient id={`leaf-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="0.65">
          <stop offset="0" stopColor={pigment(pale ? PIGMENTS.leaf.paleLight : PIGMENTS.leaf.light, lightness)} />
          <stop offset="0.45" stopColor={pigment(pale ? PIGMENTS.leaf.paleMiddle : PIGMENTS.leaf.middle, lightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.leaf.dark, lightness)} />
        </linearGradient>
        <clipPath id={`leaf-edge-${id}`}><path d={anatomy.edge} /></clipPath>
      </defs>
      <g className="bloom-leaf-follow bloom-regular-leaf-angle" data-growth-stage={character.age < 0.45 ? "unfurling" : "open"} data-leaf-kind={anatomy.kind} data-variegated={variation.variegated} style={{ rotate: `${variation.angle * 0.4}deg`, scale: `${character.age < 0.45 ? 0.94 : 1} 1`, animationDelay: `${-0.6 - (length % 7) * 0.23 - (Math.abs(angle) % 11) * 0.08}s` }}>
        <path d={anatomy.edge} fill={`url(#leaf-${id})`} />
        <g clipPath={`url(#leaf-edge-${id})`}>
          <path d={anatomy.fold} transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={PIGMENTS.leaf.fold} opacity={character.age < 0.45 ? 0.3 : 0.17} />
          <path d="M-3 -5 C-10 -28 -12 -53 -1 -80 C-7 -49 -4 -28 -3 -5 Z" transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={character.highlight} opacity={0.25} />
          {variation.variegated && <Variegation pattern={variation.pattern} coverage={variation.coverage} width={anatomy.width} height={BLOOM_SCENE.leafLength} fill={character.warm ? PIGMENTS.leaf.variegationWarm : PIGMENTS.leaf.variegationCool} />}
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
        {ladybird && <Ladybird x={curvePoint(anatomy.spine, 0.65).x} y={-66} angle={-77} scale={0.65} />}
      </g>
    </g>
  )
}

function BotanicalBud({ x, y, angle = 0, scale = 1, blue = false, foliageLightness = 0 }: {
  x: number; y: number; angle?: number; scale?: number; blue?: boolean; foliageLightness?: number
}) {
  const id = useId().replace(/:/g, "")
  const variation = useDecorationVariation(`bud:${x}:${y}`)
  const character = useGardenCharacter()
  const open = variation.opening > 0.67
  const edge = open
    ? OPEN_BUD_EDGE
    : BUD_EDGE
  const capInk = useMemo(() => outline(edge, BLOOM_OUTLINE.bud.seed, BLOOM_OUTLINE.bud.width), [edge])
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} color={BOTANICAL_INK}>
      <defs>
        <linearGradient id={`bud-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="0.4">
          <stop offset="0" stopColor={variation.budColor ? pigment(variation.budColor, 14) : blue ? PIGMENTS.bud.blueLight : PIGMENTS.bud.light} />
          <stop offset="0.5" stopColor={variation.budColor ?? (blue ? PIGMENTS.bud.blueMiddle : PIGMENTS.bud.middle)} />
          <stop offset="1" stopColor={variation.budColor ? pigment(variation.budColor, -14) : blue ? PIGMENTS.bud.blueDark : PIGMENTS.bud.dark} />
        </linearGradient>
        <clipPath id={`bud-cap-${id}`}><path d={edge} /></clipPath>
      </defs>
      <g className="bloom-bud-angle" data-growth-stage={open ? "opening" : variation.opening < 0.42 ? "tight" : "full"} style={{ rotate: `${variation.angle}deg`, scale: `${variation.fullness * (0.72 + variation.opening * 0.32)} 1` }}>
        <path d={edge} fill={`url(#bud-${id})`} />
        <g clipPath={`url(#bud-cap-${id})`}>
          <path d="M0 0 C-4 -16 -8 -30 1 -49 C-1 -30 4 -16 0 0 Z" transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={character.highlight} opacity={0.18} />
          <g fill="none" stroke="currentColor" strokeWidth={0.65} strokeLinecap="round" opacity={0.55}>
            <path d="M0 -3 C-6 -20 -3 -35 1 -46 M3 -3 C9 -15 7 -28 4 -36 M-4 -5 C-11 -13 -12 -21 -9 -27" />
          </g>
          {open && <ellipse cx={0} cy={-23} rx={5} ry={2.4} fill={PIGMENTS.bud.pollen} stroke="currentColor" strokeWidth={0.6} />}
        </g>
        <InkDrawing paths={capInk} />
        <path d="M0 4 C-11 -2 -15 -11 -16 -17 C-8 -12 -3 -6 0 -5 C3 -10 7 -14 11 -18 C12 -7 7 0 0 4 Z" fill={pigment(PIGMENTS.bud.calyx, foliageLightness)} stroke={PIGMENTS.bud.calyxOutline} strokeWidth={0.7} />
        <path d="M-8 -9 L0 1 L7 -9" fill="none" stroke={PIGMENTS.bud.calyxVein} strokeWidth={0.8} />
      </g>
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

function MonsteraLeaf({ plant, lightness = 0, inkSeed }: {
  plant: MonsteraPlant; lightness?: number; inkSeed: number
}) {
  const id = useId().replace(/:/g, "")
  const sceneSeed = useContext(GardenSeed)
  const variation = useDecorationVariation(plant.id, plant.role === "general")
  const character = useGardenCharacter()
  const anatomy = useMemo(() => monsteraAnatomy(sceneSeed, `anatomy:${plant.id}`, plant.maturity, plant.holes), [sceneSeed, plant])
  const ink = useMemo(() => outline(anatomy.edge, inkSeed, BLOOM_OUTLINE.monstera.width, BLOOM_OUTLINE.monstera.roughness), [anatomy.edge, inkSeed])
  const inkFilter = useContext(GardenInkFilter)
  return (
    <g transform={`translate(${plant.base.x} ${plant.base.y}) scale(${plant.size / BLOOM_SCENE.monsteraLength})`} color={PIGMENTS.monstera.ink}>
      <defs>
        <linearGradient id={`monstera-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="0.5">
          <stop offset="0" stopColor={pigment(PIGMENTS.monstera.light, lightness)} />
          <stop offset="0.5" stopColor={pigment(PIGMENTS.monstera.middle, lightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.monstera.dark, lightness)} />
        </linearGradient>
        <linearGradient id={`monstera-cream-${id}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="1">
          <stop offset="0" stopColor={PIGMENTS.monstera.creamLight} />
          <stop offset="1" stopColor={PIGMENTS.monstera.creamDark} />
        </linearGradient>
        <mask id={`monstera-holes-${id}`} maskUnits="userSpaceOnUse" {...BLOOM_SCENE.mask}>
          <path d={anatomy.edge} fill="white" />
          {anatomy.holes.map((hole, i) => <path key={i} data-hole-width={hole.width} data-hole-length={hole.length} d={`M${hole.x} ${hole.y - hole.length} C${hole.x + hole.width * 1.3} ${hole.y - hole.length * 0.6} ${hole.x + hole.width} ${hole.y + hole.length * 0.65} ${hole.x} ${hole.y + hole.length} C${hole.x - hole.width} ${hole.y + hole.length * 0.55} ${hole.x - hole.width * 1.2} ${hole.y - hole.length * 0.6} ${hole.x} ${hole.y - hole.length} Z`} transform={`rotate(${hole.angle} ${hole.x} ${hole.y})`} fill="black" />)}
        </mask>
      </defs>
      <g className="bloom-leaf-follow bloom-monstera-angle" data-role={plant.role} data-size={plant.size} data-fullness={plant.fullness} data-hole-family={plant.holeFamily} data-maturity={anatomy.maturity} data-splits={anatomy.splits} data-variegated={variation.variegated} style={{ rotate: `${plant.angle}deg`, animationDelay: `${-1.1 - (plant.size % 7) * 0.3}s` }}>
        <g transform={`scale(${plant.fullness} 1)`} mask={`url(#monstera-holes-${id})`}>
          <path d={anatomy.edge} fill={`url(#monstera-${id})`} />
          <path d="M0 0 C12 -38 -2 -71 2 -116 C14 -127 38 -121 48 -110 C56 -92 62 -74 59 -57 Q52 -17 0 0" transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill={PIGMENTS.monstera.fold} opacity={0.1} />
          {variation.variegated && <Variegation pattern={variation.pattern} coverage={variation.coverage} width={55} height={BLOOM_SCENE.monsteraLength} fill={`url(#monstera-cream-${id})`} />}
          <g fill={PIGMENTS.monstera.veins} stroke="none" filter={inkFilter}>
            {anatomy.veins.map((vein, i) => <path key={i} data-vein-depth={vein.depth} d={vein.d} opacity={PIGMENTS.monstera.veinOpacity[vein.depth]} />)}
          </g>
        </g>
        <g transform={`scale(${plant.fullness} 1)`}>
          <InkDrawing paths={ink} opacity={0.65} nonScaling />
        </g>
      </g>
    </g>
  )
}

const LADYBIRD_JOKES = [
  "She left me on red.",
  "Six legs. Zero closure.",
  "She wanted fewer spots.",
  "She took the good leaf.",
  "Her rebound? A stinkbug.",
  "Even my spots miss her.",
  "Blocked. On every branch.",
  "She ghosted. I composted.",
]

function Ladybird({ x = 416, y = 394, angle = -28, scale = 1 }: {
  x?: number; y?: number; angle?: number; scale?: number
}) {
  const id = useId().replace(/:/g, "")
  const variation = useDecorationVariation("ladybird-facing")
  const character = useGardenCharacter()
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
    <g transform={`translate(${x} ${y}) rotate(${angle + variation.angle}) scale(${scale})`} color={BOTANICAL_INK}>
      <Tooltip open={open} onOpenChange={changeOpen} delayDuration={0} disableHoverableContent>
        <TooltipTrigger asChild>
          <g
            role="button"
            tabIndex={0}
            aria-label="Heartbroken ladybird"
            className="bloom-ladybird"
            onClick={() => changeOpen(!open)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                changeOpen(!open)
              }
            }}
          >
            <ellipse cy={-1} rx={24} ry={25} fill="transparent" pointerEvents="all" />
            <ellipse className="bloom-ladybird-focus" cy={-1} rx={19} ry={21} fill="none" stroke="currentColor" strokeWidth={1.4} strokeDasharray="2 3" opacity={0} pointerEvents="none" />
            <g className="bloom-ladybird-body" pointerEvents="none">
              <defs>
                <radialGradient id={`ladybird-${id}`} cx={character.lightX === 0 ? 0.3 : 0.7} cy="0.25">
                  <stop offset="0" stopColor={PIGMENTS.ladybird.light} />
                  <stop offset="0.65" stopColor={PIGMENTS.ladybird.middle} />
                  <stop offset="1" stopColor={PIGMENTS.ladybird.dark} />
                </radialGradient>
              </defs>
              <ellipse cx={1} cy={3} rx={9} ry={12} fill={PIGMENTS.ladybird.underside} opacity={0.19} />
              <g fill="none" stroke="currentColor" strokeWidth={0.8} strokeLinecap="round">
                <path d="M-6 -4 L-11 -8 L-13 -7 M-7 0 L-12 0 L-14 3 M-6 6 L-10 9 L-11 13 M6 -4 L11 -8 L13 -7 M7 0 L12 0 L14 3 M6 6 L10 9 L11 13" />
                <path className="bloom-ladybird-antennae" d="M-3 -10 L-5 -15 M3 -10 L5 -15" />
              </g>
              <ellipse cy={-8} rx={5} ry={4} fill={BOTANICAL_INK} />
              <ellipse cy={2} rx={8} ry={10} fill={`url(#ladybird-${id})`} stroke="currentColor" strokeWidth={0.7} />
              <path d="M0 -7 C-1 -2 1 7 0 12" fill="none" stroke="currentColor" strokeWidth={0.85} />
              <g fill="currentColor">
                <ellipse cx={-3.5} cy={-1} rx={1.4} ry={1.6} />
                <ellipse cx={3.5} cy={-1} rx={1.4} ry={1.6} />
                <ellipse cx={-3.2} cy={6} rx={1.3} ry={1.5} />
                <ellipse cx={3.2} cy={6} rx={1.3} ry={1.5} />
              </g>
              <path d="M-5 -3 Q-6 0 -5 3" transform={character.lightX === 1 ? "scale(-1 1)" : undefined} fill="none" stroke={character.highlight} strokeWidth={1.4} strokeLinecap="round" opacity={0.65} />
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

function BotanicalGround() {
  const id = useId().replace(/:/g, "")
  const seed = useContext(GardenSeed)
  const character = useGardenCharacter()
  const ground = useMemo(() => groundGeometry(seed), [seed])
  const ink = useMemo(() => outline(ground.marks.join(" "), BLOOM_OUTLINE.ground.seed, BLOOM_OUTLINE.ground.width), [ground.marks])
  return (
    <g className="bloom-ground" data-scatter={ground.scatter} color={BOTANICAL_INK}>
      <defs>
        <radialGradient id={`soil-${id}`}>
          <stop offset="0" stopColor={pigment(PIGMENTS.ground.soil, ground.lightness)} stopOpacity={0.18} />
          <stop offset="1" stopColor={pigment(PIGMENTS.ground.soil, ground.lightness)} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse className="bloom-soil" cx={BLOOM_SCENE.centerX} cy={568} rx={ground.width} ry={ground.depth} fill={`url(#soil-${id})`} />
      {ground.grasses.map((clump, i) => (
        <g key={i} className="bloom-ground-grass" data-blade-count={clump.blades.length}>
          <ellipse cx={clump.x} cy={clump.y + 1} rx={7} ry={1.5} fill={PIGMENTS.ground.grassOutline} opacity={0.08} />
          {clump.blades.map((blade, j) => (
            <g key={j}>
              <path d={blade.d} fill={pigment(blade.fill, ground.lightness)} stroke={PIGMENTS.ground.grassOutline} strokeWidth={0.4} />
              <path d={blade.spine} fill="none" stroke={PIGMENTS.ground.grassVein} strokeWidth={0.45} opacity={0.45} />
            </g>
          ))}
        </g>
      ))}
      {ground.sprigs.map((sprig, i) => {
        const root = sprig.curve[0]
        const tip = sprig.curve[3]
        return (
          <g key={i} className="bloom-ground-sprig" style={{ ...plantMotion(seed, `ground-${i}`, BLOOM_MOTION.cycles.ground), transformOrigin: `${root.x}px ${root.y}px` }}>
            <BotanicalStem curve={sprig.curve} width={0.9} lightness={ground.lightness} />
            {sprig.pod ? <g className="bloom-seed-pod" transform={`translate(${tip.x} ${tip.y}) rotate(${sprig.angle}) scale(0.45)`} fill={PIGMENTS.ground.pod} stroke={PIGMENTS.ground.podOutline} strokeWidth={0.8}>
              <path d="M0 0 C-9 -6 -10 -25 0 -30 C10 -25 9 -6 0 0 Z" />
              <path d="M0 -2 L0 -28 M-5 -9 L0 -13 L5 -9 M-5 -18 L0 -21 L5 -18" fill="none" />
            </g> : <BotanicalBud x={tip.x} y={tip.y} angle={sprig.angle} scale={sprig.scale} blue={sprig.blue} foliageLightness={ground.lightness} />}
          </g>
        )
      })}
      <InkDrawing paths={ink} opacity={0.3} />
      {ground.rocks.map((stone, i) => (
        <g key={i} className="bloom-rock" transform={`translate(${stone.x} ${stone.y}) rotate(${stone.angle}) scale(${stone.scale})`}>
          <defs>
            <linearGradient id={`stone-${id}-${i}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="1">
              <stop offset="0" stopColor={pigment(PIGMENTS.ground.stoneLight, stone.lightness)} />
              <stop offset="0.6" stopColor={pigment(PIGMENTS.ground.stoneMiddle, stone.lightness)} />
              <stop offset="1" stopColor={pigment(PIGMENTS.ground.stoneDark, stone.lightness)} />
            </linearGradient>
            <clipPath id={`stone-edge-${id}-${i}`}><path d={stone.d} /></clipPath>
          </defs>
          <ellipse cy={stone.height * 0.85} rx={stone.width} ry={stone.height * 0.3} fill={PIGMENTS.ground.stoneUnderside} opacity={0.1} />
          <path d={stone.d} fill={`url(#stone-${id}-${i})`} stroke={PIGMENTS.ground.stoneOutline} strokeWidth={0.55} />
          <path d={`M${-stone.width * 0.6} ${-stone.height * 0.15} Q${-stone.width * 0.3} ${-stone.height * 0.8} ${stone.width * 0.35} ${-stone.height * 0.55}`} clipPath={`url(#stone-edge-${id}-${i})`} fill="none" stroke={PIGMENTS.ground.stoneHighlight} strokeWidth={0.7} opacity={0.7} />
        </g>
      ))}
      {ground.fallenPetals.map((petal, i) => <g key={i} className="bloom-fallen-petal" transform={`translate(${petal.x} ${petal.y}) rotate(${petal.angle}) scale(${petal.scale})`}>
        <ellipse cx={2} cy={2} rx={11} ry={3} fill={PIGMENTS.ground.petalUnderside} opacity={0.08} />
        <path d="M-8 1 C-8 -7 2 -9 10 -2 C14 3 6 7 -1 4 Q-6 6 -8 1 Z" fill={petal.fill} stroke={BOTANICAL_INK} strokeWidth={0.5} opacity={0.75} />
        <path d="M-6 1 Q2 3 8 -1" fill="none" stroke={PIGMENTS.ground.petalHighlight} strokeWidth={0.6} opacity={0.65} />
      </g>)}
      <g fill={PIGMENTS.ground.grain} opacity={0.4}>
        {ground.grains.map((grain, i) => <ellipse key={i} cx={grain.x} cy={grain.y} rx={grain.width} ry={grain.height} />)}
      </g>
    </g>
  )
}

function GardenBackdrop({ shades, garden, inkSeed }: { shades: number[]; garden: GardenScene; inkSeed: number }) {
  const seed = useContext(GardenSeed)
  const character = useGardenCharacter()
  const uprightCurve = garden.vine
  const vineShade = shades[shades.length - 1]
  return (
    <g className="bloom-background">
      {garden.monsteras.map((leaf, i) => (
        <g key={leaf.id} className="bloom-monstera-plant" data-plant-id={leaf.id} style={{ ...plantMotion(seed, leaf.id, BLOOM_MOTION.cycles.monstera), transformOrigin: `${leaf.root.x}px ${leaf.root.y}px` }}>
          <BotanicalStem curve={branchCurve(leaf.root, leaf.base)} width={leaf.stemWidth} lightness={shades[i]} />
          <MonsteraLeaf plant={leaf} lightness={shades[i]} inkSeed={inkSeed + BLOOM_OUTLINE.monstera.seedOffset + i * BLOOM_OUTLINE.monstera.seedStep} />
        </g>
      ))}
      <BotanicalStem curve={uprightCurve} width={1.8} lightness={vineShade} />
      {(character.density > 0.72 ? [0.25, 0.55, 0.8] : [0.2, 0.4, 0.6, 0.8]).map((t, i) => {
        const node = curvePoint(uprightCurve, t)
        return (
          <g key={i}>
            <BotanicalLeaf x={node.x} y={node.y} angle={i % 2 === 0 ? -49 : 52} length={48 - i * 5} width={23 - i * 2} variegated={i % 2 === 0} pale={i % 2 !== 0} lightness={vineShade} />
          </g>
        )
      })}
    </g>
  )
}

function BotanicalFlower({ shape, fill, centerHole, centerLightness, seed, size = BLOOM_SCENE.flowerSize, className, identity = "king" }: {
  shape: BloomShape; fill: string; centerHole: number; centerLightness: number; seed: number; size?: number; className?: string; identity?: string
}) {
  const uid = useId().replace(/:/g, "")
  const sceneSeed = useContext(GardenSeed)
  const character = useGardenCharacter()
  const traits = useMemo(() => flowerTraits(sceneSeed, identity), [sceneSeed, identity])
  const centerRadius = BLOOM_SCENE.centerRadius * centerHole
  const petals = useMemo(() => botanicalPetals(shape, traits.family, traits.individuality, traits.opening), [shape, traits])
  const petalInk = useMemo(() => petals.map((petal, i) =>
    outline(petal.d, seed + i * BLOOM_OUTLINE.flower.seedStep, BLOOM_OUTLINE.flower.width, size < BLOOM_OUTLINE.flower.smallThreshold ? BLOOM_OUTLINE.flower.smallRoughness : BLOOM_OUTLINE.flower.roughness),
  ), [petals, seed, size])
  // Keep the existing useId-labelled stream, so extraction does not change speckled pollen.
  const seeds = useMemo(() => pollenGeometry(sceneSeed, uid, centerRadius, traits.texture), [centerRadius, sceneSeed, uid, traits.texture])

  return (
    <svg aria-hidden="true" data-petal-family={traits.family} data-pollen-texture={traits.texture} width={size} height={size} viewBox={BLOOM_FLOWER_VIEWBOX} className={className} color={BOTANICAL_INK} overflow="visible">
      <defs>
        <linearGradient id={`bloom-light-${uid}`} x1={character.lightX} y1="0" x2={1 - character.lightX} y2="1">
          <stop offset="0" stopColor={character.highlight} stopOpacity={0.45} />
          <stop offset="0.48" stopColor={character.highlight} stopOpacity={0.04} />
          <stop offset="1" stopColor={PIGMENTS.flower.shade} stopOpacity={0.22} />
        </linearGradient>
        <radialGradient id={`bloom-center-${uid}`} cx={character.lightX === 0 ? 0.36 : 0.64} cy="0.3">
          <stop offset="0" stopColor={pigment(PIGMENTS.flower.centerLight, centerLightness)} />
          <stop offset="0.65" stopColor={pigment(PIGMENTS.flower.centerMiddle, centerLightness)} />
          <stop offset="1" stopColor={pigment(PIGMENTS.flower.centerDark, centerLightness)} />
        </radialGradient>
        {petals.map((petal, i) => <clipPath key={i} id={`petal-${uid}-${i}`}><path d={petal.d} /></clipPath>)}
      </defs>
      <g>
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
        {centerRadius > 0 && (
          <g>
            <ellipse cx={BLOOM_SCENE.flowerCenter + 1} cy={BLOOM_SCENE.flowerCenter + 1} rx={centerRadius + 3} ry={centerRadius * 0.93 + 2} fill={PIGMENTS.flower.centerUnderside} opacity={0.13} />
            <ellipse cx={BLOOM_SCENE.flowerCenter} cy={BLOOM_SCENE.pollenCenterY} rx={centerRadius} ry={centerRadius * 0.92} fill={`url(#bloom-center-${uid})`} stroke="currentColor" strokeWidth={0.8} />
            {traits.texture === "rings" && <g className="bloom-pollen-rings" fill="none" stroke="currentColor" strokeWidth={0.45} opacity={0.2}>
              {[0.25, 0.5, 0.75].map((radius) => <ellipse key={radius} cx={BLOOM_SCENE.flowerCenter} cy={BLOOM_SCENE.pollenCenterY} rx={centerRadius * radius} ry={centerRadius * radius * 0.92} />)}
            </g>}
            <g fill="currentColor" opacity={0.7}>
              {seeds.map((point, i) => (
                <g key={i}>
                  <ellipse cx={point.x} cy={point.y} rx={0.75} ry={1.2} transform={`rotate(${point.angle} ${point.x} ${point.y})`} />
                  <circle cx={point.x - 0.6} cy={point.y - 0.7} r={0.38} fill={PIGMENTS.flower.pollenHighlight} />
                </g>
              ))}
            </g>
          </g>
        )}
      </g>
    </svg>
  )
}

function FlowerSprig({ plant, shape, fill, size, centerHole, centerLightness, foliageLightness, seed }: CompanionBloom & {
  plant: FlowerPlant; seed: number
}) {
  const sceneSeed = useContext(GardenSeed)
  const head = plant.curve[3]
  return (
    <g className="bloom-small-plant bloom-sprig-pose" data-plant-id={plant.id} data-role={plant.role} data-diameter={size} data-height={plant.curve[0].y - head.y} data-stem-width={plant.stemWidth} data-leaf-count={plant.leaves.length} style={{ ...plantMotion(sceneSeed, plant.id, BLOOM_MOTION.cycles.plant + size / BLOOM_MOTION.cycles.companionSizeDivisor), transformOrigin: `${plant.curve[0].x}px ${plant.curve[0].y}px` }}>
      <BotanicalStem curve={plant.curve} width={plant.stemWidth} lightness={foliageLightness} />
      {plant.buds.map((branch, i) => (
        <g key={i}>
          <BotanicalStem curve={branch.curve} width={1.8} lightness={foliageLightness} />
          <BotanicalBud x={branch.tip.x} y={branch.tip.y} angle={31} scale={branch.scale} foliageLightness={foliageLightness} />
        </g>
      ))}
      {plant.leaves.map((leaf, i) => <BotanicalLeaf key={i} {...leaf} pale={i % 2 === 0} lightness={foliageLightness} />)}
      <g transform={`translate(${head.x - size / 2} ${head.y - size / 2})`}>
        <BotanicalFlower shape={shape} fill={fill} centerHole={centerHole} centerLightness={centerLightness} seed={seed} size={size} identity={plant.id} />
      </g>
    </g>
  )
}

function MainBloomPlant({ shape, fill, centerHole, centerLightness, foliageLightness, seed, moving, style, plant }: Pick<BloomIllustrationProps, "shape" | "fill" | "centerHole" | "centerLightness" | "foliageLightness"> & {
  seed: number; moving: boolean; style: CSSProperties; plant: FlowerPlant
}) {
  const head = plant.curve[3]
  const sceneSeed = useContext(GardenSeed)
  const plantStyle: CSSProperties & { "--bloom-head-left": string; "--bloom-head-top": string } = {
    ...style,
    ...plantMotion(sceneSeed, "main", BLOOM_MOTION.cycles.plant),
    transformOrigin: `${(plant.curve[0].x / BLOOM_SCENE.width) * 100}% ${(plant.curve[0].y / BLOOM_SCENE.height) * 100}%`,
    "--bloom-head-left": `${((head.x - BLOOM_SCENE.flowerCenter) / BLOOM_SCENE.width) * 100}%`,
    "--bloom-head-top": `${((head.y - BLOOM_SCENE.flowerCenter) / BLOOM_SCENE.height) * 100}%`,
  }
  return (
    <div data-animated={moving} data-role="king" data-plant-id="king" data-stem-width={plant.stemWidth} data-height={plant.curve[0].y - head.y} data-leaf-count={plant.leaves.length} data-head-x={head.x} data-head-y={head.y} style={plantStyle} className="bloom-plant">
      <svg role="group" aria-label="Garden foliage" width={BLOOM_SCENE.width} height={BLOOM_SCENE.height} viewBox={BLOOM_VIEWBOX} color={BOTANICAL_INK}>
        <BotanicalStem curve={plant.curve} width={plant.stemWidth} lightness={foliageLightness} />
        {plant.buds.map((branch, i) => (
          <g key={i}>
            <BotanicalStem curve={branch.curve} width={2} lightness={foliageLightness} />
            <BotanicalBud x={branch.tip.x} y={branch.tip.y} angle={29} scale={branch.scale} blue foliageLightness={foliageLightness} />
          </g>
        ))}
        {plant.leaves.map((leaf, i) => <BotanicalLeaf key={i} {...leaf} pale={i % 2 === 0} lightness={foliageLightness} />)}
      </svg>
      <div className="bloom-flower">
        <BotanicalFlower shape={shape} fill={fill} centerHole={centerHole} centerLightness={centerLightness} seed={seed} className="block h-auto w-full" />
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
}

export function BloomIllustration({ shape, fill, centerHole, animated, flowerScale, breeze, companions, centerLightness, foliageLightness, backgroundShades, sceneSeed, garden }: BloomIllustrationProps) {
  const inkFilterId = `garden-ink-${useId().replace(/:/g, "")}`
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false)
  const mainMoving = animated && breeze > 0
  const seed = useBoilSeed(BLOOM_MOTION.inkSeed, animated && !reducedMotion)
  const mainSeed = mainMoving ? seed : BLOOM_MOTION.inkSeed
  const character = useMemo(() => gardenCharacter(sceneSeed), [sceneSeed])
  const style: CSSProperties & { "--bloom-scale": number; "--bloom-gust-cycle": string } = {
    ...BLOOM_SCENE_STYLE,
    "--bloom-scale": flowerScale,
    "--bloom-gust-cycle": `${character.breezeCycle}s`,
  }
  const mainStyle: CSSProperties & { "--bloom-breeze": number } = {
    "--bloom-breeze": breeze,
    rotate: `${foliageLightness * 0.35}deg`,
  }

  return (
    <GardenSeed.Provider value={sceneSeed}>
      <GardenInkFilter.Provider value={`url(#${inkFilterId})`}>
      <div data-animated={animated} data-scene-seed={sceneSeed} data-flower-count={garden.flowers.length + 1} data-monstera-count={garden.monsteras.length} data-garden-age={character.age} data-garden-time={character.time} style={style} className="bloom-illustration">
        <svg aria-hidden="true" width={BLOOM_SCENE.width} height={BLOOM_SCENE.height} viewBox={BLOOM_VIEWBOX}>
          <defs>
            <filter id={inkFilterId} filterUnits="userSpaceOnUse" {...BLOOM_SCENE.mask} colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency={BLOOM_MOTION.inkFrequency} numOctaves={BLOOM_MOTION.inkOctaves} seed={seed} result="ink" />
              <feDisplacementMap in="SourceGraphic" in2="ink" scale={BLOOM_MOTION.inkDisplacement} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <BotanicalGround />
          <GardenBackdrop shades={backgroundShades} garden={garden} inkSeed={seed} />
          {garden.flowers.map((plant, i) => {
            const companion = companions.find((bloom) => bloom.id === plant.id)
            if (!companion) throw new Error(`Missing bloom for garden plant ${plant.id}`)
            return <FlowerSprig key={plant.id} plant={plant} {...companion} seed={seed + BLOOM_OUTLINE.companion.seedOffset + i * BLOOM_OUTLINE.companion.seedStep} />
          })}
        </svg>
        <MainBloomPlant shape={shape} fill={fill} centerHole={centerHole} centerLightness={centerLightness} foliageLightness={foliageLightness} seed={mainSeed} moving={mainMoving} style={mainStyle} plant={garden.king} />
      </div>
      </GardenInkFilter.Provider>
    </GardenSeed.Provider>
  )
}
