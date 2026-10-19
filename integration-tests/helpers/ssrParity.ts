export async function compareCurrentPanels(
  page: import("@playwright/test").Page,
  ssrPanel: import("@playwright/test").Locator,
  csrPanel: import("@playwright/test").Locator,
): Promise<{
  differenceRatio: number
  differingPixels: number
  inkPixels: number
  sameSize: boolean
  dominantColors?: { ssr: string[]; csr: string[] }
  inkBounds?: { ssr: number[]; csr: number[] }
}> {
  const [ssrPng, csrPng] = await Promise.all([
    ssrPanel.screenshot({ animations: "disabled" }),
    csrPanel.screenshot({ animations: "disabled" }),
  ])
  return page.evaluate(async ({ ssr, csr }) => {
    const loadPixels = async (base64: string) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      // Locator screenshots can retain transparent pixels differently for an
      // SVG root and a layered canvas frame. Composite both onto the same
      // review-sheet background before comparing RGB values.
      context.fillStyle = "#fff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0)
      return {
        width: canvas.width,
        height: canvas.height,
        pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
      }
    }
    const [a, b] = await Promise.all([loadPixels(ssr), loadPixels(csr)])
    if (a.width !== b.width || a.height !== b.height) {
      return { differenceRatio: 1, differingPixels: 1, inkPixels: 1, sameSize: false }
    }

    const isInk = (pixels: Uint8ClampedArray, index: number) =>
      Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 245
    const hasNearbyColorMatch = (
      source: Uint8ClampedArray,
      target: Uint8ClampedArray,
      x: number,
      y: number,
    ) => {
      const sourceIndex = (y * a.width + x) * 4
      for (let targetY = Math.max(0, y - 2); targetY <= Math.min(a.height - 1, y + 2); targetY++) {
        for (let targetX = Math.max(0, x - 2); targetX <= Math.min(a.width - 1, x + 2); targetX++) {
          const targetIndex = (targetY * a.width + targetX) * 4
          if (!isInk(target, targetIndex)) continue
          const channelDelta = Math.max(
            Math.abs(source[sourceIndex] - target[targetIndex]),
            Math.abs(source[sourceIndex + 1] - target[targetIndex + 1]),
            Math.abs(source[sourceIndex + 2] - target[targetIndex + 2]),
          )
          if (channelDelta <= 48) return true
        }
      }
      return false
    }

    // Compare meaningful painted pixels rather than letting the shared white
    // background hide a missing legend, axis, or mark. Check both directions:
    // otherwise content present on only one side could never count as a diff.
    let inkPixels = 0
    let differingPixels = 0
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const index = (y * a.width + x) * 4
        if (isInk(a.pixels, index)) {
          inkPixels++
          if (!hasNearbyColorMatch(a.pixels, b.pixels, x, y)) differingPixels++
        }
        if (isInk(b.pixels, index)) {
          inkPixels++
          if (!hasNearbyColorMatch(b.pixels, a.pixels, x, y)) differingPixels++
        }
      }
    }
    const dominantColors = (pixels: Uint8ClampedArray) => {
      const counts = new Map<string, number>()
      for (let index = 0; index < pixels.length; index += 4) {
        const channels = [pixels[index], pixels[index + 1], pixels[index + 2]]
        if (Math.max(...channels) - Math.min(...channels) < 24) continue
        const color = channels.map(value => value.toString(16).padStart(2, "0")).join("")
        counts.set(color, (counts.get(color) ?? 0) + 1)
      }
      return [...counts].sort((left, right) => right[1] - left[1]).slice(0, 4).map(([color]) => `#${color}`)
    }
    const inkBounds = (pixels: Uint8ClampedArray) => {
      let minX = a.width, minY = a.height, maxX = -1, maxY = -1
      for (let y = 0; y < a.height; y++) {
        for (let x = 0; x < a.width; x++) {
          if (!isInk(pixels, (y * a.width + x) * 4)) continue
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
      return [minX, minY, maxX, maxY]
    }
    return {
      differenceRatio: inkPixels === 0 ? 0 : differingPixels / inkPixels,
      differingPixels,
      inkPixels,
      sameSize: true,
      dominantColors: { ssr: dominantColors(a.pixels), csr: dominantColors(b.pixels) },
      inkBounds: { ssr: inkBounds(a.pixels), csr: inkBounds(b.pixels) },
    }
  }, { ssr: ssrPng.toString("base64"), csr: csrPng.toString("base64") })
}
