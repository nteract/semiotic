import { expect, test } from "@playwright/test"

test("hands keyboard body hover to an overlay and places scaled tooltips near the pointer after resize", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/physics-examples/?retained&items")
  const host = page.getByTestId("retained-frame")
  const frame = host.locator(".stream-physics-frame")
  const tooltip = host.locator(".stream-physics-tooltip")
  await host.locator("canvas").hover({ position: { x: 70, y: 85 } })
  await expect(tooltip).toHaveText("Left event")
  await frame.press("ArrowRight") // First authored item is the pipe.
  await frame.press("ArrowRight")
  await expect(tooltip).toHaveText("Left event")
  const initialBounds = (await frame.boundingBox())!
  await page.mouse.move(initialBounds.x + 150, initialBounds.y + 40)
  await expect(tooltip).toContainText("Pipe: 4 rec/s")
  await expect(tooltip).toContainText("Left to right")
  await page.evaluate(() => window.__retainedPhysics.step(0))
  await expect(tooltip).toContainText("Pipe: 4 rec/s")
  await expect(frame).not.toHaveAttribute("aria-describedby")
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)

  for (const scale of [0.5, 1.5]) {
    await host.evaluate((element, value) => {
      element.style.transform = `scale(${value})`
      element.style.transformOrigin = "top left"
    }, scale)
    for (const resized of [false, true]) {
      if (resized)
        await page
          .getByRole("button", { name: "Resize retained frame" })
          .click()
      for (const right of [false, true]) {
        const bounds = (await frame.boundingBox())!
        const pointer = {
          x: bounds.x + (right ? bounds.width - 40 * scale : 40 * scale),
          y: bounds.y + 40 * scale
        }
        await page.mouse.move(pointer.x, pointer.y)
        await expect(tooltip).toContainText("Pipe: 4 rec/s")
        await expect(tooltip).toHaveAttribute("data-placement", "placed")
        const tip = (await tooltip.boundingBox())!
        const gap = right ? pointer.x - tip.x - tip.width : tip.x - pointer.x
        expect(gap).toBeGreaterThanOrEqual(0)
        expect(gap).toBeLessThanOrEqual(12 * scale)
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        await frame.press("Escape")
        await expect(tooltip).toHaveCount(0)
        await page.mouse.move(0, 0)
      }
    }
  }
  expect(errors).toEqual([])
})

test("restores stationary hover and preserves keyboard ownership through repaint and resize", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/physics-examples/?retained")
  const host = page.getByTestId("retained-frame")
  const frame = host.locator(".stream-physics-frame")
  const canvas = host.locator("canvas")
  const tooltip = host.locator(".stream-physics-tooltip")
  const assertTip = async (label: string) => {
    await expect(tooltip).toHaveText(label)
    const tip = (await tooltip.boundingBox())!
    const bounds = (await frame.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
    expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
  }
  await canvas.hover({ position: { x: 70, y: 85 } })
  await assertTip("Left event")
  // Swap worlds without moving the pointer or advancing the saved clock/revision.
  await page.evaluate(() => {
    const snapshot = window.__retainedPhysics.snapshot()
    for (const body of snapshot.world.bodies) {
      body.x = body.prevX = body.id === "left" ? 220 : 80
    }
    window.__retainedPhysics.restore(snapshot)
  })
  await assertTip("Right event")
  await frame.press("ArrowRight")
  await assertTip("Left event")
  await page.evaluate(() => window.__retainedPhysics.step(0))
  await assertTip("Left event")
  await page.mouse.move(0, 0)
  await assertTip("Left event")
  await frame.press("Escape")
  await expect(tooltip).toHaveCount(0)
  await page.getByRole("button", { name: "Resize retained frame" }).click()
  await canvas.hover({ position: { x: 70, y: 85 } })
  await assertTip("Right event")
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  expect(errors).toEqual([])
})
