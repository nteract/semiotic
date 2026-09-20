/** Read static registry keys without evaluating React or renderer modules. */
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

function readRegistryKeys(filename, registryName, visiting = new Set()) {
  const identity = `${filename}:${registryName}`
  if (visiting.has(identity)) throw new Error(`Circular registry: ${identity}`)
  const nextVisiting = new Set(visiting).add(identity)
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true
  )
  const imports = new Map()
  let initializer
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const bindings = statement.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          imports.set(binding.name.text, {
            module: statement.moduleSpecifier.text,
            name: (binding.propertyName ?? binding.name).text
          })
        }
      }
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === registryName
        )
          initializer = declaration.initializer
      }
    }
  }
  const keys = new Set()
  function collect(expression) {
    while (
      expression &&
      (ts.isAsExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isParenthesizedExpression(expression))
    ) {
      expression = expression.expression
    }
    if (!expression) throw new Error(`Expected object registry: ${identity}`)
    // Read the arguments as registry fragments, without executing the call.
    // Nested assign calls preserve the same union of keys as object spreads.
    if (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      expression.expression.expression.text === "Object" &&
      expression.expression.name.text === "assign" &&
      expression.arguments.length > 0
    ) {
      for (const argument of expression.arguments) collect(argument)
      return
    }
    if (ts.isIdentifier(expression)) {
      const reference = imports.get(expression.text)
      if (!reference?.module.startsWith("."))
        throw new Error(
          `Unsupported registry spread: ${identity}: ${expression.getText(source)}`
        )
      const base = path.resolve(path.dirname(filename), reference.module)
      const target = [base, `${base}.ts`, `${base}.tsx`].find(
        (candidate) =>
          fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      )
      if (!target) throw new Error(`Missing registry module: ${base}`)
      for (const key of readRegistryKeys(target, reference.name, nextVisiting))
        keys.add(key)
      return
    }
    if (!ts.isObjectLiteralExpression(expression))
      throw new Error(`Expected object registry: ${identity}`)
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        collect(property.expression)
      } else if (
        (ts.isPropertyAssignment(property) ||
          ts.isShorthandPropertyAssignment(property)) &&
        (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ) {
        keys.add(property.name.text)
      } else {
        throw new Error(
          `Unsupported registry property: ${identity}: ${property.getText(source)}`
        )
      }
    }
  }
  collect(initializer)
  return keys
}

module.exports = { readRegistryKeys }
