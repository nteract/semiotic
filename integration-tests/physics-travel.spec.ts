import { expect, test } from "@playwright/test"
import type { PhysicsPipelineSnapshot } from "../src/components/semiotic-physics"

for (const execution of ["sync", "worker"] as const) {
  test(`${execution} travel crosses in event-time order and preserves hover through resize`, async ({
    page
  }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto(`/physics-examples/?travel=${execution}`)
    await expect
      .poll(() => page.evaluate(() => window.__travelExecution))
      .toBe(execution)
    const bodies = () =>
      page.evaluate(
        () =>
          (window.__travelChart.getCustomLayout() as PhysicsPipelineSnapshot)
            .world.bodies
      )
    const frame = page.getByTestId("event-drop-travel")
    await page.evaluate(() => window.__advanceTravel(30))
    const early = await bodies()
    expect(early).toHaveLength(2)
    expect(early[0].x).toBeLessThan(early[1].x)
    await page.screenshot({ path: testInfo.outputPath("travel-start.png") })
    await page.evaluate(() => window.__advanceTravel(45))
    const middle = await bodies()
    expect(middle[0].x).toBeGreaterThan(early[0].x)
    expect(middle[1].x).toBeLessThan(early[1].x)
    expect(middle.every((body) => body.travel)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath("travel-middle.png") })
    await page.evaluate(() => window.__advanceTravel(30))
    const crossing = await bodies()
    expect(crossing[0].x).toBeGreaterThan(crossing[1].x)
    expect(crossing.every((body) => body.travel)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath("travel-crossed.png") })
    for (const resized of [false, true]) {
      if (resized) {
        await page
          .getByRole("button", { name: "Resize travelling board" })
          .click()
        await page.evaluate(() => window.__advanceTravel(1))
      }
      const body = (await bodies())[0]
      expect(body.datum).toMatchObject({ __phase: "travel" })
      await frame
        .locator("canvas")
        .hover({ position: { x: body.x, y: body.y } })
      const tooltip = frame.locator(".stream-physics-tooltip")
      await expect(tooltip).toContainText("p1-newer: travel; event time 35")
      const bounds = (await frame.boundingBox())!
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
    await page.evaluate(() => window.__advanceTravel(30))
    expect((await bodies()).every((body) => !body.travel)).toBe(true)
    expect(errors).toEqual([])
  })
}

test("reduced motion presents the settled board with no travelling bodies", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/physics-examples/?travel=sync")
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window.__travelChart?.getCustomLayout() as PhysicsPipelineSnapshot
          )?.world.bodies.filter((body) => body.sleeping && !body.travel).length
      )
    )
    .toBe(2)
  const bodies = await page.evaluate(
    () =>
      (window.__travelChart.getCustomLayout() as PhysicsPipelineSnapshot).world
        .bodies
  )
  expect(
    bodies.every(
      (body) => (body.datum as { __phase: string }).__phase === "settled"
    )
  ).toBe(true)
})
