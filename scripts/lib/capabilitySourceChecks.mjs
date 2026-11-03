/**
 * Source-level capability signals shared by the capability gate and its
 * regression tests. These checks intentionally recognize calls, not imports:
 * importing a bridge without invoking it does not expose a working ref API.
 */
import ts from "typescript"

export const PUSH_HANDLE_CALLEES = Object.freeze([
  "useFrameImperativeHandle",
  "useSizeEncoding",
  "useOrdinalStreaming",
  "usePhysicsHocHandle",
  "usePhysicsChartData",
  "useProcessSankeyPush",
  "useRealtimeFrameHandle",
  "useRealtimeLineIngestion",
  "useImperativeHandle"
])

const customCharts = [
  "XYCustomChart",
  "OrdinalCustomChart",
  "NetworkCustomChart",
  "PhysicsCustomChart"
]

/** Read wiring syntax without loading chart modules. TypeScript's binder
 * resolves import aliases and shadowed locals; comments, strings, types and
 * uninvoked imports cannot supply capability signals. This is a structural
 * check, not a substitute for the charts' runtime behavior tests. */
export function readCapabilityWiring(source) {
  const calls = new Set(),
    components = new Set(),
    props = new Set(),
    modules = new Set()
  if (typeof source !== "string") return { calls, components, props, modules }
  const filename = "chart.tsx"
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const options = { noLib: true, noResolve: true, jsx: ts.JsxEmit.ReactJSX }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === filename ? file : undefined)
  const checker = ts.createProgram([filename], options, host).getTypeChecker()

  function imported(expression, called = false) {
    while (ts.isParenthesizedExpression(expression))
      expression = expression.expression
    const member = ts.isPropertyAccessExpression(expression)
      ? expression.name.text
      : ts.isElementAccessExpression(expression) &&
          ts.isStringLiteral(expression.argumentExpression)
        ? expression.argumentExpression.text
        : undefined
    const binding = member ? expression.expression : expression
    if (!ts.isIdentifier(binding)) return
    const declaration = checker.getSymbolAtLocation(binding)?.declarations?.[0]
    let clause, name
    if (
      declaration &&
      ts.isImportSpecifier(declaration) &&
      !member &&
      !declaration.isTypeOnly
    ) {
      clause = declaration.parent.parent
      name = (declaration.propertyName ?? declaration.name).text
    } else if (declaration && ts.isNamespaceImport(declaration) && member) {
      clause = declaration.parent
      name = member
    } else if (declaration && ts.isImportClause(declaration)) {
      clause = declaration
      const module = clause.parent.moduleSpecifier.text
      // React's default import is its namespace; default chart imports use
      // their source filename rather than the caller's chosen local alias.
      name =
        member && module === "react"
          ? member
          : !member
            ? module
                .split("/")
                .at(-1)
                .replace(/\.[jt]sx?$/, "")
            : undefined
    }
    if (!clause || clause.isTypeOnly || !name) return
    if (
      (name === "useImperativeHandle" || name === "createElement") &&
      clause.parent.moduleSpecifier.text !== "react"
    )
      return
    if (called) modules.add(clause.parent.moduleSpecifier.text)
    return name
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = imported(node.expression, true)
      if (name) calls.add(name)
      if (name === "createElement" && node.arguments.length) {
        const component = imported(node.arguments[0])
        if (component) components.add(component)
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = imported(node.tagName)
      if (name) components.add(name)
    }
    if (
      ts.isJsxAttribute(node) ||
      ts.isPropertyAssignment(node) ||
      ts.isShorthandPropertyAssignment(node)
    ) {
      if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
        props.add(node.name.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { calls, components, props, modules }
}

export function capabilitySignals(wiring) {
  const { calls, components, props } = wiring
  const customChart = customCharts.some((name) => components.has(name))
  return {
    push: PUSH_HANDLE_CALLEES.some((name) => calls.has(name)),
    physicsSelection:
      calls.has("usePhysicsSelection") || components.has("PhysicsCustomChart"),
    linkedHover:
      customChart ||
      [
        "useChartSelection",
        "useChartSetup",
        "useNetworkChartSetup",
        "usePhysicsSelection"
      ].some((name) => calls.has(name)),
    customLayout:
      ["customNetworkLayout", "customXYLayout", "customOrdinalLayout"].some(
        (name) => props.has(name)
      ) ||
      (customChart && props.has("layout"))
  }
}

/** Return true only when a HOC source invokes a recognized push-handle bridge. */
export function sourceWiresPushHandle(source) {
  return capabilitySignals(readCapabilityWiring(source)).push
}
