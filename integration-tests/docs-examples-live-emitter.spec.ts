import { expect, test, type Page } from "@playwright/test"
import { hoverCanvasMark } from "./helpers/hoverCanvasMark"
import { collectBrowserErrors } from "./helpers/browser"

test.use({ screenshot: "only-on-failure", trace: "retain-on-failure" })

async function hoverEvent(page: Page) {
  const host = page.getByTestId("live-emitter-chart")
  const canvas = host.locator("canvas").first()
  await hoverCanvasMark(canvas, [37, 99, 235])
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
    const errors = collectBrowserErrors(page)
    page.on("console", (message) => {
      if (/StreamPhysicsFrame.*unchanged scene revisions/.test(message.text()))
        errors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto("/examples/emitter-playground")
    if (execution === "worker")
      await page.getByLabel("Compare three producers", { exact: false }).check()
    const demo = page.getByTestId("live-emitter-demo")
    await demo.getByLabel("Live simulation speed").selectOption("4")
    await demo.getByLabel("Simulation engine").selectOption(execution)
    // Wait for worker startup with the final paused configuration before
    // starting the workload at 4× speed.
    await expect(demo.getByTestId("live-execution")).toHaveText(execution)
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
    const frame = demo.locator('.stream-physics-frame[tabindex="0"]')
    await frame.focus()
    await frame.press("Home")
    const announcementId = await frame.getAttribute("aria-describedby")
    expect(announcementId).toBeTruthy()
    await expect(page.locator(`[id="${announcementId}"]`)).toContainText("window")
    await frame.press("Escape")
    await expect(frame).not.toHaveAttribute("aria-describedby")
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
  const errors = collectBrowserErrors(page)
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
  expect(errors).toEqual([])
})
