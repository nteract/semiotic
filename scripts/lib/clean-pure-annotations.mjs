import ts from "typescript"

/** Terser can leave a folded call's annotation on a return or literal. */
export function cleanPureAnnotations(code) {
  const source = ts.createSourceFile(
    "chunk.js",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  )
  const calls = new Set()
  const visit = (node) => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      calls.add(node.getStart(source))
      let parent = node.parent
      while (parent && ts.isParenthesizedExpression(parent)) {
        calls.add(parent.getStart(source))
        parent = parent.parent
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  // Use the parser's comment ranges so annotation-like strings/regexes remain
  // untouched. Only invalid hints are removed; valid factory hints survive.
  const removals = new Map()
  const comments = (position) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(code, position) ?? []),
      ...(ts.getTrailingCommentRanges(code, position) ?? [])
    ]) {
      const text = code.slice(range.pos, range.end)
      if (!/[@#]__PURE__/.test(text)) continue
      const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        code
      )
      scanner.setTextPos(range.end)
      scanner.scan()
      if (!calls.has(scanner.getTokenPos())) removals.set(range.pos, range.end)
    }
  }
  const scan = (node) => {
    comments(node.pos)
    ts.forEachChild(node, scan)
  }
  scan(source)
  for (const [start, end] of [...removals].sort((a, b) => b[0] - a[0])) {
    code =
      code.slice(0, start) +
      code.slice(start, end).replace(/[@#]__PURE__/g, "") +
      code.slice(end)
  }
  return code
}
