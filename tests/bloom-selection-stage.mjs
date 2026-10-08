/* global document, getComputedStyle, window, Element, requestAnimationFrame, MouseEvent */

// Run with the existing Playwright browser code tool.
async (page) => {
  const browser = await page.context().newPage()
  const errors = []
  browser.on("pageerror", (error) => errors.push(error.message))
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const inspect = () => browser.evaluate(() => {
    const stage = document.querySelector(".bloom-artwork .bloom-illustration")
    const art = stage.querySelector("[data-focus-artwork]")
    const frame = stage.getBoundingClientRect()
    const bounds = art.querySelector('.bloom-halo[data-halo="selected"] .bloom-halo-paper').getBoundingClientRect()
    const ink = stage.querySelector(".bloom-context [data-petal] path[fill='none']")
    const material = stage.querySelector(".bloom-context [data-petal] path:not([fill='none'])")
    return {
      dx: bounds.x + bounds.width / 2 - frame.x - frame.width / 2,
      dy: bounds.y + bounds.height / 2 - frame.y - frame.height / 2,
      fill: getComputedStyle(material).fill,
      background: getComputedStyle(document.body).backgroundColor,
      stroke: ink ? getComputedStyle(ink).stroke : undefined,
      opacity: getComputedStyle(stage.querySelector(".bloom-context .bloom-selectable:not([data-selected])")).opacity,
      foregroundOpacity: getComputedStyle(art.querySelector(".bloom-halo")).opacity,
      foregroundPaths: [...art.querySelectorAll("path")].map((path) => path.getAttribute("d")),
      duplicateIds: [...stage.querySelectorAll("[id]")].map((element) => element.id),
      focusableCopies: art.querySelectorAll("[tabindex], [data-selectable]").length,
      sway: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    }
  })
  const centered = (result) => {
    const tolerance = result.sway ? 24 : 2
    check(Math.abs(result.dx) < tolerance && Math.abs(result.dy) < tolerance, "Selected artwork must remain centered while gently swaying")
    check(result.fill === result.background, "Surrounding petals must have flat background fill")
    check(result.opacity === "1", "The context garden must not be opacity-dimmed")
    check(result.foregroundOpacity === "1", "The selected sticker must stay opaque")
    check(result.focusableCopies === 0, "Visual focus copies must not create duplicate keyboard targets")
    check(new Set(result.duplicateIds).size === result.duplicateIds.length, "Focus definitions must not duplicate SVG IDs")
  }
  const panelFrames = (opening) => browser.evaluate((opening) => new Promise((resolve) => {
    const frames = []
    const start = performance.now()
    if (opening) {
      document.querySelector('.bloom-artwork [data-selectable="monstera"]')
        .dispatchEvent(new MouseEvent("click", { bubbles: true }))
    } else {
      document.querySelector(".bloom-inspector-actions button").focus()
      document.querySelector(".bloom-art-column")
        .dispatchEvent(new MouseEvent("click", { bubbles: true }))
    }
    const sample = () => {
      const intro = document.querySelector('[data-panel="intro"]')
      const plant = document.querySelector('[data-panel="plant"]')
      const paragraph = intro.querySelector(".bloom-story")
      frames.push({
        introOpacity: Number(getComputedStyle(intro).opacity),
        plantOpacity: plant ? Number(getComputedStyle(plant).opacity) : 0,
        introInert: intro.inert,
        plantInert: plant?.inert,
        capWidth: paragraph.querySelector(".justice-drop-cap").getBoundingClientRect().width,
        mode: paragraph.dataset.justice,
      })
      if (performance.now() - start < 320) requestAnimationFrame(sample)
      else resolve(frames)
    }
    requestAnimationFrame(sample)
  }), opening)

  try {
    await browser.bringToFront()
    await browser.setViewportSize({ width: 1440, height: 960 })
    await browser.emulateMedia({ reducedMotion: "reduce" })
    await browser.goto(`${page.url().split("#")[0]}#/flower-lab`)
    await browser.locator('.bloom-entry[data-ready="true"]').waitFor({ timeout: 60000 })
    const intro = browser.locator(".bloom-editorial .bloom-story").first()
    const introElement = await intro.elementHandle()
    const flower = browser.locator('.bloom-artwork [data-selectable="flower"]').first()
    const other = browser.locator('.bloom-artwork [data-selectable="monstera"]').first()
    const openFlower = async () => {
      await flower.focus()
      await browser.keyboard.press("Enter")
      await browser.locator('[data-focus-artwork="flower"]').waitFor()
    }
    await openFlower()
    check(await browser.getByRole("button", { name: "Done", exact: true }).count() === 0,
      "Plant panels must dismiss through the garden or Escape, without a Done button")
    check(!await intro.isVisible(), "The retained introduction must be hidden while inspecting a plant")
    check(await browser.locator('.bloom-artwork [data-selectable][tabindex="0"]').count() === 0,
      "Selected mode must remove garden targets from keyboard navigation")
    await other.dispatchEvent("pointerover")
    check(await other.locator('[data-halo="hover"]').count() === 0,
      "Other plants must not gain a hover sticker while selected")
    await other.focus()
    await browser.keyboard.press("Enter")
    check(await browser.locator('[data-focus-artwork="flower"]').count() === 1,
      "Keyboard activation must not switch the selected plant")
    await browser.locator('[data-focus-artwork="flower"]').dispatchEvent("click")
    check(await browser.locator(".bloom-inspector").count() === 1,
      "Clicking selected artwork must keep its inspector open")
    await other.dispatchEvent("click")
    check(await browser.locator(".bloom-inspector, [data-focus-artwork]").count() === 0,
      "Clicking another plant must only deselect, not select that plant")
    check(await introElement.evaluate((element) => element.isConnected && element.dataset.justice === "justified"),
      "Dismissal must reuse the measured paragraph instead of remounting its pending drop cap")
    check(await intro.isVisible(), "Dismissing the inspector must restore the introduction")
    await openFlower()
    await browser.locator(".bloom-art-column").dispatchEvent("click")
    check(await browser.locator(".bloom-inspector, [data-focus-artwork]").count() === 0,
      "Clicking blank garden space must deselect")
    await openFlower()
    await browser.locator("body").dispatchEvent("click")
    check(await browser.locator(".bloom-inspector, [data-focus-artwork]").count() === 0,
      "Clicking outside the garden must deselect")
    const kinds = ["flower", "monstera", "leaf", "bud", "ground", "ladybird"]
    for (const kind of kinds) {
      await browser.locator(`.bloom-artwork [data-selectable="${kind}"]`).first().focus()
      await browser.keyboard.press("Enter")
      await browser.locator(`[data-focus-artwork="${kind}"]`).waitFor()
      await browser.waitForTimeout(50)
      centered(await inspect())
      await browser.keyboard.press("Escape")
      check(await browser.locator("[data-focus-artwork]").count() === 0, "Reduced-motion dismissal must restore immediately")
    }
    const residentLeaf = browser.locator('.bloom-artwork [data-selectable="leaf"]:has([data-selectable="ladybird"])').first()
    await residentLeaf.focus()
    await browser.keyboard.press("Enter")
    check(await browser.locator('.bloom-focus-layer .bloom-halo[data-halo="selected"]').count() === 1,
      "A selected leaf must not give its resident ladybird another selected sticker")
    await browser.keyboard.press("Escape")
    await browser.locator('.bloom-artwork [data-selectable="monstera"]').first().focus()
    await browser.keyboard.press("Enter")
    const monstera = await inspect()
    await browser.getByRole("button", { name: "Surprise this monstera", exact: true }).click()
    await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
    await browser.waitForTimeout(100)
    const newMonstera = await inspect()
    centered(newMonstera)
    check(JSON.stringify(monstera.foregroundPaths) !== JSON.stringify(newMonstera.foregroundPaths), "Worker-prepared monstera edits must update the foreground")
    await browser.keyboard.press("Escape")
    await browser.locator('.bloom-artwork [data-role="king"][data-selectable="flower"]').focus()
    await browser.keyboard.press("Enter")
    const swatches = await browser.locator(".bloom-colour-choices").evaluate((row) => {
      const bounds = row.getBoundingClientRect()
      const scroll = row.closest(".bloom-inspector-scroll").getBoundingClientRect()
      const colors = [...row.querySelectorAll(".bloom-colour-choice span")].map((span) => span.getBoundingClientRect())
      const left = Math.min(...colors.map((color) => color.left))
      const right = Math.max(...colors.map((color) => color.right))
      return { centered: Math.abs(left + right - bounds.left - bounds.right) < 2,
        unclipped: left - 6 >= scroll.left && right + 6 <= scroll.right }
    })
    check(swatches.centered && swatches.unclipped, "Colour swatches must be centered with space for selection and focus rings")
    const before = await inspect()
    await browser.getByRole("button", { name: "Surprise this flower", exact: true }).click()
    await browser.waitForTimeout(100)
    const edited = await inspect()
    centered(edited)
    check(JSON.stringify(before.foregroundPaths) !== JSON.stringify(edited.foregroundPaths), "Flower edits must update the foreground artwork")
    check(await browser.getByRole("button", { name: "Reset", exact: true }).count() === 0, "Reset must not appear after editing")
    await browser.setViewportSize({ width: 1280, height: 800 })
    await browser.waitForTimeout(100)
    centered(await inspect())
    await browser.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"))
    centered(await inspect())
    await browser.evaluate(() => document.documentElement.setAttribute("data-theme", "light"))
    await browser.keyboard.press("Escape")
    await browser.emulateMedia({ reducedMotion: "no-preference" })
    await browser.locator('.bloom-artwork [data-selectable="leaf"]').first().focus()
    await browser.waitForTimeout(300)
    await browser.evaluate(() => {
      const original = Element.prototype.animate
      Element.prototype.animate = function (frames, options) {
        const animation = original.call(this, frames, options)
        if (this.classList.contains("bloom-focus-layer")) {
          Element.prototype.animate = original
          animation.pause()
          animation.currentTime = 0
          window.__stageMotion = animation
        }
        return animation
      }
    })
    await browser.keyboard.press("Enter")
    const entry = await browser.evaluate(() => {
      const art = document.querySelector('[data-focus-artwork] .bloom-halo[data-halo="selected"] .bloom-halo-paper').getBoundingClientRect()
      const source = document.querySelector('.bloom-context [data-selected] .bloom-hover-grow:has(> .bloom-halo[data-halo="selected"]) .bloom-halo[data-halo="selected"] .bloom-halo-paper').getBoundingClientRect()
      const layer = document.querySelector(".bloom-focus-layer")
      const transitions = document.querySelector(".bloom-artwork").getAnimations({ subtree: true })
      const result = {
        dx: art.x + art.width / 2 - source.x - source.width / 2,
        dy: art.y + art.height / 2 - source.y - source.height / 2,
        widthDifference: art.width - source.width,
        heightDifference: art.height - source.height,
        cropWidth: parseFloat(layer.style.width),
        stageWidth: layer.parentElement.getBoundingClientRect().width,
        duration: window.__stageMotion.effect.getTiming().duration,
        rimDuration: getComputedStyle(layer.parentElement).getPropertyValue("--bloom-rim-duration").trim(),
        fadeDuration: getComputedStyle(layer.parentElement).getPropertyValue("--bloom-rim-fade-duration").trim(),
        colorTransitions: transitions.filter((animation) => ["fill", "stroke"].includes(animation.transitionProperty)).length,
        filters: layer.querySelectorAll("[filter]").length,
      }
      window.__stageMotion.play()
      return result
    })
    check(Math.abs(entry.dx) < 2 && Math.abs(entry.dy) < 2
      && Math.abs(entry.widthDifference) < 2 && Math.abs(entry.heightDifference) < 2,
    "Entry must begin at the exact garden position and size, not the top-left")
    check(entry.colorTransitions === 0, "Selection must not launch per-path color animations")
    check(entry.filters === 0, "The moving foreground must not run displacement filters")
    check(entry.duration === 240 && entry.rimDuration === "240ms" && entry.fadeDuration === "240ms",
      "Zoom, return and sticker transitions must share the quick 240ms timing")
    check(entry.cropWidth < entry.stageWidth / 2, "A small leaf must not allocate a stage-sized compositing surface")
    const running = await browser.locator(".bloom-focus-layer").evaluate((element) =>
      element.getAnimations().some((animation) => animation.playState === "running"))
    check(running, "Selection must animate into the stage")
    await browser.waitForTimeout(650)
    centered(await inspect())
    const swayBefore = await browser.locator(".bloom-focus-sway").evaluate((element) => element.style.transform)
    await browser.waitForTimeout(180)
    const swayAfter = await browser.locator(".bloom-focus-sway").evaluate((element) => element.style.transform)
    check(swayBefore !== swayAfter, "The selected artwork must keep swaying")
    const phase = await browser.evaluate(() => {
      const source = document.querySelector('.bloom-context [data-selected] .bloom-hover-grow:has(> .bloom-halo[data-halo="selected"])').getScreenCTM()
      const foreground = document.querySelector("[data-focus-artwork]").getScreenCTM()
      return {
        angle: Math.atan2(foreground.b, foreground.a) - Math.atan2(source.b, source.a),
        backgroundRunning: document.querySelector(".bloom-context").getAnimations({ subtree: true })
          .some((animation) => animation.animationName === "bloom-leaf-follow-through" && animation.playState === "running"),
        animated: document.querySelector(".bloom-illustration").dataset.animated,
      }
    })
    check(phase.backgroundRunning, `The background garden must continue its sway during selection: ${JSON.stringify(phase)}`)
    check(Math.abs(phase.angle) < 0.01, "Foreground sway must match the source's live phase")
    const gustScope = await browser.evaluate(async () => {
      const root = document.querySelector(".bloom-artwork .bloom-illustration")
      const gust = root.getAnimations().find((animation) => animation.animationName === "bloom-gust")
      const time = gust.currentTime
      const playing = gust.playState === "running"
      gust.pause()
      const sample = async (progress) => {
        gust.currentTime = gust.effect.getComputedTiming().duration * progress
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        const value = getComputedStyle(root).getPropertyValue("--bloom-gust")
        const groups = [...root.querySelectorAll(".bloom-plant, .bloom-flower, .bloom-small-plant, .bloom-monstera-plant, .bloom-leaf-follow, .bloom-ground-sprig")]
        return {
          value,
          groups: groups.length,
          shared: groups.every((group) => getComputedStyle(group).getPropertyValue("--bloom-gust") === value),
          isolated: [...root.querySelectorAll("path")].every((path) => getComputedStyle(path).getPropertyValue("--bloom-gust") === "1"),
        }
      }
      const samples = [await sample(0.4), await sample(0.55)]
      gust.currentTime = time
      if (playing) gust.play()
      return samples
    })
    check(gustScope[0].value !== gustScope[1].value, "The wind clock must keep changing strength")
    check(gustScope.every((sample) => sample.groups > 0 && sample.shared),
      "Swaying groups must receive the shared wind, including newly selected artwork")
    check(gustScope.every((sample) => sample.isolated),
      "Wind updates must not inherit into individual artwork paths")
    await browser.evaluate(() => {
      for (const animation of document.querySelector(".bloom-artwork").getAnimations({ subtree: true })) {
        if (animation.animationName) animation.pause()
      }
      const original = Element.prototype.animate
      Element.prototype.animate = function (frames, options) {
        const animation = original.call(this, frames, options)
        if (this.classList.contains("bloom-focus-layer")) {
          Element.prototype.animate = original
          animation.pause()
          window.__stageMotion = animation
        }
        return animation
      }
    })
    await browser.keyboard.press("Escape")
    check(await browser.locator("[data-focus-artwork]").count() === 1, "Dismissal must retain artwork for the return animation")
    await browser.waitForTimeout(300)
    const exit = await browser.evaluate(async () => {
      const halo = document.querySelector('.bloom-focus-layer .bloom-halo[data-halo="selected"]')
      const rimMotion = halo.getAnimations({ subtree: true })
      const seek = async (time) => {
        window.__stageMotion.currentTime = time
        for (const animation of rimMotion) {
          animation.pause()
          animation.currentTime = time
        }
        await new Promise(requestAnimationFrame)
      }
      await seek(window.__stageMotion.effect.getTiming().duration / 2)
      const midOpacity = Number(getComputedStyle(halo).opacity)
      await seek(window.__stageMotion.effect.getTiming().duration - 0.01)
      const art = document.querySelector("[data-focus-artwork]").getBoundingClientRect()
      const source = document.querySelector("[data-focus-return]").getBoundingClientRect()
      const result = {
        dx: art.x + art.width / 2 - source.x - source.width / 2,
        dy: art.y + art.height / 2 - source.y - source.height / 2,
        widthDifference: art.width - source.width, heightDifference: art.height - source.height,
        midOpacity,
        independentFade: rimMotion.some((animation) =>
          animation.effect.getKeyframes().some((frame) => "opacity" in frame)),
        endOpacity: Number(getComputedStyle(halo).opacity),
        endRimWidth: parseFloat(getComputedStyle(halo.querySelector(".bloom-halo-paper")).strokeWidth),
      }
      window.__stageMotion.finish()
      return result
    })
    check(Math.abs(exit.dx) < 2 && Math.abs(exit.dy) < 2
      && Math.abs(exit.widthDifference) < 2 && Math.abs(exit.heightDifference) < 2,
    "Dismissal must finish at the original garden position and size")
    check(exit.midOpacity > 0 && exit.midOpacity < 1, "Sticker backing must fade throughout the return")
    check(exit.independentFade, "Sticker fading must run independently of the sway frame loop")
    check(exit.endOpacity < 0.001 && exit.endRimWidth < 0.001,
      "Sticker backing must finish fading and shrinking before the garden handoff")
    await browser.waitForTimeout(100)
    check(await browser.locator("[data-focus-artwork], [data-focus-return]").count() === 0, "Return must restore the original garden")
    await browser.locator('.bloom-artwork [data-selectable="leaf"]').first().focus()
    await browser.keyboard.press("Enter")
    await browser.keyboard.press("Escape")
    await browser.getByRole("button", { name: "Grow me a garden", exact: true }).click()
    await browser.locator('.bloom-illustration[data-scene-seed="1"]').waitFor()
    await browser.waitForTimeout(650)
    check(await browser.locator("[data-focus-artwork], [data-focus-return]").count() === 0,
      "Growing a new garden during dismissal must not leave the old foreground")
    const entering = await panelFrames(true)
    check(entering.some((frame) => frame.plantOpacity > 0 && frame.plantOpacity < 1),
      "Plant controls must animate into view, not abruptly replace the introduction")
    check(entering.some((frame) => frame.introOpacity > 0 && frame.introOpacity < 1),
      "The introduction must fade out during plant entry")
    check(entering.every((frame) => frame.introInert), "Outgoing prose controls must immediately become inert")
    const returning = await panelFrames(false)
    check(returning.some((frame) => frame.plantOpacity > 0 && frame.plantOpacity < 1),
      "The plant panel must remain mounted throughout its exit fade")
    check(returning.some((frame) => frame.introOpacity > 0 && frame.introOpacity < 1),
      "The introduction must animate back into view")
    check(returning.every((frame) => frame.plantInert !== false),
      "Outgoing plant controls must immediately become inert")
    check(await browser.locator(".bloom-editorial").evaluate((element) => document.activeElement === element),
      "Outside dismissal must restore keyboard focus before the outgoing controls become inert")
    const capWidths = [...entering, ...returning].map((frame) => frame.capWidth)
    check(Math.max(...capWidths) - Math.min(...capWidths) < 0.1
      && [...entering, ...returning].every((frame) => frame.mode === "justified"),
    "The retained slab initial must not change layout during either transition")
    check(await browser.locator(".bloom-invitation, .bloom-inspector-copy, .bloom-inspector-eyebrow, .bloom-inspector-subline").count() === 0,
      "Play mode must not restore instructional or composition-role clutter")

    for (const viewport of [{ width: 1440, height: 960 }, { width: 1280, height: 640 }, { width: 1024, height: 520 }, { width: 390, height: 844 }]) {
      await browser.setViewportSize(viewport)
      for (const kind of kinds) {
        await browser.locator(`.bloom-artwork [data-selectable="${kind}"]`).first().dispatchEvent("click")
        await browser.waitForTimeout(300)
        const layout = await browser.locator(".bloom-inspector").evaluate((panel) => {
          const scroll = panel.querySelector(".bloom-inspector-scroll")
          const actions = panel.querySelector(".bloom-inspector-actions")
          const title = panel.querySelector("h2")
          return {
            gap: actions.querySelector("button").getBoundingClientRect().top - scroll.getBoundingClientRect().bottom,
            top: panel.getBoundingClientRect().top,
            bottom: panel.getBoundingClientRect().bottom,
            titleFits: title.scrollWidth <= title.clientWidth + 1,
            widthFits: document.documentElement.scrollWidth <= window.innerWidth + 1,
          }
        })
        check(layout.gap >= 16 && layout.gap <= 24,
          `${kind} actions must sit beside the controls, not at the page bottom`)
        check(layout.titleFits && layout.widthFits, `${kind} must not overflow narrow layouts`)
        if (viewport.width >= 1024) {
          check(layout.top >= 0 && layout.bottom <= viewport.height,
            `${kind} controls and actions must fit inside a short desktop viewport`)
        }
        await browser.keyboard.press("Escape")
        await browser.locator(".bloom-inspector").waitFor({ state: "hidden" })
      }
    }
    await browser.setViewportSize({ width: 1440, height: 960 })
    for (let i = 0; i < 3; i++) {
      await flower.dispatchEvent("click")
      await browser.waitForTimeout(30)
      await browser.keyboard.press("Escape")
      await other.dispatchEvent("click")
      await browser.waitForTimeout(30)
      await browser.keyboard.press("Escape")
    }
    await browser.waitForTimeout(300)
    check(await browser.locator('[data-panel="plant"], .bloom-inspector').count() === 0,
      "Interrupted transitions must remove every outgoing plant panel")
    check(await introElement.evaluate((element) => element.isConnected && element.dataset.justice === "justified"),
      "Rapid interactions must preserve the original introduction")
    await other.dispatchEvent("click")
    await browser.waitForTimeout(60)
    await browser.emulateMedia({ reducedMotion: "reduce" })
    await browser.keyboard.press("Escape")
    await browser.locator(".bloom-inspector").waitFor({ state: "hidden" })
    check(await browser.locator('[data-panel="intro"]').evaluate((element) =>
      getComputedStyle(element).transitionDuration === "0s" && !element.inert),
    "Reduced motion must make panel swaps immediate, including mid-transition changes")
    check(errors.filter((error) => error !== "Transition was skipped. New ViewTransition started").length === 0, errors.join("; "))
    return { centeredKinds: kinds, edits: true, resetRemoved: true, resize: true, darkTheme: true, animatedReturn: true,
      panelTransitions: true, compactLayouts: true, interruptedTransitions: true }
  } finally {
    await browser.close()
  }
}
