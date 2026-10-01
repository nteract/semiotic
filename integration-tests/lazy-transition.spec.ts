import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { test, expect, type Locator } from "@playwright/test"
import { expectTooltipWithinPlot, waitForRafs } from "./helpers"

// Discover the actual split artifact, keeping this test valid across hashes.
const transitionChunks = readdirSync(resolve("dist")).filter(file =>
  /^c-.*\.min\.js$/.test(file) &&
  /as xyTransitionEngine[},]/.test(readFileSync(resolve("dist", file), "utf8"))
)

async function pointCenter(canvas: Locator) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const ctx = element.getContext("2d")!
    const pixels = ctx.getImageData(0, 0, element.width, element.height).data
    let xSum = 0, ySum = 0, count = 0
    for (let y = 0; y < element.height; y++) {
      for (let x = 0; x < element.width; x++) {
        const offset = (y * element.width + x) * 4
        if (pixels[offset] > 180 && pixels[offset + 1] < 65 && pixels[offset + 2] < 100 && pixels[offset + 3] > 200) {
          xSum += x + 0.5
          ySum += y + 0.5
          count++
        }
      }
    }
    if (!count) return null
    return { x: xSum / count * element.clientWidth / element.width, y: ySum / count * element.clientHeight / element.height }
  })
}

test("delayed transition chunk preserves a painted mark, then animates and retains hover after resize", async ({ page }) => {
  expect(transitionChunks.length).toBeGreaterThan(0)
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let requested = false
  await page.route("**/c-*.min.js", async route => {
    const filename = new URL(route.request().url()).pathname.split("/").at(-1)!
    if (transitionChunks.includes(filename)) {
      requested = true
      await held
    }
    await route.continue()
  })
  await page.goto("/xy-examples/?lazy-transition")
  const chart = page.getByTestId("lazy-transition-chart")
  const canvas = chart.locator("canvas").first()
  await expect.poll(() => pointCenter(canvas)).not.toBeNull()
  const original = (await pointCenter(canvas))!
  await page.getByRole("button", { name: "Enable transition and update" }).click()
  await expect.poll(() => requested).toBe(true)
  await waitForRafs(page, 5)
  expect(await pointCenter(canvas)).toEqual(original)
  release()
  await expect.poll(async () => (await pointCenter(canvas))?.y ?? original.y).toBeLessThan(original.y - 5)
  const moving = (await pointCenter(canvas))!
  expect(moving.y).toBeGreaterThan(100)
  await expect.poll(async () => (await pointCenter(canvas))?.y ?? 0).toBeCloseTo(84, 0)

  for (const resize of [false, true]) {
    if (resize) {
      await page.getByRole("button", { name: "Resize transition chart" }).click()
      // CSS can briefly scale the old bitmap to the new width. Wait for the
      // resized backing store before measuring the transition's final mark.
      await expect(canvas).toHaveAttribute("width", "300")
      await expect.poll(async () => (await pointCenter(canvas))?.x ?? 0).toBeCloseTo(150, 0)
    }
    const center = (await pointCenter(canvas))!
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + center.x, box.y + center.y)
    const tooltip = chart.locator(".stream-frame-tooltip")
    await expect(tooltip).toContainText("Updated point")
    await expectTooltipWithinPlot(chart, { top: 40, right: 40, bottom: 40, left: 40 })
    await page.mouse.move(box.x - 10, box.y - 10)
    await expect(tooltip).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
