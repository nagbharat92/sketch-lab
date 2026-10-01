# Isometric Portfolio Home Page: Concept Brief

## What I want to build

A scrollable isometric landscape as the home page of my portfolio. It should feel like a small, quiet game world rather than a website. The visitor scrolls across a 2D scene and discovers interactive elements scattered through it: a windmill, a house, paths, fields. Each element carries a bit of overlaid text and a few navigation options in soft white type, so the world itself becomes the menu.

Reference aesthetic: Ryo Takemasa's aerial field illustrations, plus the painterly high-angle landscape style in the attached images. Calm, textured, slightly nostalgic. Teenage Engineering levels of restraint.

## The feel

The world is alive but unhurried:
- Birds cross the scene occasionally
- Water ripples
- Trees sway gently
- Windmill blades turn
- Ambient sound underneath it all

Nothing demands attention. The motion is ambient, not animated-for-the-sake-of-it.

## Hard constraints

- **2D only.** No 3D, no WebGL-heavy engines. Plain canvas or DOM/CSS.
- **Super lightweight.** Fast first paint, small payload, no jank on scroll.
- **AI-generated graphics**, likely as sprite sheets or pre-composed scene art.
- No framework dependency unless the existing site already brings one.

## How I'm thinking about the architecture

### 1. The scene is a coordinate system, not a picture

True isometric projection. Every object lives at a tile coordinate, and screen position comes from a fixed formula:

```
screenX = (tileX - tileY) * (tileWidth / 2)
screenY = (tileX + tileY) * (tileHeight / 2)
```

Depth sorting (what draws in front of what) falls out of `tileX + tileY`: higher sum draws later, so it sits in front. The whole scene becomes a list of objects with coordinates, drawn back to front. The complexity collapses into something tractable.

### 2. Static world vs. living layer (the key separation)

Two kinds of content that must stay separate:

- **Static world:** ground tiles, windmill body, house, paths. Never changes. Render once, possibly as a single pre-composed image or baked tiles. Zero per-frame cost.
- **Living layer:** swaying tree, turning blade, the periodic bird, water ripple. Tiny, isolated, cheap precisely because it is decoupled from the static mass. A bird is ~200px moving across the screen. A swaying tree is one sprite with a gentle skew.

This is a kernel/presentation seam. Static world is the stable foundation; ambient life is the swappable surface. Keeps the whole thing light.

### 3. A fork I need to resolve

The reference images are not true isometric. They are a high-angle oblique (tilted near-top-down). That painterly angle is beautiful but does NOT tile cleanly the way true iso does.

The choice:
- **True iso:** real tile grid, scrollable, easy depth sorting, extensible. Best for the interactive home page.
- **Painterly diorama:** one hand-composed scene, gorgeous, but no real grid and harder to extend.

Current lean: true iso for the interactive home page, reserve the painterly angle for a single hero illustration.

## What I need VS Code (Copilot) to assess

1. Can my **current portfolio site** support this, or does it need restructuring? What is the current stack, and does it fit a canvas-based interactive scene?
2. Is plain canvas the right rendering choice here, or does the existing setup push toward DOM/CSS sprites?
3. What is the smallest first slice to prove the idea? Proposed first action: a ~40-line plain-canvas iso grid that renders colored rhombus tiles and logs which tile I click (validates the projection formula and the screen-to-tile inverse before any art or sound).
4. Where would AI-generated sprite sheets live, and how should they be loaded and atlased for the living layer?
5. How do the text-and-navigation overlays attach to world objects without breaking the lightweight goal?

## First action (do this before art or sound)

Build the dead-simplest iso grid in plain canvas: colored rhombus tiles, the projection formula above, and a click test that returns the correct tile coordinate. ~40 lines, no assets. Resolve the coordinate math in isolation before layering on sprites and a Web Audio context.
