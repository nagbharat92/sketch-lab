/* global document, window, requestAnimationFrame, DOMMatrixReadOnly, getComputedStyle, SVGGraphicsElement */

// Pass this file to Playwright's run-code tool; it uses the existing browser without extra dependencies.
async (page, url = `${page.url().split("#")[0]}#/flower-lab`) => {
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const equal = (actual, expected, message) =>
    check(actual === expected, `${message}: expected ${expected}, got ${actual}`)
  const same = (actual, expected, message) =>
    check(JSON.stringify(actual) === JSON.stringify(expected), message)
  const browser = await page.context().newPage()
  const errors = []
  browser.on("pageerror", (error) => errors.push(error.message))

  const ready = () => browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()

  const target = async (kind) => browser.evaluate((kind) => {
    const garden = document.querySelector(".bloom-artwork .bloom-illustration")
    const elements = [...garden.querySelectorAll("[data-selectable]")]
    const box = garden.getBoundingClientRect()
    let best
    for (let y = box.top + 2; y < box.bottom; y += 2) {
      for (let x = box.left + 2; x < box.right; x += 2) {
        const element = document.elementFromPoint(x, y)?.closest("[data-selectable]")
        if (!element || element.dataset.selectable !== kind || !garden.contains(element)) continue
        const bounds = element.getBoundingClientRect()
        const score = Math.min(x - bounds.left, bounds.right - x, y - bounds.top, bounds.bottom - y)
        if (!best || score > best.score) best = { x, y, index: elements.indexOf(element), score }
      }
    }
    if (!best) throw new Error(`No visible pointer target for ${kind}`)
    return best
  }, kind)

  const select = async (kind) => {
    await browser.locator(".bloom-artwork").evaluate((root) => {
      for (const animation of root.getAnimations({ subtree: true })) if (animation.animationName) animation.pause()
    })
    const initial = await target(kind)
    await browser.mouse.move(initial.x, initial.y)
    await browser.waitForTimeout(300)
    const hit = await target(kind)
    await browser.mouse.move(hit.x, hit.y)
    await browser.mouse.click(hit.x, hit.y)
    const element = browser.locator(".bloom-artwork [data-selectable]").nth(hit.index)
    await browser.locator(".bloom-inspector").waitFor()
    equal(await element.getAttribute("aria-pressed"), "true", `${kind} must be selected by the real pointer`)
    await browser.locator(".bloom-artwork").evaluate((root) => {
      for (const animation of root.getAnimations({ subtree: true })) if (animation.animationName) animation.play()
    })
    return element
  }

  const hoverInk = async (button) => {
    await button.hover()
    check(/site-ink-boil/.test(await button.locator("span.ink-boil").evaluate((span) => getComputedStyle(span).filter)), "Hover text must retain the site ink wiggle")
    const paths = await button.locator("svg path").evaluateAll((paths) => paths.map((path) => path.getAttribute("d")))
    await browser.waitForTimeout(450)
    const next = await button.locator("svg path").evaluateAll((paths) => paths.map((path) => path.getAttribute("d")))
    check(JSON.stringify(next) !== JSON.stringify(paths), "The button outline should boil on hover")
  }

  const pulse = async (button, activate, reduced = false) => {
    await button.evaluate((element) => {
      window.__bloomPress = new Promise((resolve) => {
        element.addEventListener("click", () => {
          const start = performance.now()
          const frames = []
          function tick() {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
            frames.push({ scale: matrix.a, y: matrix.f })
            const elapsed = performance.now() - start
            const settled = matrix.a === 1 && matrix.f === 0
            if (elapsed < 900 || (!settled && elapsed < 2000)) requestAnimationFrame(tick)
            else resolve(frames)
          }
          requestAnimationFrame(tick)
        }, { capture: true, once: true })
      })
    })
    await activate()
    const frames = await browser.evaluate(() => window.__bloomPress)
    const minScale = Math.min(...frames.map((frame) => frame.scale))
    const maxY = Math.max(...frames.map((frame) => frame.y))
    if (reduced) {
      equal(minScale, 1, "Reduced motion must not squeeze the button")
      equal(maxY, 0, "Reduced motion must not move the button")
    } else {
      check(minScale >= 0.95 && minScale < 0.99, `Expected the historical 0.96 squeeze, got ${minScale}`)
      check(maxY > 0.5 && maxY <= 2.05, `Expected the historical 2px dip, got ${maxY}`)
    }
    equal(frames.at(-1).scale, 1, "The button must rebound to its original size")
    equal(frames.at(-1).y, 0, "The button must return to its original position")
    return { minScale, maxY }
  }

  const neighbours = () => browser.evaluate(() => {
    const selected = document.querySelector(".bloom-artwork [data-selected]")
    return [...document.querySelectorAll(".bloom-artwork [data-selectable]")]
      .filter((element) => !element.contains(selected) && !selected.contains(element))
      .map((element) => [...element.querySelectorAll("path")]
        .filter((path) => !path.closest(".bloom-halo"))
        .map((path) => path.getAttribute("d")))
  })

  const paperRim = async () => {
    await browser.locator(".bloom-artwork").evaluate((root) => {
      for (const animation of root.getAnimations({ subtree: true })) if (animation.animationName) animation.pause()
    })
    const hit = await target("flower")
    const flower = browser.locator(".bloom-artwork [data-selectable]").nth(hit.index)
    const rim = flower.locator("svg[data-petal-family] > .bloom-hover-grow > .bloom-halo")
    equal(await rim.count(), 1, "A flower should have one united paper silhouette, not separate petal halos")
    const sizeFactor = await rim.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--bloom-sticker-size")))
    const hoverWidth = 28 * sizeFactor, selectedWidth = 40 * sizeFactor
    const widthMatches = (actual, expected, message) => check(Math.abs(actual - expected) < 0.001, message)
    const original = await browser.locator(".bloom-artwork").evaluate((root) =>
      [...root.querySelectorAll("path")].filter((path) => !path.closest(".bloom-halo")).map((path) => path.getAttribute("d")))
    const frames = async (activate) => {
      await rim.evaluate((element) => {
        window.__bloomRim = new Promise((resolve) => {
          const start = performance.now()
          const samples = []
          function tick() {
            samples.push({
              state: element.dataset.halo,
              opacity: Number(getComputedStyle(element).opacity),
              width: parseFloat(getComputedStyle(element.querySelector(".bloom-halo-paper")).strokeWidth),
              connected: element.isConnected,
            })
            if (performance.now() - start < 650) requestAnimationFrame(tick)
            else resolve(samples)
          }
          requestAnimationFrame(tick)
        })
      })
      await activate()
      return browser.evaluate(() => window.__bloomRim)
    }
    const entered = await frames(() => flower.focus())
    check(entered.some((sample) => sample.width > 0 && sample.width < hoverWidth - 0.1), "The rim must expand gradually on hover")
    widthMatches(entered.at(-1).width, hoverWidth, "Hover rim must follow artwork size")
    equal(entered.at(-1).state, "hover", "Hover must open the rim")
    equal(entered.at(-1).opacity, 1, "Hover sticker must be fully opaque")
    equal(await rim.locator("..").evaluate((element) => getComputedStyle(element).scale),
      "1.035", "Hover must grow the artwork and sticker together")
    const hoverColor = await rim.locator(".bloom-halo-paper").evaluate((element) => getComputedStyle(element).fill)
    const selected = await frames(() => browser.keyboard.press("Enter"))
    widthMatches(selected.at(-1).width, selectedWidth, "Selection must broaden the size-aware rim")
    equal(await rim.locator(".bloom-halo-paper").evaluate((element) => getComputedStyle(element).fill),
      hoverColor, "Selection must keep the discovered hover pigment")
    await flower.focus()
    const deselected = await frames(() => browser.keyboard.press("Escape"))
    equal(deselected.at(-1).state, "hover", "Deselecting a focused flower must retain the thinner hover rim")
    widthMatches(deselected.at(-1).width, hoverWidth, "Deselecting should return to size-aware hover width")
    const left = await frames(() => browser.locator(".bloom-editorial").focus())
    check(left.some((sample) => sample.opacity > 0 && sample.opacity < 0.84), "The rim must fade out rather than disappear")
    equal(left.at(-1).width, 0, "The rim should contract fully")
    equal(left.at(-1).opacity, 0, "The rim should fade fully")
    equal(await rim.locator("..").evaluate((element) => getComputedStyle(element).scale),
      "1", "Leaving must restore the anchored artwork size")
    check(left.every((sample) => sample.connected), "Exit must not unmount the rim mid-animation")
    const current = await browser.locator(".bloom-artwork").evaluate((root) =>
      [...root.querySelectorAll("path")].filter((path) => !path.closest(".bloom-halo")).map((path) => path.getAttribute("d")))
    same(current, original, "Paper rim interactions must not alter the original artwork")
    equal(await rim.evaluate((element) => getComputedStyle(element).pointerEvents), "none", "Paper must never cover a pointer target")
    equal(await rim.locator(".bloom-halo-line").count(), 0, "The dark selection outline must be gone")
    await browser.locator(".bloom-artwork").evaluate((root) => {
      for (const animation of root.getAnimations({ subtree: true })) if (animation.animationName) animation.play()
    })
    return { hover: entered.at(-1), selected: selected.at(-1), deselected: deselected.at(-1), left: left.at(-1) }
  }

  const stickerBacking = async () => {
    const inspecting = await browser.locator('.bloom-artwork .bloom-illustration[data-inspecting="true"]').count() > 0
    // The open plant's copy is checked by the selection-stage test; these are the garden's own stickers.
    const backing = await browser.locator(".bloom-artwork .bloom-halo:not(.bloom-focus-layer *)").evaluateAll((halos) => halos.map((halo) => {
      const path = halo.querySelector(".bloom-halo-paper path")
      const style = getComputedStyle(path)
      const blocked = []
      let opacity = 1
      for (let element = halo; element; element = element.parentElement) {
        const ancestorStyle = getComputedStyle(element)
        if (ancestorStyle.filter !== "none" || element.hasAttribute("mask") || element.hasAttribute("clip-path")) {
          blocked.push(element.tagName)
        }
        opacity *= Number(ancestorStyle.opacity)
      }
      return {
        state: halo.dataset.halo, fill: style.fill, stroke: style.stroke, opacity,
        pigment: halo.closest("[data-sticker-color]").getAttribute("data-sticker-color"),
        blocked, chalk: !!halo.querySelector(".bloom-halo-chalk"),
      }
    }))
    for (const item of backing) {
      const channels = [1, 3, 5].map((start) => parseInt(item.pigment.slice(start, start + 2), 16))
      equal(item.fill, `rgb(${channels.join(", ")})`, "Each sticker must inherit its own plant's pigment")
      equal(item.fill, item.stroke, "Sticker fill and border must match")
      check(item.fill !== "none", "Sticker backing must be filled")
      check(!item.chalk, "Stickers must not have a second chalk layer")
      same(item.blocked, [], "Sticker backing must be outside clipping masks and ink filters")
      if (item.state !== "idle") equal(item.opacity, inspecting ? 0 : 1,
        `Context stickers yield to the foreground while inspecting: ${JSON.stringify(item)}`)
    }
    const monsteras = await browser.locator('.bloom-artwork [data-leaf-frame]:not(.bloom-focus-layer *)').evaluateAll((frames) => frames.map((frame) => {
      const halo = frame.querySelector(".bloom-halo-paper path")
      const blade = frame.querySelector("clipPath[id^='study-blade-'] path")
        ?? frame.closest("[data-organic-monstera]").querySelector("clipPath[id^='study-blade-'] path")
      return halo.getAttribute("d") === blade.getAttribute("d")
    }))
    check(monsteras.length > 0 && monsteras.every(Boolean), "Monstera backing must use the uncut blade to fill slits and holes")
  }

  const cursorPaint = async (element) => {
    const pigment = await element.getAttribute("data-sticker-color")
    const cursor = await browser.evaluate(() => document.body.style.getPropertyValue("--bloom-leaf-cursor"))
    check(decodeURIComponent(cursor).includes(`fill="${pigment}"`), "The leaf cursor must carry the active sticker pigment")
    check(cursor.endsWith("5 3, auto"), "The painted cursor must retain its leaf-tip hotspot and native fallback")
  }

  const hoverWork = async () => {
    await browser.evaluate(async () => {
      const prototype = SVGGraphicsElement.prototype
      const bbox = prototype.getBBox, matrix = prototype.getScreenCTM
      let reads = 0
      prototype.getBBox = function (...args) { reads++; return bbox.apply(this, args) }
      prototype.getScreenCTM = function (...args) { reads++; return matrix.apply(this, args) }
      try {
        const targets = [...document.querySelectorAll(".bloom-artwork [data-selectable]")]
        for (const target of targets) {
          target.focus()
          await new Promise(requestAnimationFrame)
        }
        if (reads !== 0) throw new Error(`Hover must not remeasure garden geometry: ${reads} reads`)
      } finally {
        prototype.getBBox = bbox
        prototype.getScreenCTM = matrix
      }
    })
    await browser.locator(".bloom-editorial").focus()
    await browser.waitForTimeout(300)
  }

  try {
    await browser.bringToFront()
    await browser.setViewportSize({ width: 1440, height: 960 })
    await browser.emulateMedia({ reducedMotion: "no-preference" })
    await browser.goto(url)
    await browser.locator('.bloom-entry[data-ready="true"]').waitFor({ timeout: 60000 })
    await ready()
    const grow = browser.getByRole("button", { name: "Grow me a garden", exact: true })
    await grow.hover()
    await browser.mouse.move(40, 900)
    await hoverWork()
    const rimStates = await paperRim()
    await stickerBacking()
    const openMonstera = browser.locator('.bloom-artwork [data-selectable="monstera"]').first()
    await openMonstera.focus()
    await browser.keyboard.press("Enter")
    await browser.locator('.bloom-artwork [data-selectable="leaf"]').first().focus()
    // Garden stickers fade over the same 240ms as the stage motion.
    await browser.waitForTimeout(650)
    check(await browser.locator('.bloom-artwork .bloom-halo[data-halo="hover"]').count() === 0,
      "Other plants must not show a sticker while one is open")
    await stickerBacking()
    await cursorPaint(openMonstera)
    await browser.locator(".bloom-editorial").focus()
    await browser.keyboard.press("Escape")
    await hoverInk(grow)
    const gardenPulse = await pulse(grow, () => grow.click())
    await browser.locator('.bloom-illustration[data-scene-seed="1"]').waitFor()
    await ready()

    const animationNames = await browser.locator(".bloom-artwork").evaluate((root) =>
      [...new Set(root.getAnimations({ subtree: true }).map((animation) => animation.animationName))])
    for (const name of ["bloom-gust", "bloom-plant-sway", "bloom-flower-nod", "bloom-small-sway", "bloom-monstera-sway", "bloom-leaf-follow-through"]) {
      check(animationNames.includes(name), `Historical garden animation missing: ${name}`)
    }

    const pulses = {}
    for (const kind of ["flower", "monstera", "leaf", "bud", "ground", "ladybird"]) {
      await select(kind)
      await browser.waitForTimeout(650)
      await stickerBacking()
      await cursorPaint(browser.locator(`.bloom-artwork [data-selectable="${kind}"][data-selected]`))
      equal(await browser.locator(`.bloom-artwork [data-selectable="${kind}"][data-selected] .bloom-hover-grow[data-growing="true"]`)
        .first().evaluate((element) => getComputedStyle(element).scale), "1.035", `${kind} must have anchored growth`)
      const before = await neighbours()
      const surprise = browser.getByRole("button", { name: /^Surprise this / })
      await hoverInk(surprise)
      pulses[kind] = await pulse(surprise, () => surprise.click())
      await ready()
      equal(await browser.getByRole("button", { name: "Reset", exact: true }).count(), 0, "The inspector must not expose Reset")
      same(await neighbours(), before, `${kind} surprise must not redraw its neighbours`)
      equal(await browser.locator(".bloom-artwork .bloom-illustration").getAttribute("data-scene-seed"), "1", "Local surprises must preserve the garden seed")
      await browser.keyboard.press("Escape")
      await browser.locator(".bloom-inspector").waitFor({ state: "hidden" })
    }

    await browser.emulateMedia({ reducedMotion: "reduce" })
    const jokes = []
    for (let i = 0; i < 3; i++) {
      await browser.mouse.move(40, 900)
      await browser.getByRole("tooltip").waitFor({ state: "hidden" })
      const hit = await target("ladybird")
      await browser.mouse.move(hit.x, hit.y)
      await browser.getByRole("tooltip").waitFor()
      jokes.push(await browser.getByRole("tooltip").innerText())
    }
    check(jokes[0] !== jokes[1], "Hover jokes must not immediately repeat")
    check(jokes[1] !== jokes[2], "Hover jokes must not immediately repeat")
    const antennae = browser.locator('.bloom-artwork [data-selectable="ladybird"] .bloom-ladybird-antennae')
    equal(await antennae.evaluate((element) => getComputedStyle(element).animationName), "none", "Reduced motion must disable the antenna wave")
    await browser.emulateMedia({ reducedMotion: "no-preference" })
    equal(await antennae.evaluate((element) => getComputedStyle(element).animationName), "ladybird-hello", "Hover must restore the historical antenna wave")

    await browser.emulateMedia({ reducedMotion: "reduce" })
    await select("flower")
    const reducedRim = browser.locator('.bloom-artwork .bloom-halo[data-halo="selected"]:not(.bloom-focus-layer *)')
    equal(await reducedRim.evaluate((element) => getComputedStyle(element).transitionDuration), "0s", "Reduced motion must make rim changes immediate")
    equal(await reducedRim.locator("..").evaluate((element) => getComputedStyle(element).scale),
      "1", "Reduced motion must not enlarge the artwork")
    const surprise = browser.getByRole("button", { name: "Surprise this flower", exact: true })
    await surprise.hover()
    equal(await surprise.locator("span.ink-boil").evaluate((span) => getComputedStyle(span).filter), "none", "Reduced motion must disable text wiggle")
    const reducedPulse = await pulse(surprise, () => surprise.click(), true)
    await ready()
    equal(await browser.getByRole("button", { name: "Reset", exact: true }).count(), 0, "The inspector must not expose Reset")
    await browser.keyboard.press("Escape")
    const reducedGrow = await pulse(grow, () => grow.click(), true)
    await browser.locator('.bloom-illustration[data-scene-seed="2"]').waitFor()
    await ready()

    await browser.emulateMedia({ reducedMotion: "no-preference" })
    const rapidPulse = await pulse(grow, async () => {
      for (let i = 0; i < 3; i++) await grow.click({ force: true })
    })
    await browser.locator('.bloom-illustration[data-scene-seed="5"]').waitFor()
    await ready()
    await select("leaf")
    const keyboardButton = browser.getByRole("button", { name: "Surprise this leaf", exact: true })
    await keyboardButton.focus()
    const keyboardPulse = await pulse(keyboardButton, () => browser.keyboard.press("Enter"))
    await ready()
    equal(await browser.locator(".bloom-artwork .bloom-illustration").getAttribute("data-scene-seed"), "5", "Keyboard surprises must preserve the garden seed")
    await browser.keyboard.press("Escape")
    equal(await browser.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), 0, "The garden must remain a single screen")
    same(errors.filter((error) => error !== "Transition was skipped. New ViewTransition started"), [], "There must be no application errors")

    return { rimStates, gardenPulse, pulses, rapidPulse, keyboardPulse, reducedPulse, reducedGrow, animationNames, jokes }
  } finally {
    await browser.close()
  }
}
