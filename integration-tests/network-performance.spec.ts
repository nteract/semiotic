import { expect, test, type Page } from "@playwright/test"

async function hoverGeometry(page: Page, edge = false) {
  const point = await page.evaluate((edge) => {
    const handle = window.networkPerformanceHandle!
    const scene = handle.getCustomLayout!() as {
      sceneNodes: Array<{ id: string; type: string; cx?: number; cy?: number; x?: number; y?: number; w?: number; h?: number }>
      sceneEdges: Array<{ pathD: string }>
    }
    let x: number, y: number
    if (edge) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path.setAttribute("d", scene.sceneEdges[0].pathD)
      const point = path.getPointAtLength(path.getTotalLength() / 2)
      x = point.x; y = point.y
    } else {
      const mark = scene.sceneNodes.find((node) => node.id === "a")!
      x = mark.cx ?? mark.x! + (mark.w ?? 0) / 2
      y = mark.cy ?? mark.y! + (mark.h ?? 0) / 2
    }
    const zoom = handle.getZoom()
    return { x: 20 + zoom.x + x * zoom.k, y: 40 + zoom.y + y * zoom.k }
  }, edge)
  await page.locator(".stream-network-frame").hover({ position: point })
}

for (const kind of ["ensemble", "force", "transit"]) {
  test(`${kind} layout keeps current tooltips after resize and camera changes`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/network-custom-layout-examples/?performance=${kind}`)
    const frame = page.locator(".stream-network-frame")
    await expect.poll(() => page.evaluate(() => !!window.networkPerformanceHandle?.getCustomLayout?.())).toBe(true)
    for (const step of ["original", "current", "zoomed"]) {
      if (step === "current") {
        await page.getByRole("button", { name: "Update and resize" }).click()
        await expect(frame.locator("canvas").first()).toHaveCSS("width", "460px")
        await expect.poll(() => page.evaluate(() => {
          const scene = window.networkPerformanceHandle!.getCustomLayout!() as { sceneNodes: Array<{ id: string; datum: { label?: string } }> }
          return scene.sceneNodes.find((node) => node.id === "a")?.datum.label
        })).toBe("A current")
      }
      if (step === "zoomed") {
        await page.getByRole("button", { name: "Zoom and pan", exact: true }).click()
        await expect.poll(() => page.evaluate(() => window.networkPerformanceHandle!.getZoom().k)).toBe(1.15)
      }
      // The ref exposes committed geometry before the queued canvas repaint.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await hoverGeometry(page)
      const tooltip = frame.locator(".stream-network-tooltip")
      await expect(tooltip).toHaveText(`A ${step === "original" ? "original" : "current"}`)
      const bounds = (await frame.boundingBox())!, tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
      if (kind === "force") {
        await hoverGeometry(page, true)
        await expect(tooltip).toHaveText("A to B")
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
    }
    expect(errors).toEqual([])
  })
}
