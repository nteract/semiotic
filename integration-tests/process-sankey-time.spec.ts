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
    const bounds = document
      .querySelector(".stream-network-frame")!
      .getBoundingClientRect()
    for (let x = 4; x < bounds.width - 80; x += 4) {
      for (let y = 4; y < 290; y += 4) {
        if (
          ctx.isPointInPath(path, x, y) &&
          ctx.isPointInPath(path, x + 2, y + 2) &&
          ctx.isPointInPath(path, x - 2, y - 2)
        )
          return { x: x + 40, y: y + 30 }
      }
    }
    throw new Error(`No interior point in ${kind}`)
  }, kind)
  await page.locator(".stream-network-frame").hover({ position: point })
}

for (const time of ["numeric", "dates"]) {
    test(`canvas ProcessSankey ${time} ticks and hovered times survive resize`, async ({
      page
    }) => {
      await page.goto(
        `/process-sankey-examples/?time=${time}`
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
        await expect(tooltip).toContainText("Intake")
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
        await hoverMark(page, "ribbon")
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
      await page.getByRole("button", { name: "Resize process" }).click()
      await check()
      await page.getByRole("button", { name: "Use time formatter" }).click()
      await hoverMark(page, "ribbon")
      await expect(tooltip).toContainText(
        time === "numeric" ? "number 14" : "date 2026-01-01T14:00:00.000Z"
      )
    })
}
