# Sketch Lab

Last updated: October 2, 2026.

## Purpose

A collection of interactive experiments in hand-drawn interfaces, by Bharat Nag. The site explores sketchy ink, typography, colour, motion, blooms and controls rather than presenting a personal portfolio.

## Current experience

- Home: a personal introduction, a Bloom invitation and eight visual previews linking to the labs, with no Explore menu.
- Explore: available on lab pages. A Bloom-branded Sketch Lab header introduces the project; illustrated rows include Home and short lab descriptions, and animate only the selected preview.
- Labs: Strokes, Type, Colour, Motion, Bloom, Controls, Wobble and Seattle.
- Credits: Home and the Seattle lab share the Seattle signature: animated Needle and drizzle, static skyline, a red heart credit and inline X/GitHub profile links. The drawer uses a 96px tightly framed illustration on the left, a single-line heart credit and centered X/GitHub/theme icons with tooltips. The theme icon switches between moon and sun. Drawer header/footer use matching 20px vertical padding; animation runs only while open. Home retains the project source link.
- Identity: Sketch Lab browser title, description and a sketchy Bloom favicon.
- Bloom: a flat 2D, seeded garden of 4-6 flowers and 4-5 monsteras, with role-based proportions, tapered veins, variegation, original small buds, parametric ground details and gentle ink motion. Two personal paragraphs with a custom slab-serif drop cap sit beside the garden; Grow me a garden is its only control.

The personal biography, social-links row, email-copy interaction and Browser Notifications case study have been removed. Historical portfolio documents are under `docs/archive/`.

## Architecture

React 19 and TypeScript with Vite, Tailwind CSS v4, Radix UI, roughjs and Framer Motion.

- `plugins/content-plugin.js` turns Markdown entries into the `virtual:content-pages` module.
- `src/data/content/` contains the eight lab entries, with stable page IDs and explicit ordering.
- `src/data/pages.ts` composes Home and generated lab pages into navigation data.
- `FolderTreeProvider` owns hash-based page selection; the Explore drawer closes on navigation.
- `Canvas` and `ProjectCanvas` render typed content blocks. Pages use a 400ms CSS crossfade, with a gentle 600ms transform-only content entrance; Framer Motion only manages outgoing page lifetime.
- `LabHome` builds previews from the generated lab list. Custom blocks register the interactive labs.
- Shared drawing helpers, controls and animation settings remain reusable.
- `JustifiedParagraph` uses `@kitlangton/justice` for paragraph-wide fitting throughout prose. Exact DOM measurements are cached by text and typography, with font-aware and responsive reflow. Centered, rich, non-LTR/CJK and unsuitable narrow text retain native wrapping, with links, emphasis and source copying preserved.
- Theme colours live in `src/tokens.css`; layout and interaction styles live in `src/index.css`.
- Bloom separates typed design tokens, cast generation, pure botanical geometry, atomic scene state and React rendering. Its CSS uses scoped presentation tokens and shares internal scene dimensions with TypeScript. Ink frames never regenerate the cast or anatomy.
- Direct Bloom startup prepares the body font before mounting React so Justice-fitted text and artwork appear together. Drop-cap fitting uses per-line measures; other paragraph callers retain their existing defaults.

## Local development

Local folder: `/Users/bharatnag/Documents/SideProjects/sketch-lab`.

Run `npm run dev` and open `http://localhost:5190/`. The development server uses a strict port and hot reload.

Use Node 22.12 or newer. Existing validation commands: `npm run build`, `npm run lint`, `npx tsc --noEmit`, and `npm run test:garden`. The deployment workflow runs these before publishing.

## Migration status

The local conversion was reviewed and approved for publication on September 30, 2026. The existing lab refinements are included.

- Repository: [nagbharat92/sketch-lab](https://github.com/nagbharat92/sketch-lab), renamed from `portfolio` with its history retained.
- Live site: [nagbharat92.github.io/sketch-lab](https://nagbharat92.github.io/sketch-lab/).
- Git remote: `git@github.com:nagbharat92/sketch-lab.git`.
- Production base: `/sketch-lab/`.
- Publishing: the existing GitHub Actions workflow builds and deploys pushes to `main`.

Use the new live URL. The old GitHub Pages URL must not be assumed to redirect after the rename.
