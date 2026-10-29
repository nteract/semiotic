import { test, expect, type Page, type Locator } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { expectCanvasPainted } from "./helpers"

test.use({ screenshot: "only-on-failure", trace: "retain-on-failure" })

const route = "/examples/novel-network-lab"
const tooltip = (page: Page) =>
  page
    .locator(".stream-network-tooltip, .stream-physics-tooltip")
    .filter({ visible: true })

async function hoverCopyMark(
  page: Page,
  pane: Locator,
  view: string,
  kind: "node" | "incoming-edge" = "node"
) {
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
  // Scroll before projecting the mark: scrolling can update responsive layout,
  // and the pointer must use the current viewport coordinate system.
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
  if (view === "force" || view === "sankey") {
    // Locate the node from its rendered label, including the SVG's current
    // margin/resize transform. The fixture uses 14px Sankey bars; Force labels
    // sit 4px above circles whose minimum radius is 6px. Neither placement
    // depends on exact canvas colors or identical rasterization across frames.
    await expect.poll(async () => {
      const point = await label.evaluate((element: SVGTextElement, { view, kind }) => {
        const matrix = element.getScreenCTM()
        if (!matrix) return null
        let x = Number(element.getAttribute("x"))
        let y = Number(element.getAttribute("y"))
        if (view === "sankey") {
          x += element.getAttribute("text-anchor") === "start" ? -13 : 13
          // Half the 14px bar plus 4px puts the pointer inside its incoming band.
          if (kind === "incoming-edge") x -= 11
        } else {
          y += 10
        }
        const node = new DOMPoint(x, y).matrixTransform(matrix)
        return { x: node.x, y: node.y }
      }, { view, kind })
      if (!point) return "Copy label has no rendered transform"
      await page.mouse.move(point.x, point.y)
      // Let the frame's pointer coalescer and React tooltip commit process this
      // real mouse event before testing the semantic result.
      await page.evaluate(() => new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))))
      return (await tooltip(page).allTextContents()).join("\n")
    }, {
      message: `Painted Copy ${kind} in ${view} must expose its ledger tooltip`,
      intervals: [50]
    }).toMatch(kind === "node"
      ? /^Copy[\s\S]*63 visits/
      : /^Editor → Copy[\s\S]*45 handoffs/)
    return
  }
  const box = (await label.boundingBox())!
  let x = box.x + box.width / 2,
    y = box.y + box.height / 2
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
    await hoverCopyMark(page, pane, view)
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
  // Re-read the ribbon's rendered position; resize/intro animation may have
  // moved it since the preceding node hover.
  await hoverCopyMark(page, sankey, "sankey", "incoming-edge")
  await expect(tooltip(page).first()).toContainText(
    "Editor → Copy: 45 handoffs"
  )
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await page
    .getByRole("combobox", { name: "View A", exact: true })
    .selectOption("circuit")
  const circuit = page.locator('.novel-pane[data-view="circuit"]')
  await hoverCopyMark(page, circuit, "circuit")
  await expect(tooltip(page).first()).toContainText(
    "Queue and capacity: unmeasured"
  )
  await page.keyboard.press("Escape")
  await expect(tooltip(page)).toHaveCount(0)
  // A resize repaints the retained physics scene at the old pointer. Dismissal
  // lasts until fresh interaction, and the resized module remains inspectable.
  await page.setViewportSize({ width: 1180, height: 900 })
  await page.evaluate(
    () => new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await expect(tooltip(page)).toHaveCount(0)
  await hoverCopyMark(page, circuit, "circuit")
  await expect(tooltip(page).first()).toContainText("63 visits")
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
  const pipeTooltip = (await tooltip(page).first().boundingBox())!
  expect(pipeTooltip.x).toBeGreaterThanOrEqual(0)
  expect(pipeTooltip.x + pipeTooltip.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  await page.keyboard.press("Escape")
  await expect(tooltip(page)).toHaveCount(0)
  await page.mouse.move(point.x + 1, point.y)
  await expect(tooltip(page).first()).toContainText("45 handoffs")
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await circuit.locator(".stream-physics-frame").evaluate((frame: HTMLElement) =>
    frame.focus({ preventScroll: true })
  )
  await page.keyboard.press("Home")
  await expect(tooltip(page).first()).toContainText("Queue and capacity: unmeasured")
  await page.keyboard.press("Escape")
  await expect(tooltip(page)).toHaveCount(0)
  await page.keyboard.press("ArrowRight")
  await expect(tooltip(page).first()).toContainText("visits")
  await page.keyboard.press("Escape")
  await expect(tooltip(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const view of ["force", "sankey"]) {
  test(`${view} tooltips follow painted marks after repeated resizing`, async ({
    page
  }) => {
    await page.goto(route)
    await page.getByRole("button", { name: "Expand A", exact: true }).click()
    await page.getByRole("combobox", { name: "View A", exact: true }).selectOption(view)
    const pane = page.locator(`.novel-pane[data-view="${view}"]`)
    // The same theme color expressed as RGB is valid CSS. Hover targeting must
    // work with it too; a hex-only canvas pixel locator cannot find this mark.
    await pane.evaluate((element: HTMLElement) => {
      const swatch = document.createElement("span")
      swatch.style.color = "var(--semiotic-category-3)"
      element.append(swatch)
      const color = getComputedStyle(swatch).color
      swatch.remove()
      element.style.setProperty("--semiotic-category-3", color)
    })
    for (const width of [980, 1280, 1100]) {
      await page.setViewportSize({ width, height: 900 })
      await hoverCopyMark(page, pane, view)
      await expect(tooltip(page).first()).toContainText("Copy")
      await expect(tooltip(page).first()).toContainText("63 visits")
      const box = (await tooltip(page).first().boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      await page.mouse.move(2, 2)
      await expect(tooltip(page)).toHaveCount(0)
      if (view === "sankey") {
        await hoverCopyMark(page, pane, view, "incoming-edge")
        await expect(tooltip(page).first()).toContainText("Editor → Copy: 45 handoffs")
        const edgeBox = (await tooltip(page).first().boundingBox())!
        expect(edgeBox.x).toBeGreaterThanOrEqual(0)
        expect(edgeBox.x + edgeBox.width).toBeLessThanOrEqual(width)
        await page.mouse.move(2, 2)
        await expect(tooltip(page)).toHaveCount(0)
      }
    }
  })
}

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
  await hoverCopyMark(page, forest, "forest")
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
  await hoverCopyMark(page, forest, "forest")
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
