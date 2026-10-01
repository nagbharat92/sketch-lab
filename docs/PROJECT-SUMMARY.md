# Sketch Lab

Last updated: October 1, 2026.

## Purpose

A collection of interactive experiments in hand-drawn interfaces, by Bharat Nag. The site explores sketchy ink, typography, colour, motion, blooms and controls rather than presenting a personal portfolio.

## Current experience

- Home: a centered introduction and eight visual previews linking to the labs, with no Explore menu.
- Explore: available on lab pages and Blank, with flat lab navigation followed by Utilities.
- Labs: Strokes, Type, Colour, Motion, Bloom, Controls, Wobble and Seattle.
- Blank: an empty canvas for zoomed-in recordings of the Explore button and tooltip.
- Credits: Home retains the note about experiments with AI. The drawer uses a compact Seattle signature: animated Needle and drizzle, static skyline, a red heart credit and stacked X/GitHub profile links, followed by source and theme controls. It animates only while the drawer is open.
- Identity: Sketch Lab browser title, description and a sketchy Bloom favicon.

The personal biography, social-links row, email-copy interaction and Browser Notifications case study have been removed. Historical portfolio documents are under `docs/archive/`.

## Architecture

React 19 and TypeScript with Vite, Tailwind CSS v4, Radix UI, roughjs and Framer Motion.

- `plugins/content-plugin.js` turns Markdown entries into the `virtual:content-pages` module.
- `src/data/content/` contains the eight lab entries, with stable page IDs and explicit ordering.
- `src/data/pages.ts` composes Home, generated lab pages and Utilities into navigation data.
- `FolderTreeProvider` owns hash-based page selection; the Explore drawer closes on navigation.
- `Canvas` and `ProjectCanvas` render typed content blocks. Pages use a 400ms CSS crossfade, with a gentle 600ms transform-only content entrance; Framer Motion only manages outgoing page lifetime.
- `LabHome` builds previews from the generated lab list. Custom blocks register the interactive labs.
- Shared drawing helpers, controls and animation settings remain reusable.
- `JustifiedParagraph` uses `@kitlangton/justice` for paragraph-wide fitting throughout prose. Exact DOM measurements are cached by text and typography, with font-aware and responsive reflow. Centered, rich, non-LTR/CJK and unsuitable narrow text retain native wrapping, with links, emphasis and source copying preserved.
- Theme colours live in `src/tokens.css`; layout and interaction styles live in `src/index.css`.

## Local development

Local folder: `/Users/bharatnag/Documents/SideProjects/sketch-lab`.

Run `npm run dev` and open `http://localhost:5190/`. Blank is at `#/blank`. The development server uses a strict port and hot reload.

Existing validation commands: `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

## Migration status

The local conversion was reviewed and approved for publication on September 30, 2026. The existing lab refinements are included.

- Repository: [nagbharat92/sketch-lab](https://github.com/nagbharat92/sketch-lab), renamed from `portfolio` with its history retained.
- Live site: [nagbharat92.github.io/sketch-lab](https://nagbharat92.github.io/sketch-lab/).
- Git remote: `git@github.com:nagbharat92/sketch-lab.git`.
- Production base: `/sketch-lab/`.
- Publishing: the existing GitHub Actions workflow builds and deploys pushes to `main`.

Use the new live URL. The old GitHub Pages URL must not be assumed to redirect after the rename.
