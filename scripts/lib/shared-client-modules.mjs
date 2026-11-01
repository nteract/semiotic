import { dirname, resolve } from "node:path"
import ts from "typescript"

const sharedModules = new Set([
  "CategoryColors", "ThemeProvider", "store/ThemeStore", "store/SelectionStore",
  "store/useSelection", "store/ObservationStore", "store/LinkedCrosshairStore",
  "store/TooltipStore", "store/categoryColorContext", "stream/customLayoutSelection"
])
const sharedEsmData = new Set([
  "store/selectionProvenance", "store/themeCore", "store/cloneTheme",
  "store/concreteThemeAccessibility",
  "charts/shared/colorPalettes", "charts/shared/colorContrast", "charts/shared/withDisplayName"
])

/** Optional chart graphs reuse the canonical client contexts and color helpers. */
export function externalizeSharedClientModulesPlugin(cjs = true, shareData = !cjs) {
  const componentRoot = `${resolve("src/components").replace(/\\/g, "/")}/`
  return {
    name: "externalize-shared-client-modules",
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, (args) => {
        if (args.kind === "entry-point") return null
        // Sibling imports and imports from another family must resolve alike.
        const request = resolve(dirname(args.importer), args.path)
          .replace(/\\/g, "/").replace(/\.[cm]?[jt]sx?$/, "")
        if (!request.startsWith(componentRoot)) return null
        const module = request.slice(componentRoot.length)
        // Public wrappers own CSS/palette construction; only contexts are shared.
        if (!cjs && (module === "ThemeProvider" || module === "CategoryColors")) return null
        if (cjs && module === "store/categoryColorContext") return null
        if (module === "stream/customLayoutSelection") {
          return {
            path: cjs
              ? "./semiotic-custom-layout-selection-cjs-shared.min.js"
              : "./semiotic-client-selection.module.min.js",
            external: true
          }
        }
        if (!sharedModules.has(module) && (!shareData || !sharedEsmData.has(module))) return null
        return {
          path: cjs
            ? "./semiotic-client-cjs-shared.min.js"
            : ["store/ThemeStore", "store/themeCore", "store/cloneTheme", "store/concreteThemeAccessibility"].includes(module)
              ? "./t.min.js"
              : "./s.min.js",
          external: true
        }
      })
    }
  }
}

/** Recognize real selector calls even after private exports are minified. */
export function sharedStoreSelectorBindings(code) {
  const source = ts.createSourceFile("bridge.js", code, ts.ScriptTarget.Latest, true)
  const imports = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== "./s.min.js") continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements)
        imports.set(binding.name.text, (binding.propertyName ?? binding.name).text)
    }
  }
  const fields = new Map()
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && imports.has(node.expression.text)) {
      const selector = node.arguments[0]
      if (selector && ts.isArrowFunction(selector) && selector.parameters.length === 1 &&
          ts.isIdentifier(selector.parameters[0].name) && ts.isPropertyAccessExpression(selector.body) &&
          ts.isIdentifier(selector.body.expression) &&
          selector.body.expression.text === selector.parameters[0].name.text)
        fields.set(selector.body.name.text, imports.get(node.expression.text))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return fields
}
