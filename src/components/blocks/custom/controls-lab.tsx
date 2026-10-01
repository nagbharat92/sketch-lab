import { useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { Moon, Sun } from "lucide-react"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughSlider } from "@/components/lab/rough-slider"
import { RoughChunkySlider } from "@/components/lab/rough-chunky-slider"
import { RoughCheckbox } from "@/components/lab/rough-checkbox"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/lab/color-swatch"
import { SWATCHES } from "@/components/lab/rough-tiles"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

interface ControlsLabProps {
  index: number
  props?: Record<string, unknown>
}

const pct = (v: number) => `${Math.round(v)}%`
const deg = (v: number) => `${Math.round(v)}°`

// A vivid rainbow for the spectrum slider; the knob shows the live hue as a lens
// (this is the colour-face knob whose ink outline must stay visible in dark mode).
const HUE_STOPS = Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} 85% 60%)`)
const hueColor = (h: number) => `hsl(${((h % 360) + 360) % 360} 85% 60%)`

// A small picker set: <ColorPicker ink> prepends the ink swatch, so 11 colours
// keep the grid a full 2×6 (ink + 11 = 12).
const PICKER_SWATCHES = SWATCHES.slice(0, 11)

// The semantic --color-* tokens are resolved ONCE at :root (index.css @theme
// inline maps e.g. --color-background: var(--bg)), so a direct var(--color-*)
// reference does NOT flip inside a nested [data-theme] subtree — only the raw
// --bg/--text/… tokens do. Tailwind utilities already inline the raw tokens, but
// a few components read the --color-* vars directly (the slider knob's base fill
// & ink face). Rebind those to the raw tokens so they flip with the panel, and
// point --lab-surface at the panel background so the knob base masks correctly.
const THEME_SCOPE: CSSProperties = {
  "--lab-surface": "var(--bg)",
  "--color-background": "var(--bg)",
  "--color-foreground": "var(--text)",
  "--color-muted-foreground": "var(--text-muted)",
  "--color-border": "var(--border)",
  "--color-ring": "var(--text)",
} as CSSProperties

/** A labelled group of related controls. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

/**
 * A self-contained theme swatch: forces its subtree to `light` or `dark` via the
 * `data-theme` attribute (tokens.css scopes every semantic token to it — incl. a
 * `[data-theme="light"]` block added for exactly this), then paints that theme's
 * real page background so the controls sit on the true surface, regardless of the
 * page's own theme.
 */
function ThemePanel({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  const Icon = theme === "light" ? Sun : Moon
  return (
    <div
      data-theme={theme}
      style={THEME_SCOPE}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-background p-5 text-foreground sm:p-6"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {theme}
      </div>
      {children}
    </div>
  )
}

/**
 * ControlsLab — a component playground. Every interactive control is rendered on
 * a LIGHT and a DARK background side by side (both bound to shared state) so a
 * single tweak is verified in both themes at once — independent of the page's own
 * theme. Start here when refining any control's look.
 */
export function ControlsLab({ index }: ControlsLabProps) {
  const [slider, setSlider] = useState(60)
  const [hue, setHue] = useState(48)
  const [enabled, setEnabled] = useState(true)
  const [loop, setLoop] = useState(false)
  const [colorIndex, setColorIndex] = useState(2)
  const [bright, setBright] = useState(75)
  const [level, setLevel] = useState(3)
  const [chunkyHue, setChunkyHue] = useState(210)
  const [hueStep, setHueStep] = useState(180)
  const [thick, setThick] = useState(60)
  const [thickHue, setThickHue] = useState(200)

  // Rendered once per panel (fresh instances → unique clip/gradient ids), all
  // bound to the shared state above so both themes move together.
  const controls = () => (
    <>
      <Section title="Sliders">
        <RoughSlider label="Plain" value={slider} min={0} max={100} onChange={setSlider} format={pct} seed={11} />
        <RoughSlider
          label="Spectrum"
          value={hue}
          min={0}
          max={360}
          onChange={setHue}
          format={deg}
          seed={12}
          gradient={HUE_STOPS}
          thumbColor={hueColor(hue)}
        />
      </Section>

      <Section title="Chunky sliders">
        <RoughChunkySlider label="Brightness" value={bright} min={0} max={100} onChange={setBright} format={pct} seed={301} />
        <RoughChunkySlider label="Level" value={level} min={0} max={6} onChange={setLevel} seed={302} stepper />
        <RoughChunkySlider
          label="Spectrum"
          value={chunkyHue}
          min={0}
          max={360}
          onChange={setChunkyHue}
          format={deg}
          seed={303}
          gradient={HUE_STOPS}
        />
        <RoughChunkySlider
          label="Spectrum steps"
          value={hueStep}
          min={0}
          max={360}
          step={60}
          onChange={setHueStep}
          format={deg}
          seed={304}
          gradient={HUE_STOPS}
          stepper
        />
      </Section>

      <Section title="Thick rail">
        <RoughSlider label="Plain" value={thick} min={0} max={100} onChange={setThick} format={pct} seed={13} railWidth={20} />
        <RoughSlider
          label="Spectrum"
          value={thickHue}
          min={0}
          max={360}
          onChange={setThickHue}
          format={deg}
          seed={14}
          gradient={HUE_STOPS}
          thumbColor={hueColor(thickHue)}
          railWidth={20}
        />
      </Section>

      <Section title="Checkboxes">
        <RoughCheckbox label="Enabled" checked={enabled} onChange={setEnabled} seed={31} />
        <RoughCheckbox label="Loop the frames" checked={loop} onChange={setLoop} seed={32} />
      </Section>

      <Section title="Links">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {["GitHub", "LinkedIn", "Email"].map((label) => (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-base font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline"
            >
              {label}
            </a>
          ))}
        </div>
        <JustifiedParagraph className="text-sm text-muted-foreground">
          An{" "}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-foreground/80 underline underline-offset-4 transition-colors duration-150 hover:text-foreground"
          >
            inline link
          </a>{" "}
          inside prose.
        </JustifiedParagraph>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </Section>

      <Section title="Swatches">
        <ColorPicker
          swatches={PICKER_SWATCHES}
          value={colorIndex}
          onChange={setColorIndex}
          label="Colour"
          cols="grid-cols-6"
          ink
        />
      </Section>

      <Separator seed={7} />
    </>
  )

  return (
    <div className="flex w-full flex-col gap-6">
      <FadeInUp i={index}>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">Controls</h2>
          <JustifiedParagraph className="max-w-2xl text-sm text-muted-foreground">
            Every control on a light and a dark background, side by side. Tweak once and check both
            themes at a glance — the panels share state and stay independent of the page theme.
          </JustifiedParagraph>
        </div>
      </FadeInUp>

      <FadeInUp i={index + 1}>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <ThemePanel theme="light">{controls()}</ThemePanel>
          <ThemePanel theme="dark">{controls()}</ThemePanel>
        </div>
      </FadeInUp>
    </div>
  )
}
