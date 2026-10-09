import { gzipSync, constants } from "node:zlib"
import { minify } from "terser"
import { cleanPureAnnotations } from "./clean-pure-annotations.mjs"
import { chunkLoadEffect } from "./strip-pure-bare-imports.mjs"
import { writeFileSync } from "node:fs"
import { basename, join } from "node:path"

export const libraryCompressionCandidates = [
  { hoist_funs: true, hoist_vars: false },
  { hoist_funs: false, hoist_vars: false },
  { hoist_funs: true, hoist_vars: true },
  { hoist_funs: false, hoist_vars: true }
]

// Terser optimizes JavaScript length. Published chunks are transferred
// separately, where declaration ordering also affects
// gzip's dictionary. Compare function and var declaration hoisting per chunk;
// var initializers retain their execution order in every candidate.
export async function minifyLibraryChunk(code, { format, filename, options }) {
  if (process.env.SEMIOTIC_CHUNK_AUDIT_DIRECTORY) {
    writeFileSync(join(process.env.SEMIOTIC_CHUNK_AUDIT_DIRECTORY, basename(filename)), code)
  }
  let best
  for (const compression of libraryCompressionCandidates) {
    const result = await minify(
      { [filename]: code },
      {
        ...(format === "esm" ? { module: true } : { toplevel: true }),
        ...options,
        compress: { ...options.compress, ...compression }
      }
    )
    if (!result.code) throw new Error(`Empty minified chunk: ${filename}`)
    result.code = cleanPureAnnotations(result.code)
    if (compression.hoist_vars && chunkLoadEffect(result.code, filename)) continue
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
