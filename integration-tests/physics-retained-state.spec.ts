import { expect, test } from "@playwright/test"

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
