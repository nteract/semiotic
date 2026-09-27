import { expect, test } from "@playwright/test"

for (const input of ["bounded", "push"]) {
  test(`${input} canvas lineage cycles retain direction and hover through resize (#1508)`, async ({
    page
  }) => {
    await page.goto(`/recipe-regressions/?case=lineage&input=${input}`)
    const chart = page.getByTestId("lineage")
    await expect(chart.locator(".recipe-edge-arrow")).toHaveCount(4)
    for (const width of [660, 360]) {
      if (width === 360)
        await page.getByRole("button", { name: "Resize chart" }).click()
      const canvas = chart.locator("canvas").first()
      await expect(canvas).toHaveCSS("width", `${width}px`)
      const box = (await canvas.boundingBox())!
      const marks = await page.evaluate(() => {
        const scene = (
          window as unknown as {
            lineageScene(): {
              sceneNodes: {
                x: number
                y: number
                w: number
                h: number
                datum: { label: string; id: string }
              }[]
              sceneEdges: { pathD: string; datum: { label: string } }[]
            }
          }
        ).lineageScene()
        return [
          ...scene.sceneNodes.map((n) => ({
            x: n.x + n.w / 2,
            y: n.y + n.h / 2,
            label: n.datum.label + (n.datum.id === "a" ? " (Nested)" : "")
          })),
          ...scene.sceneEdges.map((e) => {
            const path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path"
            )
            path.setAttribute("d", e.pathD)
            const p = path.getPointAtLength(path.getTotalLength() / 4)
            return { x: p.x, y: p.y, label: e.datum.label }
          })
        ]
      })
      for (const mark of marks) {
        expect(mark.x).toBeGreaterThan(0)
        expect(mark.x).toBeLessThan(width - 40)
        expect(mark.y).toBeGreaterThan(0)
        expect(mark.y).toBeLessThan(280)
        await page.mouse.move(box.x + 20 + mark.x, box.y + 40 + mark.y)
        const tooltip = chart.locator(".stream-network-tooltip")
        await expect(tooltip).toHaveText(mark.label)
        await expect
          .poll(async () => {
            const tip = await tooltip.boundingBox()
            return (
              !!tip &&
              tip.x >= box.x + 19.5 &&
              tip.y >= box.y + 39.5 &&
              tip.x + tip.width <= box.x + width - 19.5 &&
              tip.y + tip.height <= box.y + 320.5
            )
          })
          .toBe(true)
        await page.mouse.move(0, 0)
        await expect(tooltip).toBeHidden()
      }
    }
  })
}
