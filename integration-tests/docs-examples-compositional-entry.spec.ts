import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function hoverWire(page: Page, id: string) {
  // Camera controls begin their transition on the next animation frame.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  await expect(page.locator(".compositional-lab")).toHaveAttribute(
    "data-camera-phase",
    "idle"
  )
  const point = await page
    .locator(`[data-wire="${id}"]`)
    .evaluate((element) => {
      const path = element as SVGPathElement
      const p = path.getPointAtLength(path.getTotalLength() * 0.55)
      const screen = new DOMPoint(p.x, p.y).matrixTransform(
        path.getScreenCTM()!
      )
      return { x: screen.x, y: screen.y }
    })
  await page.mouse.move(point.x, point.y)
  await expect(page.getByRole("tooltip")).toContainText(id)
  await expect(page.getByRole("tooltip")).toContainText("precision unknown")
  const box = await page.getByRole("tooltip").boundingBox()
  const frame = await page
    .locator(".compositional-chart .stream-network-frame")
    .boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1
  )
  expect(box!.y).toBeGreaterThanOrEqual(frame!.y)
  expect(box!.y + box!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1)
  await page.mouse.move(0, 0)
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  return point
}

test("compositional docs demonstrate geometry, optimization, trace and exact duplicate selection", async ({
  page
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() =>
    localStorage.setItem("semiotic-theme", "light")
  )
  await page.goto("/examples/compositional-dag")
  const lab = page.getByRole("region", {
    name: "Interactive compositional DAG",
    exact: true
  })
  await expect(lab.locator("[data-wire]")).toHaveCount(7)
  await expect(lab).toHaveAttribute("data-camera-phase", "idle")
  await page.screenshot({
    path: testInfo.outputPath("compositional-desktop.png")
  })
  await expect(page.getByTestId("dag-trace")).toContainText(
    "3 wires · 1 declared transfer"
  )
  const pathData = () =>
    lab
      .locator("[data-wire]")
      .evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))
  const original = await pathData()
  const calls = await lab.getAttribute("data-solve-count")
  await page.getByLabel("Show row graphics", { exact: true }).uncheck()
  expect(await pathData()).toEqual(original)
  await page.getByLabel("DAG representation").selectOption("wires")
  await expect(lab.locator("[data-part]")).toHaveCount(0)
  expect(await pathData()).toEqual(original)
  await expect(lab).toHaveAttribute("data-solve-count", calls!)
  await page.getByLabel("DAG representation").selectOption("composite")
  await page.getByLabel("Show row graphics", { exact: true }).check()

  const row = await lab
    .locator('[data-part="orders:customer"] rect')
    .boundingBox()
  const anchor = await lab
    .locator('[data-wire="input-customer"]')
    .evaluate((element) => {
      const path = element as SVGPathElement
      const p = path.getPointAtLength(0)
      return new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!).y
    })
  expect(Math.abs(row!.y + row!.height / 2 - anchor)).toBeLessThan(1)
  await lab.locator('[data-part="orders:customer"] rect').hover({ force: true })
  await expect(page.getByRole("tooltip")).toContainText(
    "Order input / Customer"
  )
  await page.mouse.move(0, 0)
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  // The owner covers its rows: smaller nested hit targets retain their datum.
  await lab.locator('[data-part="orders:customer"] rect').click({ force: true })
  await expect(page.getByLabel("Trace a connection upstream")).toHaveValue("")
  await page.getByLabel("Trace a connection upstream").selectOption("output-customer")
  const keyboardFrame = lab.locator(".stream-network-frame")
  await keyboardFrame.focus()
  await keyboardFrame.press("Home")
  await expect(page.getByRole("tooltip")).toContainText("Order input")
  await keyboardFrame.press("ArrowRight")
  await expect(page.getByRole("tooltip")).toContainText("Copy fields")
  await keyboardFrame.press("ArrowRight")
  await expect(page.getByRole("tooltip")).toContainText("Invoice output")
  await keyboardFrame.press("Enter")
  await expect(page.getByRole("tooltip")).toContainText("Invoice output / Customer")
  await keyboardFrame.press("ArrowDown")
  await expect(page.getByRole("tooltip")).toContainText("Invoice output / Quantity")
  await keyboardFrame.press("Escape")
  await expect(page.getByRole("tooltip")).toContainText("Invoice output")
  await expect(page.getByRole("tooltip")).not.toContainText("Quantity")
  await keyboardFrame.press("Escape")
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  const wire = await hoverWire(page, "output-quantity")
  await page.mouse.click(wire.x, wire.y)
  await expect(page.getByLabel("Trace a connection upstream")).toHaveValue(
    "output-quantity"
  )
  await page
    .getByLabel("Trace a connection upstream")
    .selectOption("output-customer")

  const fixed = Number(await page.getByTestId("dag-crossings").textContent())
  await page.getByLabel("Allow row reordering").check()
  await expect
    .poll(async () =>
      Number(await page.getByTestId("dag-crossings").textContent())
    )
    .toBeLessThan(fixed)
  const optimizedCalls = await lab.getAttribute("data-solve-count")
  await page.getByRole("button", { name: "Zoom in", exact: true }).click()
  await hoverWire(page, "output-quantity")
  const frame = lab.locator(".stream-network-frame")
  await frame.focus()
  await page.keyboard.press("Alt+ArrowRight")
  await hoverWire(page, "output-quantity")
  await expect(lab).toHaveAttribute("data-solve-count", optimizedCalls!)

  const trace = await page.getByTestId("dag-trace").textContent()
  await page.getByLabel("DAG representation").selectOption("summary")
  await expect(lab.locator('[data-wire="output-customer"]')).toHaveAttribute(
    "stroke-dasharray",
    "5 4"
  )
  await expect(page.getByTestId("dag-trace")).toHaveText(trace!)
  await page.getByLabel("DAG representation").selectOption("exploded")
  await expect(lab.locator("[data-part]")).toHaveCount(9)
  const firstExplodedRow = await lab.locator('[data-part^="orders:"]').evaluateAll((rows) =>
    rows.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y)[0]
      .querySelector("text")!.textContent
  )
  await keyboardFrame.focus()
  await keyboardFrame.press("Home")
  await expect(page.getByRole("tooltip")).toContainText("Order input")
  await expect(page.getByRole("tooltip")).not.toContainText("Order input /")
  await keyboardFrame.press("Enter")
  await expect(page.getByRole("tooltip")).toContainText(`Order input / ${firstExplodedRow}`)
  await keyboardFrame.press("Escape")
  await expect(page.getByRole("tooltip")).not.toContainText("Order input /")
  await keyboardFrame.press("Escape")
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  await expect(page.getByTestId("dag-trace")).toHaveText(trace!)
  await expect(lab.locator('[data-wire="output-quantity"]')).toHaveAttribute(
    "data-active",
    "false"
  )

  await page.getByText("Inspect all 7 connections", { exact: true }).click()
  const duplicate = page.getByRole("button", {
    name: "input-customer-audit",
    exact: true
  })
  await duplicate.focus()
  await page.keyboard.press("Enter")
  await expect(duplicate).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByRole("button", { name: "input-customer", exact: true })
  ).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByLabel("Trace a connection upstream")).toHaveValue(
    "input-customer-audit"
  )
  await page
    .getByText("Navigate parts and ports with the keyboard", { exact: true })
    .click()
  await page.getByLabel("Inspect an interface owner").selectOption("copy")
  await page.getByLabel("Inspect an interface owner").press("Enter")
  await expect(
    page.getByRole("button", { name: "Customer", exact: true })
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(page.getByLabel("Inspect an interface owner")).toBeFocused()

  await page.setViewportSize({ width: 390, height: 844 })
  await lab.locator(".compositional-chart").scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: "Fit", exact: true }).click()
  await hoverWire(page, "output-quantity")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByRole("button", { name: "Switch to dark mode" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await lab.locator(".compositional-chart").scrollIntoViewIfNeeded()
  await expect(lab.locator('[data-part="orders:customer"] rect')).toBeVisible()
  await hoverWire(page, "output-quantity")
  await page.screenshot({
    path: testInfo.outputPath("compositional-mobile-dark.png")
  })
  const audit = await new AxeBuilder({ page })
    .include(".compositional-lab")
    .analyze()
  expect(audit.violations).toEqual([])
  expect(errors).toEqual([])
})

test("compositional docs are discoverable and expose complete source", async ({
  page
}) => {
  await page.goto("/examples")
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "Compositional DAGs",
        exact: true
      })
    })
    .click()
  await expect(page).toHaveURL(/\/examples\/compositional-dag\/?$/)
  await page
    .getByRole("button", { name: "Show full code view", exact: true })
    .click()
  await expect(
    page.getByRole("tablist", { name: "Example source files" }).getByRole("tab")
  ).toHaveCount(4)
  await page
    .getByRole("tab", { name: "compositional-dag/model.ts", exact: true })
    .click()
  await expect(page.getByRole("tabpanel")).toContainText("input-customer-audit")
  await page.goto("/custom-charts/custom-layouts#compositional-dags")
  await page
    .getByRole("link", {
      name: "interactive Compositional DAGs example",
      exact: true
    })
    .click()
  await expect(
    page.getByRole("heading", { name: "Compositional DAGs", exact: true })
  ).toBeVisible()
})
