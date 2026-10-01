import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

// esbuild's splitting output adds side-effect-only imports (`import "./c-X.js"`)
// between chunks purely to preserve evaluation order. A consumer bundler that
// honors them hoists the target chunk into the importer's eager graph, even
// when only a lazily loaded chunk actually uses its exports: a LineChart-only
// consumer then downloads the network layout plugins that the lazy
// `registerBuiltInNetworkLayouts` fallback shares with SankeyDiagram.
//
// Evaluation order only matters for chunks with top-level effects. This pass
// removes a bare import when every chunk in the target's static closure is
// provably inert at load time, and keeps it otherwise.

const BARE_CHUNK_IMPORT = /import\s*"\.\/(c-[A-Za-z0-9_-]+\.min\.js)";?[ \t]*\n?/g
const CHUNK_REFERENCE = /(?:from\s*|import\s*)"\.\/(c-[A-Za-z0-9_-]+\.min\.js)"/g
const PURE_ANNOTATION = /\/\*\s*[@#]__PURE__\s*\*\/\s*$/
const INERT_BUILTIN_CALLEE =
  /^(?:Math\.[A-Za-z0-9]+|Object\.freeze|Symbol\.for|Symbol|Array\.from|Array\.isArray|Number|String|Boolean|Set|Map|WeakMap|WeakSet)$/

/**
 * Returns why a chunk may do observable work when it is evaluated, or null
 * when its top level only declares bindings. Deliberately conservative: any
 * un-annotated call, construction, or assignment counts as an effect.
 */
export function chunkLoadEffect(code, filename = "chunk.js") {
  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  let symbolShadowed = false
  const findSymbolBinding = (node) => {
    if (node.name && ts.isIdentifier(node.name) && node.name.text === "Symbol") symbolShadowed = true
    ts.forEachChild(node, findSymbolBinding)
  }
  findSymbolBinding(source)
  let effect = null
  const visit = (node) => {
    if (effect) return
    // Both declarations and expressions evaluate class names, decorators and
    // static members now; instance initializers and method bodies run later.
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      if (ts.getDecorators(node)?.length) {
        effect = "class decorator"
        return
      }
      if (node.heritageClauses?.some((clause) => clause.types.some((type) => !ts.isIdentifier(type.expression)))) {
        effect = "class extends an expression"
        return
      }
      for (const member of node.members) {
        if (ts.canHaveDecorators(member) && ts.getDecorators(member)?.length) {
          effect = "class member decorator"
          return
        }
        if (ts.isClassStaticBlockDeclaration(member) ||
          (ts.isPropertyDeclaration(member) && member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword))) {
          effect = "class static initializer"
          return
        }
        if (member.name && ts.isComputedPropertyName(member.name)) visit(member.name)
      }
      return
    }
    // Computed names also run for object methods/getters, despite their bodies
    // being deferred. Even a bare key can invoke an observable ToPropertyKey.
    if (ts.isComputedPropertyName(node)) {
      // Native iterator names are already primitive symbols; they cannot run
      // ToPropertyKey hooks. Do not extend this to arbitrary member reads.
      if (!symbolShadowed && ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Symbol" &&
        ["iterator", "asyncIterator"].includes(node.expression.name.text)) return
      if (!ts.isStringLiteral(node.expression) && !ts.isNumericLiteral(node.expression)) {
        effect = "computed member name"
      }
      return
    }
    if (ts.isFunctionLike(node)) {
      if (node.name && ts.isComputedPropertyName(node.name)) visit(node.name)
      return
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      if (INERT_BUILTIN_CALLEE.test(node.expression.getText(source))) {
        ts.forEachChild(node, visit)
        return
      }
      const before = code.slice(Math.max(0, node.getStart(source) - 32), node.getStart(source))
      let hasAnnotatedParentCall = false
      for (let parent = node.parent; parent && parent.getStart(source) === node.getStart(source); parent = parent.parent) {
        if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) hasAnnotatedParentCall = true
      }
      if (!PURE_ANNOTATION.test(before) || hasAnnotatedParentCall) {
        effect = `call ${node.getText(source).slice(0, 80)}`
        return
      }
    }
    if (ts.isTaggedTemplateExpression(node) || ts.isDeleteExpression(node) || ts.isAwaitExpression(node)) {
      effect = node.getText(source).slice(0, 80)
      return
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      effect = `assignment ${node.getText(source).slice(0, 80)}`
      return
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
      effect = `update ${node.getText(source).slice(0, 80)}`
      return
    }
    ts.forEachChild(node, visit)
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isFunctionDeclaration(statement)) continue
    if (ts.isExpressionStatement(statement)) {
      if (ts.isStringLiteral(statement.expression)) continue // directive prologue
      return `statement ${statement.getText(source).slice(0, 80)}`
    }
    visit(statement)
    if (effect) return effect
  }
  return null
}

/**
 * Remove bare cross-chunk imports whose targets (and everything those targets
 * load) have no load-time effects. Only `.js` files in `dir` are considered;
 * CommonJS artifacts never contain ESM import syntax.
 */
export function stripPureBareChunkImports(dir) {
  const files = readdirSync(dir).filter((file) => file.endsWith(".js"))
  const codeByFile = new Map(files.map((file) => [file, readFileSync(join(dir, file), "utf8")]))
  const effectByChunk = new Map()
  const effectOf = (chunk) => {
    if (!effectByChunk.has(chunk)) {
      const code = codeByFile.get(chunk)
      effectByChunk.set(chunk, code == null ? "missing chunk" : chunkLoadEffect(code, chunk))
    }
    return effectByChunk.get(chunk)
  }
  const closureEffect = new Map()
  const transitiveEffect = (chunk, stack = new Set()) => {
    if (closureEffect.has(chunk)) return closureEffect.get(chunk)
    if (stack.has(chunk)) return null
    stack.add(chunk)
    let effect = effectOf(chunk)
    if (!effect) {
      for (const match of (codeByFile.get(chunk) ?? "").matchAll(CHUNK_REFERENCE)) {
        const nested = transitiveEffect(match[1], stack)
        if (nested) {
          effect = `${match[1]}: ${nested}`
          break
        }
      }
    }
    stack.delete(chunk)
    // A cycle can hide an ancestor's effect from a nested traversal. Cache
    // only complete root traversals, never a partial result inside a cycle.
    if (stack.size === 0) closureEffect.set(chunk, effect)
    return effect
  }

  let stripped = 0
  const kept = new Map()
  for (const [file, code] of codeByFile) {
    const next = code.replace(BARE_CHUNK_IMPORT, (statement, chunk) => {
      const effect = transitiveEffect(chunk)
      if (effect) {
        kept.set(chunk, effect)
        return statement
      }
      stripped += 1
      return ""
    })
    if (next !== code) writeFileSync(join(dir, file), next)
  }
  return { stripped, kept }
}
