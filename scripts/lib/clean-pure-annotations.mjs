import ts from "typescript"

/** Terser can leave a folded call's annotation on a return or literal. */
export function cleanPureAnnotations(
  code,
  { functionBodyAnnotations = true } = {}
) {
  const source = ts.createSourceFile(
    "chunk.js",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  )
  const calls = new Set()
  const functionBodies = []
  const visit = (node) => {
    if (ts.isFunctionLike(node) && node.body) {
      functionBodies.push([node.body.getStart(source), node.body.end])
    }
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
  // untouched. Module factory hints survive even when body hints are omitted.
  const replacements = new Map()
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
      const position = scanner.getTokenPos()
      const valid =
        calls.has(position) &&
        (functionBodyAnnotations ||
          !functionBodies.some(
            ([start, end]) => position >= start && position < end
          ))
      const pureOnly = /^\/\*\s*[@#]__PURE__\s*\*\/$/.test(text)
      const lineBreak = /[\r\n\u2028\u2029]/.test(text) ? "\n" : ""
      if (pureOnly) {
        // A comment can be the token separator or carry an ASI line break.
        // Compact real hints; leave whitespace when removing a folded hint.
        replacements.set(range.pos, [
          range.end,
          valid ? `/*#__PURE__*/${lineBreak}` : lineBreak || " "
        ])
      } else if (!valid) {
        replacements.set(range.pos, [
          range.end,
          text.replace(/[@#]__PURE__/g, "")
        ])
      }
    }
  }
  const scan = (node) => {
    comments(node.pos)
    ts.forEachChild(node, scan)
  }
  scan(source)
  const parts = []
  let cursor = 0
  for (const [start, [end, replacement]] of [...replacements].sort(
    (a, b) => a[0] - b[0]
  )) {
    parts.push(code.slice(cursor, start), replacement)
    cursor = end
  }
  parts.push(code.slice(cursor))
  return parts.join("")
}
