import ts from "typescript"

// Hoisting function-local vars can improve compression. At module scope,
// however, assignments hide pure initializers from downstream tree shaking.
// Redeclaring an existing var at its assignment preserves its hoisting and
// evaluation order while restoring the initializer that consumer bundlers see.
export function restoreModuleInitializers(code) {
  const source = ts.createSourceFile(
    "chunk.js",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  )
  const declarations = source.statements.filter(
    (statement) =>
      ts.isVariableStatement(statement) &&
      (statement.declarationList.flags & ts.NodeFlags.BlockScoped) === 0 &&
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
  )
  const bare = new Set(
    declarations.flatMap((statement) =>
      statement.declarationList.declarations
        .filter(
          (declaration) =>
            !declaration.initializer && ts.isIdentifier(declaration.name)
        )
        .map((declaration) => declaration.name.text)
    )
  )
  const assignments = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.CommaToken
    )
      return [...assignments(node.left), ...assignments(node.right)]
    return [node]
  }
  const restored = new Set()
  const edits = []
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement)) continue
    const expressions = assignments(statement.expression)
    if (
      !expressions.every(
        (expression) =>
          ts.isBinaryExpression(expression) &&
          expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(expression.left) &&
          bare.has(expression.left.text)
      )
    )
      continue
    for (const expression of expressions) restored.add(expression.left.text)
    edits.push([
      statement.getStart(source),
      statement.end,
      `var ${statement.getText(source)}`
    ])
  }
  if (!restored.size) return code
  for (const statement of declarations) {
    const remaining = statement.declarationList.declarations.filter(
      (declaration) =>
        declaration.initializer ||
        !ts.isIdentifier(declaration.name) ||
        !restored.has(declaration.name.text)
    )
    if (remaining.length === statement.declarationList.declarations.length)
      continue
    edits.push([
      statement.getStart(source),
      statement.end,
      remaining.length
        ? `var ${remaining.map((declaration) => declaration.getText(source)).join(",")};`
        : ""
    ])
  }
  let result = code
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
    result = result.slice(0, start) + replacement + result.slice(end)
  return result
}
