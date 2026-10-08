/* global getComputedStyle */
// Run with the existing Playwright run-code tool against the running Bloom page.
async (page, url = `${page.url().split("#")[0]}#/flower-lab`) => {
  const browser = await page.context().newPage()
  const sizes = [[1440, 960], [1280, 600], [1024, 768], [1024, 400], [390, 844], [320, 568]]
  const kinds = ["flower", "monstera", "leaf", "bud", "ground", "ladybird"]
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  const chunky = async (button) => button.evaluate((node) => {
    const bounds = node.getBoundingClientRect(), parent = node.parentElement
    const style = getComputedStyle(parent)
    const width = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    return Math.abs(bounds.width - width) < 1 && bounds.height >= 64
  })
  const unclipped = async (element) => element.evaluate((input) => {
    const art = input.parentElement.querySelector(
      ".bloom-shape-choice-art,.bloom-monstera-choice-art,.bloom-ladybird-choice-art,.bloom-stage-choice span,.bloom-colour-choice span",
    ) ?? input
    const box = art.getBoundingClientRect(), style = getComputedStyle(art)
    const padding = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset) || 0)
    for (let parent = art.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent), bounds = parent.getBoundingClientRect()
      if (["hidden", "auto", "scroll", "clip"].includes(css.overflowX)
        && (box.left - padding < bounds.left - 1 || box.right + padding > bounds.right + 1)) return false
      if (["hidden", "auto", "scroll", "clip"].includes(css.overflowY)
        && (box.top - padding < bounds.top - 1 || box.bottom + padding > bounds.bottom + 1)) return false
    }
    return true
  })
  try {
    await browser.goto(url)
    await browser.emulateMedia({ reducedMotion: "reduce" })
    await browser.locator('.bloom-entry[data-ready="true"]').waitFor()
    for (const [width, height] of sizes) {
      await browser.setViewportSize({ width, height })
      const canvasWidth = await browser.locator(".project-content").evaluate((node) => node.getBoundingClientRect().width)
      const columnWidth = await browser.locator(".bloom-editorial").evaluate((node) => node.getBoundingClientRect().width)
      const proseWidth = await browser.locator(".bloom-intro-copy").evaluate((node) => node.getBoundingClientRect().width)
      const proseSize = await browser.locator(".bloom-story").first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
      if (width >= 1440) check(canvasWidth >= 1300 && columnWidth >= 470, "Wide screens must give the canvas and controls breathing room")
      check(proseWidth <= 448, "Widening the canvas must not stretch the reading measure")
      check(proseSize >= 20 && proseSize <= 24, "Intro prose must have enough visual weight beside the garden")
      for (const kind of kinds) {
        await browser.keyboard.press("Escape")
        const target = browser.locator(`.bloom-artwork [data-selectable="${kind}"]`).first()
        await target.focus()
        await target.press("Enter")
        await browser.locator(".bloom-inspector").waitFor()
        const layout = await browser.locator(".bloom-inspector").evaluate((inspector) => {
          const scroll = inspector.querySelector(".bloom-inspector-scroll")
          const rows = (selector) => new Set([...inspector.querySelectorAll(selector)]
            .map((node) => Math.round(node.getBoundingClientRect().top))).size
          return {
            overflow: scroll.scrollWidth > scroll.clientWidth + 1,
            colors: rows(".bloom-colour-choice span"),
            petals: rows(".bloom-shape-choice-art"),
            bugs: rows(".bloom-ladybird-choice-art"),
            centered: getComputedStyle(inspector.querySelector("h2")).textAlign === "center",
            details: inspector.querySelectorAll(".bloom-ladybird-caption,.bloom-ladybird-joke").length,
            underlines: [...inspector.querySelectorAll(".bloom-shape-choice-art")]
              .some((node) => parseFloat(getComputedStyle(node).borderBottomWidth) > 0),
            smallPreviews: [...inspector.querySelectorAll(".bloom-shape-choice-art,.bloom-monstera-choice-art,.bloom-ladybird-choice-art")]
              .some((node) => node.getBoundingClientRect().width < 70),
            smallColors: [...inspector.querySelectorAll(".bloom-colour-choice span")]
              .some((node) => node.getBoundingClientRect().width < 32),
          }
        })
        const label = `${width}x${height} ${kind}`
        check(!layout.overflow && layout.centered && !layout.underlines, `${label}: alignment or overflow`)
        check(!layout.smallPreviews && !layout.smallColors, `${label}: choices must wrap instead of shrinking`)
        if (kind === "flower" && width >= 1440) check(layout.petals === 1, `${label}: the wider column must fit all four large petal choices`)
        if (kind === "ladybird") check(layout.bugs >= 2 && layout.bugs <= 4 && !layout.details, `${label}: compact bugs only`)
        const choices = browser.locator('.bloom-inspector input[type="radio"]')
        for (let i = 0; i < await choices.count(); i++) {
          const input = choices.nth(i)
          await input.focus()
          await input.press("Space")
          await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
          check(await unclipped(input), `${label}: selected/focused choice ${i} clips`)
        }
        const sliders = browser.locator('.bloom-inspector [role="slider"]:not([aria-disabled="true"])')
        for (let i = 0; i < await sliders.count(); i++) {
          const slider = sliders.nth(i)
          await slider.focus()
          await slider.press("Home")
          await slider.press("End")
          await browser.locator('.bloom-artwork [data-preparing="false"]').waitFor()
          check(await unclipped(slider), `${label}: slider clips`)
        }
        const action = browser.getByRole("button", { name: /^Surprise this / })
        await action.focus()
        check(await chunky(action), `${label}: action must be full width and chunky`)
        check(await unclipped(action), `${label}: action focus ring clips`)
      }
      await browser.keyboard.press("Escape")
      const grow = browser.getByRole("button", { name: "Grow me a garden", exact: true })
      await grow.focus()
      check(await chunky(grow), `${width}x${height}: main action must be full width and chunky`)
      check(await unclipped(grow), `${width}x${height}: main action focus ring clips`)
    }
    return { layouts: sizes.length * kinds.length, selectedChoices: true, sliders: true, actions: true }
  } finally {
    await browser.close()
  }
}
