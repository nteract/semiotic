import { expect, test } from "@playwright/test"
import sharp from "sharp"

test("source keyboard controls, themed marks, and real body hover survive resize", async ({
  page
}, testInfo) => {
  // The matrix contains only canvas geometry, with no platform-dependent text.
  // Keep one reviewed baseline per browser for both developer and CI platforms.
  testInfo.snapshotSuffix = "canvas"
  await page.emulateMedia({ reducedMotion: "reduce" })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/physics-examples/?transition")
  const frame = page.getByTestId("event-drop-transition")
  const assertVisibleBodies = async () => {
    const bodies = await page.evaluate(
      () => window.__eventDropTransition.getCustomLayout().world.bodies
    )
    const bounds = (await frame.locator("canvas").boundingBox())!
    const pixels = await sharp(await page.screenshot())
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const colors = {
      "p1-event": [37, 99, 235],
      "p2-event": [192, 38, 211],
      "p3-event": [5, 150, 105]
    }
    for (const body of bodies) {
      const offset =
        (Math.round(bounds.y + body.y) * pixels.info.width +
          Math.round(bounds.x + body.x)) *
        pixels.info.channels
      const expected = colors[body.id as keyof typeof colors]
      expected.forEach((value, channel) =>
        expect(Math.abs(pixels.data[offset + channel] - value)).toBeLessThan(30)
      )
    }
  }
  const p3 = frame.getByRole("button", { name: "P3 on" })
  await p3.focus()
  await page.keyboard.press("Enter")
  await expect(frame.getByRole("button", { name: "P3 off" })).toHaveAttribute(
    "aria-pressed",
    "false"
  )
  await page.keyboard.press("Space")
  await expect(frame.getByRole("button", { name: "P3 on" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  for (const resized of [false, true]) {
    if (resized)
      await page.getByRole("button", { name: "Resize board" }).click()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__eventDropTransition
              ?.getCustomLayout()
              .world.bodies.filter((body) => body.sleeping).length
        )
      )
      .toBe(3)
    const bodies = await page.evaluate(
      () => window.__eventDropTransition.getCustomLayout().world.bodies
    )
    for (const body of bodies) {
      await frame
        .locator("canvas")
        .hover({ position: { x: body.x, y: body.y } })
      const tooltip = frame.locator(".stream-physics-tooltip")
      await expect(tooltip).toContainText(body.id)
      await expect(tooltip).toContainText("eventTime")
      const bounds = (await frame.boundingBox())!
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
    await expect(
      frame.getByRole("button", { name: /^P[123] on$/ })
    ).toHaveCount(3)
  }
  const before = await page.evaluate(() => {
    window.__eventDropStore = window.__eventDropTransition.getStore()
    return window.__eventDropTransition.getCustomLayout().world.bodies
  })
  await assertVisibleBodies()
  await expect(
    page.getByTestId("physics-mark-matrix").locator("canvas")
  ).toHaveScreenshot("marks-light.png")
  await page.screenshot({
    path: testInfo.outputPath("physics-transition-light.png")
  })
  await page.getByRole("button", { name: "Toggle palette" }).click()
  await expect(frame.locator(".stream-physics-frame")).toHaveCSS(
    "--semiotic-physics-background",
    "#102030"
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__eventDropTransition.getStore() === window.__eventDropStore
      )
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () => window.__eventDropTransition.getCustomLayout().world.bodies
    )
  ).toEqual(before)
  await assertVisibleBodies()
  await expect(
    page.getByTestId("physics-mark-matrix").locator("canvas")
  ).toHaveScreenshot("marks-dark.png")
  await page.screenshot({
    path: testInfo.outputPath("physics-transition-dark.png")
  })
  expect(errors).toEqual([])
})
