# Sketch Lab

Experiments in hand-drawn interfaces. A place to play with sketchy strokes, typography, colour, motion and controls.

Try Sketch Lab: [https://nagbharat92.github.io/sketch-lab/](https://nagbharat92.github.io/sketch-lab/).

## Labs

Strokes, Type, Colour, Motion, Bloom, Controls, Wobble and Seattle. Most labs expose live controls for exploring their visual style; Bloom is an interactive magazine spread with a single garden-generation button. Home has a personal introduction, a Bloom invitation and lab previews, without an Explore menu. Within the labs, the Explore drawer provides illustrated navigation and short descriptions, including a Home row.

Seattle explores a personal signature: a rough-drawn Space Needle cycling through ink seeds, a quiet static skyline, and animated drizzle with tiny splashes. Its compact version appears in the drawer with a red heart credit, X/GitHub profile links and source/theme controls. Animation respects reduced motion; the drawer signature runs only while open.

Bloom creates a seeded cast of 4-6 flowers and 4-5 monsteras. King, general, soldier and commoner roles link size, stem height/thickness and leaf maturity within bounded ranges. Planting zones, crown spacing and a foliage budget keep the composition readable. Monsteras vary in fullness, splits and paired, graduated or offset fenestrations. A personal introduction with a drawn slab-serif initial makes the page an illustrated editorial spread; Grow me a garden is its only garden control and remixes the entire cast.

Generated monsteras support the flowers as an asymmetric anchor, smaller counterweight, one or two connectors and a young basal accent. The flower-aware planner protects the main crown, staggers grouped roots and balances partial leaf overlap; larger blades render behind smaller ones. This planning runs only when generating a garden, never when tending an individual plant, and preserves the approved flat-2D leaf artwork.

The planner compares whole-garden arrangements and revisits earlier placements once the entire cast is present. It accounts for foreground flower/leaf occlusion, readable monstera silhouettes, pairwise overlap, visual mass and canopy height spread. Foliage uses uniform supporting-scale reductions rather than perspective distortion, and connectors can rise into the middle of the garden instead of collecting at the base.

The soil bed is capped at 360 scene units and grows symmetrically from the bottom center. The main flower always roots at that center; companion roots stay inset within the compact bed without moving their crowns. Regenerating changes the plants, not the garden's base anchor.

Regular leaves keep a bounded upright lean and vine leaves follow that rhythm. Monsteras retain their approved hanging orientation and inward/outward facing relationships. Leaf anatomy and standalone study poses are unchanged.

The shared site canvas expands to 1360px with responsive outer gutters, while prose retains its own reading-width limit. Bloom gives its controls a wider left column, full-width 64px-tall actions and a more generous vertical rhythm, without reducing artwork or preview sizes.

Randomizing a selected plant swaps its drawing immediately at the stage center, without a growth or position animation. Selection entry and dismissal still follow the plant's garden position; resizing keeps the selected stage centered without replaying that entry flight.

Selected framing uses the visible sticker silhouette rather than SVG bounds inflated by clipped markings. It retains the preview zoom across swaps unless larger geometry or a viewport change needs a refit; living motion pivots around the selected silhouette's center. Monstera age and marking changes keep the same visible size.

Startup shows only the Bloom loader. The garden and prose prepare in a transparent, inert container so layout can be measured, then become visible together only after artwork and both paragraphs are ready.

## Local development

```sh
npm ci
npm run dev
```

Open `http://localhost:5190/`. The port is fixed; Vite reports an error if it is already occupied. Changes reload automatically.

```sh
npm run build
npm run lint
npx tsc --noEmit
npm run test:garden
```

Use Node 22.12 or newer. The dependency-free garden tests use Node's built-in test runner and TypeScript stripping. They cover 2,000 casts, fixed anatomy snapshots, original bud sizes, non-repeating palettes and independence between scene generation and animated ink.

Bloom's historical Surprise feedback is shared by the garden and inspector buttons:
the 160ms squeeze, 2px dip and rebound, plus hover outline/text boil. Regeneration
uses a React transition so preparing artwork does not block that feedback.
For browser regressions, open local Bloom in Playwright and run
`tests/bloom-interactions.mjs` through its run-code tool. The script uses the open
page's origin and needs no extra dependencies. It exercises real pointer targets,
all six local Surprise actions, measured button motion, rapid clicks, keyboard
activation, unchanged neighbours, garden sway, ladybird jokes/antennae and reduced motion.

Selection uses a pastel paper-cut rim with a lightly chalked edge, not a dark
outline. It expands on hover, broadens on selection, and contracts/fades on exit.
The silhouette mask keeps colour outside the artwork and unites overlapping
flower petals. The browser regression also checks the complete rim lifecycle,
unchanged artwork, pointer transparency and immediate reduced-motion states.

## Structure

- `src/data/content/`: Markdown entries that register and order the labs.
- `src/components/blocks/custom/`: interactive lab pages and the home page.
- `src/components/lab/`: shared sketchy controls and drawing helpers.
- `src/components/lab/bloom-tokens.ts`: garden pigments, role ranges, composition budgets, motion settings and the CSS scene-dimension bridge.
- `src/components/lab/bloom-garden.ts` and `bloom-geometry.ts`: pure seeded composition and botanical anatomy.
- `src/components/lab/bloom-state.ts`: atomic garden generation and unique palette allocation; `bloom-illustration.tsx` renders the scene.
- `src/lib/`: ink, bloom and motion settings.
- `src/tokens.css`: light/dark theme colours.
- `docs/`: current reference documents and archived portfolio plans.

React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, roughjs and Framer Motion. Hash routing works with static hosting.

## Paragraph typography

[Justice](https://justice.kitlangton.com/) fits compatible prose a whole paragraph at a time, choosing line breaks and adjusting word spacing, letter spacing and punctuation margins together.

The shared `JustifiedParagraph` component measures the actual rendered font, caches word measurements, and refits on resize or font changes. Home descriptions, lab copy, credits, captions and Markdown paragraphs all use the same component. Centered text, rich inline markup, RTL/CJK text and UI labels retain native layout. Columns requiring excessive spacing or overflow also keep native wrapping. Selection and copying preserve the source text, including nonbreaking spaces and existing hyphens.

Bloom opts into a two-line drop cap: Justice fits the opening lines to a narrower measure, then returns to the full column width. Its custom initial uses the same measured exclusion, without reserving extra empty lines beneath it.

Bloom opens with a compact spinning-flower title while its paragraphs and artwork prepare. Batched text measurements avoid repeated layout flushes; the garden is revealed when both paragraphs and artwork are ready, without an arbitrary minimum delay.

## Garden tokens

Bloom-specific illustration pigments intentionally stay separate from theme-dependent UI colours. Adjust `BLOOM_PIGMENTS`, `GARDEN_ROLES`, `BLOOM_COMPOSITION`, `BLOOM_VARIATION`, `BLOOM_OUTLINE` and `BLOOM_MOTION` in `bloom-tokens.ts` to tune the flat 2D garden. Seed labels and random draw order are part of the artwork's identity; changing them changes existing scenes.

Page sizing, typography and sway bounds use scoped `--bloom-*` variables in `bloom-illustration.css`. Internal scene dimensions come from `BLOOM_SCENE` through `BLOOM_SCENE_STYLE`, rather than a second set of CSS numbers. SVG path control points remain anatomy, not design tokens. Shared site ink still comes from `src/lib/ink.ts`, and ink cadence from `useBoilSeed`.

## Source and publishing

Browse the [source repository](https://github.com/nagbharat92/sketch-lab).

GitHub Actions runs lint, TypeScript and garden regressions before building and deploying pushes to `main` through GitHub Pages. Vite uses `/sketch-lab/` as the production base. This repository was previously named `portfolio`; its history is retained.

By Bharat Nag.
