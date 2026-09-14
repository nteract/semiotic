import { test, expect, type Page } from "@playwright/test"
import { readFile, writeFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"

test.use({ actionTimeout: 10_000 })

async function openLab(page: Page) {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/examples/atlas-acceptance")
  try {
    await expect(page.getByTestId("atlas-evaluation")).toBeVisible()
  } catch (error) {
    throw new Error(`${error}\n${errors.join("\n")}`)
  }
}

test("large Atlas overview selects without re-preparation and exports the complete evidence", async ({
  page
}, testInfo) => {
  await openLab(page)
  const demo = page.getByTestId("atlas-evaluation")
  await demo
    .getByRole("combobox", { name: "Workload", exact: true })
    .selectOption("10000")
  await expect(demo).toHaveAttribute("data-ready", "true")
  await expect(demo.getByTestId("atlas-facts")).toContainText("50,000")
  await expect(demo).toContainText("397 visible glyphs")
  await expect(demo.getByTestId("acceptance-checks")).not.toContainText("Fail")
  const preparations = await demo.getAttribute("data-preparations")
  const canvas = demo.locator("canvas").first()
  await expect(canvas).toBeVisible()
  const initial = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.toDataURL()
  )
  await demo.getByLabel("Inspect vertex").selectOption("r1.2")
  await expect(demo.getByTestId("atlas-vertex-reading")).toContainText("r1.2")
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())
    )
    .not.toBe(initial)
  const frame = demo.locator(".stream-network-frame")
  await frame.press("Home")
  await frame.press("Space")
  await expect(demo.getByLabel("Inspect vertex")).toHaveValue("r1.1")
  await demo.getByText("Read chart interactions", { exact: true }).click()
  await expect(demo.getByTestId("atlas-observation")).toContainText("r1.1")
  await canvas.hover({ position: { x: 60, y: 130 } })
  await demo.getByRole("button", { name: "Measure 50 selections" }).click()
  await expect(demo.getByTestId("selection-timing")).toContainText("50 samples")
  await expect(demo).toHaveAttribute("data-preparations", preparations!)
  const download = page.waitForEvent("download")
  await demo.getByRole("button", { name: "Export evidence JSON" }).click()
  const completed = await download
  const packet = JSON.parse(
    await readFile((await completed.path()) as string, "utf8")
  )
  expect(packet.synthetic).toBe(true)
  expect(packet.config.props.forest.atlas.source.nodes).toHaveLength(10000)
  expect(packet.config.props.forest.atlas.source.edges).toHaveLength(50000)
  expect(packet.selectionTiming.samples).toBe(50)
  expect(packet.selectionTiming.p95Ms).toBeGreaterThan(0)
  const report = testInfo.outputPath("atlas-selection-performance.json")
  await writeFile(
    report,
    JSON.stringify(
      {
        ...packet.selectionTiming,
        viewport: page.viewportSize(),
        nodes: 10000,
        edges: 50000,
        visibleGlyphs: 397
      },
      null,
      2
    ) + "\n"
  )
  await testInfo.attach("atlas-selection-performance", {
    path: report,
    contentType: "application/json"
  })
  await page.screenshot({
    path: testInfo.outputPath("atlas-acceptance-desktop.png"),
    fullPage: true
  })
  await page.getByRole("button", { name: "Switch to light mode" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="atlas-evaluation"]')
        .analyze()
    ).violations
  ).toEqual([])
  await expect(demo).toHaveAttribute("data-preparations", preparations!)
  // Timing is reported against the 50 ms product target for this environment;
  // correctness never gets a wider tolerance on a slower shared CI runner.
  await expect(demo.getByRole("alert")).toHaveCount(0)
})

test("newer worker requests win and witness budgets leave graph facts intact", async ({
  page
}) => {
  await openLab(page)
  const demo = page.getByTestId("atlas-evaluation")
  await demo
    .getByRole("combobox", { name: "Workload", exact: true })
    .selectOption("10000")
  await demo
    .getByRole("combobox", { name: "Workload", exact: true })
    .selectOption("1000")
  await expect(demo).toHaveAttribute("data-ready", "true")
  await expect(demo.getByTestId("atlas-facts")).toContainText(
    "1,000 work items"
  )
  await demo.getByLabel("Fan witness limit").selectOption("2")
  await expect(demo).toHaveAttribute("data-ready", "true")
  await expect(demo.getByTestId("atlas-facts")).toContainText(
    "Truncated witnesses2,000"
  )
  await demo.getByLabel("Reverse display backbone").check()
  await expect(demo).toHaveAttribute(
    "data-ranking-policy",
    "rooted-traversal:id-desc"
  )
  await expect(demo).toHaveAttribute("data-ready", "true")
  await expect(demo.getByTestId("atlas-facts")).toContainText(
    "1,000 work items"
  )
  const preparations = await demo.getAttribute("data-preparations")
  await demo.getByLabel("Open region").selectOption("4")
  await expect(demo.getByLabel("Inspect vertex")).toHaveValue("r5.1")
  await expect(demo).toHaveAttribute("data-preparations", preparations!)
  await expect(demo.getByTestId("acceptance-checks")).not.toContainText("Fail")
})

test("the mobile inspector remains accessible and exports a static overview", async ({
  page
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openLab(page)
  const demo = page.getByTestId("atlas-evaluation")
  await expect(demo).toHaveAttribute("data-ready", "true")
  await demo.getByLabel("Inspect vertex").selectOption("r1.8")
  await expect(demo.getByTestId("atlas-vertex-reading")).toContainText("r1.8")
  await demo
    .getByText("Show original-edge support for r1.8", { exact: true })
    .click()
  await expect(
    demo
      .getByRole("table", { name: "Original edges incident to r1.8" })
      .locator("tbody tr")
  ).toHaveCount(10)
  await expect(
    demo.getByRole("button", { name: "Measure 50 selections" })
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="atlas-evaluation"]')
        .analyze()
    ).violations
  ).toEqual([])
  await page.getByRole("button", { name: "Switch to light mode" }).click()
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="atlas-evaluation"]')
        .analyze()
    ).violations
  ).toEqual([])
  const pending = page.waitForEvent("download")
  await demo.getByRole("button", { name: "Export static SVG" }).click()
  const download = await pending
  expect(download.suggestedFilename()).toBe("atlas-acceptance.svg")
  const svg = await readFile((await download.path()) as string, "utf8")
  expect(svg).toContain("Atlas acceptance overview")
  expect(svg).toContain("500 internal links")
  expect(svg).not.toMatch(/NaN|Infinity/)
  await page.screenshot({
    path: testInfo.outputPath("atlas-acceptance-mobile.png"),
    fullPage: true
  })
})
