import { expect, test } from "@playwright/test"

test.setTimeout(45000)

test("parallel wiring retains identity, geometry and trace through presentation and camera changes", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/pipeline-explorer")
  const explorer = page.getByRole("region", {
    name: "Interactive pipeline explorer"
  })
  await expect(page.locator('[data-edge-id="step-0-next"]')).toBeVisible()
  const paths = () =>
    page
      .locator('[data-testid="zoom-connections"] path')
      .evaluateAll((elements) =>
        elements.map((e) => [
          e.getAttribute("data-edge-id"),
          e.getAttribute("d")
        ])
      )
  const originalPaths = await paths()
  const calls = await explorer.getAttribute("data-solve-calls")
  await page.getByLabel("Show row graphics").uncheck()
  await page.getByLabel("Wiring representation").selectOption("wires")
  expect(await paths()).toEqual(originalPaths)
  await expect(explorer).toHaveAttribute("data-solve-calls", calls!)
  await page.getByLabel("Wiring representation").selectOption("composite")
  await page.getByLabel("Show row graphics").check()
  // The metric row's actual CSS center meets its solved terminal, including borders.
  const row = await page
    .locator('[data-mark-id="step-0"] [data-part-id="rows"]')
    .boundingBox()
  const anchor = await page
    .locator('[data-edge-id="step-0-next"]')
    .evaluate((element) => {
      const path = element as SVGPathElement
      const point = path.getPointAtLength(0)
      const screen = new DOMPoint(point.x, point.y).matrixTransform(
        path.getScreenCTM()!
      )
      return { x: screen.x, y: screen.y }
    })
  expect(row).not.toBeNull()
  expect(Math.abs(row!.y + row!.height / 2 - anchor.y)).toBeLessThan(1)

  await page
    .getByText("Trace and select all 73 connections", { exact: true })
    .click()
  await expect(page.locator(".pipeline-connections-table")).toHaveJSProperty(
    "open",
    true
  )
  await page
    .getByLabel("Select a connection", { exact: true })
    .selectOption("step-0-next-duplicate")
  await expect(
    page.getByRole("button", { name: "step-0-next-duplicate", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await page.locator(".pipeline-chart").scrollIntoViewIfNeeded()
  await expect(
    page.locator('[data-edge-id="step-0-next-latency"]')
  ).toHaveAttribute("data-active", "false")
  const trace = await page.getByTestId("trace-status").textContent()
  await page.getByLabel("Wiring representation").selectOption("summary")
  await expect(page.locator('[data-edge-id="step-0-next"]')).toHaveAttribute(
    "stroke-dasharray",
    "4 3"
  )
  await expect(page.getByTestId("trace-status")).toHaveText(trace!)
  await page.getByLabel("Wiring representation").selectOption("exploded")
  await expect(page.locator(".pipeline-part-box").first()).toBeVisible()
  await expect(page.getByTestId("trace-status")).toHaveText(trace!)
  await page.getByLabel("Wiring representation").selectOption("composite")
  const fixedMetrics = await page.getByLabel("Wiring metrics").textContent()
  await page.getByLabel("Optimize part order").check()
  await expect(page.getByLabel("Wiring metrics")).not.toHaveText(fixedMetrics!)
  const optimizedCalls = await explorer.getAttribute("data-solve-calls")
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await expect(explorer).toHaveAttribute("data-solve-calls", optimizedCalls!)
  await page
    .getByLabel("Step note", { exact: true })
    .fill("Geometry stays stable")
  await expect(explorer).toHaveAttribute("data-solve-calls", optimizedCalls!)
  await page
    .getByRole("button", { name: "step-0-next-duplicate", exact: true })
    .focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByLabel("Select a connection", { exact: true })
  ).toHaveValue("step-0-next-duplicate")
  await page
    .getByRole("button", { name: "Remove selected connection", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "step-0-next-duplicate", exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "step-0-next", exact: true })
  ).toBeVisible()
  await expect(
    page.getByLabel("Select a connection", { exact: true })
  ).toHaveValue("step-0-next-duplicate")
  await expect(
    page.getByText(
      "step-0-next-duplicate was removed; selection remains on that ID."
    )
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Restore duplicate connection", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "step-0-next-duplicate", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  const owner = page.getByLabel("Inspect an interface owner")
  await owner.selectOption("step-1")
  await owner.press("Enter")
  await expect(
    page.getByRole("button", { name: "Output rows", exact: true })
  ).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("button", { name: "Output rows / in (in)", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("Escape")
  await expect(owner).toBeFocused()
  await page.getByText("Existing record nodes", { exact: true }).click()
  const rowFrame = page.locator(".pipeline-row-example .stream-network-frame")
  await rowFrame.scrollIntoViewIfNeeded()
  const rowCanvas = rowFrame.locator("canvas").first()
  const markPoint = async () => rowCanvas.evaluate(element => {
    const canvas = element as HTMLCanvasElement
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data
    const box = canvas.getBoundingClientRect()
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 237 && pixels[i + 1] === 242 && pixels[i + 2] === 247 && pixels[i + 3] > 0) {
      return { x: box.x + ((i / 4) % canvas.width + 20) * box.width / canvas.width,
        y: box.y + (Math.floor(i / 4 / canvas.width) + 10) * box.height / canvas.height }
    }
    return null
  })
  await expect.poll(markPoint).not.toBeNull()
  const point = (await markPoint())!
  await page.mouse.move(point.x, point.y)
  await expect(page.getByRole("tooltip")).toContainText("orders:row:42")
  await page.mouse.move(0, 0)
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  // Ungrouped row nodes still initialize at the first node, including after Escape.
  await rowFrame.focus()
  for (let attempt = 0; attempt < 2; attempt++) {
    await rowFrame.press("ArrowRight")
    await expect(page.getByRole("tooltip")).toContainText("orders:row:42")
    await rowFrame.press("Escape")
    await expect(page.getByRole("tooltip")).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
