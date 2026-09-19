import { test, expect, type Locator } from "@playwright/test"

async function countColorPixels(
  chart: Locator,
  rgb: number[]
): Promise<number> {
  return chart.locator("canvas").evaluateAll((nodes, color) => {
    let count = 0
    for (const node of nodes) {
      const canvas = node as HTMLCanvasElement
      const ctx = canvas.getContext("2d")
      if (!ctx) continue
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i + 3] > 200 &&
          color.every((channel, c) => Math.abs(pixels[i + c] - channel) < 5)
        )
          count++
      }
    }
    return count
  }, rgb)
}

for (const scheme of ["array", "map"]) {
  test(`screenshot: linked charts retain the ${scheme} palette`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 960, height: 700 })
    await page.goto(`/linked-color-examples/?scenario=shared&scheme=${scheme}`)
    for (const id of ["visual-line", "visual-bar"]) {
      for (const color of [
        [255, 0, 0],
        [0, 0, 255]
      ]) {
        await expect
          .poll(() =>
            countColorPixels(page.locator(`[data-chart="${id}"]`), color)
          )
          .toBeGreaterThan(20)
      }
    }
    await expect(page.locator(".legend-item rect")).toHaveCount(2)
    await expect(page.getByTestId("color-dashboard")).toHaveScreenshot(
      `linked-${scheme}-palette.png`,
      { maxDiffPixels: 100 }
    )
  })
}

test("screenshot: linked charts share mapped colors and retain independent palettes", async ({
  page
}) => {
  await page.setViewportSize({ width: 960, height: 700 })
  await page.goto("/linked-color-examples/?scenario=mixed&scheme=array")
  for (const [id, local] of [
    ["visual-line", [0, 0, 255]],
    ["visual-bar", [176, 0, 181]],
    ["visual-scatter", [255, 127, 14]]
  ] as const) {
    const chart = page.locator(`[data-chart="${id}"]`)
    await expect
      .poll(() => countColorPixels(chart, [0, 138, 91]))
      .toBeGreaterThan(20)
    await expect
      .poll(() => countColorPixels(chart, [...local]))
      .toBeGreaterThan(20)
    await expect(chart.locator(".legend-item rect")).toHaveCount(2)
  }
  await expect(page.getByTestId("color-dashboard")).toHaveScreenshot(
    "linked-shared-and-local-palettes.png",
    { maxDiffPixels: 100 }
  )
})

for (const scheme of ["array", "map"]) {
  for (const mode of ["controlled", "push"]) {
    for (const provider of ["none", "partial"]) {
      test(`${scheme} palette, ${mode} data, ${provider} provider: canvas marks and unified legend`, async ({
        page
      }) => {
        await page.goto(
          `/linked-color-examples/?scheme=${scheme}&mode=${mode}&provider=${provider}`
        )
        const first = provider === "partial" ? [0, 255, 0] : [255, 0, 0]
        for (const id of ["root-line", "line", "scatter", "bar", "histogram"]) {
          const chart = page.locator(`[data-chart="${id}"]`)
          for (const color of [first, [0, 0, 255]]) {
            await expect
              .poll(() => countColorPixels(chart, color), {
                message: `${id} paints ${color}`
              })
              .toBeGreaterThan(20)
          }
        }
        const swatches = page.locator(".legend-item rect")
        await expect(swatches).toHaveCount(2)
        await expect(swatches.nth(0)).toHaveCSS(
          "fill",
          `rgb(${first.join(", ")})`
        )
        await expect(swatches.nth(1)).toHaveCSS("fill", "rgb(0, 0, 255)")
      })
    }
  }
}
