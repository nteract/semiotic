import { expect, test, type Locator, type Page } from "@playwright/test"

async function captureStory(page: Page, locator: Locator, path: string) {
  // Capture in document coordinates so the site's sticky navigation does not
  // cover the middle of a tall example in the inspection artifact.
  await page.evaluate(() => window.scrollTo(0, 0))
  const clip = await locator.boundingBox()
  if (!clip) throw new Error("Story has no visible layout to capture")
  await page.screenshot({ path, fullPage: true, clip })
}

async function waitForObservation(page: Page) {
  await expect(page.getByTestId("physics-story-clock")).toHaveText(
    "Observation complete · 20.0 / 20 model seconds",
    { timeout: 35_000 }
  )
}

async function alignedWatermarkBand(page: Page) {
  const geometry = () =>
    page.evaluate(() => {
      const ruler = document
        .querySelector('[data-testid="watermark-period-band"]')!
        .getBoundingClientRect()
      const board = document
        .querySelector('[data-testid="watermark-board-band"]')!
        .getBoundingClientRect()
      return {
        width: ruler.width,
        error: Math.max(
          Math.abs(ruler.x - board.x),
          Math.abs(ruler.width - board.width)
        )
      }
    })
  await expect.poll(async () => (await geometry()).error).toBeLessThan(1)
  return (await geometry()).width
}

async function reviewReading(page: Page) {
  const text = await page.getByTestId("merge-observation").innerText()
  const metric = async (label: string) =>
    Number(
      await page
        .locator(".merge-pressure__metric")
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator("strong")
        .innerText()
    )
  return {
    text,
    peak: await metric("peak queue"),
    returns: await metric("CI returns"),
    risk: await metric("merged risk")
  }
}

async function journeyReading(page: Page) {
  const result: Record<string, string[]> = {}
  for (const label of [
    "Activation",
    "First Impact",
    "Habit",
    "Commitment",
    "Ecosystem Leadership"
  ]) {
    result[label] = await page
      .locator(".stakeholder-journey__ledger-row")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("b")
      .allTextContents()
  }
  return result
}

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`A solid lid retains earlier admissions and sends later arrivals left (${reducedMotion})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/examples/watermarks")
    const lesson = page.getByTestId("watermark-closure-lesson")
    const reading = lesson.getByTestId("watermark-lesson-counts")
    await expect(reading).toHaveText(
      "1 in event-time bins + 0 in the far-left bin + 0 in flight = 1 arrival",
      { timeout: 15_000 }
    )
    const closeLid = lesson.getByRole("button", {
      name: "2. Close the lid",
      exact: true
    })
    await expect(closeLid).toBeEnabled({ timeout: 15_000 })
    await closeLid.click()
    await expect(reading).toHaveText(
      "1 in event-time bins + 0 in the far-left bin + 0 in flight = 1 arrival"
    )
    await lesson
      .getByRole("button", { name: "3. Send a late arrival", exact: true })
      .click()
    if (reducedMotion === "no-preference")
      await expect(reading).toHaveText(
        "1 in event-time bins + 0 in the far-left bin + 1 in flight = 2 arrivals"
      )
    await expect(reading).toHaveText(
      "1 in event-time bins + 1 in the far-left bin + 0 in flight = 2 arrivals",
      { timeout: 15_000 }
    )
    await captureStory(
      page,
      lesson,
      testInfo.outputPath("closure-sequence.png")
    )
    await lesson
      .getByRole("button", { name: "1. Let an event in", exact: true })
      .click()
    await expect(reading).toHaveText(
      "1 in event-time bins + 0 in the far-left bin + 0 in flight = 1 arrival",
      { timeout: 15_000 }
    )
  })
}

for (const theme of ["light", "dark"] as const) {
  test(`Waiting changes admissions without losing the reader's state (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    await page.goto("/examples/watermarks")
    const period = page.getByTestId("watermark-period")
    await expect(period).toContainText("now 70s − lag 18s = watermark 52s")
    await expect(page.getByTestId("watermark-snapshot-result")).toContainText(
      "7 accepted · 3 late"
    )
    const shortBand = await alignedWatermarkBand(page)
    const table = page.getByRole("table", { name: "Event-time window counts" })
    const firstWindow = table.getByRole("row").nth(1).getByRole("cell")
    await expect(firstWindow).toHaveText(["0-12s", "1", "1", "2"])
    await expect(page.getByTestId("watermark-policy-tradeoff")).toContainText(
      "3 additional events"
    )
    await page
      .getByRole("button", { name: /Wait for the delayed batch/ })
      .click()
    await expect(firstWindow).toHaveText(["0-12s", "2", "0", "2"])
    await expect(period).toContainText("now 70s − lag 54s = watermark 16s")
    expect(await alignedWatermarkBand(page)).toBeCloseTo(shortBand * 3, 1)
    await expect(page.getByTestId("watermark-story-witness")).toContainText(
      "closes it after 66s"
    )
    await page
      .getByRole("button", { name: "Before the batch", exact: true })
      .click()
    await expect(firstWindow).toHaveText(["0-12s", "1", "0", "1"])
    await expect(period).toContainText("now 61s − lag 54s = watermark 7s")
    await page
      .getByRole("button", { name: "After the batch", exact: true })
      .click()
    await expect(firstWindow).toHaveText(["0-12s", "2", "0", "2"])
    await expect(page.getByTestId("watermark-snapshot-result")).toContainText(
      "10 accepted · 0 late"
    )
    await expect(page.getByTestId("watermark-snapshot-result")).toContainText(
      "The batch arrived before its windows closed."
    )
    await page
      .getByRole("heading", { name: "How it maps to Semiotic" })
      .scrollIntoViewIfNeeded()
    await page
      .getByRole("button", { name: /Wait for the delayed batch/ })
      .scrollIntoViewIfNeeded()
    await expect(
      page.getByRole("button", { name: /Wait for the delayed batch/ })
    ).toHaveAttribute("aria-pressed", "true")
    await expect(firstWindow).toHaveText(["0-12s", "2", "0", "2"])
    await page.setViewportSize({ width: 390, height: 844 })
    await alignedWatermarkBand(page)
    await captureStory(
      page,
      page.locator(".watermarks-example__workbench"),
      testInfo.outputPath("watermarks-mobile.png")
    )
    await expect(firstWindow).toHaveText(["0-12s", "2", "0", "2"])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    await page.getByRole("button", { name: /Close sooner/ }).click()
    await expect(page.getByTestId("watermark-snapshot-result")).toContainText(
      "7 accepted · 3 late"
    )
    await expect(period).toContainText("now 70s − lag 18s = watermark 52s")
    await alignedWatermarkBand(page)
    await captureStory(
      page,
      page.locator(".watermarks-example__workbench"),
      testInfo.outputPath("watermark-short-lag-mobile.png")
    )
    await page
      .getByText("Explore other streams and settings", { exact: true })
      .click()
    await page
      .getByRole("slider", { name: /Arrival frontier/i })
      .fill("7")
    await expect(period).toContainText("now 7s − lag 18s = watermark -11s")
    await expect(period).toContainText(
      "The watermark is before the visible time range."
    )
    await alignedWatermarkBand(page)
  })

  test(`Review experiments preserve work and retain the pressure history (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    await page.goto("/examples/merge-pressure")
    await waitForObservation(page)
    const baseline = await reviewReading(page)
    await page.getByRole("button", { name: /2\. AI burst/ }).click()
    await waitForObservation(page)
    const burst = await reviewReading(page)
    expect(burst.peak).toBeGreaterThan(baseline.peak)
    await expect(page.getByTestId("merge-comparison-rule")).toContainText(
      "only the arrival gap changes"
    )
    await page.getByRole("button", { name: /3\. CI returns/ }).click()
    await waitForObservation(page)
    const narrow = await reviewReading(page)
    await page.getByRole("button", { name: /4\. Shallow checks/ }).click()
    await waitForObservation(page)
    const shallow = await reviewReading(page)
    expect(shallow.returns).toBeLessThan(narrow.returns)
    expect(shallow.risk).toBeGreaterThan(narrow.risk)
    await page.getByRole("button", { name: /5\. Scale review/ }).click()
    await waitForObservation(page)
    const scaled = await reviewReading(page)
    expect(scaled.peak).toBeLessThan(burst.peak)
    await expect(page.getByTestId("merge-comparison-rule")).toContainText(
      "only review service triples"
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await captureStory(
      page,
      page.locator(".merge-pressure__workbench"),
      testInfo.outputPath("merge-mobile.png")
    )
    expect(await reviewReading(page)).toEqual(scaled)
    await page
      .getByRole("button", { name: "Replay stream", exact: true })
      .click()
    await waitForObservation(page)
    expect(await reviewReading(page)).toEqual(scaled)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
  })

  test(`Invitation changes the crossing on a fixed cohort and geometry (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    await page.goto("/examples/stakeholder-journey")
    await waitForObservation(page)
    const first = await journeyReading(page)
    expect(first.Commitment[1]).toBe("Not run")
    await page
      .getByRole("button", { name: /Passive path.*Product usage/ })
      .click()
    await waitForObservation(page)
    const compared = await journeyReading(page)
    for (const stage of ["Activation", "First Impact", "Habit"]) {
      expect(compared[stage][0]).toEqual(compared[stage][1])
    }
    expect(parseInt(compared.Commitment[0])).toBeGreaterThan(
      parseInt(compared.Commitment[1])
    )
    await page.setViewportSize({ width: 390, height: 844 })
    // A keyboard focus ring marks a real participant. Hovering that same
    // painted location must identify the same person after mobile CSS scaling.
    const chart = page.locator(
      '.physics-story__model .stream-physics-frame[role="group"]'
    )
    await chart.scrollIntoViewIfNeeded({ timeout: 5000 })
    await chart.press("Home")
    const tooltip = page.locator(".stakeholder-journey__tooltip")
    const participant = await tooltip.locator("strong").innerText()
    const ring = await chart
      .locator('circle[stroke-dasharray="4,2"]')
      .boundingBox()
    if (!ring)
      throw new Error("The focused participant has no painted focus ring")
    await chart.press("Escape")
    await page.mouse.move(0, 0)
    await page.mouse.move(ring.x + ring.width / 2, ring.y + ring.height / 2)
    await expect(tooltip.locator("strong")).toHaveText(participant)
    await page.mouse.move(0, 0)
    await page.getByRole("button", { name: /^Ecosystem Leadership:/ }).click()
    await captureStory(
      page,
      page.locator(".stakeholder-journey__system"),
      testInfo.outputPath("journey-mobile.png")
    )
    expect(await journeyReading(page)).toEqual(compared)
    await page
      .getByRole("button", { name: "Replay cohort", exact: true })
      .click()
    await waitForObservation(page)
    const replayed = await journeyReading(page)
    for (const stage of Object.keys(compared))
      expect(replayed[stage][1]).toEqual(compared[stage][1])
    await page
      .getByRole("button", { name: /Designed relay.*Intentional/ })
      .click()
    await waitForObservation(page)
    expect(await journeyReading(page)).toEqual(compared)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
  })
}

test("Animated and reduced-motion observations tell the same process story", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const route of ["merge-pressure", "stakeholder-journey"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto(`/examples/${route}`)
    await waitForObservation(page)
    const animated =
      route === "merge-pressure"
        ? await reviewReading(page)
        : await journeyReading(page)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page
      .getByRole("button", {
        name: route === "merge-pressure" ? "Replay stream" : "Replay cohort",
        exact: true
      })
      .click()
    await waitForObservation(page)
    const reduced =
      route === "merge-pressure"
        ? await reviewReading(page)
        : await journeyReading(page)
    expect(reduced).toEqual(animated)
  }
  expect(errors).toEqual([])
})
