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
  while (
    initializer &&
    (ts.isAsExpression(initializer) ||
      ts.isSatisfiesExpression(initializer) ||
      ts.isParenthesizedExpression(initializer))
  ) {
    initializer = initializer.expression
  }
  if (!initializer || !ts.isObjectLiteralExpression(initializer))
    throw new Error(`Expected object registry: ${identity}`)
  const keys = new Set()
  for (const property of initializer.properties) {
    if (ts.isSpreadAssignment(property)) {
      const reference = ts.isIdentifier(property.expression)
        ? imports.get(property.expression.text)
        : undefined
      if (!reference?.module.startsWith("."))
        throw new Error(
          `Unsupported registry spread: ${identity}: ${property.getText(source)}`
        )
      const base = path.resolve(path.dirname(filename), reference.module)
      const target = [base, `${base}.ts`, `${base}.tsx`].find(
        (candidate) =>
          fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      )
      if (!target) throw new Error(`Missing registry module: ${base}`)
      for (const key of readRegistryKeys(target, reference.name, nextVisiting))
        keys.add(key)
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
  return keys
}

module.exports = { readRegistryKeys }
