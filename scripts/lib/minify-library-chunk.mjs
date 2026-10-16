import { gzipSync, constants } from "node:zlib"
import { minify } from "terser"
import { cleanPureAnnotations } from "./clean-pure-annotations.mjs"
import { chunkLoadEffect } from "./strip-pure-bare-imports.mjs"
import { restoreModuleInitializers } from "./restore-module-initializers.mjs"

export const libraryCompressionCandidates = [
  { hoist_funs: true },
  { hoist_funs: false },
  { hoist_funs: true, hoist_vars: true },
  { hoist_funs: false, hoist_vars: true },
  { hoist_funs: true, reduce_funcs: true },
  { hoist_funs: false, reduce_funcs: true },
  { hoist_funs: false, reduce_funcs: true, passes: 2 }
]

// Terser optimizes JavaScript length. Published chunks are transferred
// separately, where declaration ordering also affects
// gzip's dictionary. Compare equivalent compression strategies per chunk.
// Reparse the best output once: optimizations exposed by printing/annotation
// cleanup are not always reached by Terser's passes over the same AST.
export async function minifyLibraryChunk(
  code,
  { format, filename, options, allowFunctionReduction = false }
) {
  let best
  for (let round = 0; round < 2; round++) {
    const input = best?.code ?? code
    const inputMap = best?.map
    const preserveInert =
      round > 0 && format === "esm" && chunkLoadEffect(input, filename) === null
    for (const compression of libraryCompressionCandidates) {
      // Callers can opt out when downstream import unions grow: function
      // cloning can shrink one chunk while widening a consumer's bundle.
      if (compression.reduce_funcs && !allowFunctionReduction) continue
      const result = await minify(
        { [filename]: input },
        {
          ...(format === "esm" ? { module: true } : { toplevel: true }),
          ...options,
          compress: { ...options.compress, ...compression },
          ...(inputMap
            ? { sourceMap: { ...options.sourceMap, content: inputMap } }
            : {})
        }
      )
      if (!result.code) throw new Error(`Empty minified chunk: ${filename}`)
      // Module initializers need hints for named-import tree shaking. Terser
      // already optimized function bodies; retaining JSX hints there adds
      // transfer bytes without helping discard unused module exports.
      if (format === "esm" && compression.hoist_vars)
        result.code = restoreModuleInitializers(result.code)
      result.code = cleanPureAnnotations(result.code, {
        functionBodyAnnotations: false
      })
      if (preserveInert && chunkLoadEffect(result.code, filename)) continue
      const bytes = gzipSync(result.code, {
        level: constants.Z_BEST_COMPRESSION
      }).length
      if (!best || bytes < best.bytes) best = { ...result, bytes }
    }
  }
  if (!best) throw new Error(`No inert minification candidate: ${filename}`)
  return { code: best.code, map: best.map }
}

export function minifyLibraryPlugin({
  format,
  options,
  allowFunctionReduction
}) {
  return {
    name: "minify-library-chunk",
    renderChunk(code, info) {
      if (!/\.(?:cjs|js|mjs)$/.test(info.path)) return
      return minifyLibraryChunk(code, {
        format,
        filename: info.path,
        options,
        allowFunctionReduction
      })
    }
  }
}
