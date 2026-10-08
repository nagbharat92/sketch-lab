/* global document, requestAnimationFrame, CSSAnimation, DOMMatrix, getComputedStyle */
// Run with the existing Playwright browser code tool on the Bloom page.
async (page, url = `${page.url().split("#")[0]}#/flower-lab`) => {
  const browser = await page.context().newPage()
  const kinds = ["flower", "monstera", "leaf", "bud", "ground", "ladybird"]
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  try {
    await browser.bringToFront()
    await browser.goto(url)
    await browser.emulateMedia({ reducedMotion: "no-preference" })
    await browser.locator('.bloom-entry[data-ready="true"]').waitFor()
    for (const [width, height] of [[1440, 960], [390, 844]]) {
      await browser.setViewportSize({ width, height })
      for (const kind of kinds) {
        await browser.keyboard.press("Escape")
        await browser.locator(".bloom-inspector").waitFor({ state: "detached" })
        await browser.locator(".bloom-artwork").evaluate((root) => {
          for (const animation of root.getAnimations({ subtree: true })) {
            if (animation instanceof CSSAnimation) animation.pause()
          }
        })
        const target = browser.locator(`.bloom-artwork [data-selectable="${kind}"]`).first()
        await target.focus()
        await target.press("Enter")
        await browser.locator(`[data-focus-artwork="${kind}"]`).waitFor()
        await browser.waitForTimeout(300)
        const initialScale = await browser.locator(".bloom-focus-layer").evaluate((node) =>
          new DOMMatrix(getComputedStyle(node).transform).a)
        for (let repeat = 0; repeat < 3; repeat++) {
          await browser.locator(".bloom-artwork").evaluate((root) => {
            for (const animation of root.getAnimations({ subtree: true })) {
              if (animation instanceof CSSAnimation) animation.pause()
            }
          })
          const frames = await browser.evaluate(() => new Promise((resolve) => {
            const frames = []
            const start = performance.now()
            const original = document.querySelector("[data-focus-artwork]").firstElementChild
            const sample = () => {
              const stage = document.querySelector(".bloom-artwork .bloom-illustration")
              const art = stage.querySelector("[data-focus-artwork]")
              const canvas = stage.querySelector(".bloom-focus-layer").getBoundingClientRect()
              const paper = art.querySelector('.bloom-halo[data-halo="selected"] .bloom-halo-paper')
              const bounds = paper.getBoundingClientRect(), center = stage.getBoundingClientRect()
              frames.push({
                dx: canvas.x + canvas.width / 2 - center.x - center.width / 2,
                dy: canvas.y + canvas.height / 2 - center.y - center.height / 2,
                artDx: bounds.x + bounds.width / 2 - center.x - center.width / 2,
                artDy: bounds.y + bounds.height / 2 - center.y - center.height / 2,
                updated: art.firstElementChild !== original,
                animating: stage.querySelector(".bloom-focus-layer").getAnimations()
                  .some((animation) => animation.playState === "running"),
                width: bounds.width,
                scale: new DOMMatrix(getComputedStyle(stage.querySelector(".bloom-focus-layer")).transform).a,
              })
              if (performance.now() - start < 900) requestAnimationFrame(sample)
              else resolve(frames)
            }
            document.querySelector(".bloom-inspector-actions button").click()
            requestAnimationFrame(sample)
          }))
          await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
          check(frames.length >= 10, "Regeneration must be sampled throughout its transition")
          check(frames.some((frame) => frame.updated), "Randomization must replace the selected drawing")
          check(frames.every((frame) => Math.abs(frame.dx) < 2 && Math.abs(frame.dy) < 2),
            `${width}px ${kind}: randomizing must swap at the stage center on every frame`)
          check(frames.filter((frame) => frame.updated)
            .every((frame) => Math.abs(frame.artDx) < 2 && Math.abs(frame.artDy) < 2),
          `${width}px ${kind}: swapped artwork must remain centered`)
          check(frames.filter((frame) => frame.updated).every((frame) => !frame.animating),
            `${width}px ${kind}: swapping must not replay position or growth animations`)
          if (kind === "monstera") {
            check(frames.every((frame) => Math.abs(frame.scale - initialScale) < 0.0001),
              "Monstera markings and age must not change the selected preview scale")
          }
        }
      }
    }
    await browser.keyboard.press("Escape")
    await browser.emulateMedia({ reducedMotion: "reduce" })
    await browser.locator('.bloom-artwork [data-selectable="monstera"]').first().focus()
    await browser.keyboard.press("Enter")
    await browser.locator('[data-focus-artwork="monstera"]').waitFor()
    const visibleSize = () => browser.locator('[data-focus-artwork="monstera"] .bloom-halo[data-halo="selected"] .bloom-halo-paper')
      .evaluate((node) => { const bounds = node.getBoundingClientRect(); return { width: bounds.width, height: bounds.height } })
    const size = await visibleSize()
    for (const markings of ["plain", "marbled", "tips", "streaks", "patches"]) {
      const option = browser.locator(`.bloom-inspector input[value="${markings}"]`)
      await option.focus()
      await option.press("Space")
      await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
      for (let age = 0; age <= 5; age++) {
        const slider = browser.getByRole("slider", { name: "Age", exact: true })
        await slider.focus()
        await slider.press("Home")
        for (let step = 0; step < age; step++) await slider.press("ArrowRight")
        await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
        const updated = await visibleSize()
        check(Math.abs(updated.width - size.width) < 1 && Math.abs(updated.height - size.height) < 1,
          `${markings}/${age}: clipping masks must not change the visible monstera size`)
      }
    }
    return { kinds, viewports: 2, centeredSwaps: 36, stableMonsteraVariations: 30 }
  } finally {
    await browser.close()
  }
}
