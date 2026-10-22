import { expect, test, type Page } from "@playwright/test"

async function hoverEvent(page: Page) {
  const host = page.getByTestId("live-emitter-chart")
  const canvas = host.locator("canvas").first()
  await canvas.scrollIntoViewIfNeeded()
  const point = await canvas.evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data
    const rect = canvas.getBoundingClientRect()
    for (let y = 2; y < canvas.height - 2; y++) {
      for (let x = 2; x < canvas.width - 2; x++) {
        const i = (y * canvas.width + x) * 4
        if (
          Math.abs(pixels[i] - 37) < 5 &&
          Math.abs(pixels[i + 1] - 99) < 5 &&
          Math.abs(pixels[i + 2] - 235) < 5 &&
          pixels[i + 3] > 240
        ) {
          const p = {
            x: (x / canvas.width) * rect.width,
            y: (y / canvas.height) * rect.height
          }
          if (document.elementFromPoint(rect.x + p.x, rect.y + p.y) === canvas)
            return p
        }
      }
    }
    throw new Error("No visible blue event")
  })
  await canvas.hover({ position: point })
  const tooltip = host.locator(".stream-physics-tooltip")
  await expect(tooltip).toContainText("Event live-")
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

for (const execution of ["sync", "worker"] as const) {
  test(`live ${execution}: retirement, snapshot replay, source gating and camera hover`, async ({
    page
  }, info) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (/StreamPhysicsFrame.*unchanged scene revisions/.test(message.text()))
        errors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto("/examples/emitter-playground")
    if (execution === "worker")
      await page.getByLabel("Compare three producers", { exact: false }).check()
    const demo = page.getByTestId("live-emitter-demo")
    await demo.getByLabel("Simulation engine").selectOption(execution)
    await demo.getByLabel("Live simulation speed").selectOption("4")
    await demo
      .getByRole("button", { name: "Start live stream", exact: true })
      .click()
    await expect(demo.getByTestId("live-execution")).toHaveText(execution)
    await expect
      .poll(
        async () =>
          parseFloat(await demo.getByTestId("live-clock").innerText()),
        { timeout: 90_000 }
      )
      .toBeGreaterThan(40)
    await demo
      .getByRole("button", { name: "Pause live stream", exact: true })
      .click()
    await expect
      .poll(async () =>
        Number(await demo.getByTestId("live-windows").innerText())
      )
      .toBeGreaterThan(12)
    const retained = Number(await demo.getByTestId("live-retained").innerText())
    const accepted = Number(await demo.getByTestId("live-accepted").innerText())
    const late = Number(await demo.getByTestId("live-late").innerText())
    expect(retained).toBeLessThanOrEqual(160)
    expect(accepted + late).toBeGreaterThan(retained)
    if (execution === "worker") expect(late).toBeGreaterThan(0)
    await hoverEvent(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await hoverEvent(page)
    await page.evaluate(async () => {
      window.scrollTo(0, 0)
      await document.fonts.ready
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
    })
    await page.screenshot({
      path: info.outputPath(`live-${execution}-mobile.png`),
      fullPage: true
    })
    await demo.getByRole("button", { name: "Save live snapshot" }).click()
    const savedClock = await demo.getByTestId("live-clock").innerText()
    const savedAccepted = await demo.getByTestId("live-accepted").innerText()
    await demo
      .getByRole("button", { name: "Start live stream", exact: true })
      .click()
    await expect
      .poll(async () =>
        Number(await demo.getByTestId("live-accepted").innerText())
      )
      .toBeGreaterThan(Number(savedAccepted) + 10)
    await demo.getByRole("button", { name: "Restore live snapshot" }).click()
    await expect(demo.getByTestId("live-clock")).toHaveText(savedClock)
    await expect(demo.getByTestId("live-accepted")).toHaveText(savedAccepted)
    await hoverEvent(page)
    // Stop every source, flush the travellers already in flight, and prove the
    // live clock continues while admissions stop. Resume without resetting.
    const labels =
      execution === "worker" ? ["Regular", "Jittered", "Bursty"] : ["Regular"]
    for (const label of labels)
      await demo
        .getByRole("button", { name: `${label} on`, exact: true })
        .click()
    await demo
      .getByRole("button", { name: "Start live stream", exact: true })
      .click()
    const time = () =>
      demo.getByTestId("live-clock").innerText().then(parseFloat)
    const start = await time()
    await expect.poll(time).toBeGreaterThan(start + 2)
    const totals = async () =>
      Number(await demo.getByTestId("live-accepted").innerText()) +
      Number(await demo.getByTestId("live-late").innerText())
    const stopped = await totals()
    await expect.poll(time).toBeGreaterThan(start + 5)
    expect(await totals()).toBe(stopped)
    await demo.getByRole("button", { name: "Regular off", exact: true }).click()
    await expect.poll(totals).toBeGreaterThan(stopped)
    await demo
      .getByRole("button", { name: "Pause live stream", exact: true })
      .click()
    expect(errors).toEqual([])
  })
}

test("reduced motion advances the live program in finite batches", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/examples/emitter-playground")
  const demo = page.getByTestId("live-emitter-demo")
  for (let i = 1; i <= 25; i++) {
    await demo
      .getByRole("button", { name: "Advance live stream by one second" })
      .click()
    await expect(demo.getByTestId("live-clock")).toHaveText(`${i.toFixed(1)}s`)
  }
  expect(
    Number(await demo.getByTestId("live-accepted").innerText())
  ).toBeGreaterThan(65)
  expect(
    Number(await demo.getByTestId("live-retained").innerText())
  ).toBeLessThan(60)
  await hoverEvent(page)
  await demo.getByRole("button", { name: "Regular on", exact: true }).click()
  // Flush any traveller already in flight, then advance the idle board.
  await demo.getByRole("button", { name: "Advance live stream by one second" }).click()
  const admitted = await demo.getByTestId("live-accepted").innerText()
  await demo.getByRole("button", { name: "Advance live stream by one second" }).click()
  await expect(demo.getByTestId("live-clock")).toHaveText("27.0s")
  await expect(demo.getByTestId("live-accepted")).toHaveText(admitted)
})
