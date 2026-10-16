import { rollup } from "rollup"

/** Consolidate repeated ESM imports without removing statements or effects. */
export async function mergeLibraryImports(code, filename) {
  const directives = []
  const bundle = await rollup({
    input: filename,
    external: (id) => id !== filename,
    treeshake: false,
    preserveEntrySignatures: "strict",
    makeAbsoluteExternalsRelative: false,
    onwarn(warning, warn) {
      // Unused bindings can disappear while their module import remains.
      // Rollup drops module directives; restore them below before minifying.
      if (
        !["UNUSED_EXTERNAL_IMPORT", "MODULE_LEVEL_DIRECTIVE"].includes(
          warning.code
        )
      )
        warn(warning)
    },
    plugins: [
      {
        name: "library-chunk",
        resolveId: (id) => (id === filename ? id : null),
        load: (id) => (id === filename ? code : null),
        moduleParsed(info) {
          if (info.id !== filename) return
          for (const statement of info.ast.body) {
            if (
              statement.type !== "ExpressionStatement" ||
              statement.expression.type !== "Literal" ||
              typeof statement.expression.value !== "string"
            )
              break
            directives.push(code.slice(statement.start, statement.end))
          }
        }
      }
    ]
  })
  try {
    const result = await bundle.generate({ format: "esm", file: filename })
    return [...directives, result.output[0].code].join("\n")
  } finally {
    await bundle.close()
  }
}
