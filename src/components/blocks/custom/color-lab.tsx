import { useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { Moon, RotateCcw, Sun } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughSlider } from "@/components/lab/rough-slider"
import { ColorPicker } from "@/components/lab/color-swatch"
import type { Swatch } from "@/components/lab/rough-tiles"
import { RoughBox, RoughLine } from "@/components/ui/rough-ink"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

interface ColorLabProps {
  index: number
  props?: Record<string, unknown>
}

// ── Colour maths ──────────────────────────────────────────────────────────────
// The whole lab works in HSL because the request is about hue and shade: "same
// hue, different shade" is just a lightness step, and "complementary" is a 180°
// hue turn. Everything renders as an hsl() string; hex is only for the readout.

type HSL = { h: number; s: number; l: number }

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))
const css = (c: HSL) => `hsl(${Math.round(c.h)} ${Math.round(clamp(c.s))}% ${Math.round(clamp(c.l))}%)`

/** HSL → #RRGGBB, for the token readout under each preview. */
function hslToHex(h: number, s: number, l: number): string {
  const sN = clamp(s) / 100
  const lN = clamp(l) / 100
  const a = sN * Math.min(lN, 1 - lN)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

const fmtDeg = (v: number) => `${Math.round(v)}°`
const fmtPct = (v: number) => `${Math.round(v)}%`

/**
 * A vivid hue spectrum (13 stops, 0→360) for painting a hue slider's rail, so
 * the slider itself shows which colour each position selects. Rotated by `from`
 * so the night "hue shift" rail runs from the current day hue around the wheel.
 */
const hueSpectrum = (from = 0) =>
  Array.from({ length: 13 }, (_, i) => `hsl(${(from + i * 30) % 360} 85% 60%)`)

/**
 * The vivid colour at a single hue — matches the spectrum stops so a hue
 * slider's knob reads as a lens over its rail, clearly showing the hue being
 * chosen. (Using the derived palette background instead would render the night
 * knob near-black at low lightness.)
 */
const hueSwatch = (h: number) => `hsl(${((h % 360) + 360) % 360} 85% 60%)`

/**
 * Sample an HSL function into `n` gradient stops (t: 0→1), so a slider's rail
 * shows exactly how one channel morphs across its range while the others stay
 * at their current values — and the matching knob (the derived palette colour)
 * lands on the rail colour beneath it.
 */
const ramp = (n: number, f: (t: number) => HSL) =>
  Array.from({ length: n }, (_, i) => css(f(i / (n - 1))))

// ── Base backgrounds ──────────────────────────────────────────────────────────
// The starting swatches: a warm near-white "Paper" default, then a pastel
// spectrum swept warm → cool (coral → plum), sized to fill exactly two full rows
// of six. Paper is the first swatch and the default; the site's warm "Butter"
// yellow anchors the warm end. A swatch sets hue + saturation + lightness; the
// sliders fine-tune from there.
type Base = { name: string; h: number; s: number; l: number }
const BASES: Base[] = [
  // Row 1 — warm
  { name: "Paper", h: 48, s: 30, l: 98 }, // warm near-white, the default
  { name: "Coral", h: 22, s: 62, l: 90 },
  { name: "Amber", h: 36, s: 62, l: 89 },
  { name: "Butter", h: 48, s: 60, l: 90 }, // site identity
  { name: "Chartreuse", h: 74, s: 46, l: 90 },
  { name: "Green", h: 120, s: 40, l: 91 },
  // Row 2 — cool
  { name: "Mint", h: 152, s: 42, l: 92 },
  { name: "Teal", h: 182, s: 40, l: 91 },
  { name: "Sky", h: 202, s: 48, l: 92 },
  { name: "Blue", h: 224, s: 50, l: 92 },
  { name: "Violet", h: 262, s: 44, l: 93 },
  { name: "Plum", h: 292, s: 42, l: 93 },
]

/** The bases as framework swatches ({ name, color }) for <ColorPicker>. */
const BASE_SWATCHES: Swatch[] = BASES.map((b) => ({ name: b.name, color: css({ h: b.h, s: b.s, l: b.l }) }))

/**
 * The default value of every control — the single source of truth for both the
 * initial state and the Reset button, so the two can never drift. (Mirrors the
 * DEFAULTS pattern in folder-lab.tsx / type-lab.tsx.) Default = the warm
 * near-white "Paper" day (hue 48), complemented (180°) into a blue night.
 */
const DEFAULTS = {
  baseIndex: 0, // Paper
  hue: 48,
  sat: 30,
  light: 98,
  shade: 3, // lightness step between the page and its cards
  tint: 75, // card saturation as a % of the page's
  nightShift: 180, // day → night hue turn (180° = exact complement)
  nightSat: 15,
  nightLight: 10,
}

// ── Palette derivation ────────────────────────────────────────────────────────
interface Palette {
  bg: HSL
  card: HSL
  raised: HSL
  border: HSL
  text: HSL
  muted: HSL
  accent: HSL
  accentInk: HSL
}

type Config = typeof DEFAULTS

/**
 * Build a full palette for one mode from the shared controls.
 *
 *  • Day keeps the chosen hue; Night turns it by `nightShift` (180° = the exact
 *    complement — yellow → blue, pink → green).
 *  • Cards share the page's hue and step ONE shade toward the surface: darker
 *    than the page in day, lighter at night (surfaces rise toward the light).
 *  • Text and muted ink are the same hue held near the far end of the lightness
 *    range so they stay readable and in-family.
 */
function buildPalette(mode: "day" | "night", c: Config): Palette {
  const dark = mode === "night"
  const h = dark ? (c.hue + c.nightShift) % 360 : c.hue
  const baseS = dark ? c.nightSat : c.sat
  const baseL = dark ? c.nightLight : c.light

  const cardS = clamp(baseS * (c.tint / 100))
  const dir = dark ? 1 : -1 // day: cards darker; night: cards lighter

  const bg: HSL = { h, s: baseS, l: baseL }
  const card: HSL = { h, s: cardS, l: clamp(baseL + dir * c.shade) }
  const raised: HSL = { h, s: cardS, l: clamp(baseL + dir * c.shade * 1.9) }
  const border: HSL = { h, s: clamp(cardS * 0.9), l: clamp(baseL + dir * c.shade * 2.7) }
  const text: HSL = dark
    ? { h, s: clamp(baseS * 0.35, 0, 22), l: 90 }
    : { h, s: clamp(baseS * 0.35, 0, 24), l: 16 }
  const muted: HSL = dark
    ? { h, s: clamp(baseS * 0.3, 0, 18), l: 62 }
    : { h, s: clamp(baseS * 0.3, 0, 20), l: 44 }
  const accent: HSL = { h, s: clamp(Math.max(baseS, 55)), l: dark ? 62 : 58 }
  const accentInk: HSL = accent.l > 55 ? { h, s: 30, l: 12 } : { h, s: 20, l: 96 }

  return { bg, card, raised, border, text, muted, accent, accentInk }
}

// ── UI pieces ─────────────────────────────────────────────────────────────────

/** A titled control card — a light sidebar-coloured panel (matches the other
 *  labs). Publishes `--lab-surface` so slider knobs mask to the card colour. */
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section
      style={{ "--lab-surface": "var(--color-sidebar)" } as CSSProperties}
      className="flex flex-col gap-4 rounded-2xl bg-(--lab-surface) p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {/* -mr-2 cancels the action button's own px-2 so its text/glyph right edge
            lands flush with the content (slider) right edge below. */}
        {action ? <div className="-mr-2">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Resets every control on the page to DEFAULTS. */
function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="Reset all controls to their defaults"
      title="Reset to defaults"
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RotateCcw className="size-4 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider">Reset</span>
    </button>
  )
}

// One hand-drawn base-colour swatch now comes from the site-wide colour-swatch
// framework: <ColorPicker> renders the bases and blooms the selected one.

/** A mini product-UI painted entirely from a derived palette — a windowed card
 *  with a header rule, an editorial headline, a profile/list tile beside an
 *  activity tile, and an action row. Uses every role (bg / card / raised /
 *  border / text / muted / accent / accentInk). All outlines are hand-drawn
 *  (roughjs) in the palette's border ink, to match the site's sketchy UI. */
function ThemePreview({ p, label, seed }: { p: Palette; label: string; seed: number }) {
  const bg = css(p.bg)
  const card = css(p.card)
  const raised = css(p.raised)
  const border = css(p.border)
  const text = css(p.text)
  const muted = css(p.muted)
  const accent = css(p.accent)
  const accentInk = css(p.accentInk)
  const night = label === "Night"
  const ModeIcon = night ? Moon : Sun
  // A little bar-chart shape (percent heights); the peak carries the accent.
  const bars = [44, 66, 54, 84, 60, 74, 50]
  const peak = bars.indexOf(Math.max(...bars))

  // color = the border ink, so every nested RoughBox/RoughLine (currentColor)
  // draws in the palette's border colour; text nodes set their own colour.
  return (
    <div className="relative rounded-xl" style={{ backgroundColor: bg, color: border }}>
      {/* Header — window chrome: mode label + a three-dot cluster (last is accent) */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <ModeIcon className="size-3.5" style={{ color: muted }} strokeWidth={2} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: muted }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: raised }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: border }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>
      {/* Hand-drawn header rule */}
      <RoughLine seed={seed + 1} />

      <div className="flex flex-col gap-3.5 p-4">
        {/* Editorial headline */}
        <div>
          <h4 style={{ color: text, fontFamily: "var(--font-display)" }} className="text-xl leading-none">
            {night ? "After dark" : "Daylight"}
          </h4>
          <JustifiedParagraph style={{ color: muted }} className="mt-1.5 text-sm leading-snug">
            Surfaces echo the page hue, one shade apart.
          </JustifiedParagraph>
        </div>

        {/* Content grid — a profile/list tile beside an activity tile */}
        <div className="grid grid-cols-5 gap-3">
          <div className="relative col-span-3 rounded-lg p-3" style={{ backgroundColor: card }}>
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                style={{ backgroundColor: accent, color: accentInk }}
              >
                SL
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-tight" style={{ color: text }}>
                  Sketch Lab
                </div>
                <div className="truncate text-xs" style={{ color: muted }}>
                  Hand-drawn interfaces
                </div>
              </div>
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              {["78%", "62%", "44%"].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: i === 0 ? accent : muted }} />
                  <span className="h-2 rounded-full" style={{ width: w, backgroundColor: raised }} />
                </div>
              ))}
            </div>
            <RoughBox seed={seed + 2} />
          </div>

          <div className="relative col-span-2 flex flex-col rounded-lg p-3" style={{ backgroundColor: card }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: muted }}>
                Activity
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                style={{ backgroundColor: accent, color: accentInk }}
              >
                +12%
              </span>
            </div>
            <div className="mt-auto flex h-11 items-end gap-1 pt-3">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-[2px]"
                  style={{ height: `${h}%`, backgroundColor: i === peak ? accent : raised }}
                />
              ))}
            </div>
            <RoughBox seed={seed + 3} />
          </div>
        </div>

        {/* Action row — a filled accent button, a hand-drawn ghost button, hue tags */}
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: accent, color: accentInk }}
          >
            Get started
          </span>
          <span className="relative rounded-md px-3 py-1.5 text-xs font-medium" style={{ color: border }}>
            <span style={{ color: text }}>Details</span>
            <RoughBox seed={seed + 4} inset={2} />
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: raised, color: muted }}>
              hue
            </span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: raised, color: muted }}>
              +1 shade
            </span>
          </div>
        </div>
      </div>

      {/* Hand-drawn outer frame (drawn last so it sits above the fills) */}
      <RoughBox seed={seed} />
    </div>
  )
}

/** Compact hex readout of the derived tokens under a preview. */
function TokenRow({ p }: { p: Palette }) {
  const toks: Array<[string, HSL]> = [
    ["bg", p.bg],
    ["card", p.card],
    ["raised", p.raised],
    ["text", p.text],
    ["muted", p.muted],
    ["accent", p.accent],
  ]
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1">
      {toks.map(([name, c]) => (
        <div key={name} className="flex items-center gap-1.5" title={name}>
          <span
            className="size-3.5 rounded border border-border"
            style={{ backgroundColor: css(c) }}
          />
          <span className="font-mono text-[11px] text-muted-foreground">{hslToHex(c.h, c.s, c.l)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * ColorLab — a day/night palette generator.
 *
 * Pick a background hue (the site's yellow, a near-white paper, or anything on
 * the wheel); the cards derive from it automatically — same hue, one shade apart
 * — with sliders for the shade step and how much hue the cards carry. The
 * dark-mode ("night") palette is derived parametrically from the light one:
 * night turns the whole hue through the wheel (180° = the exact complement, so a
 * yellow day becomes a blue night, a pink day becomes green), then rebuilds the
 * surfaces and ink at night lightness. Day and night render side by side so the
 * relationship is visible at a glance.
 */
export function ColorLab({ index }: ColorLabProps) {
  const [baseIndex, setBaseIndex] = useState(DEFAULTS.baseIndex)
  const [hue, setHue] = useState(DEFAULTS.hue)
  const [sat, setSat] = useState(DEFAULTS.sat)
  const [light, setLight] = useState(DEFAULTS.light)
  const [shade, setShade] = useState(DEFAULTS.shade)
  const [tint, setTint] = useState(DEFAULTS.tint)
  const [nightShift, setNightShift] = useState(DEFAULTS.nightShift)
  const [nightSat, setNightSat] = useState(DEFAULTS.nightSat)
  const [nightLight, setNightLight] = useState(DEFAULTS.nightLight)

  const reset = () => {
    setBaseIndex(DEFAULTS.baseIndex)
    setHue(DEFAULTS.hue)
    setSat(DEFAULTS.sat)
    setLight(DEFAULTS.light)
    setShade(DEFAULTS.shade)
    setTint(DEFAULTS.tint)
    setNightShift(DEFAULTS.nightShift)
    setNightSat(DEFAULTS.nightSat)
    setNightLight(DEFAULTS.nightLight)
  }

  // Apply a base swatch: set the page hue/saturation/lightness together.
  const applyBase = (i: number) => {
    const b = BASES[i]
    setBaseIndex(i)
    setHue(b.h)
    setSat(b.s)
    setLight(b.l)
  }

  const config: Config = useMemo(
    () => ({ baseIndex, hue, sat, light, shade, tint, nightShift, nightSat, nightLight }),
    [baseIndex, hue, sat, light, shade, tint, nightShift, nightSat, nightLight],
  )
  const day = useMemo(() => buildPalette("day", config), [config])
  const night = useMemo(() => buildPalette("night", config), [config])

  // Derived channel values that the coloured slider rails ramp over (mirrors
  // buildPalette so each rail matches the preview): the night hue, the day
  // cards' saturation, and the day cards' lightness.
  const nightHue = (hue + nightShift) % 360
  const cardS = clamp(sat * (tint / 100))
  const dayCardL = clamp(light - shade)
  // Night's real surfaces are very dark (L≈12), so a rail drawn at the true
  // lightness reads as a near-black line. For the night sat/light rails we lift
  // the OTHER channels to a legible level so the hue family is visible, while
  // still ramping the channel the slider controls.
  const nightVisS = clamp(Math.max(nightSat, 55))

  // The complement label, so the copy names the actual night hue live.
  const nightHueName = ((): string => {
    const h = (hue + nightShift) % 360
    const names: Array<[number, string]> = [
      [15, "red"], [45, "orange"], [65, "yellow"], [95, "lime"], [150, "green"],
      [185, "teal"], [210, "cyan"], [250, "blue"], [285, "violet"], [320, "purple"],
      [345, "pink"], [360, "red"],
    ]
    return names.find(([max]) => h < max)?.[1] ?? "blue"
  })()

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* ── PREVIEW — day above night, full-width theme cards, PINNED while the rail scrolls ─ */}
      <FadeInUp i={index} className="min-w-0 flex-1 lg:sticky lg:top-(--content-pt)">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <ThemePreview p={day} label="Day" seed={61} />
            <TokenRow p={day} />
          </div>
          <div className="flex flex-col gap-3">
            <ThemePreview p={night} label="Night" seed={71} />
            <TokenRow p={night} />
          </div>
        </div>
      </FadeInUp>

      {/* ── CONTROLS — the rail scrolls beside the pinned preview ──────────── */}
      <FadeInUp i={index + 1} className="w-full shrink-0 lg:w-80">
        <div className="flex flex-col gap-4">
          <Card title="Background" action={<ResetButton onReset={reset} />}>
            <ColorPicker
              swatches={BASE_SWATCHES}
              value={baseIndex}
              onChange={applyBase}
              label="Base background colour"
              cols="grid-cols-6"
            />
            <RoughSlider label="Hue" value={hue} min={0} max={360} step={1} onChange={(v) => { setHue(v); setBaseIndex(-1) }} format={fmtDeg} seed={11} gradient={hueSpectrum()} thumbColor={hueSwatch(hue)} />
            <RoughSlider label="Saturation" value={sat} min={0} max={100} step={1} onChange={(v) => { setSat(v); setBaseIndex(-1) }} format={fmtPct} seed={12} gradient={ramp(7, (t) => ({ h: hue, s: t * 100, l: light }))} thumbColor={css(day.bg)} />
            <RoughSlider label="Lightness" value={light} min={80} max={99} step={1} onChange={(v) => { setLight(v); setBaseIndex(-1) }} format={fmtPct} seed={13} gradient={ramp(7, (t) => ({ h: hue, s: sat, l: 80 + t * 19 }))} thumbColor={css(day.bg)} />
          </Card>

          <Card title="Cards">
            <RoughSlider label="Shade step" value={shade} min={0} max={20} step={1} onChange={setShade} format={fmtPct} seed={21} gradient={ramp(7, (t) => ({ h: hue, s: cardS, l: clamp(light - t * 20) }))} thumbColor={css(day.card)} />
            <RoughSlider label="Hue in cards" value={tint} min={40} max={200} step={5} onChange={setTint} format={fmtPct} seed={22} gradient={ramp(7, (t) => ({ h: hue, s: clamp(sat * (40 + t * 160) / 100), l: dayCardL }))} thumbColor={css(day.card)} />
            <JustifiedParagraph className="text-sm text-muted-foreground">
              Cards keep the page hue and step one shade toward the surface —
              darker by day, lighter at night.
            </JustifiedParagraph>
          </Card>

          <Card title="Night (dark mode)">
            <RoughSlider label="Hue shift" value={nightShift} min={0} max={360} step={5} onChange={setNightShift} format={fmtDeg} seed={31} gradient={hueSpectrum(hue)} thumbColor={hueSwatch(hue + nightShift)} />
            <RoughSlider label="Saturation" value={nightSat} min={0} max={100} step={1} onChange={setNightSat} format={fmtPct} seed={32} gradient={ramp(7, (t) => ({ h: nightHue, s: t * 100, l: 52 }))} thumbColor={css({ h: nightHue, s: nightSat, l: 52 })} />
            <RoughSlider label="Lightness" value={nightLight} min={5} max={24} step={1} onChange={setNightLight} format={fmtPct} seed={33} gradient={ramp(7, (t) => ({ h: nightHue, s: nightVisS, l: 5 + t * 19 }))} thumbColor={css({ h: nightHue, s: nightVisS, l: nightLight })} />
            <JustifiedParagraph className="text-sm text-muted-foreground">
              Night turns the day hue through the wheel. At{" "}
              <strong className="font-semibold text-foreground">180°</strong> it lands on the exact
              complement — this day reads as a{" "}
              <strong className="font-semibold text-foreground">{nightHueName}</strong> night. Dial
              toward 210–260° for a violet cast.
            </JustifiedParagraph>
          </Card>
        </div>
      </FadeInUp>
    </div>
  )
}
