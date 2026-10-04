import { test, expect, type Page, type Locator } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { expectCanvasPainted } from "./helpers"

const route = "/examples/novel-network-lab"
const tooltip = (page: Page) =>
  page
    .locator(".stream-network-tooltip, .novel-circuit-tooltip")
    .filter({ visible: true })

async function moveToNode(page: Page, pane: Locator, view: string) {
  // Expansion and view changes resize the host before the chart catches up.
  // Wait for its measured width before locating a mark in the rendered output.
  const minimum =
    view === "circuit"
      ? 1080
      : ["braid", "atlas", "loom"].includes(view)
        ? 820
        : view === "sankey"
          ? 760
          : 520
  await expect
    .poll(() =>
      pane.locator(".novel-plot").evaluate((host, minimum) => {
        const canvas = host.querySelector("canvas")
        const width = Math.max(
          minimum,
          Math.min(1600, Math.floor(host.getBoundingClientRect().width))
        )
        return canvas?.getBoundingClientRect().width === width
      }, minimum)
    )
    .toBe(true)
  const label = pane
    .locator("svg text")
    .filter({ hasText: /^Copy$/ })
    .first()
  await label.scrollIntoViewIfNeeded()
  // Scroll before sampling the canvas: scrolling can update responsive layout,
  // and the sampled pixel must be in the current viewport coordinate system.
  await label.evaluate((element) => {
    const box = element.getBoundingClientRect()
    window.scrollBy(0, box.y + box.height / 2 - innerHeight / 2)
  })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  const box = (await label.boundingBox())!
  let x = box.x + box.width / 2,
    y = box.y + box.height / 2
  if (view === "force") {
    // Locate the filled, pinned Copy circle in the actual canvas. Other review
    // nodes are dimmed, so only this circle uses the opaque department color.
    const canvas = pane.locator("canvas").first()
    const pixel = await canvas.evaluate((element: HTMLCanvasElement) => {
      const hex = getComputedStyle(element)
        .getPropertyValue("--semiotic-category-3")
        .trim()
      const rgb = [1, 3, 5].map((offset) =>
        parseInt(hex.slice(offset, offset + 2), 16)
      )
      const { data } = element
        .getContext("2d")!
        .getImageData(0, 0, element.width, element.height)
      let sx = 0,
        sy = 0,
        count = 0
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] === rgb[0] &&
          data[i + 1] === rgb[1] &&
          data[i + 2] === rgb[2] &&
          data[i + 3] === 255
        ) {
          sx += (i / 4) % element.width
          sy += Math.floor(i / 4 / element.width)
          count++
        }
      }
      const rect = element.getBoundingClientRect()
      return {
        count,
        x: rect.x + ((sx / count) * rect.width) / element.width,
        y: rect.y + ((sy / count) * rect.height) / element.height
      }
    })
    expect(pixel.count).toBeGreaterThan(100)
    x = pixel.x
    y = pixel.y
  }
  if (view === "sankey") x = box.x + box.width + 13
  if (view === "braid") y -= 24
  if (view === "circuit") y += 23
  if (view === "chord") {
    const canvas = (await pane.locator("canvas").first().boundingBox())!
    x = box.x + box.width
    const cx = canvas.x + canvas.width / 2 - 5,
      cy = canvas.y + canvas.height / 2 + 2.5
    const length = Math.hypot(cx - x, cy - y)
    x += ((cx - x) * 28) / length
    y += ((cy - y) * 28) / length
  }
  await page.mouse.move(x, y)
  return { x, y }
}

test("all eight readers use the ledger and expose real mark tooltips", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(route)
  await page.getByRole("button", { name: "Expand A", exact: true }).click()
  for (const view of [
    "force",
    "sankey",
    "chord",
    "braid",
    "forest",
    "circuit",
    "atlas"
  ]) {
    await page
      .getByRole("combobox", { name: "View A", exact: true })
      .selectOption(view)
    const pane = page.locator(`.novel-pane[data-view="${view}"]`)
    await expectCanvasPainted(pane.locator("canvas").first())
    await moveToNode(page, pane, view)
    await expect(tooltip(page).first(), view).toContainText("Copy")
    if (view !== "atlas")
      await expect(tooltip(page).first(), view).toContainText("63 visits")
    const box = (await tooltip(page).first().boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    await page.mouse.move(2, 2)
    await expect(tooltip(page)).toHaveCount(0)
  }
  await page
    .getByRole("combobox", { name: "View A", exact: true })
    .selectOption("loom")
  const loom = page.locator('.novel-pane[data-view="loom"]')
  await expectCanvasPainted(loom.locator("canvas").first())
  // A Copy → Proof column is located by its label; the original endpoint row
  // provides the vertical position. Hover the actual column below that endpoint.
  const column = loom
    .locator("svg text")
    .filter({ hasText: /^Copy→Pr/ })
    .first()
  const row = loom
    .locator("svg text")
    .filter({ hasText: /^Copy$/ })
    .first()
  await row.scrollIntoViewIfNeeded()
  const c = (await column.boundingBox())!,
    r = (await row.boundingBox())!
  await page.mouse.move(c.x + c.width / 2, r.y + r.height / 2 + 10)
  await expect(tooltip(page).first()).toContainText("Copy")
  await expect(tooltip(page).first()).toContainText("intra-group (internal)")
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await page
    .getByRole("combobox", { name: "View A", exact: true })
    .selectOption("sankey")
  const sankey = page.locator('.novel-pane[data-view="sankey"]')
  await moveToNode(page, sankey, "sankey")
  const copyLabel = (await sankey
    .locator("svg text")
    .filter({ hasText: /^Copy$/ })
    .boundingBox())!
  await page.mouse.move(copyLabel.x, copyLabel.y + copyLabel.height / 2)
  await expect(tooltip(page).first()).toContainText(
    "Editor → Copy: 45 handoffs"
  )
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await page
    .getByRole("combobox", { name: "View A", exact: true })
    .selectOption("circuit")
  const circuit = page.locator('.novel-pane[data-view="circuit"]')
  await moveToNode(page, circuit, "circuit")
  await expect(tooltip(page).first()).toContainText(
    "Queue and capacity: unmeasured"
  )
  await page.keyboard.press("Escape")
  await expect(tooltip(page)).toHaveCount(0)
  const pipe = circuit
    .locator('[data-circuit-edge="Editor→Copy:standard"] path')
    .first()
  const point = await pipe.evaluate((path: SVGPathElement) => {
    const local = path.getPointAtLength(path.getTotalLength() / 2)
    return new DOMPoint(local.x, local.y)
      .matrixTransform(path.getScreenCTM()!)
      .toJSON()
  })
  await page.mouse.move(point.x, point.y)
  await expect(tooltip(page).first()).toContainText(
    "Editor → Copy: 45 handoffs"
  )
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

test("guided comparisons, shared pin, resize, theme and source access", async ({
  page
}) => {
  await page.goto(route)
  await page
    .getByRole("button", { name: /Required versus optional stages/ })
    .click()
  await expect(
    page.getByRole("combobox", { name: "View A", exact: true })
  ).toHaveValue("forest")
  await expect(page.getByTestId("novel-stage-summary")).toContainText("Release")
  await expect(page).toHaveURL(/stage=Release/)
  await page.getByLabel("Pinned stage").selectOption("Copy")
  await expect(page.getByTestId("novel-stage-summary")).toContainText(
    "63 visits from 45 manuscripts"
  )
  await page.getByRole("button", { name: "Expand A", exact: true }).click()
  await page.setViewportSize({ width: 980, height: 900 })
  const forest = page.locator('.novel-pane[data-view="forest"]')
  await moveToNode(page, forest, "forest")
  await expect(tooltip(page).first()).toContainText("63 visits")
  await page.mouse.click(
    (await forest
      .locator("svg text")
      .filter({ hasText: /^Intake$/ })
      .boundingBox())!.x + 12,
    (await forest
      .locator("svg text")
      .filter({ hasText: /^Intake$/ })
      .boundingBox())!.y + 7
  )
  await expect(page.getByTestId("novel-stage-summary")).toContainText(
    "48 visits from 48 manuscripts"
  )
  await page.getByRole("button", { name: /Switch to light mode/ }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await moveToNode(page, forest, "forest")
  await expect(tooltip(page).first()).toContainText("Copy")
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel("Pinned stage")).toHaveValue("Intake")
  const downloadPromise = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Download the shared ledger (JSON)" })
    .click()
  expect((await downloadPromise).suggestedFilename()).toBe(
    "novel-network-lab.json"
  )
  await page.getByRole("button", { name: "Show full code view" }).click()
  await expect(
    page.getByRole("tab", { name: "novel-network-lab/data.ts", exact: true })
  ).toBeVisible()
})

test("phone layout, keyboard controls, and accessible alternatives", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(route)
  await page.getByLabel("Pinned stage").selectOption("Author")
  await expect(page.getByTestId("novel-stage-summary")).toContainText(
    "16 visits from 12 manuscripts"
  )
  const control = page.getByRole("combobox", { name: "View A", exact: true })
  await control.focus()
  await expect(control).toBeFocused()
  await control.selectOption("atlas")
  await expectCanvasPainted(
    page.locator('.novel-pane[data-view="atlas"] canvas').first()
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  const results = await new AxeBuilder({ page })
    .include(".novel-lab")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(results.violations).toEqual([])
  await page.emulateMedia({ forcedColors: "active" })
  await expect(page.getByTestId("novel-stage-summary")).toContainText("Author")
})
