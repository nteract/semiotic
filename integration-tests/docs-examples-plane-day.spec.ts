import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"
import snapshot from "../docs/src/pages/examples/plane-day/snapshot.json"

test("plane story preserves a flight through layouts, clocks, URL and an independent note import", async ({
  page,
  browser
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/plane-day")
  await expect(
    page.getByRole("heading", { name: "Your plane has had a day." })
  ).toBeVisible()
  await expect(page.getByTestId("flight-charts")).toBeVisible()
  await page.screenshot({ path: "/private/tmp/e02-desktop.png" })
  await page.getByRole("button", { name: "Pin HA 466 · PPG → HNL" }).click()
  const selected = await page
    .getByTestId("pinned-flight")
    .getAttribute("data-event-id")
  await page.getByLabel("View", { exact: true }).selectOption("network")
  await page.getByLabel("Clock labels").selectOption("utc")
  await page
    .locator(".plane-charts")
    .screenshot({ path: "/private/tmp/e02-network.png" })
  await expect(page.getByTestId("flight-charts")).toHaveAttribute(
    "data-selected-event",
    selected!
  )
  await page
    .getByLabel("Your local note about this flight")
    .fill(
      "The last arrival is on July 11; the scheduled-date window continues overnight."
    )
  await page.getByRole("button", { name: "Attach note to this flight" }).click()
  const url = await page
    .getByRole("link", { name: "Open this flight and notes from a link" })
    .getAttribute("href")
  await page.goto(url!)
  await page.reload()
  await expect(page.getByTestId("pinned-flight")).toHaveAttribute(
    "data-event-id",
    selected!
  )
  await expect(page.getByRole("blockquote")).toContainText(
    "last arrival is on July 11"
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId("pinned-flight")).toHaveAttribute(
    "data-event-id",
    selected!
  )
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download note packet" }).click()
  const saved = await download
  expect(await saved.failure()).toBeNull()
  const path = await saved.path()
  const packet = JSON.parse(await readFile(path!, "utf8"))
  expect(packet.state.selected.eventId).toBe(selected)
  expect(
    packet.checks.every((check: { status: string }) => check.status === "pass")
  ).toBe(true)
  const separate = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  try {
    const other = await separate.newPage()
    await other.goto("http://127.0.0.1:3000/examples/plane-day")
    await other.getByLabel("Import note packet").setInputFiles(path!)
    await expect(other.getByTestId("pinned-flight")).toHaveAttribute(
      "data-event-id",
      selected!
    )
    await expect(other.getByRole("blockquote")).toContainText(
      "last arrival is on July 11"
    )
    await expect(other.getByLabel("View", { exact: true })).toHaveValue(
      "network"
    )
    const sheetDownload = other.waitForEvent("download")
    await other
      .getByRole("button", { name: "Download printable day sheet" })
      .click()
    const sheet = await sheetDownload
    const html = await readFile((await sheet.path())!, "utf8")
    expect(html).toContain(`data-event-id="${selected}" data-selected="true"`)
    expect(html).toContain("last arrival is on July 11")
    expect(html).toContain(snapshot.editionId)
  } finally {
    await separate.close()
  }
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1280]) {
  test(`plane itinerary supports keyboard, forced colors and no overflow at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/examples/plane-day")
    const button = page.getByRole("button", { name: "Pin HA 11 · SFO → HNL" })
    await button.focus()
    await page.keyboard.press("Enter")
    await expect(button).toHaveAttribute("aria-pressed", "true")
    const bounds = await button.boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    await page.getByLabel("View", { exact: true }).selectOption("network")
    const geometry = await page.locator(".plane-story").evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth
    }))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1)
    await page.emulateMedia({ forcedColors: "active" })
    await expect(button).toBeVisible()
    await page
      .locator(".plane-story")
      .evaluate((element) => ((element as HTMLElement).style.fontSize = "34px"))
    const zoomed = await page.locator(".plane-story").evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth
    }))
    expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.width + 1)
    if (width === 390) {
      await page.emulateMedia({ forcedColors: "none" })
      await page
        .locator(".plane-story")
        .evaluate((element) => ((element as HTMLElement).style.fontSize = ""))
      await page
        .getByRole("heading", { name: "The day, leg by leg." })
        .scrollIntoViewIfNeeded()
      await page.screenshot({ path: "/private/tmp/e02-mobile-itinerary.png" })
      await page
        .locator(".plane-itinerary")
        .screenshot({ path: "/private/tmp/e02-mobile-cards.png" })
    }
  })
}

test("plane opening and essential controls have no automated accessibility violations", async ({
  page
}) => {
  await page.goto("/examples/plane-day")
  await expect(page.getByTestId("flight-charts")).toBeVisible()
  const result = await new AxeBuilder({ page })
    .include(".plane-story")
    .analyze()
  expect(result.violations).toEqual([])
})

test("cohort selection opens real day files, exposes breaks and preserves a failed request for retry", async ({
  page
}) => {
  const edition = `/stories/plane-day/${snapshot.editionId}`
  const response = await page.request.get(`${edition}/days/2025-07-02.json`)
  expect(response.ok()).toBe(true)
  const days = await response.json()
  const broken = days.find(
    (day: { breaks: unknown[] }) => day.breaks.length > 0
  )
  expect(broken).toBeTruthy()
  await page.goto("/examples/plane-day")
  await page.getByLabel("Comparison pattern").selectOption("ineligible")
  await page.getByLabel("Explore an aircraft-day").selectOption(broken.id)
  await expect(
    page.getByText("Observed chain breaks here:", { exact: false }).first()
  ).toBeVisible()
  await expect(page.getByTestId("day-summary")).toContainText(broken.tail)
  const link = await page
    .getByRole("link", { name: "Open this flight and notes from a link" })
    .getAttribute("href")
  await page.goto(link!)
  await expect(page.getByTestId("pinned-flight")).toHaveAttribute(
    "data-event-id",
    broken.flights[0].id
  )
  const next = snapshot.days.find(
    (day) => day.pattern !== "ineligible" && day.date === "2025-07-03"
  )!
  await page.route(`**${edition}/days/2025-07-03.json`, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" })
  )
  await page.getByLabel("Explore an aircraft-day").selectOption(next.id)
  await expect(page.getByRole("alert")).toContainText("selection is retained")
  await page.unroute(`**${edition}/days/2025-07-03.json`)
  await page
    .getByRole("button", { name: "Retry loading this aircraft-day" })
    .click()
  await expect(page.getByTestId("pinned-flight")).toHaveAttribute(
    "data-event-id",
    next.firstEventId
  )
})

test("an unavailable edition stays unresolved until an explicit reset", async ({
  page
}) => {
  const state = {
    version: 1,
    selected: {
      editionId: "missing-edition",
      dayId: "missing-day",
      eventId: "missing-flight"
    },
    view: "timeline",
    timeBasis: "local",
    notes: []
  }
  await page.goto(
    `/examples/plane-day?flight=${encodeURIComponent(JSON.stringify(state))}`
  )
  await expect(page.getByRole("alert")).toContainText("has not been replaced")
  await expect(page.getByTestId("pinned-flight")).toHaveCount(0)
  await page
    .getByRole("button", { name: "Reset to the authored recovery case" })
    .click()
  await expect(page.getByTestId("pinned-flight")).toContainText("HA 465")
})
