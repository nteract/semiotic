import { chromium, expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { fingerprintValue } from "semiotic/artifact"
import bootstrap from "../docs/src/pages/examples/reservoir-guide/bootstrap.json"
import { readFileSync } from "node:fs"
import type { ReservoirSnapshot } from "../docs/src/pages/examples/reservoir-guide/types"

test.use({ actionTimeout: 15_000 })

const snapshot = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      `docs/public/stories/reservoir-guide/${bootstrap.header.editionId}/snapshot.json`
    ),
    "utf8"
  )
) as ReservoirSnapshot
const ROOT = "/stories/reservoir-guide"
const PATH = "/examples/reservoir-guide"
const sign = (value: ReservoirSnapshot) => {
  value.fingerprint = fingerprintValue({
    ...value,
    fingerprint: ""
  }).fingerprint
  return value
}

for (const width of [320, 390, 768, 1280]) {
  test(`reservoir guide supports native exploration and readable tables at ${width}px`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(PATH)
    await expect(page.getByTestId("season-chart")).toBeVisible()
    await expect(page.getByTestId("reservoir-storage")).toHaveText(
      "3,258,792 acre-feet"
    )
    const selector = page.getByLabel("Reservoir", { exact: true })
    await selector.focus()
    await expect(selector).toBeFocused()
    await page.keyboard.press("o")
    await page.keyboard.press("Tab")
    await expect(selector).toHaveValue("ORO")
    await expect(page.getByTestId("reservoir-summary")).toContainText(
      "No eligible baseline years"
    )
    await page.getByLabel("Comparison water year").selectOption("2023")
    await page
      .getByRole("button", { name: "Inspect a missing reading" })
      .focus()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("reservoir-storage")).toHaveText(
      "Unavailable"
    )
    await expect(
      page.getByTestId("reservoir-collection-summary")
    ).toContainText("Excluded: Don Pedro")
    await page
      .getByText("Read the two-year table and missing observations", {
        exact: true
      })
      .click()
    const table = page.getByRole("region", { name: "Two-year storage table" })
    await expect(table).toContainText("Don Pedro · water years 1993 and 2025")
    await expect(table.locator('tr[data-selected="true"]')).toContainText(
      "Unavailable"
    )
    await page.getByRole("button", { name: "Try leap day" }).click()
    await expect(page.getByTestId("reservoir-summary")).toContainText(
      "Only 7 eligible baseline years"
    )
    await page.getByLabel("Selected water year").selectOption("2025")
    await expect(page.getByTestId("reservoir-storage")).toHaveText(
      "Unavailable"
    )
    await expect(page.getByTestId("reservoir-active-guide")).toContainText(
      "This water year has no February 29"
    )
    await expect(page.getByLabel("Calendar date", { exact: true })).toHaveValue(
      "02-29"
    )
    for (const control of await page
      .locator(".reservoir-controls select, .reservoir-actions button")
      .all()) {
      const box = await control.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
    const overflow = () =>
      page
        .locator(".reservoir-story")
        .evaluate((node) => node.scrollWidth - node.clientWidth)
    expect(await overflow()).toBeLessThanOrEqual(1)
    await page.emulateMedia({ forcedColors: "active" })
    await page.locator(".reservoir-story").evaluate((node) => {
      ;(node as HTMLElement).style.fontSize = "34px"
    })
    expect(await overflow()).toBeLessThanOrEqual(1)
    await expect(selector).toBeVisible()
    await page.locator(".reservoir-story").evaluate((node) => {
      ;(node as HTMLElement).style.fontSize = ""
    })
    await page.emulateMedia({ forcedColors: "none" })
    await page.getByRole("button", { name: "Shasta opening" }).click()
    await page.screenshot({ path: join(tmpdir(), `e03-${width}.png`) })
    await page
      .getByTestId("season-chart")
      .screenshot({ path: join(tmpdir(), `e03-${width}-season.png`) })
    const collectionChart = page.getByTestId("collection-chart")
    await collectionChart.scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        collectionChart.locator("canvas").evaluateAll((canvases) => {
          let marks = 0
          for (const node of canvases) {
            const canvas = node as HTMLCanvasElement
            const context = canvas.getContext("2d")
            if (!context || !canvas.width || !canvas.height) continue
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ).data
            for (let index = 0; index < pixels.length; index += 4) {
              if (
                pixels[index] === 9 &&
                pixels[index + 1] === 109 &&
                pixels[index + 2] === 118 &&
                pixels[index + 3] > 0
              )
                marks++
            }
          }
          return marks
        })
      )
      .toBeGreaterThan(100)
    await collectionChart.screenshot({
      path: join(tmpdir(), `e03-${width}-collection.png`)
    })
    await page
      .getByText("Inspect this date’s source fields and baseline", {
        exact: true
      })
      .click()
    const axe = await new AxeBuilder({ page })
      .include(".reservoir-story")
      .analyze()
    expect(axe.violations).toEqual([])
    if (width === 390) {
      await page.getByRole("button", { name: "Switch to light mode" }).click()
      expect(
        (await new AxeBuilder({ page }).include(".reservoir-story").analyze())
          .violations
      ).toEqual([])
    }
    expect(errors).toEqual([])
  })
}

test("four real selections agree across browser values, full table and downloaded packets", async ({
  page,
  browser
}) => {
  await page.goto(PATH)
  for (const [button, name] of [
    ["Shasta opening", "default"],
    ["Oroville’s changed measure", "changed-measurement"],
    ["Inspect a missing reading", "missing-storage"],
    ["Try leap day", "leap-day"]
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click()
    const pending = page.waitForEvent("download")
    await page
      .getByRole("button", { name: "Download data packet", exact: true })
      .click()
    const downloaded = await pending
    expect(await downloaded.failure()).toBeNull()
    const packet = JSON.parse(
      await readFile((await downloaded.path())!, "utf8")
    )
    const canonical = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          `docs/public${ROOT}/${snapshot.editionId}/${name}.json`
        ),
        "utf8"
      )
    )
    expect(packet).toEqual(canonical)
    expect(
      packet.checks.some((c: { status: string }) => c.status === "fail")
    ).toBe(false)
    await expect(page.getByTestId("reservoir-summary")).toHaveText(
      packet.summary
    )
    if (
      (await page.locator(".reservoir-table-details").getAttribute("open")) ===
      null
    )
      await page
        .getByText("Read the two-year table and missing observations", {
          exact: true
        })
        .click()
    await expect(
      page.locator('.reservoir-table-scroll tr[data-selected="true"]')
    ).toContainText(
      packet.guide.reading?.storageAcreFeet === null || !packet.guide.reading
        ? "Unavailable"
        : packet.guide.reading.storageAcreFeet.toLocaleString("en-US")
    )
    const other = await browser.newContext()
    try {
      const separate = await other.newPage()
      await separate.goto(`http://127.0.0.1:3000${PATH}`)
      await expect(
        separate.getByLabel("Reopen a saved data packet")
      ).toBeEnabled()
      await separate
        .getByLabel("Reopen a saved data packet")
        .setInputFiles((await downloaded.path())!)
      await expect(separate.getByTestId("reservoir-summary")).toHaveText(
        packet.summary
      )
      await separate.reload()
      await expect(
        separate.getByLabel("Reservoir", { exact: true })
      ).toHaveValue(packet.state.stationId)
      await expect(
        separate.getByLabel("Calendar date", { exact: true })
      ).toHaveValue(packet.state.monthDay)
    } finally {
      await other.close()
    }
  }
})

test("an explicitly saved selection survives a disconnected browser restart; unsaved addresses are unavailable", async () => {
  const profile = await mkdtemp(join(tmpdir(), "e03-offline-profile-"))
  let context = await chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 390, height: 844 }
  })
  let savedURL = ""
  const savedFile = join(profile, "saved-reservoir.html")
  try {
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:3000${PATH}`)
    await page.getByRole("button", { name: "Try leap day" }).click()
    await page
      .getByRole("button", { name: "Save an offline address", exact: true })
      .click()
    const link = page.getByTestId("saved-offline-link")
    await expect(link).toBeVisible()
    savedURL = (await link.getAttribute("href"))!
    const pending = page.waitForEvent("download")
    await page
      .getByRole("button", { name: "Download offline HTML", exact: true })
      .click()
    const download = await pending
    await download.saveAs(savedFile)
    const html = await readFile(savedFile, "utf8")
    expect(/<script|<link|<img|@import|url\((?!#)/.test(html)).toBe(false)
  } finally {
    await context.close()
  }
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    offline: true,
    viewport: { width: 390, height: 844 }
  })
  try {
    const page = await context.newPage()
    const failures: string[] = []
    page.on("requestfailed", (request) => failures.push(request.url()))
    await page.goto(savedURL)
    await expect(page.locator("[data-saved-summary]")).toContainText(
      "Shasta, February 29, 2024"
    )
    await expect(page.locator("body")).toContainText(
      "water year 2024 compared with 2025"
    )
    await expect(page.locator("body")).toContainText(snapshot.editionId)
    await expect(page.locator("body")).toContainText(snapshot.retrievedAt)
    await expect(page.locator("body")).toContainText(
      "Only 7 eligible baseline years"
    )
    await expect(page.locator("svg")).toHaveCount(2)
    await expect(page.getByRole("img", { name: /^Where this reading sits/ })).toBeVisible()
    await expect(page.getByRole("img", { name: /^Shasta: two water years/ })).toBeVisible()
    expect(await page.locator("table tbody tr").count()).toBe(372)
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations).toEqual([])
    expect(failures).toEqual([])
    await page.goto(
      savedURL.replace(/saved=.*/, "saved=never-saved-test-edition")
    )
    await expect(
      page.getByRole("heading", {
        name: "This reservoir edition was not saved"
      })
    ).toBeVisible()
    await page.goto(`file://${savedFile}`)
    await expect(page.locator("[data-saved-summary]")).toContainText(
      "Shasta, February 29, 2024"
    )
    await expect(page.locator("svg")).toHaveCount(2)
    await expect(page.getByRole("img", { name: /^Where this reading sits/ })).toBeVisible()
    await expect(page.getByRole("img", { name: /^Shasta: two water years/ })).toBeVisible()
    await writeFile(
      join(
        process.cwd(),
        "scripts/reservoir-guide/evidence/offline-browser.json"
      ),
      JSON.stringify(
        {
          browser: context.browser()?.version(),
          persistentProfile: profile,
          savedURL,
          restartWithOfflineEnabled: true,
          savedSelection: "SHA, WY2024/WY2025, 02-29",
          tableRows: 372,
          unavailableEdition: true,
          downloadedFileOpenedOffline: true,
          failedSavedResources: failures,
          axeViolations: axe.violations.length
        },
        null,
        2
      )
    )
  } finally {
    await context.close()
  }
})

test("refresh offers changed dates and values, preserves compatible selection, retains failures and identifies incompatible baselines", async ({
  page
}) => {
  const next = structuredClone(snapshot)
  next.editionId = "synthetic-refresh-fixture-v2"
  next.retrievedAt = "2026-09-06T00:00:00.000Z"
  const index = Math.round(
    (Date.parse("2025-07-30") - Date.parse(next.startDate)) / 86400000
  )
  next.series.SHA[index][0]! += 100
  sign(next)
  let fail = false
  await page.route(`**${ROOT}/current.json`, async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        body: "Synthetic unavailable refresh"
      })
      return
    }
    await route.fulfill({
      json: {
        editionId: next.editionId,
        fingerprint: next.fingerprint,
        snapshotURL: `${ROOT}/${next.editionId}/snapshot.json`
      }
    })
  })
  await page.route(`**${ROOT}/synthetic-*/snapshot.json`, (route) =>
    route.fulfill({ json: next })
  )
  await page.goto(PATH)
  await page.getByRole("button", { name: "Check for another edition" }).click()
  const offer = page.getByTestId("reservoir-update-offer")
  await expect(offer).toContainText("1 changed daily records")
  await offer.getByText("Changed dates and values", { exact: true }).click()
  await expect(offer).toContainText(
    "SHA · 2025-07-30: 3,258,792 → 3,258,892 AF"
  )
  await expect(page.getByTestId("reservoir-storage")).toHaveText(
    "3,258,792 acre-feet"
  )
  await page.getByRole("button", { name: "Accept this edition" }).click()
  await expect(page.getByTestId("reservoir-storage")).toHaveText(
    "3,258,892 acre-feet"
  )
  await expect(page.getByLabel("Comparison water year")).toHaveValue("2021")
  fail = true
  await page.getByRole("button", { name: "Check for another edition" }).click()
  await expect(page.locator(".reservoir-status")).toContainText(
    "Update check failed"
  )
  await expect(page.locator(".reservoir-status")).toContainText(
    next.retrievedAt
  )
  await expect(page.getByTestId("reservoir-storage")).toHaveText(
    "3,258,892 acre-feet"
  )
  fail = false
  next.editionId = "synthetic-incompatible-fixture-v3"
  next.baseline.id = "synthetic-different-baseline"
  sign(next)
  await page.getByRole("button", { name: "Check for another edition" }).click()
  await expect(offer).toContainText("saved comparison baseline is unavailable")
  await page.getByRole("button", { name: "Accept this edition" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "saved comparison baseline is unavailable"
  )
  await expect(page.getByLabel("Reservoir", { exact: true })).toHaveValue("SHA")
  await expect(page.getByTestId("reservoir-active-guide")).toHaveCount(0)
})
