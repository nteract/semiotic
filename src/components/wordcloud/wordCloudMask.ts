import { WordCloudLayoutError } from "./types"
import type { WordCloudCanvasEnvironment } from "./types"
import type { NormalizedWordCloudInput } from "./normalizeWordCloudInput"

export function createWordCloudCanvas(
  environment: WordCloudCanvasEnvironment
): HTMLCanvasElement {
  const canvas =
    environment.canvas?.() ??
    (typeof document !== "undefined" ? document.createElement("canvas") : null)
  if (!canvas)
    throw new WordCloudLayoutError(
      "CANVAS_REQUIRED",
      "Preparing WordCloud requires a Canvas factory. Supply { canvas, path, loadImage } in Node, or render a precomputed layout."
    )
  if (!canvas.getContext("2d"))
    throw new WordCloudLayoutError(
      "CANVAS_REQUIRED",
      "WordCloud needs a Canvas implementation with a working 2D raster context."
    )
  return canvas as HTMLCanvasElement
}

async function loadMaskImage(
  src: string,
  environment: WordCloudCanvasEnvironment
) {
  if (environment.loadImage) return environment.loadImage(src)
  if (typeof Image === "undefined")
    throw new WordCloudLayoutError(
      "MASK_LOAD",
      "Image masks in Node require a loadImage adapter."
    )
  if (!src || /^\s*(?:javascript|file):/i.test(src))
    throw new WordCloudLayoutError(
      "INVALID_MASK",
      "Use a same-origin/CORS image URL or image data URL for mask.src."
    )
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(
        new WordCloudLayoutError(
          "MASK_LOAD",
          "WordCloud could not load the image mask. Check its URL and CORS headers."
        )
      )
    image.src = src
  })
}

/** Rasterize silhouette alpha, then invert only for the inside contract. */
export async function rasterizeWordCloudMask(
  input: NormalizedWordCloudInput,
  environment: WordCloudCanvasEnvironment
) {
  const { mask, width, height } = input
  if (!mask) return null
  if (!["inside", "outside"].includes(mask.mode ?? "inside"))
    throw new WordCloudLayoutError(
      "INVALID_MASK",
      "Mask mode must be inside or outside."
    )
  const canvas = createWordCloudCanvas(environment)
  // Image sprites are centered on integer pixels; even masks avoid half-pixel
  // resampling of their binary alpha. A spare edge pixel remains outside the box.
  canvas.width = Math.ceil(width / 2) * 2
  canvas.height = Math.ceil(height / 2) * 2
  const ctx = canvas.getContext("2d")!
  let view: [number, number, number, number]
  let image: CanvasImageSource | undefined
  let path: Path2D | undefined
  if (mask.type === "svgPath") {
    view = mask.viewBox
    if (
      !Array.isArray(view) ||
      view.length !== 4 ||
      !view.every(Number.isFinite) ||
      view[2] <= 0 ||
      view[3] <= 0 ||
      !mask.path?.trim() ||
      /[<>]/.test(mask.path)
    ) {
      throw new WordCloudLayoutError(
        "INVALID_MASK",
        "An SVG path mask requires path data and a finite, positive viewBox."
      )
    }
    if (mask.fillRule && !["evenodd", "nonzero"].includes(mask.fillRule))
      throw new WordCloudLayoutError(
        "INVALID_MASK",
        "Mask fillRule must be nonzero or evenodd."
      )
    try {
      path =
        environment.path?.(mask.path) ??
        (typeof Path2D !== "undefined" ? new Path2D(mask.path) : undefined)
    } catch {
      throw new WordCloudLayoutError(
        "INVALID_MASK",
        "WordCloud could not parse the SVG mask path."
      )
    }
    if (!path)
      throw new WordCloudLayoutError(
        "CANVAS_REQUIRED",
        "SVG path masks require a Path2D factory in this raster environment."
      )
  } else if (mask.type === "image") {
    try {
      const loaded = await loadMaskImage(mask.src, environment)
      image = loaded
      view = [0, 0, loaded.width, loaded.height]
      if (!(view[2] > 0 && view[3] > 0)) throw new Error("Empty image")
    } catch (error) {
      if (error instanceof WordCloudLayoutError) throw error
      throw new WordCloudLayoutError(
        "MASK_LOAD",
        "WordCloud could not decode the image mask; check the source and CORS permissions."
      )
    }
  } else
    throw new WordCloudLayoutError(
      "INVALID_MASK",
      "WordCloud mask.type must be svgPath or image."
    )
  const fit = input.maskFit === "cover" ? Math.max : Math.min
  const scale = fit(width / view[2], height / view[3])
  ctx.save()
  ctx.translate(
    (canvas.width - view[2] * scale) / 2,
    (canvas.height - view[3] * scale) / 2
  )
  ctx.scale(scale, scale)
  ctx.translate(-view[0], -view[1])
  ctx.fillStyle = "black"
  if (path)
    ctx.fill(
      path,
      mask.type === "svgPath" ? (mask.fillRule ?? "nonzero") : "nonzero"
    )
  else ctx.drawImage(image!, 0, 0, view[2], view[3])
  ctx.restore()
  let pixels: ImageData
  try {
    pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  } catch {
    throw new WordCloudLayoutError(
      "MASK_LOAD",
      "The mask Canvas is not readable. Use an image with CORS permission or a local SVG path."
    )
  }
  let silhouettePixels = 0
  let forbiddenPixels = 0
  for (let i = 3; i < pixels.data.length; i += 4) {
    const inside = pixels.data[i] >= input.maskThreshold
    if (inside) silhouettePixels++
    const forbidden = (mask.mode ?? "inside") === "inside" ? !inside : inside
    if (forbidden) forbiddenPixels++
    pixels.data[i] = forbidden ? 255 : 0
  }
  if (!silhouettePixels || forbiddenPixels === canvas.width * canvas.height) {
    throw new WordCloudLayoutError(
      "INVALID_MASK",
      "The mask leaves no usable silhouette or no space for words. Check alpha transparency, threshold, and mask mode."
    )
  }
  ctx.putImageData(pixels, 0, 0)
  return { canvas, forbiddenPixels }
}
