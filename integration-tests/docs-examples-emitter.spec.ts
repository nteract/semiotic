import { expect, test, type Page } from "@playwright/test"

async function capturePage(page: Page, path: string) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0)
    await document.fonts.ready
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )
  })
  await page.screenshot({ path, fullPage: true })
}

async function hoverPaintedEvent(page: Page) {
  const host = page.getByTestId("emitter-chart")
  const canvas = host.locator("canvas").first()
  await canvas.scrollIntoViewIfNeeded()
  // Locate a real blue data mark in the canvas. The source tile is SVG and
  // cannot satisfy this check; no test-only chart handle is needed.
  const point = await canvas.evaluate((element: HTMLCanvasElement) => {
    const { width, height } = element
    const pixels = element
      .getContext("2d")!
      .getImageData(0, 0, width, height).data
    const bounds = element.getBoundingClientRect()
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (
          Math.abs(pixels[i] - 37) < 5 &&
          Math.abs(pixels[i + 1] - 99) < 5 &&
          Math.abs(pixels[i + 2] - 235) < 5 &&
          pixels[i + 3] > 240
        ) {
          const point = {
            x: (x * bounds.width) / width,
            y: ((y + 2) * bounds.height) / height
          }
          // Newly emitted bodies may be behind the source. Use a visible mark
          // without bypassing the real pointer hit target.
          if (
            document.elementFromPoint(
              bounds.x + point.x,
              bounds.y + point.y
            ) === element
          )
            return point
        }
      }
    }
    throw new Error("No blue event was painted")
  })
  await canvas.hover({ position: point })
  const tooltip = host.locator(".stream-physics-tooltip")
  await expect(tooltip).toContainText("Event p1-")
  await expect(tooltip).toContainText("Event time:")
  await expect(tooltip).toContainText("Window:")
  const tip = (await tooltip.boundingBox())!
  const bounds = (await host.boundingBox())!
  expect(tip.x).toBeGreaterThanOrEqual(bounds.x - 1)
  expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
  expect(tip.y).toBeGreaterThanOrEqual(bounds.y - 1)
  expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1)
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
}

test("travel pauses, survives mobile resize, and supports real mark hover", async ({
  page
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/examples/emitter-playground")
  await page.getByRole("button", { name: "Start emitter", exact: true }).click()
  await expect(page.getByTestId("emitter-travelling")).not.toHaveText("0")
  await expect
    .poll(async () =>
      parseFloat(await page.getByTestId("emitter-clock").innerText())
    )
    .toBeGreaterThanOrEqual(1.5)
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const clock = await page.getByTestId("emitter-clock").innerText()
  const countsBeforeRateChange = await page
    .getByTestId("emitter-conservation")
    .innerText()
  await page.getByLabel("Emission rate").selectOption("4")
  await page.getByLabel("Simulation speed").selectOption("2")
  await expect(page.getByTestId("emitter-clock")).toHaveText(clock)
  await expect(page.getByTestId("emitter-conservation")).toHaveText(
    countsBeforeRateChange
  )
  await expect(page.getByTestId("emitter-accepted")).toHaveText("0")
  await page.waitForTimeout(300)
  await expect(page.getByTestId("emitter-clock")).toHaveText(clock)
  await hoverPaintedEvent(page)
  await capturePage(page, testInfo.outputPath("emitter-travel-desktop.png"))
  await page.setViewportSize({ width: 390, height: 844 })
  await hoverPaintedEvent(page)
  await expect(page.getByTestId("emitter-clock")).toHaveText(clock)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await capturePage(page, testInfo.outputPath("emitter-travel-mobile.png"))
  await page.getByRole("button", { name: "Resume", exact: true }).click()
  await expect(page.getByTestId("emitter-accepted")).not.toHaveText("0")
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await page.getByLabel("Travel path").selectOption("connector")
  await expect(page.getByTestId("emitter-clock")).toHaveText("0.0s")
  await expect(page.getByTestId("emitter-conservation")).toHaveText(
    "0 emitted = 0 travelling + 0 accepted + 0 late"
  )
  await page.getByRole("button", { name: "Start emitter", exact: true }).click()
  await expect(page.getByTestId("emitter-travelling")).not.toHaveText("0")
  await expect
    .poll(async () =>
      parseFloat(await page.getByTestId("emitter-clock").innerText())
    )
    .toBeGreaterThanOrEqual(1.5)
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  await hoverPaintedEvent(page)
  expect(errors).toEqual([])
})

test("live rates preserve the sequence and each producer behavior conserves a bounded run", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/examples/emitter-playground")
  const step = page.getByRole("button", {
    name: "Advance 1 second",
    exact: true
  })
  await step.click()
  await expect(page.getByTestId("emitter-accepted")).toHaveText("2")
  await page.getByLabel("Emission rate").selectOption("4")
  await expect(page.getByTestId("emitter-clock")).toHaveText("1.0s")
  await step.click()
  await expect(page.getByTestId("emitter-accepted")).toHaveText("6")
  await page.getByLabel("Emission rate").selectOption("2")
  for (const pattern of ["jittered", "bursty"]) {
    await page.getByLabel("Producer behavior").selectOption(pattern)
    await expect(page.getByTestId("emitter-clock")).toHaveText("0.0s")
    for (let i = 0; i < 28; i++) {
      await step.click()
      await expect(page.getByTestId("emitter-clock")).toHaveText(`${i + 1}.0s`)
    }
    await expect(step).toBeDisabled()
    await expect(page.getByTestId("emitter-travelling")).toHaveText("0")
    const counts = (await page.getByTestId("emitter-conservation").innerText())
      .match(/\d+/g)!
      .map(Number)
    expect(counts[0]).toBeGreaterThan(30)
    expect(counts[0]).toBeLessThanOrEqual(120)
    expect(counts[0]).toBe(counts[2] + counts[3])
    if (pattern === "jittered") expect(counts[3]).toBeGreaterThan(0)
    await hoverPaintedEvent(page)
  }
})

test("the source toggle gates emission and a closed window routes older events late", async ({
  page
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/examples/emitter-playground")
  await page.getByRole("button", { name: "Start emitter", exact: true }).click()
  await expect(page.getByTestId("emitter-travelling")).not.toHaveText("0")
  await page
    .getByRole("button", { name: "Emitter on", exact: true })
    .press("Enter")
  await expect(
    page.getByRole("button", { name: "Emitter off", exact: true })
  ).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("emitter-travelling")).toHaveText("0")
  const settled = await page.getByTestId("emitter-conservation").innerText()
  await page.waitForTimeout(700)
  await expect(page.getByTestId("emitter-conservation")).toHaveText(settled)
  await page
    .getByRole("button", { name: "Emitter off", exact: true })
    .press("Enter")
  const older = page.getByRole("button", {
    name: "Send older event",
    exact: true
  })
  await expect(older).toBeEnabled({ timeout: 18_000 })
  await older.click()
  await expect(page.getByTestId("emitter-late")).toHaveText("1", {
    timeout: 6000
  })
  await expect(page.getByRole("row", { name: /^0–5s Closed/ })).toBeVisible()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const counts = (await page.getByTestId("emitter-conservation").innerText())
    .match(/\d+/g)!
    .map(Number)
  expect(counts[0]).toBe(counts[1] + counts[2] + counts[3])
  await capturePage(page, testInfo.outputPath("emitter-closed-window.png"))
  await page.getByRole("button", { name: "New run", exact: true }).click()
  await expect(page.getByTestId("emitter-clock")).toHaveText("0.0s")
  await expect(page.getByTestId("emitter-late")).toHaveText("0")
})

test("reduced motion steps a bounded stream without autoplay", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(() =>
    localStorage.setItem("semiotic-theme", "light")
  )
  await page.goto("/examples/emitter-playground")
  const step = page.getByRole("button", {
    name: "Advance 1 second",
    exact: true
  })
  await expect(step).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page.getByTestId("emitter-clock")).toHaveText("0.0s")
  for (let i = 0; i < 10; i++) await step.click()
  await expect(page.getByTestId("emitter-accepted")).toHaveText("20")
  await expect(page.getByTestId("emitter-travelling")).toHaveText("0")
  await hoverPaintedEvent(page)
  await page
    .getByRole("button", { name: "Send older event", exact: true })
    .click()
  await expect(page.getByTestId("emitter-late")).toHaveText("1")
  for (let i = 10; i < 28; i++) await step.click()
  await expect(step).toBeDisabled()
  await expect(page.getByTestId("emitter-clock")).toHaveText("28.0s")
  await expect(page.getByTestId("emitter-conservation")).toHaveText(
    "49 emitted = 0 travelling + 48 accepted + 1 late"
  )
})
