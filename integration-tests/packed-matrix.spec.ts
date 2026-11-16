import { expect, test } from "@playwright/test"
import type {} from "./packed-matrix/index"

for (const renderer of ["canvas", "svg"]) {
  for (const rows of ["banded", "stacked"]) {
    for (const mode of ["bounded", "push"]) {
      test(`${renderer} ${rows} ${mode} matrix preserves marks and hover through resize and camera changes`, async ({
        page
      }) => {
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(
          `/packed-matrix/?renderer=${renderer}&rows=${rows}${mode === "push" ? "&push" : ""}`
        )
        const frame = page.locator(".stream-network-frame")
        const tooltip = frame.locator(".stream-network-tooltip")
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                window.packedMatrixHandle?.getCustomLayout?.()?.sceneNodes
                  ?.length
            )
          )
          .toBe(120)
        for (const width of [600, 360]) {
          if (width === 360)
            await page.getByRole("button", { name: "Resize matrix" }).click()
          await expect(frame).toHaveCSS("width", `${width}px`)
          for (const id of ["satellite-7", "satellite-67"]) {
            const target = await page.evaluate((id) => {
              const node = window.packedMatrixHandle!
                .getCustomLayout!()!.sceneNodes!.find((n) => n.id === id)!
              if (node.type !== "symbol") throw new Error("Expected a symbol")
              const camera = {
                k: 1.2,
                x: 150 - node.cx * 1.2,
                y: 170 - node.cy * 1.2
              }
              window.packedMatrixHandle!.zoomTo(camera, 0)
              return camera
            }, id)
            // Imperative camera changes commit through React before getZoom updates.
            await expect
              .poll(() =>
                page.evaluate(() => window.packedMatrixHandle!.getZoom())
              )
              .toEqual(target)
            const point = { x: 170, y: 210 } // Include the frame's left/top margins.
            const bounds = (await frame.boundingBox())!
            if (renderer === "canvas") {
              await expect
                .poll(() =>
                  frame
                    .locator("canvas")
                    .evaluate((canvas: HTMLCanvasElement, p) => {
                      const rect = canvas.getBoundingClientRect()
                      return canvas
                        .getContext("2d")!
                        .getImageData(
                          (p.x * canvas.width) / rect.width,
                          (p.y * canvas.height) / rect.height,
                          1,
                          1
                        ).data[3]
                    }, point)
                )
                .toBeGreaterThan(0)
            } else {
              await expect(frame.locator("svg path")).toHaveCount(120)
            }
            await page.mouse.move(bounds.x + point.x, bounds.y + point.y)
            await expect(tooltip).toHaveText(
              id === "satellite-7"
                ? "satellite-7: A / one; size n/a"
                : "satellite-67: B / two; size 4"
            )
            const tip = (await tooltip.boundingBox())!
            expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
            expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
            expect(tip.x + tip.width).toBeLessThanOrEqual(
              bounds.x + bounds.width
            )
            expect(tip.y + tip.height).toBeLessThanOrEqual(
              bounds.y + bounds.height
            )
            await page.mouse.move(0, 0)
            await expect(tooltip).toHaveCount(0)
          }
        }
        expect(errors).toEqual([])
      })
    }
  }
}
