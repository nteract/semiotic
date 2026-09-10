import { test, expect, type Locator, type Page } from "@playwright/test"

async function hoverAt(page: Page, chart: Locator, x: number, y: number) {
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + x, box!.y + y)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/chart-features-examples/")
  await expect(
    page.getByTestId("linked-line").locator("canvas").first()
  ).toBeVisible()
  await expect(
    page.getByTestId("upper-histogram").locator('[data-orient="left"]')
  ).toBeVisible()
})

test("category bars dim lines, and field hover from lines highlights bars", async ({
  page
}) => {
  const example = page.getByTestId("temporal-linked-example")
  await hoverAt(page, page.getByTestId("category-source"), 210, 70)
  await expect(page.getByTestId("selection-summary")).toHaveText(
    "3 matching observations: North"
  )
  await expect(example).toHaveScreenshot("bar-to-line.png")
  // South's first vertex: x=5, y=8 in the fixed [0,30] × [0,12] domains.
  await hoverAt(
    page,
    page.getByTestId("linked-line"),
    48 + 652 / 6,
    28 + 154 / 3
  )
  await expect(page.getByTestId("selection-summary")).toHaveText(
    "3 matching observations: South"
  )
  await expect(example).toHaveScreenshot("line-to-bar-field.png")
  await page.mouse.move(850, 10)
  await expect(page.getByTestId("selection-summary")).toContainText(
    "Hover a category bar"
  )
})

test("a bin emits its source time and category and highlights the corresponding line point", async ({
  page
}) => {
  await hoverAt(page, page.getByTestId("upper-histogram"), 374, 60)
  await expect(page.getByTestId("selection-summary")).toHaveText(
    "1 matching observations: North"
  )
  await expect(page.getByTestId("temporal-linked-example")).toHaveScreenshot(
    "bin-to-line-point.png"
  )
})

test("mirrored histograms share a zero baseline and resize natively", async ({
  page
}) => {
  const upper = page.getByTestId("upper-histogram")
  const lower = page.getByTestId("lower-histogram")
  await expect(upper.locator('[data-orient="bottom"]')).toHaveCount(0)
  const a = await upper.boundingBox()
  const b = await lower.boundingBox()
  expect(a!.y + a!.height).toBe(b!.y)
  await expect(page.getByTestId("mirrored-histograms")).toHaveScreenshot(
    "shared-zero-baseline.png"
  )
  await page.getByRole("button", { name: "Resize charts" }).click()
  await expect
    .poll(
      async () => (await upper.locator("canvas").first().boundingBox())!.width
    )
    .toBe(420)
  await expect
    .poll(
      async () =>
        (await page
          .getByTestId("responsive-height")
          .locator("canvas")
          .first()
          .boundingBox())!.height
    )
    .toBe(140)
  await expect(
    page.getByTestId("responsive-height").locator('[data-orient="left"]')
  ).toHaveCount(0)
  await expect(page.getByTestId("responsive-example")).toHaveScreenshot(
    "responsive-mirrored-histograms.png"
  )
  await expect(page.getByTestId("responsive-height")).toHaveScreenshot(
    "responsive-height-hidden-value-axis.png"
  )
})

test("threshold end caps render beside a top axis and top legend", async ({
  page
}) => {
  const chart = page.getByTestId("thresholds-and-top-legend")
  await expect(chart.locator(".semiotic-threshold-end-cap")).toHaveCount(
    2
  )
  const axis = await chart.locator('[data-orient="top"]').boundingBox()
  for (const item of await chart.locator(".legend-item").all()) {
    const box = await item.boundingBox()
    expect(box!.y + box!.height).toBeLessThan(axis!.y)
  }
  await expect(chart).toHaveScreenshot("threshold-caps-top-legend.png")
})

test("default gauge readouts use native SVG in React and server output", async ({
  page
}) => {
  const charts = page.getByTestId("gauge-parity")
  await expect(
    page.getByTestId("server-gauge").locator("foreignObject")
  ).toHaveCount(0)
  await expect(
    page.getByTestId("server-gauge").locator("text").filter({ hasText: /^64$/ })
  ).toHaveCount(1)
  await expect(charts.locator(".semiotic-radial-center-content")).toHaveCount(2)
  expect(
    await charts
      .locator(".semiotic-radial-center-content")
      .first()
      .evaluate((node) => node.namespaceURI)
  ).toBe("http://www.w3.org/2000/svg")
  await expect(charts).toHaveScreenshot("native-gauge-readouts.png")
})
