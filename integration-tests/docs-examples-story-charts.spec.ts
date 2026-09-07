import { expect, test, type Locator } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"

async function painted(locator: Locator, color?: [number, number, number]) {
  await expect
    .poll(() =>
      locator.locator("canvas").evaluateAll((canvases, target) => {
        let count = 0
        for (const canvas of canvases as HTMLCanvasElement[]) {
          const ctx = canvas.getContext("2d")
          if (!ctx || !canvas.width || !canvas.height) continue
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          for (let i = 0; i < data.length; i += 4) {
            if (
              data[i + 3] > 100 &&
              (target
                ? Math.abs(data[i] - target[0]) < 6 &&
                  Math.abs(data[i + 1] - target[1]) < 6 &&
                  Math.abs(data[i + 2] - target[2]) < 6
                : Math.max(data[i], data[i + 1], data[i + 2]) -
                    Math.min(data[i], data[i + 1], data[i + 2]) >
                  35)
            )
              count++
          }
        }
        return count
      }, color)
    )
    .toBeGreaterThan(40)
}

test("a grocery month is inspectable and a saved basket restores its path in another session", async ({
  page,
  browser
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/examples/grocery-bill")
  const chart = page.getByTestId("grocery-trajectory")
  await chart.scrollIntoViewIfNeeded()
  await painted(chart)
  const annotation = chart.locator("svg .annotation")
  const monthLabel = annotation.locator(".annotation-note-label")
  await expect(monthLabel).toHaveText("2025-06")
  const juneAnchor = await annotation.getAttribute("transform")
  await page.getByLabel("Follow a basket month").selectOption("2025-03")
  await expect(monthLabel).toHaveText("2025-03")
  await expect(annotation).not.toHaveAttribute("transform", juneAnchor!)
  await expect(page.getByTestId("trajectory-reading")).toContainText("$29.40")
  await page.getByLabel("Follow a basket month").selectOption("2025-06")
  await expect(monthLabel).toHaveText("2025-06")
  await expect(annotation).toHaveAttribute("transform", juneAnchor!)
  await expect(page.getByTestId("trajectory-reading")).toContainText("$27.29")
  await page.getByRole("button", { name: "Four dozen eggs" }).click()
  const event = page.waitForEvent("download")
  await page.getByRole("button", { name: "Data packet", exact: true }).click()
  const saved = await event
  const path = (await saved.path())!
  const other = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  try {
    const reopened = await other.newPage()
    await reopened.goto("http://127.0.0.1:3000/examples/grocery-bill")
    await reopened
      .getByLabel("Reopen a saved basket packet")
      .setInputFiles(path)
    await expect(reopened.getByTestId("after-total")).toHaveText("$38.61")
    await expect(reopened.getByTestId("grocery-reopen-status")).toContainText(
      "restored and verified"
    )
    await painted(reopened.getByTestId("grocery-trajectory"))
    const packet = JSON.parse(await readFile(path, "utf8"))
    packet.history[0].costUSD = 999
    await reopened
      .getByLabel("Reopen a saved basket packet")
      .setInputFiles({
        name: "altered.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(packet))
      })
    await expect(reopened.locator(".grocery-feedback")).toContainText(
      "Could not reopen"
    )
    await expect(reopened.getByTestId("after-total")).toHaveText("$38.61")
  } finally {
    await other.close()
  }
})

test("flight schedules are visibly hatched and notes survive the guided transformation", async ({
  page
}) => {
  await page.goto("/examples/plane-day")
  const path = page.getByTestId("time-space-chart")
  await path.scrollIntoViewIfNeeded()
  await painted(path, [40, 122, 121])
  await painted(path, [89, 102, 116])
  await page
    .getByLabel("Your local note about this flight")
    .fill("Follow this exact flight through the other view.")
  await page.getByRole("button", { name: "Attach note to this flight" }).click()
  const identity = await page
    .getByTestId("pinned-flight")
    .getAttribute("data-event-id")
  await page
    .getByRole("button", { name: "Switch view and clocks; keep this flight" })
    .click()
  await expect(page.getByLabel("View", { exact: true })).toHaveValue("network")
  await expect(page.getByLabel("Clock labels")).toHaveValue("utc")
  await expect(page.getByTestId("pinned-flight")).toHaveAttribute(
    "data-event-id",
    identity!
  )
  await expect(page.getByRole("blockquote")).toContainText("this exact flight")
  await page.getByLabel("View", { exact: true }).selectOption("timeline")
  const ribbon = page.locator(".plane-wide-ribbon")
  await ribbon.scrollIntoViewIfNeeded()
  await painted(ribbon, [40, 122, 121])
  await painted(ribbon, [89, 102, 116])
  await ribbon.screenshot({ path: "/private/tmp/story-flight-hatching.png" })
  const event = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Download printable day sheet" })
    .click()
  const html = await readFile((await (await event).path())!, "utf8")
  expect(html).toContain("<pattern")
  expect(html).toContain("this exact flight")
})

test("reservoir dots retain baseline limits and travel into the offline download", async ({
  page
}) => {
  await page.goto("/examples/reservoir-guide")
  const distribution = page.getByTestId("reservoir-distribution")
  await distribution.scrollIntoViewIfNeeded()
  await painted(distribution, [98, 104, 87])
  await expect(distribution).toContainText("30 eligible readings")
  await page.getByRole("button", { name: "Try leap day" }).click()
  await expect(distribution).toContainText("7 eligible readings")
  await expect(distribution).toContainText("a percentile requires 20")
  await page.getByRole("button", { name: "Oroville’s changed measure" }).click()
  await expect(distribution).toContainText("No eligible historical dots")
  await expect(page.getByTestId("distribution-chart")).toHaveCount(0)
  await page.getByLabel("Reservoir", { exact: true }).selectOption("SHA")
  const event = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download offline HTML" }).click()
  const html = await readFile((await (await event).path())!, "utf8")
  expect(html).toContain("Where this reading sits")
  expect(html).toContain("30 eligible readings")
})

for (const width of [320, 390, 1280]) {
  test(`new story charts paint without overflow at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    for (const [route, article, chartID] of [
      ["grocery-bill", ".grocery-story", "grocery-trajectory"],
      ["plane-day", ".plane-story", "time-space-chart"],
      ["reservoir-guide", ".reservoir-story", "reservoir-distribution"]
    ]) {
      await page.goto(`/examples/${route}`)
      const chart = page.getByTestId(chartID)
      await chart.scrollIntoViewIfNeeded()
      await painted(
        chart,
        route === "reservoir-guide" ? [98, 104, 87] : undefined
      )
      await chart.screenshot({
        path: `/private/tmp/story-${route}-${width}.png`
      })
      const box = await page
        .locator(article)
        .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }))
      expect(box.scroll).toBeLessThanOrEqual(box.width + 1)
      if (width === 390) {
        const audit = await new AxeBuilder({ page }).include(article).analyze()
        expect(audit.violations).toEqual([])
      }
    }
  })
}
