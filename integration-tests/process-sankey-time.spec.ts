import { expect, test, type Page } from "@playwright/test"

async function hoverMark(page: Page, kind: "band" | "ribbon") {
  const point = await page.evaluate((kind) => {
    const handle = (
      window as unknown as {
        __processTimeChart: {
          getCustomLayout: () => {
            bands: Array<{ pathD: string }>
            ribbons: Array<{ pathD: string }>
          }
        }
      }
    ).__processTimeChart
    const layout = handle.getCustomLayout()
    const mark = kind === "band" ? layout.bands[0] : layout.ribbons[0]
    const path = new Path2D(mark.pathD)
    const ctx = document.createElement("canvas").getContext("2d")!
    // Bands paint above ribbons. Avoid covered attachments and the band's
    // five-pixel stroke hit padding when choosing an exposed ribbon point.
    const coveringBands = (
      kind === "ribbon" ? layout.bands : layout.bands.slice(1)
    ).map((band) => new Path2D(band.pathD))
    ctx.lineWidth = 10
    const bounds = document
      .querySelector(".stream-network-frame")!
      .getBoundingClientRect()
    for (let x = 4; x < bounds.width - 80; x += 4) {
      for (let y = 4; y < 290; y += 4) {
        if (
          ctx.isPointInPath(path, x, y) &&
          ctx.isPointInPath(path, x + 2, y + 2) &&
          ctx.isPointInPath(path, x - 2, y - 2) &&
          !coveringBands.some(
            (band) =>
              ctx.isPointInPath(band, x, y) ||
              ctx.isPointInStroke(band, x, y)
          )
        )
          return { x: x + 40, y: y + 30 }
      }
    }
    throw new Error(`No exposed interior point in ${kind}`)
  }, kind)
  await page.locator(".stream-network-frame").hover({ position: point })
}

for (const time of ["numeric", "dates"]) {
  for (const execution of ["sync", "worker"]) {
    test(`canvas ProcessSankey ${execution} ${time} ticks and hovered times survive resize`, async ({
      page
    }) => {
      let workers = 0
      page.on("worker", () => workers++)
      await page.goto(
        `/process-sankey-examples/?time=${time}&execution=${execution}`
      )
      const frame = page.locator(".stream-network-frame")
      const tooltip = frame.locator(".stream-network-tooltip")
      await expect(
        frame
          .locator("svg text")
          .filter({
            hasText: time === "numeric" ? /^14$/ : /02 PM|04 PM|06 PM/
          })
          .first()
      ).toHaveText(time === "numeric" ? "14" : /02 PM|04 PM|06 PM/)
      const check = async () => {
        await hoverMark(page, "band")
        await expect(tooltip).toHaveCount(1)
        await expect(tooltip).toContainText("Intake")
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
        await hoverMark(page, "ribbon")
        await expect(tooltip).toHaveCount(1)
        await expect(tooltip.getByText("a → b", { exact: true })).toBeVisible()
        await expect(tooltip).toContainText(
          time === "numeric" ? "14" : "2026-01-01T14:00:00Z"
        )
        await expect(tooltip).toContainText(
          time === "numeric" ? "18" : "2026-01-01T18:00:00Z"
        )
        const bounds = (await frame.boundingBox())!
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
      await check()
      expect(workers).toBe(execution === "worker" ? 1 : 0)
      await page.getByRole("button", { name: "Resize process" }).click()
      await check()
      await page.getByRole("button", { name: "Use time formatter" }).click()
      await hoverMark(page, "ribbon")
      await expect(tooltip.getByText("a → b", { exact: true })).toBeVisible()
      await expect(tooltip).toContainText(
        time === "numeric" ? "number 14" : "date 2026-01-01T14:00:00.000Z"
      )
      await expect(tooltip).toContainText(
        time === "numeric" ? "number 18" : "date 2026-01-01T18:00:00.000Z"
      )
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
      expect(workers).toBe(execution === "worker" ? 1 : 0)
    })
  }
}
