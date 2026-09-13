import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

const readers = [
  ["MotifBraidChart", "atlas-motif-braid-checkout", "checkout"],
  ["DependencyForestChart", "network-custom-dependency-xray-supplier", "X"],
  [
    "FlowCircuitChart",
    "physics-custom-flow-circuit-retry-observed",
    "inventory"
  ]
] as const

for (const [component, id, nodeId] of readers) {
  test(`linked-hover changes the public ${component} reader`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 1400, height: 1400 })
    await page.goto(`/ssr-parity-examples/?case=${id}&linkedNode=${nodeId}`)
    await waitForChartReady(page, "atlas-link-source")
    await waitForChartReady(page, `csr-${id}`)
    const target = page.getByTestId(`csr-${id}`)
    const original = await target.screenshot()
    const source = page
      .getByTestId("atlas-link-source")
      .locator("canvas")
      .first()
    const bounds = await source.boundingBox()
    if (!bounds) throw new Error("Source point has no viewport bounds")
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await expect
      .poll(async () => (await target.screenshot()).equals(original), {
        message: `${component} must redraw when its linked-hover selection becomes active`
      })
      .toBe(false)
    await expect(target).toHaveScreenshot(`atlas-linked-hover-${component}.png`)
    await page.mouse.move(0, 0)
    await expect
      .poll(async () => (await target.screenshot()).equals(original))
      .toBe(true)
  })
}
