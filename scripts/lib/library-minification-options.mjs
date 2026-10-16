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
    hoist_funs: true,
    // Start with intact helpers; the chunk minifier also compares function
    // reduction by compressed size. Semantic and named-import regressions
    // cover the selected output.
    reduce_funcs: false,
    passes: 3
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
