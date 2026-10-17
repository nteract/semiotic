import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import type {} from "./network-custom-layout-examples/zoomFixture"

async function point(page: Page, x: number, y: number) {
  const frame = (await page.locator(".stream-network-frame").boundingBox())!
  const zoom = await page.evaluate(() => window.networkZoomHandle!.getZoom())
  return {
    x: frame.x + 30 + x * zoom.k + zoom.x,
    y: frame.y + 20 + y * zoom.k + zoom.y
  }
}

test("drag-enabled cameras deliver node and edge activation at every scale", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom-test")
  for (const k of [0.3, 1, 2]) {
    await page.evaluate(
      (k) =>
        window.networkZoomHandle!.zoomTo({ x: 0, y: k === 2 ? -160 : 0, k }, 0),
      k
    )
    await expect(page.getByLabel("Zoom level")).toHaveText(`${k * 100}%`)
    for (const [id, x, y] of [
      ["a", 160, 150],
      ["edge", 225, 200]
    ] as const) {
      const p = await point(page, x, y)
      await page.mouse.move(p.x, p.y)
      await expect(page.getByTestId("zoom-tooltip")).toHaveText(id)
      await page.mouse.click(p.x, p.y)
      await expect(page.getByTestId("zoom-activate")).toHaveText(id)
      await page.mouse.move(0, 0)
      await expect(page.getByTestId("zoom-tooltip")).toHaveCount(0)
    }
  }
})

test("drag suppresses activation, then ordinary clicks and card inputs still work", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom-test")
  const from = await point(page, 160, 150)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 80, from.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByTestId("zoom-activate")).toHaveText("none")
  await expect
    .poll(() => page.evaluate(() => window.networkZoomHandle!.getZoom().x))
    .toBeGreaterThan(60)
  const to = await point(page, 160, 150)
  await page.mouse.click(to.x, to.y)
  await expect(page.getByTestId("zoom-activate")).toHaveText("a")
  const input = page.getByLabel("Draft", { exact: true })
  await input.fill("kept after pan")
  await expect(input).toHaveValue("kept after pan")
  await expect(input).toBeFocused()
})

test("touch taps activate marks with camera gestures enabled", async ({
  browser
}) => {
  const context = await browser.newContext({ hasTouch: true })
  const page = await context.newPage()
  try {
    await page.goto(
      "http://127.0.0.1:1234/network-custom-layout-examples/?zoom-test"
    )
    for (const [id, x, y] of [
      ["a", 160, 150],
      ["edge", 225, 200]
    ] as const) {
      const p = await point(page, x, y)
      await page.touchscreen.tap(p.x, p.y)
      await expect(page.getByTestId("zoom-activate")).toHaveText(id)
    }
  } finally {
    await context.close()
  }
})
