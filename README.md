# Sketch Lab

Experiments in hand-drawn interfaces. A place to play with sketchy strokes, typography, colour, motion and controls.

Try Sketch Lab: [https://nagbharat92.github.io/sketch-lab/](https://nagbharat92.github.io/sketch-lab/).

## Labs

Strokes, Type, Colour, Motion, Bloom, Controls, Wobble and Seattle. Each lab exposes live controls for exploring its visual style. The home page has a centered introduction and lab previews, without an Explore menu. The Explore drawer is available within the labs and on Blank for recording interactions against an empty background.

Seattle explores a personal signature: a rough-drawn Space Needle cycling through ink seeds, a quiet static skyline, and animated drizzle with tiny splashes. Its compact version appears in the drawer with a red heart credit, X/GitHub profile links and source/theme controls. Animation respects reduced motion; the drawer signature runs only while open.

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
```

## Structure

- `src/data/content/`: Markdown entries that register and order the labs.
- `src/components/blocks/custom/`: interactive lab pages and the home page.
- `src/components/lab/`: shared sketchy controls and drawing helpers.
- `src/lib/`: ink, bloom and motion settings.
- `src/tokens.css`: light/dark theme colours.
- `docs/`: current reference documents and archived portfolio plans.

React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, roughjs and Framer Motion. Hash routing works with static hosting.

## Paragraph typography

[Justice](https://justice.kitlangton.com/) fits compatible prose a whole paragraph at a time, choosing line breaks and adjusting word spacing, letter spacing and punctuation margins together.

The shared `JustifiedParagraph` component measures the actual rendered font, caches word measurements, and refits on resize or font changes. Home descriptions, lab copy, credits, captions and Markdown paragraphs all use the same component. Centered text, rich inline markup, RTL/CJK text and UI labels retain native layout. Columns requiring excessive spacing or overflow also keep native wrapping. Selection and copying preserve the source text, including nonbreaking spaces and existing hyphens.

## Source and publishing

Browse the [source repository](https://github.com/nagbharat92/sketch-lab).

GitHub Actions builds and deploys pushes to `main` through GitHub Pages. Vite uses `/sketch-lab/` as the production base. This repository was previously named `portfolio`; its history is retained.

By Bharat Nag.
