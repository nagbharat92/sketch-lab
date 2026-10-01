# Sketch Lab

Experiments in hand-drawn interfaces. A place to play with sketchy strokes, typography, colour, motion and controls.

Try Sketch Lab: [https://nagbharat92.github.io/sketch-lab/](https://nagbharat92.github.io/sketch-lab/).

## Labs

Strokes, Type, Colour, Motion, Bloom, Controls and Wobble. Each lab exposes live controls for exploring its visual style. The home page provides previews; the Explore drawer lists the labs directly. Utilities includes a Blank page for recording interactions against an empty background.

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

## Source and publishing

Browse the [source repository](https://github.com/nagbharat92/sketch-lab).

GitHub Actions builds and deploys pushes to `main` through GitHub Pages. Vite uses `/sketch-lab/` as the production base. This repository was previously named `portfolio`; its history is retained.

By Bharat Nag.
