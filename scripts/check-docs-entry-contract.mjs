import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"

export function validateDocsEntrySource(source, fileName = "docs/src/index.jsx") {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX,
  )
  const rootVariables = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        isCreateRootCall(declaration.initializer)
      ) {
        rootVariables.add(declaration.name.text)
      }
    }
  }

  const hasTopLevelRender = sourceFile.statements.some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      isRenderCall(statement.expression, rootVariables),
  )

  if (hasTopLevelRender) return []
  return [
    `${fileName} must create and render the #root React tree in direct top-level statements; an exported or uncalled mount helper is not an eager docs entry`,
  ]
}

export function validateDocsEntryBundle(bundle, entryPath) {
  const expectedEntry = normalizeModuleId(entryPath)
  const entryChunks = Object.values(bundle).filter(
    (item) => item?.type === "chunk" && item.isEntry,
  )
  const eagerlyIncludesEntry = entryChunks.some((chunk) =>
    (chunk.moduleIds || []).map(normalizeModuleId).includes(expectedEntry),
  )

  if (eagerlyIncludesEntry) return []
  const entryFacades = entryChunks
    .map((chunk) => normalizeModuleId(chunk.facadeModuleId))
    .filter(Boolean)
  return [
    `Docs production entry chunks must eagerly include ${expectedEntry}; Rollup emitted ${entryFacades.join(", ") || "no JavaScript entry facade"}`,
  ]
}

export function docsEntryContract({ entryPath }) {
  return {
    name: "docs-eager-entry-contract",
    apply: "build",
    buildStart() {
      const failures = validateDocsEntrySource(readFileSync(entryPath, "utf8"), entryPath)
      if (failures.length > 0) this.error(failures.join("\n"))
    },
    generateBundle(_options, bundle) {
      const failures = validateDocsEntryBundle(bundle, entryPath)
      if (failures.length > 0) this.error(failures.join("\n"))
    },
  }
}

function isCreateRootCall(expression) {
  const candidate = unwrapExpression(expression)
  return (
    ts.isCallExpression(candidate) &&
    expressionName(candidate.expression) === "createRoot" &&
    candidate.arguments.length > 0 &&
    isRootElementLookup(candidate.arguments[0])
  )
}

function isRootElementLookup(expression) {
  const candidate = unwrapExpression(expression)
  if (!ts.isCallExpression(candidate) || candidate.arguments.length !== 1) return false
  const callee = unwrapExpression(candidate.expression)
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "document" &&
    callee.name.text === "getElementById" &&
    ts.isStringLiteralLike(candidate.arguments[0]) &&
    candidate.arguments[0].text === "root"
  )
}

function isRenderCall(expression, rootVariables) {
  const candidate = unwrapExpression(expression)
  if (!ts.isCallExpression(candidate)) return false
  const callee = unwrapExpression(candidate.expression)
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "render") return false
  const receiver = unwrapExpression(callee.expression)
  return (
    (ts.isIdentifier(receiver) && rootVariables.has(receiver.text)) ||
    isCreateRootCall(receiver)
  )
}

function expressionName(expression) {
  const candidate = unwrapExpression(expression)
  if (ts.isIdentifier(candidate)) return candidate.text
  if (ts.isPropertyAccessExpression(candidate)) return candidate.name.text
  return null
}

function unwrapExpression(expression) {
  let candidate = expression
  while (
    ts.isParenthesizedExpression(candidate) ||
    ts.isAsExpression(candidate) ||
    ts.isNonNullExpression(candidate) ||
    ts.isSatisfiesExpression(candidate)
  ) {
    candidate = candidate.expression
  }
  return candidate
}

function normalizeModuleId(moduleId) {
  if (!moduleId) return null
  return resolve(moduleId.replace(/^\0/, "").split("?", 1)[0])
}
