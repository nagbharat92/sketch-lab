/* global document, window, getComputedStyle, requestAnimationFrame */
// Run with the existing Playwright browser code tool.
async (page, url = `${page.url().split("#")[0]}#/flower-lab`) => {
  const browser = await page.context().newPage()
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  try {
    await browser.bringToFront()
    await browser.addInitScript(() => {
      window.__bloomStartup = []
      let finished = 0
      const painted = (node) => {
        if (!node || !node.getClientRects().length || getComputedStyle(node).visibility !== "visible") return false
        let opacity = 1
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
          opacity *= Number(getComputedStyle(ancestor).opacity)
        }
        return opacity > 0.01
      }
      const sample = () => {
        const entry = document.querySelector(".bloom-entry")
        if (entry) {
          const loading = Boolean(entry.querySelector(".bloom-intro"))
          const frame = {
            loading,
            ready: entry.dataset.ready === "true",
            content: [...entry.querySelectorAll(".bloom-story,.bloom-illustration,.bloom-surprise")].some(painted),
            hidden: entry.querySelector(".bloom-entry-content")?.getAttribute("aria-hidden"),
            inert: entry.querySelector(".bloom-entry-content")?.inert,
          }
          window.__bloomStartup.push(frame)
          if (frame.ready && !loading && frame.content) finished++
        }
        if (finished < 3) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    const reports = []
    for (const [width, height] of [[1440, 960], [390, 844]]) {
      await browser.setViewportSize({ width, height })
      for (const reducedMotion of ["no-preference", "reduce"]) {
        await browser.emulateMedia({ reducedMotion })
        await browser.goto(url)
        await browser.reload()
        await browser.locator('.bloom-entry[data-ready="true"]').waitFor()
        await browser.getByRole("status", { name: "Loading Bloom", exact: true }).waitFor({ state: "detached" })
        await browser.waitForFunction(() => window.__bloomStartup.some((frame) => frame.ready && frame.content))
        const frames = await browser.evaluate(() => window.__bloomStartup)
        const loading = frames.filter((frame) => frame.loading)
        check(loading.length > 0, "Startup must show the loader before the garden")
        check(loading.every((frame) => !frame.content && frame.hidden === "true" && frame.inert),
          "No paragraph, garden or button may be revealed while the loader exists")
        check(frames.some((frame) => frame.ready && !frame.loading && frame.content),
          "The completed garden must become visible after the loader is removed")
        reports.push({ width, reducedMotion, loadingFrames: loading.length })
      }
    }
    return { reports, overlappingFrames: 0 }
  } finally {
    await browser.close()
  }
}
