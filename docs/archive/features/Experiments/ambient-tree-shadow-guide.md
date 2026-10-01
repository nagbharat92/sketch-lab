# Building an Ambient "Tree-Shadow" 3D Layer for a Personal Site

**Reference site:** https://ambient-reader.vercel.app/ (by Seungmee Lee) — toggle "ambience on" and switch light/dark to see the effect.

---

## 1. What we're actually looking at

The effect looks like sunlight filtering through leaves and casting soft, drifting shadows across the page. It's tempting to assume this is a looping video or an animated PNG, but it isn't. It's a **live 3D scene** rendered on a WebGL canvas that sits over the page, and the "shadows" are *real* shadow maps cast by low-poly 3D foliage onto a flat plane.

There are three cooperating pieces:

1. **A 3D scene** — clumps of leaf-like geometry lit by angled lights that cast shadows onto a ground plane.
2. **A compositing trick** — the canvas is overlaid on the whole viewport and blended with \`mix-blend-mode: multiply\`, so only the dark shadow pixels tint the content while everything else stays invisible.
3. **Ambient audio** — two looping tracks (a day one and a night one) toggled with the theme.

The reason this approach is worth the effort over a flat image is that the shadows genuinely move in 3D. As the light angle and canopy rotation change, the dappling shifts and parallaxes the way real shade does. It also adapts to any screen size for free.

We're going to build a **lightweight** version: fewer vertices, fewer leaf instances, a smaller shadow map, and a render loop that's respectful of the CPU/GPU and battery.

---

## 2. The key design decision: keep the 3D off to one side

This is the most important thing to get right, and it's how the reference does it. **The foliage does not sit centered over your content.** In the reference scene, the camera is positioned at roughly \`[-20, 20, -30]\` looking toward \`[-8, -10, -28]\`, and every foliage cluster is placed high and to one side (positions like \`[5, 10, 8]\`, \`[5, 11, 8]\`, \`[-6, 8, 3]\`, \`[-6, 10, 3]\`). The light rakes in from an angle, so the shadows **enter from a corner and fall diagonally across the page**, thinning out toward the opposite side.

The practical payoff: your text stays in the lighter, less-cluttered region, and the shadows read as an atmospheric edge treatment rather than a busy pattern sitting on top of every word. When you build this, think of the canopy as living in *one upper corner* of the 3D world, with the light source behind/above it throwing shade across and down. You can decide which corner suits your layout — mirror the positions if your text column sits on the left vs. right.

Two levers control how much the shadows intrude on content:

- **Position the canopy away from where your body text lives.** If your article column is centered or left-aligned, push the foliage to the upper-right so shadows graze the margins.
- **Tune shadow opacity.** The reference uses a \`shadowMaterial\` whose opacity is low (~0.4) in light mode and full (1.0) in dark mode. Lower opacity = more suggestion, less obstruction. Start subtle.

Keep this open-ended: the "correct" placement depends entirely on your page's layout, so treat the numbers here as a starting frame you'll nudge by eye.

---

## 3. Architecture overview

\`\`\`
┌─────────────────────────────────────────────┐
│  Your normal page content (HTML, z-index: 0) │
│                                              │
│   ┌──────────────────────────────────────┐  │
│   │  <Canvas> overlay                    │  │
│   │  position: fixed; inset: 0;          │  │
│   │  z-index: 2; pointer-events: none;   │  │
│   │  mix-blend-mode: multiply;           │  │
│   │                                      │  │
│   │   3D scene (off to one side):        │  │
│   │    • angled directional light(s)     │  │
│   │    • low-poly leaf clusters          │  │
│   │    • invisible shadow-catcher plane  │  │
│   │    • slow sine rotation = "breeze"    │  │
│   │    • soft blur (depth of field)      │  │
│   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

+ two looping <audio> elements toggled by theme
+ an "ambience on/off" button (also unlocks audio)
\`\`\`

**Recommended stack:** React with \`@react-three/fiber\` and \`@react-three/drei\`. If your site isn't React, you can do the same thing in vanilla THREE.js — the concepts map one-to-one; you'd just write the scene graph imperatively and run your own \`requestAnimationFrame\` loop.

---

## 4. The compositing layer (the real magic)

The canvas wrapper in the reference is a fixed, full-viewport element:

\`\`\`css
.ambience-canvas {
  position: fixed;
  inset: 0;              /* top:0; left:0; width:100vw; height:100vh */
  z-index: 2;
  pointer-events: none;  /* never blocks clicks or scrolling */
  mix-blend-mode: multiply;
}
\`\`\`

\`mix-blend-mode: multiply\` is what makes shadows land *on* the content instead of behind it. Multiply keeps dark pixels and makes white/light pixels disappear (white × anything = unchanged). So we render a scene that is essentially white/empty except where shadows fall, and only those shadow regions darken the page beneath.

**Important caveat for dark mode:** multiply behaves very differently on a dark background — multiplying a dark shadow onto an already-dark page does almost nothing. That's exactly why the reference *raises* shadow opacity to full in dark mode and also swaps which lights/materials are active. Plan to test and tune both themes independently; don't assume one set of values works for both. You might even switch blend modes per theme (e.g. \`multiply\` on light, \`screen\` or a lightened overlay on dark) — worth experimenting.

---

## 5. Building the 3D scene (lightweight version)

### 5.1 The Canvas and camera

Enable shadows on the renderer, and place the camera so it looks toward the canopy from the side.

\`\`\`jsx
import { Canvas } from '@react-three/fiber'

<Canvas
  shadows
  camera={{ position: [-20, 20, -30], fov: 50 }}
  gl={{ antialias: true, alpha: true }}   // alpha:true so the canvas is transparent
  style={{ /* the fixed/overlay CSS from section 4 */ }}
>
  <Scene />
</Canvas>
\`\`\`

Point the camera at the canopy region once on mount (e.g. \`camera.lookAt(-8, -10, -28)\`), or use drei's \`<CameraControls>\`/\`<PerspectiveCamera makeDefault>\` if you want to animate the view when ambience toggles.

### 5.2 Lights that cast shadows

The shadows come from **directional lights** with \`castShadow\`, angled so they rake across the plane. Keep the shadow map small for performance.

\`\`\`jsx
<ambientLight intensity={0.6} />

<directionalLight
  castShadow
  position={[2.5, 10, 20]}
  intensity={3}
  shadow-mapSize={[512, 512]}   // lightweight: 512 instead of 1024
>
  <orthographicCamera attach="shadow-camera" args={[-30, 30, -30, 100, 0.5, 80]} />
</directionalLight>
\`\`\`

One well-placed light is often enough for a lightweight build. The reference uses two or three plus some fill point lights; add more only if the single-light look feels flat. The orthographic shadow-camera args define the shadow frustum — make it just big enough to contain your foliage, no larger (tighter frustum = crisper shadows per texel).

### 5.3 The shadow-catcher plane

A large flat plane with a \`shadowMaterial\` — invisible except where shadows land. This is what the shadows are "painted" onto.

\`\`\`jsx
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
  <planeGeometry args={[1000, 1000]} />
  <shadowMaterial transparent opacity={isDark ? 1.0 : 0.4} />
</mesh>
\`\`\`

Note the theme-driven opacity — the single most useful knob for controlling how much the shadows touch your content.

### 5.4 Low-poly foliage (where we cut vertices)

This is where "lightweight" happens. The reference builds leaf clumps from many small, very low-detail partial spheres (geometry args roughly \`[7, 6, 6, ...]\` — radius 7, only 6 width/height segments, so they're chunky and cheap) with a simple \`meshLambertMaterial\`. Each clump scatters a \`number\` of leaves via \`Math.random()\`, and it placed 200–300 leaves per clump across four clumps.

For a lightweight build, **cut both the segment count and the instance count**, and use \`<Instances>\`/\`<Instance>\` (drei) so all leaves in a clump are a single draw call:

\`\`\`jsx
import { Instances, Instance } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function LeafClump({ number = 60, position = [0, 0, 0] }) {
  const group = useRef()

  // scatter leaves once
  const leaves = useMemo(
    () => Array.from({ length: number }, () => ({
      pos: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      ],
      scale: 0.5 + Math.random() * 0.8,
    })),
    [number]
  )

  // the "breeze": slow sine oscillation of the whole clump
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() / 10) * Math.PI
    }
  })

  return (
    <group ref={group} position={position}>
      <Instances castShadow>
        {/* low-poly sphere: small segment counts keep vertex count tiny */}
        <sphereGeometry args={[7, 6, 6]} />
        <meshLambertMaterial color="white" />
        {leaves.map((leaf, i) => (
          <Instance key={i} position={leaf.pos} scale={leaf.scale} />
        ))}
      </Instances>
    </group>
  )
}
\`\`\`

Then place a couple of clumps **off to one side** (section 2):

\`\`\`jsx
<group position={[0, -3.5, 0]}>
  <LeafClump position={[5, 10, 8]}  number={60} />
  <LeafClump position={[-6, 9, 3]}  number={80} />
</group>
\`\`\`

Tuning ideas (open-ended — dial these to taste and to your performance budget):

- **Vertices:** \`sphereGeometry\` segments of \`6,6\` are already low. You could go lower, or swap spheres for \`icosahedronGeometry(r, 0)\` (20 faces, very cheap) for a more faceted, stylized leaf. The leaves are only ever seen as *shadows*, so their surface detail barely matters — this is a great place to be aggressive about cutting polys.
- **Instance count:** 60–80 per clump instead of 200–300 is usually plenty for a convincing dapple. Start low; add only if the shadow looks too sparse.
- **Two clumps instead of four.** More clumps = denser shadow but more cost.

### 5.5 The animation ("breeze")

Two layers, both cheap:

1. **Per-clump sine rotation** (shown above): \`rotation.y = sin(t / 10) * π\`. The \`/10\` makes it very slow — a full sweep takes ~60+ seconds, so it reads as a lazy drift rather than spinning. Adjust the divisor for wind speed and the multiplier for sweep amount.
2. **Optional light-angle animation.** Wrap the light(s) in a group and gently animate its rotation, or spring it to a new angle when the theme toggles, so the "sun" shifts. Libraries like \`@react-spring/three\` make the theme transition smooth.

### 5.6 Softness: blur and fog

Hard-edged CG shadows look artificial. The reference softens them two ways:

- **Depth of field** via drei/postprocessing (\`<DepthOfField>\` with something like \`focusDistance\`, \`bokehScale ~ 10\`, low \`samples\` for perf). This gives the gauzy, out-of-focus shadow edges.
- **Scene fog** (\`<fog args={['black', 0, 40]}>\`) to fade distant geometry.

For a lightweight build, postprocessing is the most expensive optional piece. Alternatives that are cheaper: use PCF soft shadow maps (\`gl.shadowMap.type = THREE.PCFSoftShadowMap\`) and simply place the light farther from the foliage (softer penumbra), skipping the full DoF pass. Decide based on your performance budget — this is a good "add if it still feels crisp" item.

---

## 6. The ambient audio

Two looping tracks, one per theme, hidden and toggled by the ambience/theme state. In the reference they're plain \`<audio loop>\` elements with \`volume = 0.5\`, played/paused in a React effect.

\`\`\`jsx
const dayAudio = useRef()
const nightAudio = useRef()

useEffect(() => {
  const day = dayAudio.current
  const night = nightAudio.current
  if (!day || !night) return
  day.volume = 0.5
  night.volume = 0.5

  if (ambienceOn) {
    if (isDark) { night.play(); day.pause() }
    else        { day.play();   night.pause() }
  } else {
    day.pause(); night.pause()
  }
}, [ambienceOn, isDark])
\`\`\`

\`\`\`jsx
<audio ref={dayAudio}   loop src="/audio/day-ambience.mp3"   style={{ display: 'none' }} />
<audio ref={nightAudio} loop src="/audio/night-ambience.mp3" style={{ display: 'none' }} />
\`\`\`

**Two gotchas:**

1. **Autoplay is blocked** until a user gesture. That's why there's an explicit "ambience on" button — the click both starts the effect *and* satisfies the browser's audio-unlock requirement. Always gate audio behind a real click/tap.
2. **Always provide a mute/off control.** Unexpected sound is jarring; make it obviously toggleable and remember the user's choice (e.g. \`localStorage\`).

### On the reference's audio files

The reference site's two clips are served at:

- Day / light: \`https://ambient-reader.vercel.app/whitenoise.mp3\`
- Night / dark: \`https://ambient-reader.vercel.app/nightnoise.mp3\`

These are the author's own assets, so use them **for reference/listening only** — don't ship someone else's audio on a public site without permission. For your own build, grab properly licensed ambient loops from a source that authorizes reuse, e.g.:

- **Freesound.org** — filter by Creative Commons / CC0 license (search "forest ambience", "gentle breeze", "wind leaves", "pool water").
- **Pixabay Sound Effects** (pixabay.com/sound-effects) — royalty-free, no attribution required.
- **Zapsplat**, **BBC Sound Effects** (bbcsfx.acropolis.org.uk), or **YouTube Audio Library** — check each one's license terms.

Look for seamless loops (or loop-friendly clips you trim), keep them small (mono, modest bitrate — ambient noise doesn't need high fidelity), and consider fading volume in/out on toggle for polish.

---

## 7. Performance & accessibility checklist

Bake these in from the start:

- **\`prefers-reduced-motion\`:** if the user prefers reduced motion, stop the sine animation (render a static frame) or skip the effect entirely.
- **Pause when hidden:** stop the render loop and audio on \`document.visibilitychange\` when the tab is backgrounded — saves battery and CPU.
- **Cap the pixel ratio:** \`gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))\` so retina screens don't render 4× the pixels.
- **Small shadow map** (512, maybe 1024 only if it looks jagged) and a **tight shadow frustum**.
- **Low instance/segment counts** as covered above.
- **\`pointer-events: none\`** on the overlay, always.
- **Off by default**, with the state persisted, so first-time visitors aren't surprised and the page stays fast until they opt in.
- **Test both themes** for shadow visibility — the multiply blend makes dark mode a separate tuning problem.

---

## 8. Suggested build order

1. Get a fixed, transparent \`<Canvas>\` overlay rendering *anything* (a single shadow) with the multiply blend and \`pointer-events: none\`. Confirm shadows appear over your text.
2. Add one angled directional light + the shadow-catcher plane + one low-poly leaf clump, positioned off to one side. Get the shadows entering from a corner.
3. Add the slow sine rotation. Tune speed.
4. Add the second clump, tune density/opacity, add softening (soft shadow maps or DoF).
5. Wire the "ambience on" button, then the theme-swapped looping audio with a mute control.
6. Add the accessibility/performance guards.
7. Tune everything by eye against *your* real content and layout.

---

## 9. Open questions to decide as you build

These are intentionally left for you and your layout:

- Which corner should the shade fall from, and how far should it reach across the text?
- Faceted (icosahedron) vs. rounded (sphere) leaves — which suits your site's aesthetic?
- Do you want the light angle to *change* between light/dark mode (like sun vs. moon), or just swap opacity/audio?
- One canopy, or a second faint layer at a different speed for depth?
- Full depth-of-field blur, or the cheaper soft-shadow-map route?

Everything above is a working frame, not a fixed recipe — the reference itself is described by its author as a quick prototype, and the fun is in tuning the "nice-to-have" feel to your own pages.

---

**Reference to keep open while building:** https://ambient-reader.vercel.app/
