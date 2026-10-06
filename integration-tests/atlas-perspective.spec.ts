import { expect, test } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

for (const id of [
  "atlas-motif-braid-checkout",
  "network-custom-dependency-xray-supplier",
  "physics-custom-flow-circuit-retry-observed"
]) {
  test(`projected ${id} retains tooltips after resize and camera changes`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 1500, height: 1500 })
    await page.goto(`/ssr-parity-examples/?case=${id}&projected`)
    await waitForChartReady(page, `csr-${id}`)
    const anchor = page.getByTestId("projected-node-anchor")
    const tooltip = page.locator(".stream-network-tooltip")
    for (const action of [
      null,
      "Resize projected chart",
      "Pan and zoom projected chart"
    ]) {
      if (action) await page.getByRole("button", { name: action }).click()
      await anchor.scrollIntoViewIfNeeded()
      await waitForRafs(page, 4)
      const box = (await anchor.boundingBox())!
      await page.mouse.move(box.x + 4, box.y + 4)
      await expect(tooltip).toBeVisible() // test-quality-gate: allow-mount-only — content, placement, selection and dismissal are asserted below
      await expect(tooltip).toContainText(
        id.includes("motif")
          ? /home/
          : id.includes("dependency")
            ? /X/
            : /inventory/i
      )
      if (id.includes("flow-circuit"))
        await expect(tooltip).toContainText(/inventory.*completed; queue/i)
      const tip = (await tooltip.boundingBox())!
      expect(Math.hypot(tip.x - box.x, tip.y - box.y)).toBeLessThan(400)
      await page.mouse.click(box.x + 4, box.y + 4)
      await expect(page.getByTestId("projected-selection")).not.toHaveText("")
      await page.mouse.move(2, 2)
      await expect(tooltip).toHaveCount(0)
    }
  })
}
