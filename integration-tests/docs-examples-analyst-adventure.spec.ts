import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/analyst-adventure"
const PAGE_TITLE = "Analyst Adventure: The Case of the Vanishing Visionary"

async function beginInvestigation(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible()
  const titleBegin = page.getByRole("button", { name: "BEGIN INVESTIGATION", exact: true })
  await expect(titleBegin).toBeVisible()
  await expect(titleBegin).toHaveCSS("background-color", "rgb(255, 215, 90)")
  await expect(page.locator(".analyst-adventure__title-art")).toHaveText("SEMIOTIC")
  await expect(
    page.getByText("SEMIOTIC PRESENTS // SOFTWARE PRODUCT 1984", { exact: true }),
  ).toBeVisible()

  const begin = page.locator('[data-session-action="begin"]')
  await expect(begin).toHaveText("BEGIN")
  await expect(begin).toHaveAttribute("data-session-action", "begin")
  await expect(begin).toHaveCSS("background-color", "rgb(255, 215, 90)")
  await begin.focus()
  await expect(begin).toBeFocused()
  await page.keyboard.press("Enter")
  const restart = page.locator('[data-session-action="restart"]')
  await expect(restart).toHaveText("RESTART")
  await expect(restart).toHaveAttribute("data-session-action", "restart")
  await expect(restart).toHaveCSS("background-color", "rgb(255, 112, 127)")
  await expect(page.getByText("Executive Suite · StreamXYFrame", { exact: true })).toBeVisible()
}

async function chooseWithNumber(page: Page, number: 1 | 2 | 3 | 4) {
  await page.keyboard.press(String(number))
}

async function expectAnalyticalResolution(page: Page, reason: RegExp) {
  const resolution = page.locator(".aa-choice-panel__resolution")
  await expect(resolution).toBeVisible()
  await expect(resolution).toContainText(reason)
  await expect(page.locator(".aa-choice")).toHaveCount(0)
}

async function enterDestination(page: Page, name: string | RegExp) {
  const destination = page.getByRole("button", { name }).first()
  await destination.focus()
  await expect(destination).toBeFocused()
  await page.keyboard.press("Enter")
}

async function openDetailsWithKeyboard(page: Page, name: string) {
  const summary = page.locator("summary").filter({ hasText: name }).first()
  await summary.focus()
  await expect(summary).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(summary.locator("xpath=..")).toHaveAttribute("open", "")
}

async function hoverFirstExecutiveTelemetryMark(page: Page) {
  const mark = page.locator(".stream-xy-frame circle").first()
  const box = await mark.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator(".stream-xy-frame .stream-frame-tooltip")).toContainText(
    "cache age",
  )
}

async function activateAndDismissAnnotation(
  page: Page,
  buttonName: string,
  chatTitle: string,
) {
  const annotation = page.getByRole("button", { name: buttonName, exact: true }).first()
  await annotation.click()
  const chat = page.locator("dialog.aa-chat").filter({ hasText: chatTitle })
  await expect(chat).toHaveAttribute("open", "")
  await page.keyboard.press("Escape")
  await expect(chat).not.toHaveAttribute("open")
}

test.describe("Analyst Adventure authored source interactions", () => {
  test("reaches the denominator-preserving best ending using keyboard controls", async ({ page }) => {
    const maximumDepthErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Maximum update depth")) {
        maximumDepthErrors.push(message.text())
      }
    })
    page.on("pageerror", (error) => {
      if (error.message.includes("Maximum update depth")) {
        maximumDepthErrors.push(error.message)
      }
    })

    await beginInvestigation(page)

    await expect(page.locator("text.semiotic-chart-title", { hasText: "EXECUTIVE TELEMETRY // TRUST WINDOW" })).toBeVisible()
    await expect(page.getByRole("button", { name: /badge feed is replaying cached positions/i })).toHaveAttribute(
      "aria-keyshortcuts",
      "2",
    )
    await expect(page.getByRole("button", { name: /Hidden Forecast Vault/i })).toHaveCount(0)
    await hoverFirstExecutiveTelemetryMark(page)
    await page.waitForTimeout(250)
    expect(maximumDepthErrors).toEqual([])

    // H invokes the deterministic local resolver; opening its disclosure uses
    // the same keyboard-only interaction model as the rest of the example.
    await page.keyboard.press("h")
    await openDetailsWithKeyboard(page, "ZORKBOT-2000 · LOCAL HINT TERMINAL")
    await expect(
      page.getByText(/dramatic destination can still be stale.*cache-age field/i),
    ).toBeVisible()

    // D exposes every answer-bearing field, including the two distinct clocks.
    await page.keyboard.press("d")
    const summary = page.locator("dialog.aa-data-summary")
    await expect(summary).toHaveAttribute("open", "")
    await expect(summary.getByRole("columnheader", { name: "timestamp" })).toBeVisible()
    await expect(summary.getByRole("columnheader", { name: "observed At" })).toBeVisible()
    await expect(summary.getByRole("rowheader", { name: "badge-roof-0914" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(summary).not.toHaveAttribute("open")

    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /stale|cached|observed/i)
    await enterDestination(page, /^Records Catacombs/)
    await expect(page.getByText("Records Catacombs · StreamOrdinalFrame", { exact: true })).toBeVisible()
    const recordsFrame = page.locator(".stream-ordinal-frame")
    await expect(
      recordsFrame.locator("text.semiotic-axis-tick").filter({ hasText: "Sales" }),
    ).toBeVisible()
    await expect(
      recordsFrame.locator("text.semiotic-axis-tick").filter({ hasText: "Corp. Archaeology" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "RATE / EMPLOYEE" }).click()
    await expect(recordsFrame.locator("text.semiotic-chart-title")).toContainText(
      "CANCELLATIONS PER EMPLOYEE",
    )
    await expect(
      page.getByRole("button", {
        name: "Open ARCHIVIST-2 comment on Corporate Archaeology",
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /Corporate Archaeology.*strongest rate/i })).toBeVisible()
    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /per[- ]employee|headcount|denominator/i)

    await enterDestination(page, /^Corporate Map Room/)
    await expect(page.getByText("Corporate Map Room · StreamGeoFrame", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Credential route direction")).toContainText(
      "B2 RELAY→HQ ROUTER→OFFSITE BUNKER→DISPLAY",
    )
    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /originate|source|routed endpoint/i)

    await enterDestination(page, /^Server Cathedral/)
    await expect(page.getByText("Server Cathedral · StreamNetworkFrame", { exact: true })).toBeVisible()
    await expect(page.getByText("CONSERVATION CHECK: 100 LEGITIMATE IN · 110 DISPLAYED OUT")).toBeVisible()
    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /unsupported|confidence|lineage/i)
    await enterDestination(page, /^Boardroom/)

    await expect(page.getByText("Boardroom · Evidence Montage", { exact: true })).toBeVisible()
    await expect(page.getByText("ALL FOUR DEFENSIBLE CLAIMS MOUNTED. CORRECTED PRESENTATION AVAILABLE.")).toBeVisible()
    await expect(page.locator('.analyst-adventure__snapshot-chart[data-component="LineChart"]')).toBeVisible()
    await expect(page.locator('.analyst-adventure__snapshot-chart[data-component="BarChart"]')).toBeVisible()
    await expect(page.locator('.analyst-adventure__snapshot-chart[data-component="FlowMap"]')).toBeVisible()
    await expect(page.locator('.analyst-adventure__snapshot-chart[data-component="SankeyDiagram"]')).toBeVisible()
    await chooseWithNumber(page, 1)
    await expect(
      page.getByRole("heading", { name: "THE BIG PRESENTATION, NOW WITH DENOMINATORS" }),
    ).toBeVisible()
    const restoredEvidence = page.locator(".aa-ending__evidence")
    await expect(restoredEvidence.getByText("Eight-Minute Replay", { exact: true })).toBeVisible()
    await expect(restoredEvidence.getByText("Denominator Key", { exact: true })).toBeVisible()
    await expect(restoredEvidence.getByText("Origin Vector", { exact: true })).toBeVisible()
    await expect(restoredEvidence.getByText("Lineage Break", { exact: true })).toBeVisible()
    expect(maximumDepthErrors).toEqual([])
  })

  test("uses keyboard-operable annotation widgets to enter the reduced-motion vault", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await beginInvestigation(page)
    await expect(page.locator(".analyst-adventure")).toHaveAttribute("data-reduced-motion", "true")

    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /stale|cached|observed/i)
    await enterDestination(page, /^Corporate Map Room/)
    await expect(page.getByRole("button", { name: /Hidden Forecast Vault/i })).toHaveCount(0)

    const tunnelWidget = page.getByRole("button", {
      name: "Activate unlabeled maintenance marker",
      exact: true,
    })
    await tunnelWidget.focus()
    await page.keyboard.press("Enter")
    const tunnelChat = page.locator("dialog.aa-chat").filter({ hasText: "FACILITIES_BOT" })
    await expect(tunnelChat).toHaveAttribute("open", "")
    await expect(page.getByText(/This tunnel does not exist.*cannot be locked/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Close annotation chat" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(tunnelChat).not.toHaveAttribute("open")
    await expect(tunnelWidget).toBeFocused()

    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /originate|source|routed endpoint/i)
    await enterDestination(page, /^Server Cathedral/)
    const daemonWidget = page.getByRole("button", {
      name: "Activate PRESENTATION_DAEMON annotation",
      exact: true,
    })
    await daemonWidget.focus()
    await page.keyboard.press("Enter")

    await expect(page.getByText("Hidden Forecast Vault · StreamPhysicsFrame", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "SETTLED PROJECTION SHOWN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByText("REDUCED MOTION: FINAL STATE", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("table", { name: "Deterministic settled projection · 30 forecast scenarios" }),
    ).toBeVisible()
    await expect(page.getByRole("row", { name: /DEFENSIBLE 10/ })).toBeVisible()

    // The stable projection can be read before activating the CEO token.
    await chooseWithNumber(page, 2)
    await expect(page.getByText("Settled Projection", { exact: true })).toBeVisible()
    await chooseWithNumber(page, 1)
    await expect(page.getByRole("heading", { name: "THE CEO IN THE CHART" })).toBeVisible()
  })

  test("reveals the Annotation Cabal on the way into the playable Forecast Vault", async ({ page }) => {
    await beginInvestigation(page)

    await activateAndDismissAnnotation(
      page,
      "M.ZORK (offline) left a comment",
      "M.ZORK (offline)",
    )
    await chooseWithNumber(page, 2)
    await enterDestination(page, /^Records Catacombs/)

    await activateAndDismissAnnotation(
      page,
      "Open ARCHIVIST-2 comment on Corporate Archaeology",
      "ARCHIVIST-2",
    )
    await chooseWithNumber(page, 2)
    await enterDestination(page, /^Corporate Map Room/)

    await activateAndDismissAnnotation(
      page,
      "Activate unlabeled maintenance marker",
      "FACILITIES_BOT",
    )
    await chooseWithNumber(page, 2)
    await enterDestination(page, /^Server Cathedral/)

    await page
      .getByRole("button", {
        name: "Activate PRESENTATION_DAEMON annotation",
        exact: true,
      })
      .click()

    await expect(
      page.getByText("Hidden Forecast Vault · StreamPhysicsFrame", { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "THE ANNOTATION CABAL" })).toBeVisible()
    await expect(page.getByText(/collaborative analytics/i)).toBeVisible()
    await expect(page.locator(".aa-ending")).toHaveCount(0)
    await expect(
      page.getByRole("button", {
        name: "Read the settled projection before touching anything.",
        exact: true,
      }),
    ).toBeVisible()
  })

  test("keeps the analytical choice flow inside a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await beginInvestigation(page)

    const cachedFeedChoice = page.getByRole("button", {
      name: /badge feed is replaying cached positions/i,
    })
    await expect(cachedFeedChoice).toHaveAttribute("aria-keyshortcuts", "2")

    const bounds = await page.evaluate(() => {
      const root = document.querySelector(".analyst-adventure")
      const chart = document.querySelector(".aa-chart-viewport")
      if (!(root instanceof HTMLElement) || !(chart instanceof HTMLElement)) return null
      const rootBox = root.getBoundingClientRect()
      const chartBox = chart.getBoundingClientRect()
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        rootLeft: rootBox.left,
        rootRight: rootBox.right,
        chartLeft: chartBox.left,
        chartRight: chartBox.right,
      }
    })

    expect(bounds).not.toBeNull()
    expect(bounds!.pageWidth).toBeLessThanOrEqual(bounds!.viewportWidth + 1)
    expect(bounds!.rootLeft).toBeGreaterThanOrEqual(0)
    expect(bounds!.rootRight).toBeLessThanOrEqual(bounds!.viewportWidth + 1)
    expect(bounds!.chartLeft).toBeGreaterThanOrEqual(0)
    expect(bounds!.chartRight).toBeLessThanOrEqual(bounds!.viewportWidth + 1)

    await chooseWithNumber(page, 2)
    await expectAnalyticalResolution(page, /stale|cached|observed/i)
    await expect(page.getByText("Eight-Minute Replay", { exact: true })).toBeVisible()

    const restart = page.locator('[data-session-action="restart"]')
    await expect(restart).toHaveText("RESTART")
    await expect(restart).toHaveAttribute("data-session-action", "restart")
    await restart.click()
    const begin = page.locator('[data-session-action="begin"]')
    await expect(begin).toHaveText("BEGIN")
    await expect(begin).toHaveAttribute("data-session-action", "begin")
    await expect(
      page.getByRole("button", { name: "BEGIN INVESTIGATION", exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Executive Suite · StreamXYFrame", { exact: true })).toHaveCount(0)
  })
})
