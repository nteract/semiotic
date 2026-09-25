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
    // Keep reusable helpers intact across every library entry. Cloning them
    // into individual chunks can retain otherwise unused exports downstream.
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
