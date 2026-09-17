import type { SharpFactory, SharpModule } from "./optionalImageTypes"
import type { RenderToImageOptions } from "./renderToStaticSVG"

export async function rasterizeSVG(
  svg: string,
  width: number,
  height: number,
  options: RenderToImageOptions
): Promise<Buffer> {
  const { format = "png", scale = 1 } = options
  // Load sharp dynamically — optional dep, loaded at call time only.
  // The variable specifier defeats static bundler resolution so sharp stays
  // out of edge/browser-oriented server bundles until this Node-only raster
  // export path is actually called.
  let sharp: SharpFactory
  try {
    const moduleName = "sharp"
    const sharpModule: SharpModule = await import(moduleName)
    sharp = sharpModule.default ?? sharpModule
  } catch {
    throw new Error(
      `Image export requires the "sharp" package and a Node.js runtime. Install it:\n` +
        `  npm install sharp\n` +
        `sharp is listed as an optional dependency of semiotic.`
    )
  }

  const svgBuffer =
    typeof globalThis.Buffer !== "undefined"
      ? globalThis.Buffer.from(svg)
      : new TextEncoder().encode(svg)
  const pipeline = sharp(svgBuffer, { density: 72 * scale }).resize(
    Math.round(width * scale),
    Math.round(height * scale)
  )

  if (format === "jpeg") {
    return pipeline.jpeg({ quality: 90 }).toBuffer()
  }
  return pipeline.png().toBuffer()
}
