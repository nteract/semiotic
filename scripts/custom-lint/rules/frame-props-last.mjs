const FRAME_PROPS = /^(?:frameProps(?:Without[A-Z]\w*|Rest)?|restFrameProps)$/
const STYLE_KEYS = new Set(["pointStyle", "lineStyle", "areaStyle", "pieceStyle", "summaryStyle"])

// These chart layers compose caller graphics or reserve space in the plot margin.
const chartLayers = new Map([
  ["xy/BumpChart.tsx", ["legendLayout"]],
  ["xy/MultiAxisLineChart.tsx", ["legendLayout"]],
  ["xy/QuadrantChart.tsx", ["canvasPreRenderers", "svgPreRenderers"]],
  ["geo/DistanceCartogram.tsx", ["foregroundGraphics"]]
])

function definition(context, identifier, spreadOnly = false) {
  if (identifier?.type !== "Identifier") return
  for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const variable = scope.set.get(identifier.name)
    if (!variable) continue
    if (spreadOnly && variable.references.some(ref => !ref.init && ref.identifier.parent.type !== "SpreadElement")) return
    return variable.defs.length === 1 ? variable.defs[0] : undefined
  }
}

function styleHook(context, value, spreadOnly = false) {
  const binding = definition(context, value, spreadOnly)
  if (binding?.type !== "Variable" || binding.parent.kind !== "const" ||
    binding.node.id.type !== "Identifier") return
  const call = binding.node.init
  if (call?.type !== "CallExpression") return
  const hook = definition(context, call.callee)
  if (hook?.node.type !== "ImportSpecifier" ||
    hook.parent.source.value !== "../shared/useSelectionAwareFrameStyle") return
  return { name: hook.node.imported.name, input: call.arguments[0] }
}

function frameSpread(context, property) {
  if (property.type !== "SpreadElement") return
  const value = property.argument
  if (value.type === "Identifier" && FRAME_PROPS.test(value.name)) return value.name
  if (value.type === "CallExpression" && value.arguments[0]?.name === "frameProps") {
    const helper = definition(context, value.callee)
    if (helper?.node.type === "ImportSpecifier" && helper.node.imported.name === "withoutOrdinalPieceStyle" &&
      helper.parent.source.value === "../shared/useOrdinalPieceStyle") return "frameProps"
  }
}

function isComposed(context, property, layers, guard) {
  if (property.type === "Property") {
    if (property.computed || property.kind !== "init") return false
    const key = property.key.name ?? property.key.value
    if (layers.includes(key)) return true
    if (!STYLE_KEYS.has(key) || guard?.type !== "Identifier" || property.value.type !== "Identifier" ||
      guard.name !== property.value.name) return false
    const hook = styleHook(context, property.value)
    return hook?.name === "useSelectionAwareFrameStyle" &&
      hook.input?.type === "MemberExpression" && !hook.input.computed &&
      hook.input.object.name === "frameProps" && hook.input.property.name === key
  }
  const expression = property.argument
  const condition = expression.type === "LogicalExpression" && expression.operator === "&&"
    ? expression : undefined
  const object = condition?.right ?? expression
  if (object.type === "ObjectExpression") {
    return object.properties.every(p => isComposed(context, p, layers, condition?.left ?? guard))
  }
  const hook = styleHook(context, object, true)
  return hook?.name === "useSelectionAwareXYFrameStyles" && hook.input?.name === "frameProps"
}

export default {
  meta: {
    type: "problem",
    docs: { description: "Preserve frameProps precedence in chart configuration objects" },
    schema: [],
    messages: {
      framePropsLast: "Move this property before {{name}}. Only selection-wrapped frame styles and this chart's composed layers may follow it."
    }
  },
  create(context) {
    const chart = context.filename.replaceAll("\\", "/").split("src/components/charts/")[1]
    if (!chart) return {}
    const layers = chartLayers.get(chart) ?? []
    return {
      ObjectExpression(node) {
        let frameProps
        for (const property of node.properties) {
          if (!frameProps) {
            frameProps = frameSpread(context, property)
          } else if (!isComposed(context, property, layers)) {
            context.report({ node: property, messageId: "framePropsLast", data: { name: frameProps } })
          }
        }
      }
    }
  }
}
