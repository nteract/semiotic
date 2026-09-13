import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("Motif Braid switches public stories and exports a reusable static reading", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/charts/motif-braid-chart")
  const demo = page.getByTestId("atlas-reader-demo")
  try {
    await expect(demo.getByTestId("atlas-takeaway")).toContainText("8% to 30%")
  } catch (error) {
    throw new Error(`${error}\n${errors.join("\n")}`)
  }
  await expect(
    demo.getByRole("table").filter({ hasText: "Supported journeys" })
  ).toContainText("3. checkout")
  await demo
    .getByRole("combobox", { name: "Story", exact: true })
    .selectOption("search")
  await expect(demo.getByTestId("atlas-takeaway")).toContainText("6,000")
  await expect(
    demo.getByRole("table").filter({ hasText: "Supported journeys" })
  ).toContainText("query")
  const download = page.waitForEvent("download")
  await demo
    .getByRole("button", { name: "Export static SVG", exact: true })
    .click()
  expect((await download).suggestedFilename()).toBe("search-atlas.svg")
  await expect(demo.getByRole("alert")).toHaveCount(0)
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="atlas-reader-demo"]')
    .analyze()
  expect(audit.violations).toEqual([])
})

test("the phone dependency reader retains a vertex when a bypass changes required paths", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/charts/dependency-forest-chart")
  const demo = page.getByTestId("atlas-reader-demo")
  await demo.getByLabel("Inspect vertex").selectOption("A")
  const table = demo
    .getByRole("table")
    .filter({ hasText: "Required predecessors" })
  await expect(table).toContainText('"X"')
  await demo.getByLabel("Add zero-capacity bypass").check()
  await expect(demo.getByLabel("Inspect vertex")).toHaveValue("A")
  await expect(table).not.toContainText('"X"')
  await demo.getByLabel("Add zero-capacity bypass").uncheck()
  await expect(demo.getByLabel("Inspect vertex")).toHaveValue("A")
  await expect(table).toContainText('"X"')
  await demo.getByLabel("Add zero-capacity bypass").check()
  await demo.getByLabel("Inspect vertex").selectOption("Y")
  await expect(table.locator("tbody tr")).toHaveCount(1)
  await demo.getByLabel("Add zero-capacity bypass").uncheck()
  await expect(demo.getByLabel("Inspect vertex")).toHaveValue("")
  await expect(table.locator("tbody tr")).toHaveCount(6)
  await expect(
    table.getByRole("rowheader", { name: "Y", exact: true })
  ).toHaveCount(0)
  await expect(demo.getByTestId("atlas-takeaway")).toContainText(
    "70% shortfall"
  )
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.slice(0, 100),
        right: el.getBoundingClientRect().right
      }))
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    ),
    JSON.stringify(overflow)
  ).toBe(true)
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="atlas-reader-demo"]')
    .analyze()
  expect(audit.violations).toEqual([])
})

test("Flow Circuit reads observed and modeled editions with accessible time controls", async ({
  page
}) => {
  await page.goto("/charts/flow-circuit-chart")
  const demo = page.getByTestId("atlas-reader-demo")
  await demo.getByLabel("Inspect vertex").selectOption("p1")
  await expect(
    demo.getByRole("table").filter({ hasText: "observed edition" })
  ).toContainText("queued: 1200000")
  await demo.getByLabel("Observation time").fill("0")
  await expect(
    demo.getByRole("table").filter({ hasText: "observed edition" })
  ).toContainText("queued: 0")
  await demo.getByLabel("Read modeled edition").check()
  await expect(
    demo.getByRole("table").filter({ hasText: "modeled edition" })
  ).toContainText("queued: 0")
  await demo
    .getByRole("combobox", { name: "Story", exact: true })
    .selectOption("retry")
  await demo.getByLabel("Inspect vertex").selectOption("inventory")
  await expect(
    demo.getByRole("table").filter({ hasText: "observed edition" })
  ).toContainText("queued: unmeasured")
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="atlas-reader-demo"]')
    .analyze()
  expect(audit.violations).toEqual([])
})
