import { expect, test } from "@playwright/test"

test("keeps backgrounds and plot-edge clipping through hydration and preserves hover", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/hydration-plot-examples/")
  const frame = page.locator(".stream-xy-frame")
  await expect(frame.locator("clipPath rect")).toHaveAttribute("width", "190")
  const samples = async () => {
    const png = (await frame.screenshot()).toString("base64")
    return page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(image, 0, 0)
      return [
        [5, 5],
        [57, 85],
        [63, 85],
        [155, 85]
      ].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data))
    }, png)
  }
  const expected = [
    [171, 205, 239, 255],
    [171, 205, 239, 255],
    [255, 0, 0, 255],
    [255, 0, 0, 255]
  ]
  expect(await samples()).toEqual(expected)
  await page.getByRole("button", { name: "Hydrate chart" }).click()
  await expect(frame.locator("clipPath")).toHaveCount(0)
  await expect.poll(samples).toEqual(expected)
  const bounds = (await frame.boundingBox())!
  await page.mouse.move(bounds.x + 155, bounds.y + 85)
  const tooltip = frame.locator(".stream-frame-tooltip")
  await expect(tooltip).toHaveText("Point center")
  const tip = (await tooltip.boundingBox())!
  expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
  expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
  await page.mouse.move(500, 300)
  await expect(tooltip).toHaveCount(0)
  expect(errors).toEqual([])
})
