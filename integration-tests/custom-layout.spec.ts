import { test, expect, type Page } from "@playwright/test"
import { waitForRafs } from "./helpers"

async function waitForFlowerFixtureReady(page: Page): Promise<void> {
  const fixture = page.locator('[data-testid="gofish-flower-responsive"]')
  await expect(fixture).toBeVisible()
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="gofish-flower-responsive"]')
    const hasCanvas = Boolean(root?.querySelector("canvas"))
    const flowerCenters = root?.querySelectorAll('circle[data-gofish-id^="flower-center-"]').length ?? 0
    return hasCanvas && flowerCenters >= 5
  })
  await waitForRafs(page, 3)
}

async function expectFlowerCentersAligned(page: Page): Promise<void> {
  const pairs = await page.locator('[data-testid="gofish-flower-responsive"]').evaluate((root) => {
    const centers = Array.from(
      root.querySelectorAll('circle[data-gofish-id^="flower-center-"]')
    ) as SVGCircleElement[]
    const stems = Array.from(
      root.querySelectorAll('rect[data-gofish-id^="flower-stem-"]')
    ) as SVGRectElement[]
    const stemCenters = new Map(
      stems.map((stem) => {
        const id = stem.getAttribute("data-gofish-id") ?? ""
        const lake = id.replace(/^flower-stem-/, "")
        const x = Number(stem.getAttribute("x"))
        const width = Number(stem.getAttribute("width"))
        return [lake, x + width / 2]
      })
    )

    return centers.map((center) => {
      const id = center.getAttribute("data-gofish-id") ?? ""
      const lake = id.replace(/^flower-center-/, "")
      const flowerX = Number(center.getAttribute("cx"))
      const stemX = stemCenters.get(lake) ?? Number.NaN
      return { lake, dx: Math.abs(flowerX - stemX), flowerX, stemX }
    })
  })

  expect(pairs.length).toBeGreaterThan(0)
  for (const pair of pairs) {
    expect(pair.dx, `${pair.lake}: flower ${pair.flowerX}, stem ${pair.stemX}`).toBeLessThan(0.01)
  }
}

test("custom layout overlays stay aligned through responsive resize and transitions", async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []

  page.on("pageerror", (err) => pageErrors.push(err.message))
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })

  await page.goto("/custom-layout-examples/")
  await waitForFlowerFixtureReady(page)
  await expectFlowerCentersAligned(page)

  await page.setViewportSize({ width: 620, height: 800 })
  await waitForRafs(page, 8)
  await expectFlowerCentersAligned(page)

  await page.getByTestId("radius-plus").click()
  await waitForRafs(page, 12)
  await expectFlowerCentersAligned(page)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
