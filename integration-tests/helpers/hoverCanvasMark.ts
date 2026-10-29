import { expect, type Locator } from "@playwright/test"

/** Hover a painted mark without bypassing foreground controls. */
export async function hoverCanvasMark(
  canvas: Locator,
  color: [number, number, number]
) {
  await expect(async () => {
    await canvas.scrollIntoViewIfNeeded({ timeout: 1000 })
    const point = await canvas.evaluate((element: HTMLCanvasElement, color) => {
      const { width, height } = element
      const bounds = element.getBoundingClientRect()
      const pixels = element
        .getContext("2d")!
        .getImageData(0, 0, width, height).data
      const scaleX = bounds.width / width
      const scaleY = bounds.height / height
      const matches = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return false
        const i = (y * width + x) * 4
        return (
          color.every((value, c) => Math.abs(pixels[i + c] - value) < 5) &&
          pixels[i + 3] > 240
        )
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!matches(x, y)) continue
          // Sample inside the mark, allowing for the canvas backing resolution.
          const dx = Math.max(1, Math.ceil(1 / scaleX))
          const dy = Math.max(1, Math.ceil(1 / scaleY))
          if (
            !matches(x - dx, y) ||
            !matches(x + dx, y) ||
            !matches(x, y - dy) ||
            !matches(x, y + dy)
          )
            continue
          const point = { x: (x + 0.5) * scaleX, y: (y + 0.5) * scaleY }
          // A fractional edge beside an SVG tile can pass one hit test but
          // become covered after pointer rounding or scrolling. Require room.
          if (
            [-2, 0, 2].every((dx) =>
              [-2, 0, 2].every(
                (dy) =>
                  document.elementFromPoint(
                    bounds.x + point.x + dx,
                    bounds.y + point.y + dy
                  ) === element
              )
            )
          )
            return point
        }
      }
      return null
    }, color)
    expect(point, "No exposed interior of a painted canvas mark").not.toBeNull()
    // Resize/worker rendering can move the rail between sampling and hovering.
    // Re-sample on failure instead of retrying one stale point for the full test.
    await canvas.hover({ position: point!, timeout: 1000 })
  }).toPass({ timeout: 10_000 })
}
