# Isometric Portfolio: Vision + MVP

## Vision

The home page is a scrollable isometric world, not a webpage. The visitor moves across a quiet 2D landscape and discovers interactive elements scattered through it: a windmill, a house, paths, fields. Each carries a little overlaid text and a few navigation options in soft white type, so the world itself becomes the menu.

The world is alive but unhurried. Birds cross occasionally, water ripples, trees sway, windmill blades turn, ambient sound sits underneath. Nothing demands attention. Reference aesthetic: Ryo Takemasa's aerial fields, calm and textured, Teenage Engineering levels of restraint.

Everything in that world will sit on a grid. So the grid comes first. It is the visible scaffold, drawn as iso lines, exactly like architectural blueprint art where objects rest on a lightly drawn ground plane. We build the grid as a real foundation now, then place objects, motion, and sound on top of it later. Nothing in this MVP gets thrown away.

## Architecture (the foundation, build once)

The scene is a coordinate system, not a picture. Every tile lives at an integer coordinate `(tileX, tileY)`. Screen position comes from a fixed projection:

```
screenX = (tileX - tileY) * (tileWidth / 2)
screenY = (tileX + tileY) * (tileHeight / 2)
```

Depth sorting later falls out of `tileX + tileY` (higher sum draws in front). For the MVP there is nothing to sort yet, but the formula and its inverse (screen pixel back to tile coordinate) are the core of everything that follows, so we get them right in isolation now.

Rendering target: **a single HTML canvas element**, plain JS, no framework. One canvas scales cleanly to the eventual living world (hundreds of tiles plus birds and ripples) where a grid of DOM nodes would not. We pay a small cost now (hover detection and fade are hand-driven rather than free CSS) in exchange for a foundation that holds.

Layer order, drawn every frame, back to front:
1. Grid lines (the static iso field)
2. Hover fill (the one feature in this MVP)
3. Edge fade mask (a separate top overlay everything passes under, so future birds and ripples fade at the edges too, never pop)

There is a single animation loop (`requestAnimationFrame`) from the start. The MVP only animates the hover fade, but the loop is the home for all future motion.

## MVP definition

A static page (no scroll yet) showing an isometric grid that responds to hover.

**In scope:**
- A fixed iso grid of **20 x 20 tiles**, centered in the viewport. Fixed tile count, not viewport-filling, so the edge fade stays predictable and the math stays clean. The window can be any size; the grid is a known object sitting inside it.
- Tiles drawn as **iso line work**: thin light-grey rhombus outlines on a white background. Blueprint feel.
- **Hover fills the rhombus tile** under the cursor with a light grey. This is the unit an object will later sit on, and the hover already exercises the screen-to-tile inverse we will need for clicking objects. Free practice.
- **Smooth asymmetric fade**: hover-in ~150ms ease-out, hover-out ~250ms ease-out. Faster in reads responsive, slower out reads calm. The asymmetry is deliberate craft, not an accident.
- **Radial edge fade**: the grid dissolves toward the edges of the canvas via a mask drawn as the top layer.
- Single `requestAnimationFrame` loop driving the fade.
- Correct screen-to-tile hit testing (the inverse projection), verified by the hover landing on the right tile at any window size.

**Out of scope (later, on this same foundation):**
- Scrolling / panning the world
- Any placed objects (windmill, house, trees)
- Sprites or AI-generated art
- Ambient motion (birds, ripples, sway)
- Sound
- Click navigation and text overlays

## First action

Build the grid and the hover. One canvas, the projection formula and its inverse, the `requestAnimationFrame` loop, line-drawn tiles, hover fill with the asymmetric fade, radial edge mask on top. Validate by hovering: the correct tile should fill at any window size, and the fade should feel calm leaving, crisp arriving.

## What to confirm before building

Report the current portfolio site stack first. Is it static HTML, or is there a framework and build step? The canvas approach drops into either, but the answer decides where this file lives and how it mounts. State the stack, then confirm the canvas grid fits cleanly before writing code.
