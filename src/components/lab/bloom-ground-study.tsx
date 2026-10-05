import { useId, useMemo } from "react"
import { pigment } from "./bloom-geometry"
import { groundStudyGeometry } from "./bloom-ground-study-geometry"
import { BLOOM_PIGMENTS, GROUND_STUDY } from "./bloom-tokens"
import { roughPathInfos, ROUGH_OPTIONS, type RoughPathInfo } from "./rough"

function Ink({ paths, opacity }: { paths: RoughPathInfo[]; opacity: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      {paths.map((path, i) => <path key={i} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />)}
    </g>
  )
}

export function GroundStudyDrawing({ seed, extent }: { seed: number; extent?: { left: number; right: number } }) {
  const id = useId().replace(/:/g, "")
  const ground = useMemo(() => groundStudyGeometry(seed, extent), [seed, extent])
  const colors = BLOOM_PIGMENTS.ground
  // Ink is fixed per generation; the stage's displacement filter supplies the living wiggle.
  const ink = useMemo(() => {
    const options = (inkSeed: number, strokeWidth: number) => ({
      ...ROUGH_OPTIONS, seed: inkSeed, roughness: 0.35, bowing: 0.3, stroke: colors.stoneOutline,
      strokeWidth, fill: "none", disableMultiStroke: true,
    })
    const base = seed % 997 + 1
    return { crest: roughPathInfos(ground.crest, options(base, 0.75)), base: roughPathInfos(ground.base, options(base + 31, 0.6)) }
  }, [ground, seed, colors.stoneOutline])

  return (
    <g data-ground-study="true">
      <defs>
        <linearGradient id={`ground-soil-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GROUND_STUDY.soil.top} />
          <stop offset="1" stopColor={GROUND_STUDY.soil.bottom} />
        </linearGradient>
      </defs>
      <ellipse {...ground.shadow} fill={colors.stoneDark} opacity={0.12} data-ground-shadow="true" />
      {ground.tufts.map((tuft, i) => (
        <g key={i} data-rooted-grass="true" data-grass-height={tuft.height}>
          {tuft.blades.map((blade, j) => (
            <g key={j}>
              <path d={blade.d} fill={blade.fill} stroke={colors.grassOutline} strokeWidth={0.35} />
              <path d={blade.spine} fill="none" stroke={colors.grassVein} strokeWidth={0.35} opacity={0.45} />
            </g>
          ))}
        </g>
      ))}
      {ground.stones.map((stone, i) => (
        <g key={i} transform={`translate(${stone.x} ${stone.y}) rotate(${stone.angle}) scale(${stone.scale})`} data-ground-stone="true">
          <path d={stone.d} fill={pigment(i % 2 === 0 ? colors.stoneLight : colors.stoneMiddle, stone.lightness * 0.5)}
            stroke={colors.stoneOutline} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
          <path d={`M${-stone.width * 0.5} ${-stone.height * 0.2} Q${-stone.width * 0.1} ${-stone.height * 0.85} ${stone.width * 0.45} ${-stone.height * 0.45}`}
            fill="none" stroke={colors.stoneHighlight} strokeWidth={0.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.7} />
        </g>
      ))}
      <path d={ground.soil} fill={`url(#ground-soil-${id})`} data-soil-strip="true" />
      <Ink paths={ink.crest} opacity={0.55} />
      <Ink paths={ink.base} opacity={0.3} />
      <g fill={colors.grain} opacity={0.55}>
        {ground.specks.map((speck, i) => <ellipse key={i} cx={speck.x} cy={speck.y} rx={speck.rx} ry={speck.ry} />)}
      </g>
      {ground.twigs.map((twig, i) => (
        <g key={i} transform={`translate(${twig.x} ${twig.y})`} fill="none" strokeLinecap="round" data-fallen-twig="true">
          <path d={twig.main} stroke={colors.podOutline} strokeWidth={twig.width} />
          <path d={twig.branch} stroke={colors.podOutline} strokeWidth={twig.width * 0.7} />
        </g>
      ))}
      {ground.leaves.map((leaf, i) => (
        <g key={i} data-leaf-litter="true">
          <g transform={`translate(${leaf.x} ${leaf.y}) scale(1 ${leaf.squash}) rotate(${leaf.angle}) scale(${leaf.scale})`}>
            <path d={leaf.edge} fill={leaf.fill} stroke={colors.podOutline} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
            <g fill={pigment(leaf.fill, -16)}>
              {leaf.veins.map((vein, j) => <path key={j} d={vein.d} opacity={vein.depth === 0 ? 0.75 : vein.depth === 1 ? 0.45 : 0.15} />)}
            </g>
          </g>
        </g>
      ))}
    </g>
  )
}
