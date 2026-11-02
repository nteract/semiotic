import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

test("OrbitDiagram preserves pointer and keyboard activation through resize", async ({
  page
}) => {
  await page.goto("/selection-predicates-examples/?review=orbit")
  const chart = page.getByTestId("orbit-review")
  const canvas = chart.locator("canvas").first()
  const tooltip = chart.locator(".stream-network-tooltip")
  for (const resized of [false, true]) {
    if (resized)
      await page.getByRole("button", { name: "Resize orbit" }).click()
    await expect(canvas).toHaveCSS("width", resized ? "340px" : "300px")
    await expect
      .poll(() =>
        page.evaluate(
          () => window.orbitSelectionRef?.current?.getTopology().nodes.length
        )
      )
      .toBe(3)
    const position = await page.evaluate(() => {
      const node = window.orbitSelectionRef
        .current!.getTopology()
        .nodes.find((n) => n.id === "A")!
      return { x: node.x + 20, y: node.y + 20 }
    })
    await canvas.hover({ position })
    await expect(tooltip).toContainText("Orbit node: A")
    await expectTooltipWithinPlot(chart, {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    })
    await canvas.click({ position })
    await expect(page.getByTestId("orbit-selection-state")).toHaveText("false")
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
    await expect(page.getByTestId("orbit-hover-state")).toHaveText("false")

    const frame = chart.locator(".stream-network-frame")
    await frame.focus()
    await frame.press("Home")
    await expect(tooltip).toContainText("Orbit node:")
    await frame.press("Enter")
    await expect(page.getByTestId("orbit-selection-state")).toHaveText("false")
    await frame.press("Escape")
    await expect(tooltip).toHaveCount(0)
    await expect(page.getByTestId("orbit-hover-state")).toHaveText("false")
  }
})

test("removing unrelated matrix cells preserves the surviving cell's hover", async ({
  page
}) => {
  await page.goto("/selection-predicates-examples/?review=matrix")
  const chart = page.getByTestId("matrix-review")
  const canvas = chart.locator("canvas").first()
  const points = () =>
    canvas.evaluate((element: HTMLCanvasElement) => {
      const ctx = element.getContext("2d")!
      const { data } = ctx.getImageData(0, 0, element.width, element.height)
      const ratio = element.width / element.clientWidth
      const matches = [
        [20, 96, 170],
        [233, 108, 44]
      ].map((color) => {
        let x = 0,
          y = 0,
          count = 0,
          alpha = 0
        for (let i = 0; i < data.length; i += 4) {
          if (
            data[i] === color[0] &&
            data[i + 1] === color[1] &&
            data[i + 2] === color[2] &&
            data[i + 3] > 0
          ) {
            x += (i / 4) % element.width
            y += Math.floor(i / 4 / element.width)
            alpha = Math.max(alpha, data[i + 3])
            count++
          }
        }
        return { x: x / count / ratio, y: y / count / ratio, alpha }
      })
      return matches
    })
  await expect
    .poll(async () => (await points()).map((p) => p.alpha))
    .toEqual([255, 255])
  const markPositions = await points()
  const [point] = markPositions
  const alphas = () =>
    canvas.evaluate((element: HTMLCanvasElement, positions) => {
      const ratio = element.width / element.clientWidth
      return positions.map(
        ({ x, y }) =>
          element
            .getContext("2d")!
            .getImageData(Math.floor(x * ratio), Math.floor(y * ratio), 1, 1)
            .data[3]
      )
    }, markPositions)
  // Matrix hover dims other rows to 60%; unselectedOpacity belongs to brushing.
  const dimmed = await page.evaluate(() => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    ctx.globalAlpha = 0.6
    ctx.fillRect(0, 0, 1, 1)
    return ctx.getImageData(0, 0, 1, 1).data[3]
  })
  await canvas.hover({ position: { x: point.x, y: point.y } })
  await expect(chart.locator(".scatterplot-matrix-tooltip")).toContainText(
    "Matrix row: A"
  )
  await expect.poll(alphas).toEqual([255, dimmed])
  await page
    .getByRole("button", { name: "Remove unrelated field" })
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(chart.locator(".stream-xy-frame")).toHaveCount(2)
  await expect(chart.locator(".scatterplot-matrix-tooltip")).toContainText(
    "Matrix row: A"
  )
  await expect.poll(alphas).toEqual([255, dimmed])
  await page.mouse.move(0, 0)
  await expect(chart.locator(".scatterplot-matrix-tooltip")).toHaveCount(0)
  await expect.poll(alphas).toEqual([255, 255])
})
