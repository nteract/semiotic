import { expect, test } from "@playwright/test"
import { waitForRafs } from "./helpers"
import type { PhysicsPipelineSnapshot } from "../src/components/stream/physics/PhysicsPipelineStore"
import type {} from "./physics-examples/SegmentContactsFixture"

for (const execution of ["sync", "worker"] as const) {
  test(`${execution}: segment walls retain painted marks and hover after resize`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto(`/physics-examples/?segments=${execution}`)
    await expect
      .poll(() => page.evaluate(() => window.__segmentExecution))
      .toBe(execution)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const snapshot = window.__segmentPhysics?.getCustomLayout() as
            PhysicsPipelineSnapshot | undefined
          return snapshot?.world.bodies.filter((body) => body.sleeping).length
        })
      )
      .toBe(2)

    const frame = page.locator(".stream-physics-frame")
    const canvas = frame.locator("canvas").first()
    for (const resize of [false, true]) {
      if (resize) {
        await page.getByRole("button", { name: "Resize chart" }).click()
        await expect(canvas).toHaveCSS("width", "440px")
        await expect
          .poll(() =>
            page.evaluate(() => {
              const snapshot =
                window.__segmentPhysics!.getCustomLayout() as PhysicsPipelineSnapshot
              return snapshot.world.bodies.filter((body) => body.sleeping)
                .length
            })
          )
          .toBe(2)
      }
      await waitForRafs(page, 2)
      const bodies = await page.evaluate(
        () =>
          (
            window.__segmentPhysics!.getCustomLayout() as PhysicsPipelineSnapshot
          ).world.bodies
      )
      expect(bodies.map(({ id }) => id)).toEqual(["circle", "box"])
      for (const body of bodies) {
        const radius =
          body.shape.type === "circle"
            ? body.shape.radius
            : body.shape.height / 2
        expect(body.y + radius).toBeCloseTo(140.005, 3)
        // Check actual canvas ink as well as the retained simulation state.
        const pixel = await canvas.evaluate(
          (element, position) => {
            const canvas = element as HTMLCanvasElement
            const scale = canvas.width / canvas.getBoundingClientRect().width
            return Array.from(
              canvas
                .getContext("2d")!
                .getImageData(
                  Math.round(position.x * scale),
                  Math.round(position.y * scale),
                  1,
                  1
                ).data
            )
          },
          { x: body.x, y: body.y }
        )
        expect(pixel.slice(0, 3)).toEqual([18, 52, 86])
        expect(pixel[3]).toBeGreaterThan(0)
        await canvas.hover({ position: { x: body.x, y: body.y } })
        const tooltip = frame.locator(".stream-physics-tooltip")
        await expect(tooltip).toContainText(
          body.id === "circle" ? "Small circle" : "Wide box"
        )
        const bounds = (await frame.boundingBox())!
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
    }
    expect(errors).toEqual([])
  })
}
