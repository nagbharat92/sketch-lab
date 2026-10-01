import { useCallback, useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { CornerFrame } from "@/components/ui/corner-frame"
import { RoughBox } from "@/components/ui/rough-ink"
import { RoughSlider } from "@/components/lab/rough-slider"
import { RoughCheckbox } from "@/components/lab/rough-checkbox"
import { FontCombobox } from "@/components/lab/font-combobox"
import { GOOGLE_FONTS } from "@/data/google-fonts"
import { cn } from "@/lib/utils"

interface TypeLabProps {
  index: number
  props?: Record<string, unknown>
}

const fmtPx = (v: number) => `${Math.round(v)}px`
const fmtRem = (v: number) => `${Math.round(v)}rem`
const fmtScale = (v: number) => `${v.toFixed(2)}×`
const fmtNum2 = (v: number) => v.toFixed(2)
const fmtEm = (v: number) =>
  v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(3)}em`

// ── Fonts ─────────────────────────────────────────────────────────────────────
// Fallbacks kept generic so the brief pre-swap flash never looks jarring; once a
// Google font loads (display=swap), the real face takes over.
const DISPLAY_FALLBACK = "system-ui, sans-serif"
const BODY_FALLBACK = "system-ui, sans-serif"

type FontSpec = { family: string; weights: number[] }

/**
 * A curated pairing. `display`/`body` are Google Fonts families (+ the weights to
 * request); `tagline` is a one-liner for the carousel card; `why` is the human
 * "why this works" note shown beside the specimen.
 */
type Pairing = {
  id: string
  name: string
  display: FontSpec
  body: FontSpec
  tagline: string
  why: string
}

/**
 * The presets, curated to span moods — the site's own voice, editorial serif,
 * modern grotesque, condensed newsstand, poster-bold, and refined serif. All are
 * real Google Fonts families with the requested weights available.
 */
const PAIRINGS: Pairing[] = [
  {
    id: "house",
    name: "House",
    display: { family: "Chango", weights: [400] },
    body: { family: "Cause", weights: [400, 600, 700] },
    tagline: "The site's own voice.",
    why: "A heavy poster display over a friendly, geometric body — the pairing this site already wears. Chango is pure personality up top; Cause stays calm and rounded for the read, so the page feels playful but never hard to follow.",
  },
  {
    id: "editorial",
    name: "Editorial",
    display: { family: "Playfair Display", weights: [400, 700] },
    body: { family: "Source Sans 3", weights: [400, 600, 700] },
    tagline: "Magazine drama, quiet body.",
    why: "Playfair's high-contrast, thick-to-thin serif brings instant editorial elegance to headlines; Source Sans is an even, humanist workhorse that disappears into long reading. Maximum character on top, maximum clarity below — the classic contrast.",
  },
  {
    id: "grotesk",
    name: "Grotesk",
    display: { family: "Space Grotesk", weights: [400, 500, 700] },
    body: { family: "Inter", weights: [400, 600, 700] },
    tagline: "Modern and product-native.",
    why: "Two sans-serifs paired by tone rather than category. Space Grotesk's quirky, slightly technical details give headings a distinct voice, while Inter — engineered for screens — recedes into effortless body text. Cohesive, contemporary, unmistakably digital.",
  },
  {
    id: "newsstand",
    name: "Newsstand",
    display: { family: "Oswald", weights: [500, 700] },
    body: { family: "Lora", weights: [400, 600, 700] },
    tagline: "Condensed heads, serif read.",
    why: "An inversion of the usual order: Oswald's tall, condensed caps stack into punchy, newspaper-style headlines, and Lora answers with a warm, calligraphic serif that's a genuine pleasure to read at length. Structured up top, humane below.",
  },
  {
    id: "poster",
    name: "Poster",
    display: { family: "Anton", weights: [400] },
    body: { family: "Work Sans", weights: [400, 600, 700] },
    tagline: "Big, black, unapologetic.",
    why: "Anton is all impact — tight, ultra-bold, room-filling headlines with nothing to prove. Work Sans is the neutral, hard-working body that lets it shout without the page feeling loud. Contrast at its most extreme: one voice booms, the other keeps order.",
  },
  {
    id: "elegant",
    name: "Elegant",
    display: { family: "Cormorant Garamond", weights: [500, 600, 700] },
    body: { family: "Mulish", weights: [400, 600, 700] },
    tagline: "Refined and understated.",
    why: "Cormorant Garamond is a delicate, high-contrast display serif with real couture in its curves; Mulish is a minimalist sans that stays out of its way. Together they read as considered and premium — luxury that whispers rather than shouts.",
  },
]

/** Strip a family name to safe characters (prevents CSS / URL injection from the
 *  custom-font inputs), collapse whitespace, and trim. */
function sanitizeFamily(name: string): string {
  return name.replace(/[^A-Za-z0-9 -]/g, "").replace(/\s+/g, " ").trim()
}

/** A quoted CSS `font-family` value with a fallback (empty name → just fallback). */
function cssFamily(name: string, fallback: string): string {
  const clean = sanitizeFamily(name)
  return clean ? `"${clean}", ${fallback}` : fallback
}

/** One `family=…` param for the Google Fonts CSS2 API (no weights → regular only). */
function familyParam(family: string, weights: number[]): string {
  const name = sanitizeFamily(family).replace(/ /g, "+")
  if (!name) return ""
  const w = [...new Set(weights)].filter((n) => n > 0).sort((a, b) => a - b)
  return w.length ? `family=${name}:wght@${w.join(";")}` : `family=${name}`
}

/** Build one CSS2 stylesheet URL for a set of families (deduped by family). */
function buildFontsHref(specs: FontSpec[]): string | null {
  const seen = new Set<string>()
  const params: string[] = []
  for (const s of specs) {
    const key = sanitizeFamily(s.family).toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const p = familyParam(s.family, s.weights)
    if (p) params.push(p)
  }
  return params.length ? `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap` : null
}

/** Create/update/remove a keyed <link rel=stylesheet> in <head> for font loading. */
function ensureStylesheet(id: string, href: string | null): void {
  if (typeof document === "undefined") return
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!href) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href)
}

/**
 * The default value of every control on the page — the SINGLE source of truth
 * for both the initial state and the Reset button, so the two can never drift.
 * (Mirrors the DEFAULTS pattern in folder-lab.tsx.)
 */
const DEFAULTS = {
  pairingId: "house", // selected preset id, or "custom"
  bodySize: 20, // px — matches the site's --content-body-size
  lineHeight: 1.6, // unitless
  measure: 34, // rem — reading-column max width
  headingScale: 1, // multiplier on the h1/h2/h3 ramp
  tracking: 0, // em — letter-spacing on headings
  headingsUseBody: false, // headings render in the body face, not the display face
}

/**
 * A titled card — a light, sidebar-coloured panel that groups one control
 * section, matching the Strokes (folder-lab) control cards. The card publishes
 * `--lab-surface` so descendant slider knobs mask to the card's own background.
 */
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

/**
 * PairingRow — one curated preset as a compact, selectable row in the rail's
 * pairing picker. Just the two faces (display over body), each set in its own
 * family, so the pairing's character reads at a glance — the preset name lives
 * on the aria-label, not a third line. A hand-drawn box frames the row and inks
 * darker when it's the selected pairing.
 */
function PairingRow({
  pairing,
  selected,
  seed,
  onSelect,
}: {
  pairing: Pairing
  selected: boolean
  seed: number
  onSelect: () => void
}) {
  const [hovering, setHovering] = useState(false)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${pairing.name}: ${pairing.display.family} and ${pairing.body.family}`}
      onClick={onSelect}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className="group relative flex flex-col gap-0.5 rounded-xs px-3.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RoughBox
        seed={seed}
        inset={3}
        boil={hovering}
        className={cn(selected ? "text-foreground" : "text-border group-hover:text-muted-foreground")}
      />
      <span
        style={{ fontFamily: cssFamily(pairing.display.family, DISPLAY_FALLBACK) }}
        className={cn("text-base leading-tight", selected ? "text-foreground" : "text-foreground/80")}
      >
        {pairing.display.family}
      </span>
      <span
        style={{ fontFamily: cssFamily(pairing.body.family, BODY_FALLBACK) }}
        className={cn("text-sm leading-tight", selected ? "text-foreground/70" : "text-foreground/45")}
      >
        {pairing.body.family}
      </span>
    </button>
  )
}

/**
 * CustomRow — the last entry in the pairing picker: browse the ENTIRE Google
 * Fonts library for each slot via a searchable, non-dropdown combobox (type, or
 * press ↑/↓ to cycle — each family previewed live). Choosing a family switches
 * the specimen to "custom"; only the highlighted face is ever loaded.
 */
function CustomRow({
  selected,
  displayFamily,
  bodyFamily,
  seed,
  onDisplayChange,
  onBodyChange,
}: {
  selected: boolean
  displayFamily: string
  bodyFamily: string
  seed: number
  onDisplayChange: (v: string) => void
  onBodyChange: (v: string) => void
}) {
  const [hovering, setHovering] = useState(false)
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-label="Custom pairing"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className="relative flex flex-col gap-2.5 rounded-xs px-3.5 py-3"
    >
      <RoughBox seed={seed} inset={3} boil={hovering} className={cn(selected ? "text-foreground" : "text-border")} />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Custom</span>
      <FontCombobox
        label="Display font"
        value={displayFamily}
        placeholder="e.g. Bricolage Grotesque"
        fonts={GOOGLE_FONTS}
        seed={seed + 1}
        onChange={onDisplayChange}
      />
      <FontCombobox
        label="Body font"
        value={bodyFamily}
        placeholder="e.g. Newsreader"
        fonts={GOOGLE_FONTS}
        seed={seed + 2}
        onChange={onBodyChange}
      />
    </div>
  )
}

/**
 * TypeLab — a type-specimen playground for judging font pairings.
 *
 * PHASE 1: tests the CURRENT site pairing (Chango display + Cause body). The
 * specimen is a realistic article that exercises the whole hierarchy — title,
 * section headings, body copy, links, lists, a pull-quote, figures and UI text
 * — so a pairing can be judged the way it will actually be read. A sticky
 * controls rail tunes the levers that matter most (size, leading, measure,
 * heading scale, tracking, and whether headings use the display or body face).
 *
 * The fonts are applied via SCOPED custom properties on the specimen root
 * (`--type-display` / `--type-body`, defaulting to the site's `--font-display` /
 * `--font-sans`), so PHASE 2 only has to swap those two variables to test new
 * faces — the global type ramp is never touched.
 */
export function TypeLab({ index }: TypeLabProps) {
  const [pairingId, setPairingId] = useState(DEFAULTS.pairingId)
  // The applied custom families — the pickers browse/preview these live.
  const [customDisplay, setCustomDisplay] = useState("")
  const [customBody, setCustomBody] = useState("")

  const [bodySize, setBodySize] = useState(DEFAULTS.bodySize)
  const [lineHeight, setLineHeight] = useState(DEFAULTS.lineHeight)
  const [measure, setMeasure] = useState(DEFAULTS.measure)
  const [headingScale, setHeadingScale] = useState(DEFAULTS.headingScale)
  const [tracking, setTracking] = useState(DEFAULTS.tracking)
  const [headingsUseBody, setHeadingsUseBody] = useState(DEFAULTS.headingsUseBody)

  const reset = () => {
    setPairingId(DEFAULTS.pairingId)
    setCustomDisplay("")
    setCustomBody("")
    setBodySize(DEFAULTS.bodySize)
    setLineHeight(DEFAULTS.lineHeight)
    setMeasure(DEFAULTS.measure)
    setHeadingScale(DEFAULTS.headingScale)
    setTracking(DEFAULTS.tracking)
    setHeadingsUseBody(DEFAULTS.headingsUseBody)
  }

  // Preload every preset family once so the carousel previews render in-font and
  // switching a pairing is instant.
  useEffect(() => {
    ensureStylesheet("type-lab-fonts", buildFontsHref(PAIRINGS.flatMap((p) => [p.display, p.body])))
  }, [])

  // Load custom families on demand. Weights omitted (regular only) so ANY family
  // loads reliably; heavier weights faux-synthesize. DEBOUNCED so rapidly cycling
  // with the arrow keys only fetches the family you settle on, not every face in
  // between.
  useEffect(() => {
    const specs: FontSpec[] = []
    if (customDisplay) specs.push({ family: customDisplay, weights: [] })
    if (customBody) specs.push({ family: customBody, weights: [] })
    const href = buildFontsHref(specs)
    const t = setTimeout(() => ensureStylesheet("type-lab-custom", href), 180)
    return () => clearTimeout(t)
  }, [customDisplay, customBody])

  // Live setters for the two custom pickers — choosing a family previews it and
  // switches the specimen into "custom" mode. Stable identities keep the pickers'
  // large option lists memoised while cycling.
  const setDisplay = useCallback((family: string) => {
    setCustomDisplay(family)
    setPairingId("custom")
  }, [])
  const setBody = useCallback((family: string) => {
    setCustomBody(family)
    setPairingId("custom")
  }, [])

  // Resolve the active pairing → the two families + the "why it works" note.
  const isCustom = pairingId === "custom"
  const active = PAIRINGS.find((p) => p.id === pairingId)
  const displayFamily = isCustom ? customDisplay : active?.display.family ?? ""
  const bodyFamily = isCustom ? customBody : active?.body.family ?? ""
  const activeName = isCustom ? "Custom" : active?.name ?? ""
  const whyText = isCustom
    ? "Your own pairing. Type any two families from the Google Fonts library, hit Apply, and judge them against the full specimen — headings, body, links, lists and all."
    : active?.why ?? ""

  // Scoped typographic variables — everything in the specimen reads from these,
  // so one place drives the whole preview without touching global styles.
  const specimenStyle = {
    "--type-display": headingsUseBody ? cssFamily(bodyFamily, BODY_FALLBACK) : cssFamily(displayFamily, DISPLAY_FALLBACK),
    "--type-body": cssFamily(bodyFamily, BODY_FALLBACK),
    "--type-body-size": `${bodySize}px`,
    "--type-leading": `${lineHeight}`,
    "--type-measure": `${measure}rem`,
    "--type-heading-scale": `${headingScale}`,
    "--type-tracking": `${tracking}em`,
    // The one card surface (--surface), matching the Strokes stage + control cards.
    "--lab-stage": "var(--surface)",
  } as CSSProperties

  const bodyStyle: CSSProperties = {
    fontFamily: "var(--type-body)",
    fontSize: "var(--type-body-size)",
    lineHeight: "var(--type-leading)",
  }
  const heading = (rem: string): CSSProperties => ({
    fontFamily: "var(--type-display)",
    fontSize: `calc(${rem} * var(--type-heading-scale))`,
    letterSpacing: "var(--type-tracking)",
    lineHeight: 1.1,
  })

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* ── SPECIMEN — the reading column, PINNED (sticky) so it stays visible
          while the controls rail scrolls; kept short to fit a laptop viewport ── */}
      <FadeInUp i={index} className="min-w-0 flex-1 lg:sticky lg:top-(--content-pt)">
        <div
          style={specimenStyle}
          className="relative rounded-2xl bg-(--lab-stage) p-10"
        >
          <CornerFrame />
          <div style={{ maxWidth: "var(--type-measure)" }} className="mx-auto w-full">
            {/* Pairing meta — the two faces being tested */}
            <p className="mb-8 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Headings · {(headingsUseBody ? bodyFamily : displayFamily) || "—"}
              <span className="px-2 text-muted-foreground/50">/</span>
              Body · {bodyFamily || "—"}
            </p>

            <h1 style={heading("2.5rem")} className="text-foreground">
              Pairing type with intent
            </h1>

            <p
              style={{ ...bodyStyle, fontSize: "calc(var(--type-body-size) * 1.2)" }}
              className="mt-4 text-muted-foreground"
            >
              A pairing works when the display and body faces disagree just enough —
              contrast to signal hierarchy, harmony to read as one voice.
            </p>

            <h2 style={heading("1.5rem")} className="mt-8 text-foreground">
              Reading at length
            </h2>
            <p style={bodyStyle} className="mt-3 text-foreground/80">
              Body copy at the reading size — judge it by the paragraph, not the
              letter. Emphasis stays calm: a{" "}
              <strong className="font-semibold text-foreground">bold phrase</strong>,
              an <em className="italic">italic aside</em>, an{" "}
              <a
                href="#"
                className="underline underline-offset-4 transition-colors duration-150 hover:text-foreground"
              >
                inline link
              </a>{" "}
              and even{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
                inline code
              </code>{" "}
              sitting comfortably on the line.
            </p>
          </div>
        </div>
      </FadeInUp>

      {/* ── CONTROLS — a scrolling rail beside the pinned specimen ─────────── */}
      <FadeInUp i={index + 1} className="w-full shrink-0 lg:w-80">
        <div className="flex flex-col gap-4">
          <Card title="Pairing" action={<ResetButton onReset={reset} />}>
            <div role="radiogroup" aria-label="Font pairings" className="flex flex-col gap-2">
              {PAIRINGS.map((p, i) => (
                <PairingRow
                  key={p.id}
                  pairing={p}
                  selected={!isCustom && pairingId === p.id}
                  seed={40 + i}
                  onSelect={() => setPairingId(p.id)}
                />
              ))}
              <CustomRow
                selected={isCustom}
                displayFamily={customDisplay}
                bodyFamily={customBody}
                seed={60}
                onDisplayChange={setDisplay}
                onBodyChange={setBody}
              />
            </div>
          </Card>

          <Card title="Why it works">
            <p className="text-sm leading-relaxed text-foreground/80">
              <span className="font-semibold text-foreground">{activeName}. </span>
              {whyText}
            </p>
          </Card>

          <Card title="Body">
            <RoughSlider label="Body size" value={bodySize} min={14} max={28} step={1} onChange={setBodySize} format={fmtPx} seed={11} />
            <RoughSlider label="Line height" value={lineHeight} min={1.2} max={2} step={0.05} onChange={setLineHeight} format={fmtNum2} seed={12} />
            <RoughSlider label="Measure" value={measure} min={24} max={48} step={1} onChange={setMeasure} format={fmtRem} seed={13} />
          </Card>

          <Card title="Headings">
            <RoughSlider label="Heading scale" value={headingScale} min={0.75} max={1.5} step={0.05} onChange={setHeadingScale} format={fmtScale} seed={21} />
            <RoughSlider label="Tracking" value={tracking} min={-0.03} max={0.08} step={0.005} onChange={setTracking} format={fmtEm} seed={22} />
            <div className="pt-1">
              <RoughCheckbox label="Headings use body font" checked={headingsUseBody} onChange={setHeadingsUseBody} seed={31} />
            </div>
          </Card>
        </div>
      </FadeInUp>
    </div>
  )
}
