import type { AnimatedGifOptions } from "./animatedGif"
import type {
  GifEncoder,
  GifPalette,
  GifencExports,
  GifencRuntimeExports,
  SharpFactory,
  SharpModule
} from "./optionalImageTypes"

export async function encodeSvgFramesToGif(
  svgFrames: string[],
  width: number,
  height: number,
  options: Pick<AnimatedGifOptions, "fps" | "loop" | "scale"> = {}
): Promise<Buffer> {
  const { fps = 12, loop = true, scale = 1 } = options
  const scaledW = Math.round(width * scale)
  const scaledH = Math.round(height * scale)

  // Load optional deps dynamically at call time. The variable specifiers
  // defeat static bundler resolution so these Node-only raster/encoding
  // packages stay out of edge/browser-oriented bundles until GIF export runs.
  let sharp: SharpFactory
  try {
    const sharpName = "sharp"
    const sharpModule: SharpModule = await import(sharpName)
    sharp = sharpModule.default ?? sharpModule
  } catch {
    throw new Error(
      `Animated GIF export requires "sharp". Install it:\n  npm install sharp`
    )
  }

  let GIFEncoder: () => GifEncoder
  let quantize: (pixels: Uint8Array, maxColors: number) => GifPalette
  let applyPalette: (pixels: Uint8Array, palette: GifPalette) => Uint8Array
  try {
    const gifencName = "gifenc"
    const gifencModule: GifencExports = await import(gifencName)
    const exports = [gifencModule, gifencModule.default].find(
      (candidate): candidate is GifencRuntimeExports =>
        typeof candidate?.GIFEncoder === "function" &&
        typeof candidate.quantize === "function" &&
        typeof candidate.applyPalette === "function"
    )
    if (!exports) {
      throw new Error("gifenc did not expose its encoder functions")
    }
    GIFEncoder = exports.GIFEncoder
    quantize = exports.quantize
    applyPalette = exports.applyPalette
  } catch (error) {
    throw new Error(
      `Animated GIF export requires "gifenc". Install it:\n  npm install gifenc`,
      { cause: error }
    )
  }

  // Rasterize each SVG frame to raw RGBA pixels
  const delay = Math.round(1000 / fps)
  const encoder = GIFEncoder()

  for (let i = 0; i < svgFrames.length; i++) {
    const svgStr = svgFrames[i]

    const pngBuffer = await sharp(Buffer.from(svgStr), { density: 72 * scale })
      .resize(scaledW, scaledH)
      .ensureAlpha()
      .raw()
      .toBuffer()

    // Convert to Uint8Array for gifenc
    const pixels = new Uint8Array(pngBuffer)
    const palette = quantize(pixels, 256)
    const indexed = applyPalette(pixels, palette)

    encoder.writeFrame(indexed, scaledW, scaledH, {
      palette,
      delay,
      repeat: loop ? 0 : -1
    })
  }

  encoder.finish()
  return Buffer.from(encoder.bytes())
}
