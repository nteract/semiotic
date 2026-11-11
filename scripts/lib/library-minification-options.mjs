// Shared by all production library formats and their semantic regression tests.
// Public datum accessors may be getters, and malformed numeric inputs may be NaN.
// Terser's default pure_getters="strict" is also too permissive for that contract.
export const libraryTerserOptions = {
  compress: {
    pure_getters: false,
    unsafe: false,
    unsafe_comps: false,
    drop_console: false,
    pure_funcs: ["console.log", "console.debug"],
    drop_debugger: true,
    // These three settings are the one configuration every chunk is minified
    // with. `scripts/lib/minify-library-chunk.mjs` records the measurement
    // that replaced a per-chunk search over seven variants: leaving function
    // declarations in place, inlining single-use functions, and two compress
    // passes came closest to that search's gzip output at a seventeenth of its
    // minification time. Semantic and named-import regression tests cover
    // this output.
    hoist_funs: false,
    reduce_funcs: true,
    passes: 2
  },
  mangle: {
    properties: false
  },
  format: {
    // Runtime-selected imports must retain their consumer-bundler directives.
    comments: /webpackIgnore|@vite-ignore/,
    // Consumers still tree-shake these library chunks. Preserve the purity
    // annotations emitted by esbuild so unused catalogs and factories can
    // disappear when only a few public exports are imported.
    preserve_annotations: true
  }
}
