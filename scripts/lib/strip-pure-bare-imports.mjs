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
  let effect = null
  const visit = (node) => {
    if (effect) return
    // Function and class bodies do not run while the chunk loads.
    if (ts.isFunctionLike(node)) return
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      if (INERT_BUILTIN_CALLEE.test(node.expression.getText(source))) {
        ts.forEachChild(node, visit)
        return
      }
      const before = code.slice(Math.max(0, node.getStart(source) - 32), node.getStart(source))
      if (!PURE_ANNOTATION.test(before)) {
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
    if (ts.isClassDeclaration(statement)) {
      if (statement.heritageClauses?.some((clause) => clause.types.some((type) => !ts.isIdentifier(type.expression)))) {
        return "class extends an expression"
      }
      if (statement.members.some((member) =>
        ts.isClassStaticBlockDeclaration(member) ||
        (ts.isPropertyDeclaration(member) && member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword))
      )) {
        return "class static initializer"
      }
      continue
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
    closureEffect.set(chunk, effect)
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
