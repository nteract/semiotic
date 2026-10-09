import { test, expect } from "@playwright/test"
import type { NetworkViewportSnapshot } from "../src/components/stream/networkViewportTypes"

test("node hover and click hand off to edges at twelve screen pixels through zoom, pan and resize", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/network-custom-layout-examples/?zoom-test&node-hit-test&tooltip=owned")
  const frame = page.locator(".stream-network-frame")
  const tooltip = frame.locator(".stream-network-tooltip")
  await expect(page.getByLabel("Draft", { exact: true })).toBeVisible()

  for (const narrow of [false, true]) {
    if (narrow) await page.getByRole("button", { name: "Narrow chart" }).click()
    for (const k of [0.25, 1, 3]) {
      await page.evaluate((scale) => window.networkZoomHandle!.zoomTo({
        k: scale, x: 100 - 500 * scale, y: 100 - 400 * scale
      }, 0), k)
      await expect(page.getByLabel("Zoom level")).toHaveText(`${k * 100}%`)
      const bounds = (await frame.boundingBox())!
      const hover = async (offset: number, id: string) => {
        const x = bounds.x + 130 + offset, y = bounds.y + 120
        await page.mouse.move(x, y)
        await expect(page.getByTestId("zoom-hover")).toHaveText(id)
        await expect(tooltip).toHaveText(id)
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        return { x, y }
      }
      await hover(0, "tiny-node")
      for (const [offset, id] of [[11, "tiny-node"], [13, "node-edge"]] as const) {
        const point = await hover(offset, id)
        await page.mouse.click(point.x, point.y)
        await expect(page.getByTestId("zoom-activate")).toHaveText(id)
      }
      await page.mouse.move(0, 0)
      await expect(page.getByTestId("zoom-hover")).toHaveText("none")
      await expect(tooltip).toHaveCount(0)
    }
  }
  expect(errors).toEqual([])
})

test("network hover follows band paint order and thick strokes through zoom, pan and resize", async ({ page }) => {
  await page.goto("/network-custom-layout-examples/?zoom-test&hit-test&tooltip=owned")
  const frame = page.locator(".stream-network-frame")
  const tooltip = frame.locator(".stream-network-tooltip")
  await expect(page.getByLabel("Draft", { exact: true })).toBeVisible()
  let view = { x: 0, y: 0, k: 1 }
  const hover = async (x: number, y: number, id: string) => {
    const bounds = (await frame.boundingBox())!
    await page.mouse.move(bounds.x + 30 + view.x + x * view.k, bounds.y + 20 + view.y + y * view.k)
    await expect(page.getByTestId("zoom-hover")).toHaveText(id)
    if (id === "none") {
      await expect(tooltip).toHaveCount(0)
    } else {
      await expect(tooltip).toHaveText(id)
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
  }
  const checkGeometry = async () => {
    await hover(50, 55, "foreground-circle")
    await hover(56, 145, "child-circle")
    await hover(200, 210, "top-band")
    await hover(120, 210, "bottom-band")
    await hover(200, 294, "wide-path")
    await hover(200, 324, "wide-line")
    await hover(200, 260, "none")
  }
  await checkGeometry()
  view = { x: -20, y: -28, k: 1.1 }
  await page.evaluate((next) => window.networkZoomHandle!.zoomTo(next, 0), view)
  await checkGeometry()
  await page.getByRole("button", { name: "Narrow chart" }).click()
  await checkGeometry()
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
})

test("network overlay edges hit their stroke or filled band, and nested rows take precedence", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/network-custom-layout-examples/")
  await expect(
    page.getByTestId("edge-geometry").locator("path").first()
  ).toHaveAttribute("d", "M20,120 C20,20 180,20 180,120")
  const hover = async (x: number, y: number, id: string) => {
    const point = await page.getByTestId("edge-geometry").evaluate(
      (element, point) => {
        const matrix = (element as unknown as SVGGraphicsElement).getScreenCTM()
        if (!matrix) throw new Error("Missing overlay transform")
        const client = new DOMPoint(point.x, point.y).matrixTransform(matrix)
        return { x: client.x, y: client.y }
      },
      { x, y }
    )
    await page.mouse.move(point.x, point.y)
    await expect(page.getByTestId("hover")).toHaveText(id)
  }
  await hover(100, 45, "curve")
  await hover(100, 90, "none") // Inside the curve's implicit fill, far from its stroke.
  await hover(300, 90, "band")
  await hover(100, 173, "line")
  await hover(100, 180, "none")
  await hover(300, 170, "none") // Table-only geometry must never intercept hover.
  await hover(100, 250, "row")
  await hover(100, 220, "card")
  expect(errors).toEqual([])
})

test("one viewport drives cards, edge culling and the minimap without relayout", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?viewport")
  const root = page.getByTestId("scroll-root")
  const snapshot = async () =>
    JSON.parse(
      await page.getByTestId("viewport").innerText()
    ) as NetworkViewportSnapshot
  await expect
    .poll(async () => (await snapshot())?.visibleRect?.height)
    .toBeGreaterThan(0)
  const calls = await page.evaluate(() => window.networkViewportLayoutCalls)
  const firstEdges = await page
    .getByTestId("visible-edges")
    .locator("path")
    .evaluateAll((paths) =>
      paths.map((path) => path.getAttribute("data-edge-id"))
    )
  const input = page.getByLabel("Card 0", { exact: true })
  await input.fill("unsaved edit")
  await root.evaluate((element) => {
    element.scrollTop = 810
  })
  await expect
    .poll(async () => (await snapshot()).visibleRect?.y)
    .toBeGreaterThan(700)
  await expect(input).toBeFocused()
  await expect(input).toHaveValue("unsaved edit")
  await expect(page.getByLabel("Card 1", { exact: true })).toBeAttached()
  expect((await snapshot()).visibleMarkIds).not.toContain("0")
  expect((await snapshot()).visibleMarkIds).not.toContain("1")
  expect((await snapshot()).mountedMarkIds).toContain("0")
  const minimapY = Number(
    await page.getByTestId("minimap-window").getAttribute("y")
  )
  expect(minimapY).toBeCloseTo((await snapshot()).visibleRect!.y / 10)
  expect(
    await page
      .getByTestId("visible-edges")
      .locator("path")
      .evaluateAll((paths) =>
        paths.map((path) => path.getAttribute("data-edge-id"))
      )
  ).not.toEqual(firstEdges)
  const members = (await snapshot()).visibleMarkIds
  await root.evaluate((element) => {
    element.scrollTop += 1
  })
  await expect
    .poll(async () =>
      Number(await page.getByTestId("minimap-window").getAttribute("y"))
    )
    .toBeGreaterThan(minimapY)
  expect((await snapshot()).visibleMarkIds).toEqual(members)
  await page.getByLabel("Pin card 1").uncheck() // Moving focus releases card 0 too.
  await expect(input).toHaveCount(0)
  await expect(page.getByLabel("Card 1", { exact: true })).toHaveCount(0)
  await page.getByLabel("Overscan").selectOption("400")
  await expect
    .poll(async () => (await snapshot()).mountedMarkIds.length)
    .toBeGreaterThan(members!.length)
  await page.getByLabel("Cull", { exact: true }).uncheck()
  await expect(root.locator(".semiotic-network-html-mark")).toHaveCount(30)
  expect(await page.evaluate(() => window.networkViewportLayoutCalls)).toBe(
    calls
  )
})

test("explicit roots can be unavailable, external, replaced or discovered without changing layout", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?viewport")
  const snapshot = async () =>
    JSON.parse(
      await page.getByTestId("viewport").innerText()
    ) as NetworkViewportSnapshot
  await expect
    .poll(async () => (await snapshot())?.visibleRect?.height)
    .toBeGreaterThan(0)
  const calls = await page.evaluate(() => window.networkViewportLayoutCalls)
  const root = page.getByLabel("Root", { exact: true })
  await root.selectOption("null")
  await expect.poll(async () => (await snapshot()).visibleRect).toBeNull()
  await expect(page.locator(".semiotic-network-html-mark")).toHaveCount(30)
  await root.selectOption("external")
  await expect.poll(async () => (await snapshot()).visibleRect?.height).toBe(80)
  await page.getByRole("button", { name: "Replace external root" }).click()
  await expect
    .poll(async () => (await snapshot()).visibleRect?.height)
    .toBe(130)
  await root.selectOption("auto")
  const before = (await snapshot()).visibleRect!.height
  await page.getByRole("button", { name: "Resize viewport" }).click()
  await expect
    .poll(async () => (await snapshot()).visibleRect?.height ?? 0)
    .toBeGreaterThan(before)
  expect(await page.evaluate(() => window.networkViewportLayoutCalls)).toBe(
    calls
  )
})

test("replacement data preserves an edited focused card, and deletion returns focus to the frame", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?viewport")
  const input = page.getByLabel("Card 0", { exact: true })
  await input.fill("unsaved")
  const element = await input.elementHandle()
  await page
    .getByRole("button", { name: "Replace nodes" })
    .evaluate((button) => (button as HTMLButtonElement).click())
  await expect(input).toHaveValue("unsaved")
  await expect(input).toBeFocused()
  expect(
    await input.evaluate((current, previous) => current === previous, element)
  ).toBe(true)
  await page
    .getByRole("button", { name: "Delete card 0" })
    .evaluate((button) => (button as HTMLButtonElement).click())
  await expect(input).toHaveCount(0)
  await expect(page.locator(".stream-network-frame")).toBeFocused()
})
