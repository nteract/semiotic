import { gzipSync, constants } from "node:zlib"
import { minify } from "terser"
import { cleanPureAnnotations } from "./clean-pure-annotations.mjs"

// Terser optimizes JavaScript length. Published chunks are transferred
// separately, where declaration ordering also affects
// gzip's dictionary. Compare equivalent compression strategies per chunk.
export async function minifyLibraryChunk(code, { format, filename, options }) {
  let best
  for (const hoist_funs of [true, false]) {
    const result = await minify(
      { [filename]: code },
      {
        ...(format === "esm" ? { module: true } : { toplevel: true }),
        ...options,
        compress: { ...options.compress, hoist_funs }
      }
    )
    if (!result.code) throw new Error(`Empty minified chunk: ${filename}`)
    result.code = cleanPureAnnotations(result.code)
    const bytes = gzipSync(result.code, {
      level: constants.Z_BEST_COMPRESSION
    }).length
    if (!best || bytes < best.bytes) best = { ...result, bytes }
  }
  return { code: best.code, map: best.map }
}

export function minifyLibraryPlugin({ format, options }) {
  return {
    name: "minify-library-chunk",
    renderChunk(code, info) {
      if (!/\.(?:cjs|js|mjs)$/.test(info.path)) return
      return minifyLibraryChunk(code, { format, filename: info.path, options })
    }
  }
}
