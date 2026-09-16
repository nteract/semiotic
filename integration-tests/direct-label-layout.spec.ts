import { test, expect, type Locator } from "@playwright/test"

async function layout(chart: Locator) {
  return JSON.parse(
    (await chart
      .locator(".semiotic-direct-labels")
      .getAttribute("data-label-layout")) || "null"
  )
}
async function boxes(chart: Locator) {
  return chart.locator("[data-direct-label-id] text").evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const box = (node as SVGTextElement).getBBox()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      })
      .sort((a, b) => a.y - b.y)
  )
}
test.beforeEach(async ({ page }) => {
  await page.goto("/direct-label-examples/")
  await expect
    .poll(
      async () =>
        (await layout(page.getByTestId("magnitude-1")))?.measurement.measured
    )
    .toBe(6)
})

test("painted text is invariant across units, separated and bounded after resize and font change", async ({
  page
}) => {
  const charts = [
    "magnitude-0.000001",
    "magnitude-1",
    "magnitude-1000000000"
  ].map((id) => page.getByTestId(id))
  for (const phase of ["initial", "resize", "font"]) {
    if (phase === "resize")
      await page.getByRole("button", { name: "Resize charts" }).click()
    if (phase === "font")
      await page.getByRole("button", { name: "Change font" }).click()
    await expect.poll(async () => (await layout(charts[0])).rendered).toBe(6)
    const all = await Promise.all(charts.map(boxes))
    for (const set of all)
      set.forEach((box, i) => {
        expect(Math.abs(box.y - all[0][i].y)).toBeLessThanOrEqual(1)
        expect(box.y).toBeGreaterThanOrEqual(-1)
        expect(box.y + box.height).toBeLessThanOrEqual(
          (phase === "initial" ? 230 : 130) + 1
        )
        if (i)
          expect(
            box.y - set[i - 1].y - set[i - 1].height
          ).toBeGreaterThanOrEqual(1)
      })
  }
})

test("actual omissions have evidence and accessible fallback; axes report measured collisions", async ({
  page
}) => {
  const chart = page.getByTestId("impossible")
  const evidence = await layout(chart)
  expect(evidence.omitted).toBeGreaterThan(0)
  expect(evidence.requested).toBe(evidence.rendered + evidence.omitted)
  await expect(chart.locator("[data-direct-label-id]")).toHaveCount(
    evidence.rendered
  )
  await expect(chart.locator("svg > desc")).toContainText("Series 29:")
  await expect
    .poll(async () => {
      const axes = await page
        .getByTestId("colliding-axis")
        .locator("[data-axis-label-layout]")
        .getAttribute("data-axis-label-layout")
      return JSON.parse(axes!).collisions
    })
    .toBeGreaterThan(0)
})

test("push updates refresh endpoints with fixed domains and font-load invalidation remeasures", async ({
  page
}) => {
  const chart = page.getByTestId("push")
  await page.getByRole("button", { name: "Push initial data" }).click()
  await expect(chart.locator("[data-direct-label-id]")).toHaveCount(6)
  const before = await chart
    .locator('[data-direct-label-id="Series 0"] text')
    .getAttribute("y")
  await page.getByRole("button", { name: "Push new endpoint" }).click()
  await expect
    .poll(async () =>
      chart.locator('[data-direct-label-id="Series 0"] text').getAttribute("y")
    )
    .not.toBe(before)
  await expect(chart.locator("svg > desc")).toContainText(
    "Series 0: x 2, y 0.2"
  )
  // A synthetic event exercises the same invalidation subscription without an external font dependency.
  await page.evaluate(() =>
    document.fonts.dispatchEvent(new Event("loadingdone"))
  )
  await expect
    .poll(async () => (await layout(chart)).measurement.measured)
    .toBe(6)
})
