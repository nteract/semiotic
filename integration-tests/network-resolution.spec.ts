import { test, expect, type Page } from "@playwright/test"

async function markPoint(page: Page, kind: "group" | "edge") {
  const local = await page.evaluate((kind) => {
    const { scene, camera } = (
      window as unknown as {
        resolutionProbe: {
          scene: {
            sceneNodes: {
              type: string
              x: number
              y: number
              w: number
              h: number
              datum: { kind: string; nodeIds: string[] }
            }[]
            sceneEdges: { pathD: string; datum: { edgeIds?: string[] } }[]
          }
          camera: { x: number; y: number; k: number }
        }
      }
    ).resolutionProbe
    let x: number, y: number
    if (kind === "group") {
      const mark = scene.sceneNodes.find(
        (n) =>
          n.type === "rect" &&
          n.datum.kind === "group" &&
          n.datum.nodeIds.length > 1
      )!
      x = mark.x + mark.w / 2
      y = mark.y + mark.h / 2
    } else {
      const mark = scene.sceneEdges.find(
        (e) => e.datum.edgeIds?.[0] === "e17" && /^M[^ ]+ V/.test(e.pathD)
      )!
      const numbers = mark.pathD.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      x = numbers[0]
      y = (numbers[1] + numbers[2]) / 2
    }
    return { x: 12 + camera.x + camera.k * x, y: 15 + camera.y + camera.k * y }
  }, kind)
  const canvas = page.getByTestId("reader").locator("canvas").first()
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error("Missing reader canvas")
  return { x: bounds.x + local.x, y: bounds.y + local.y }
}

for (const [mode, kind, text] of [
  ["atlas", "group", "original nodes"],
  ["loom", "edge", "Edge e17"]
] as const) {
  test(`${mode}: real mark hover survives resize and camera transforms`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 1400, height: 1200 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/network-resolution-examples/?mode=${mode}`)
    await expect(
      page.getByTestId("reader").locator("canvas").first()
    ).toBeVisible()
    const revision = await page
      .getByTestId("reader")
      .locator("[data-resolution-revision]")
      .getAttribute("data-resolution-revision")
    for (const action of [null, "Resize reader", "Zoom and pan"]) {
      if (action)
        await page.getByRole("button", { name: action, exact: true }).click()
      await page.waitForTimeout(150)
      const point = await markPoint(page, kind)
      await page.mouse.move(point.x, point.y)
      const tooltip = page
        .getByTestId("reader")
        .locator(".stream-network-tooltip")
      await expect(tooltip).toContainText(text)
      await expect(tooltip).toHaveAttribute("data-placement", "placed")
      const box = await tooltip.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(Math.abs(box!.x - point.x)).toBeLessThan(700)
      expect(Math.abs(box!.y - point.y)).toBeLessThan(220)
      await page.mouse.move(2, 2)
      await expect(tooltip).toHaveCount(0)
      await expect(
        page.getByTestId("reader").locator("[data-resolution-revision]")
      ).toHaveAttribute("data-resolution-revision", revision!)
    }
    await page
      .getByText("Source ownership and edge history table", { exact: true })
      .click()
    await page.getByRole("button", { name: "Inspect e17", exact: true }).click()
    await expect(page.getByLabel("Edge witness")).toContainText(
      "Alternative structural path"
    )
    await expect(
      page.getByRole("table", { name: /^Entry-to-exit support\./ })
    ).toContainText("no")
    expect(errors).toEqual([])
  })
}
