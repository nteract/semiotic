import { minify } from "terser"
import { cleanPureAnnotations } from "./clean-pure-annotations.mjs"
import { mergeLibraryImports } from "./merge-library-imports.mjs"

// One Terser run per chunk with the shared library options.
//
// Through 3.13.3 this module tried seven compression variants over two rounds
// (14 Terser runs per chunk, serially) and kept the smallest gzip result.
// Measured on the 210 ESM chunks of one production build (Node 22.23.2,
// Terser 5.51.2, Apple M5 Max, 2026-11-10):
//
//   - An application that bundles Semiotic is unaffected, because its own
//     minifier rewrites the chunks anyway. Across the 43 cold-consumer named
//     imports the eager gzip total moved 2,294,900 -> 2,295,727 B (+0.04%).
//   - A consumer that loads the published files without bundling downloads
//     0.33% more: 2,817,422 -> 2,826,609 B summed over every published ESM
//     file, with whole-entry graphs between +0.1% (server) and +0.9% (utils).
//   - The production build fell from 368 s to 41-45 s (two runs).
//
// The configuration in `library-minification-options.mjs` is the variant that
// came closest to the search when applied to every chunk on its own (the
// other six ranged from +0.37% to +0.92%). A second run over its own output
// recovers only 0.06% for twice the minification time, so each chunk is
// minified once.
export async function minifyLibraryChunk(code, { format, filename, options }) {
  const result = await minify(
    { [filename]: code },
    {
      ...(format === "esm" ? { module: true } : { toplevel: true }),
      ...options
    }
  )
  if (!result.code) throw new Error(`Empty minified chunk: ${filename}`)
  // Module initializers need hints for named-import tree shaking. Terser
  // already optimized function bodies; retaining JSX hints there adds
  // transfer bytes without helping discard unused module exports.
  return {
    code: cleanPureAnnotations(result.code, { functionBodyAnnotations: false }),
    map: result.map
  }
}

export function minifyLibraryPlugin({ format, options, mergeImports = false }) {
  return {
    name: "minify-library-chunk",
    async renderChunk(code, info) {
      if (!/\.(?:cjs|js|mjs)$/.test(info.path)) return
      if (mergeImports && format === "esm")
        code = await mergeLibraryImports(code, info.path)
      return minifyLibraryChunk(code, {
        format,
        filename: info.path,
        options
      })
    }
  }
}
