import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import ts from "typescript"
import Ajv2020 from "ajv/dist/2020.js"
import { json } from "./artifacts"
import type { Fixture } from "./types"

/** Query the artifact's own published props, including frameProps not modeled
 * by JSON schemas. Never infer support merely because a render didn't throw.
 */
export function inspectSupport(
  packageRoot: string,
  fixtures: Fixture[]
): Map<string, string[]> {
  const pkg = json(join(packageRoot, "package.json"))
  const entry = pkg.exports?.["."]?.types || pkg.types
  if (!entry || !existsSync(resolve(packageRoot, entry)))
    throw new Error(
      "Artifact has no public declarations for capability inspection"
    )
  const schema = json(join(packageRoot, "ai/schema.json"))
  if (!Array.isArray(schema.tools))
    throw new Error("Artifact has no component schema inventory")
  const path = resolve(packageRoot, entry)
  const program = ts.createProgram([path], {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    strict: true,
    types: []
  })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(path)!
  const module = checker.getSymbolAtLocation(source)
  if (!module || program.getSyntacticDiagnostics().length)
    throw new Error("Cannot inspect artifact declarations")
  const exports = checker.getExportsOfModule(module)
  const ajv = new Ajv2020({ strict: false, allErrors: true })
  return new Map(
    fixtures.map((fixture) => {
      const reasons: string[] = []
      const component = exports.find(
        (symbol) => symbol.name === fixture.component
      )
      const schemaEntry = schema.tools.find(
        (tool: { function?: { name: string } }) =>
          tool.function?.name === fixture.component
      )?.function
      if (!component || !schemaEntry)
        return [
          fixture.id,
          [
            `Component ${fixture.component} is absent from the artifact's public declarations/schema`
          ]
        ]
      // React's memo/forwardRef wrappers require consumer @types/react to resolve
      // call signatures. Prefer the package-owned public Props type so inspecting
      // the artifact does not depend on unrelated ambient declaration packages.
      const namedProps = exports.find(
        (symbol) => symbol.name === `${fixture.component}Props`
      )
      const type = checker.getTypeOfSymbolAtLocation(component, source)
      const param = type.getCallSignatures()[0]?.parameters[0]
      const props = namedProps
        ? checker.getDeclaredTypeOfSymbol(
            namedProps.flags & ts.SymbolFlags.Alias
              ? checker.getAliasedSymbol(namedProps)
              : namedProps
          )
        : param &&
          checker.getTypeOfSymbolAtLocation(
            param,
            param.valueDeclaration || source
          )
      if (!props)
        throw new Error(
          `Cannot resolve ${fixture.component}'s props in the artifact`
        )
      const paths = new Set([
        ...Object.keys(fixture.props),
        ...fixture.coveredProps
      ])
      for (const path of paths) {
        let current = props
        for (const part of path.split(".")) {
          current = checker.getNonNullableType(current)
          if (current.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))
            throw new Error(
              `Cannot verify ${fixture.component}.${path}: unresolved/open declaration`
            )
          const prop = checker.getPropertyOfType(current, part)
          if (!prop) {
            reasons.push(`Prop ${fixture.component}.${path} is not declared`)
            break
          }
          current = checker.getTypeOfSymbolAtLocation(
            prop,
            prop.valueDeclaration || source
          )
        }
      }
      const validate = ajv.compile(schemaEntry.parameters)
      if (!validate(fixture.props))
        reasons.push(
          `Fixture values are unsupported by the artifact schema: ${ajv.errorsText(validate.errors)}`
        )
      return [fixture.id, reasons]
    })
  )
}
