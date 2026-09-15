import { test, expect } from "@playwright/test"
import { waitForRafs } from "./helpers"

test("custom chart mounts and ResizeObserver use one layout per input state", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto("/custom-layout-examples/")
  await expect(page.getByTestId("responsive-layout-width")).toHaveText("918")
  // Let the XY fixture's 450ms transition finish as well as size settling.
  await waitForRafs(page, 30)
  const xy = await page.evaluate(() => window.xyMountLayoutCalls)
  expect(xy.glyph).toHaveLength(1)
  expect([...xy.glyph, ...xy.flower].every((call) => call.nodes > 0)).toBe(true)
  expect(xy.flower.length).toBeGreaterThanOrEqual(1)
  expect(xy.flower.length).toBeLessThanOrEqual(2)
  expect(new Set(xy.flower.map((call) => call.width)).size).toBe(
    xy.flower.length
  )
  const calls = () => page.evaluate(() => window.mountLayoutCalls)
  const mounted = await calls()
  expect(mounted.fixed).toEqual([
    { width: 720, height: 300, nodes: 52, edges: 53 }
  ])
  // Measurement may be available before the first layout. If it isn't, the
  // only additional permitted state is the supplied fallback width.
  expect(mounted.responsive.length).toBeGreaterThanOrEqual(1)
  expect(mounted.responsive.length).toBeLessThanOrEqual(2)
  expect(new Set(mounted.responsive.map((call) => call.width)).size).toBe(
    mounted.responsive.length
  )
  expect(
    mounted.responsive.every((call) => call.nodes === 6 && call.edges === 5)
  ).toBe(true)

  await page.getByTestId("mount-layout-rerender").click()
  await waitForRafs(page, 5)
  expect(await calls()).toEqual(mounted)

  await page.getByTestId("mount-layout-resize").click()
  await expect(page.getByTestId("responsive-layout-width")).toHaveText("618")
  await waitForRafs(page, 5)
  const resized = await calls()
  expect(resized.fixed).toEqual(mounted.fixed)
  expect(resized.responsive).toEqual([
    ...mounted.responsive,
    { width: 618, height: 290, nodes: 6, edges: 5 }
  ])
  // Verify real canvas pixels, not just counter/overlay publication.
  expect(
    await page
      .getByTestId("responsive-layout")
      .locator("canvas")
      .first()
      .evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext("2d")!
        const x = Math.round(canvas.width / 2)
        const y = Math.round((15 * canvas.height) / 290)
        const pixel = context.getImageData(x, y, 1, 1).data
        return [pixel[0], pixel[1], pixel[2], pixel[3]]
      })
  ).toEqual([36, 104, 171, 255])
  expect(await page.evaluate(() => window.xyMountLayoutCalls)).toEqual(xy)
  expect(errors).toEqual([])
})
