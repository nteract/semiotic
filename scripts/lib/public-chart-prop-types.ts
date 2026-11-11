import ts from "typescript"
import type { PublicPropRuntimeShape } from "./public-chart-prop-parity"

export interface PublicChartProp extends PublicPropRuntimeShape {
  optional: boolean
}

export interface PublicChartPropTypes {
  /** Chart name → every member of its resolved `<Chart>Props` type. */
  props: Map<string, Map<string, PublicChartProp>>
  /** Charts whose exported `<Chart>Props` type could not be found. */
  missing: string[]
}

/**
 * Resolve each chart's public props through the TypeScript checker.
 *
 * The checker (rather than syntax-only interface members) is used so that
 * inherited `BaseChartProps` members and composed aliases count. Both the
 * chart-spec parity gate and the validator's public-prop test read this, so
 * "every prop the component accepts" means the same thing in each.
 */
export function loadPublicChartPropTypes(
  repoRoot: string,
  chartNames: readonly string[]
): PublicChartPropTypes {
  const configPath = ts.findConfigFile(
    repoRoot,
    ts.sys.fileExists,
    "tsconfig.json"
  )
  if (!configPath) throw new Error("Unable to locate tsconfig.json")
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")
    )
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    repoRoot
  )
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options
  })
  const checker = program.getTypeChecker()
  const declarations = new Map<
    string,
    ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  >()

  for (const sourceFile of program.getSourceFiles()) {
    if (
      (!sourceFile.fileName.includes("/src/components/charts/") &&
        !sourceFile.fileName.includes("/src/components/recipes/atlas/")) ||
      sourceFile.isDeclarationFile
    )
      continue
    ts.forEachChild(sourceFile, (node) => {
      if (
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name
      ) {
        const name = node.name.text
        if (name.endsWith("Props")) declarations.set(name, node)
      }
    })
  }

  const describeType = (input: ts.Type): PublicPropRuntimeShape => {
    const runtimeTypes = new Set<string>()
    const stringLiterals = new Set<string>()
    let broadString = false
    const visit = (type: ts.Type) => {
      if (type.isUnion()) {
        type.types.forEach(visit)
        return
      }
      if (type.isIntersection()) {
        const primitiveParts = type.types.filter(
          (part) =>
            !!(
              part.flags &
              (ts.TypeFlags.StringLike |
                ts.TypeFlags.NumberLike |
                ts.TypeFlags.BooleanLike)
            )
        )
        if (primitiveParts.length > 0) {
          primitiveParts.forEach(visit)
        } else if (
          checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0
        ) {
          runtimeTypes.add("function")
        } else {
          runtimeTypes.add("object")
        }
        return
      }
      if (type.flags & ts.TypeFlags.StringLiteral) {
        runtimeTypes.add("string")
        stringLiterals.add((type as ts.StringLiteralType).value)
      } else if (type.flags & ts.TypeFlags.StringLike) {
        runtimeTypes.add("string")
        broadString = true
      } else if (type.flags & ts.TypeFlags.NumberLike) {
        runtimeTypes.add("number")
      } else if (type.flags & ts.TypeFlags.BooleanLike) {
        runtimeTypes.add("boolean")
      } else if (
        type.flags &
        (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)
      ) {
        runtimeTypes.add("null")
      } else if (
        type.flags &
        (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)
      ) {
        runtimeTypes.add("unknown")
      } else if (
        checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0
      ) {
        runtimeTypes.add("function")
      } else if (checker.isArrayType(type) || checker.isTupleType(type)) {
        runtimeTypes.add("array")
      } else if (type.flags & ts.TypeFlags.Object) {
        runtimeTypes.add("object")
      }
    }
    visit(input)
    return { runtimeTypes, stringLiterals, broadString }
  }

  const props = new Map<string, Map<string, PublicChartProp>>()
  const missing: string[] = []
  for (const chartName of chartNames) {
    const declaration = declarations.get(`${chartName}Props`)
    if (!declaration) {
      missing.push(chartName)
      continue
    }
    const type = checker.getTypeAtLocation(declaration)
    const properties = new Map<string, PublicChartProp>()
    for (const symbol of checker.getPropertiesOfType(type)) {
      const propType = checker.getTypeOfSymbolAtLocation(
        symbol,
        symbol.valueDeclaration ?? declaration
      )
      properties.set(symbol.getName(), {
        optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        ...describeType(propType)
      })
    }
    props.set(chartName, properties)
  }
  return { props, missing }
}
