# Sketch Lab

Last updated: September 30, 2026.

## Purpose

A collection of interactive experiments in hand-drawn interfaces, by Bharat Nag. The site explores sketchy ink, typography, colour, motion, blooms and controls rather than presenting a personal portfolio.

## Current experience

- Home: a short introduction and seven visual previews linking to the labs.
- Explore: flat lab navigation, followed by Utilities containing Blank.
- Labs: Strokes, Type, Colour, Motion, Bloom, Controls and Wobble. Their existing controls, styling and interactions are preserved.
- Blank: an empty canvas for zoomed-in recordings of the Explore button and tooltip.
- Footer: small creator credit, repository link and theme switch.
- Identity: Sketch Lab browser title, description and a sketchy Bloom favicon.

The personal biography, social-links row, email-copy interaction and Browser Notifications case study have been removed. Historical portfolio documents are under `docs/archive/`.

## Architecture

React 19 and TypeScript with Vite, Tailwind CSS v4, Radix UI, roughjs and Framer Motion.

- `plugins/content-plugin.js` turns Markdown entries into the `virtual:content-pages` module.
- `src/data/content/` contains the seven lab entries, with stable page IDs and explicit ordering.
- `src/data/pages.ts` composes Home, generated lab pages and Utilities into navigation data.
- `FolderTreeProvider` owns hash-based page selection; the Explore drawer closes on navigation.
- `Canvas` and `ProjectCanvas` render typed content blocks and handle page transitions.
- `LabHome` builds previews from the generated lab list. Custom blocks register the interactive labs.
- Shared drawing helpers, controls and animation settings remain reusable.
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
