import { expect, test } from "@playwright/test"
import { waitForChartReady } from "./helpers"

for (const input of ["bounded", "push"]) {
  test(`${input} positioned recipes keep raw node/edge hover through resize (#1503)`, async ({
    page
  }) => {
    await page.goto(`/recipe-regressions/?case=positioned&input=${input}`)
    for (const name of ["flextree", "dagre"])
      await waitForChartReady(page, name)
    for (const width of [500, 280]) {
      if (width === 280)
        await page.getByRole("button", { name: "Resize charts" }).click()
      for (const name of ["flextree", "dagre"]) {
        const chart = page.getByTestId(name)
        const canvas = chart.locator("canvas").first()
        await expect(canvas).toHaveCSS("width", `${width}px`)
        const labels = chart
          .locator("text")
          .filter({ hasText: /^(Root|Leaf)$/ })
        await expect(labels).toHaveText(["Root", "Leaf"])
        const centers = await labels.evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
          })
        )
        const scale = Math.min(1, (width - 42) / 300, 238 / 260)
        const root = centers[0],
          leaf = centers[1]
        const midpoint = {
          x: (root.x + leaf.x) / 2,
          y: (root.y + leaf.y) / 2 - (name === "flextree" ? 10 * scale : 0)
        }
        for (const [point, content] of [
          [root, "Root (Nested)"],
          [leaf, "Leaf"],
          [midpoint, "Root to Leaf"]
        ] as const) {
          await page.mouse.move(point.x, point.y)
          const tooltip = chart.locator(".stream-network-tooltip")
          await expect(tooltip).toHaveText(content)
          await expect
            .poll(async () => {
              const box = await canvas.boundingBox(),
                tip = await tooltip.boundingBox()
              return (
                !!box &&
                !!tip &&
                tip.x >= box.x + 19.5 &&
                tip.y >= box.y + 19.5 &&
                tip.x + tip.width <= box.x + box.width - 19.5 &&
                tip.y + tip.height <= box.y + box.height - 19.5
              )
            })
            .toBe(true)
          await page.mouse.move(0, 0)
          await expect(tooltip).toBeHidden()
        }
      }
    }
  })
}
