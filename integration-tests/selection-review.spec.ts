import { expect, test } from "@playwright/test"
import { expectCanvasPainted, expectTooltipWithinPlot } from "./helpers"

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

test("keyboard activation and brushing keep sibling matrices independent", async ({ page, browserName }) => {
  await page.goto("/selection-predicates-examples/?review=keyboard")
  const tile = page.getByRole("button", { name: /Sales/ })
  await expect(tile).toHaveAccessibleDescription("Sales for the current quarter")
  await page.keyboard.press("Tab")
  await expect(tile).toBeFocused()
  await page.keyboard.press("Enter")
  await page.keyboard.press("Space")
  await expect(page.getByTestId("activations")).toHaveText("2")
  const [first, second] = await page.getByRole("grid").all()
  const firstCells = first.getByRole("gridcell")
  await page.keyboard.press("Tab")
  await expect(firstCells.first()).toBeFocused()
  await page.keyboard.press("ArrowRight")
  const source = firstCells.nth(1)
  await expect(source).toBeFocused()
  const brush = source.getByRole("region", { name: /range brush/ })
  await expect(brush).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(brush).toBeFocused()
  const canvas = (grid: typeof first) => grid.getByRole("gridcell").nth(3).locator("canvas").first()
  const pixels = (grid: typeof first) => canvas(grid).evaluate((element: HTMLCanvasElement) => element.toDataURL())
  const before = await pixels(first)
  await expect.poll(() => pixels(second)).toEqual(before)
  await page.keyboard.press("ArrowRight")
  await expect.poll(() => pixels(first)).not.toEqual(before)
  expect(await pixels(second)).toEqual(before)
  await expect(page.getByTestId("parent-selection")).toHaveText("false")
  const selection = source.locator(".brush-g .selection")
  const width = Number(await selection.getAttribute("width"))
  await page.keyboard.press("Shift+ArrowRight")
  await expect.poll(async () => Number(await selection.getAttribute("width"))).toBeGreaterThan(width)
  await page.keyboard.press("Escape")
  await expect(source).toBeFocused()
  await expect.poll(() => pixels(first)).toEqual(before)
  await page.keyboard.press("Tab")
  await expect(second.getByRole("gridcell").first()).toBeFocused()
  // macOS WebKit uses Option-Tab to focus native buttons.
  await page.keyboard.press(browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab")
  await expect(page.getByRole("button", { name: "After matrices" })).toBeFocused()
})

test("matrix cells expose point values and activation from the keyboard", async ({ page }) => {
  await page.goto("/selection-predicates-examples/?review=matrix")
  const chart = page.getByTestId("matrix-review")
  const cell = chart.getByRole("gridcell", { name: "b versus a" })
  await cell.focus()
  await page.keyboard.press("Enter")
  await expect(cell.getByRole("group")).toBeFocused()
  await page.keyboard.press("Home")
  const tooltip = chart.locator(".scatterplot-matrix-tooltip")
  await expect(tooltip).toContainText("Matrix row: A")
  const highlightedBars = chart.locator('rect[opacity="0.7"]')
  await expect.poll(() => highlightedBars.count()).toBeGreaterThan(0)
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("matrix-activated")).toHaveText("A")
  await page.keyboard.press("Escape")
  await expect(cell).toBeFocused()
  await expect(tooltip).toBeHidden()
  await expect(highlightedBars).toHaveCount(0)
  await page.keyboard.press("Enter")
  await page.keyboard.press("Home")
  await expect.poll(() => highlightedBars.count()).toBeGreaterThan(0)
  await page.keyboard.press("Tab")
  await expect(highlightedBars).toHaveCount(0)
  await expect(tooltip).toBeHidden()
})

test("Tab leaves the matrix after an unrelated field is removed", async ({ page }) => {
  await page.goto("/selection-predicates-examples/?review=matrix")
  const chart = page.getByTestId("matrix-review")
  const cell = chart.getByRole("gridcell", { name: "a versus b" })
  await cell.focus()
  await page.getByRole("button", { name: "Remove unrelated field" }).evaluate(button => (button as HTMLButtonElement).click())
  await expect(cell).toBeFocused()
  await expect(cell).toHaveAttribute("tabindex", "0")
  await page.keyboard.press("Tab")
  await expect(chart.locator('[role="grid"] :focus')).toHaveCount(0)
})

test("the standalone scatterplot brush has a keyboard range outside its image", async ({ page }) => {
  await page.goto("/selection-predicates-examples/?review=brush-hover")
  const chart = page.getByTestId("brushed-scatterplot")
  const frame = chart.locator(".stream-xy-frame")
  const image = frame.getByRole("img")
  const brush = frame.getByRole("region", { name: /brush/i })
  await expect(image).toBeVisible()
  await expect(brush).toHaveAccessibleDescription(/arrow keys/i)
  await expect(image.getByRole("region")).toHaveCount(0)
  await frame.focus()
  await frame.press("Home")
  await expect(chart.locator(".stream-frame-tooltip")).toHaveText("Reading Center")
  await frame.press("Escape")
  await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
  await brush.focus()
  await brush.press("ArrowRight")
  const range = brush.locator(".selection")
  await expect(range).toBeVisible()
  const width = Number(await range.getAttribute("width"))
  await brush.press("Shift+ArrowRight")
  await expect.poll(async () => Number(await range.getAttribute("width"))).toBeGreaterThan(width)
  await brush.press("Escape")
  await expect(range).toBeHidden()
})

test("brushed scatterplot exposes the mark tooltip through its overlay after resize", async ({ page }) => {
  await page.goto("/selection-predicates-examples/?review=brush-hover")
  const chart = page.getByTestId("brushed-scatterplot")
  const canvas = chart.locator("canvas").first()
  const tooltip = chart.locator(".stream-frame-tooltip")
  for (const width of [320, 420]) {
    if (width === 420) await page.getByRole("button", { name: "Resize scatterplot" }).click()
    await expect(canvas).toHaveCSS("width", width + "px")
    await expectCanvasPainted(canvas)
    await chart.locator(".brush-g .overlay").hover()
    await expect(tooltip).toHaveText("Reading Center")
    await expectTooltipWithinPlot(chart, { left: 20, right: 20, top: 20, bottom: 20 })
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  }
})
