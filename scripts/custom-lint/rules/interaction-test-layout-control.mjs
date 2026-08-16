const MOVE_METHODS = new Set(["mouseMove", "pointerMove"])
const GROUPING_PROPS = new Set(["lineBy", "colorBy", "groupBy", "categoryBy"])

function jsxName(node) {
  return node.type === "JSXIdentifier" ? node.name : ""
}

function attributeName(attribute) {
  return attribute.type === "JSXAttribute" && attribute.name.type === "JSXIdentifier"
    ? attribute.name.name
    : ""
}

function isExplicitFalse(attribute) {
  return (
    attribute?.type === "JSXAttribute" &&
    attribute.value?.type === "JSXExpressionContainer" &&
    attribute.value.expression.type === "Literal" &&
    attribute.value.expression.value === false
  )
}

function isNumericLiteral(property) {
  if (property.type !== "Property" || property.computed) return false
  const name = property.key.type === "Identifier" ? property.key.name : property.key.value
  return (
    (name === "clientX" || name === "clientY") &&
    property.value.type === "Literal" &&
    typeof property.value.value === "number"
  )
}

function isHardcodedFireEventMove(node) {
  if (
    node.callee.type !== "MemberExpression" ||
    node.callee.computed ||
    node.callee.object.type !== "Identifier" ||
    node.callee.object.name !== "fireEvent" ||
    node.callee.property.type !== "Identifier" ||
    !MOVE_METHODS.has(node.callee.property.name)
  ) return false

  const coordinates = node.arguments[1]
  return coordinates?.type === "ObjectExpression" && coordinates.properties.some(isNumericLiteral)
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Make grouped-chart interaction test geometry explicit before using literal pointer coordinates"
    },
    schema: [],
    messages: {
      uncontrolledLayout: "This grouped-chart test uses literal pointer coordinates while automatic legend layout is enabled. Disable the unrelated legend with showLegend={false}, or derive coordinates from the actual plot geometry."
    }
  },
  create(context) {
    if (!/\.(test|spec)\.[^.]+$/.test(context.filename)) return {}
    const stateByScope = new Map()

    function isTestCallback(node) {
      const call = node.parent
      return (
        call?.type === "CallExpression" &&
        call.callee.type === "Identifier" &&
        (call.callee.name === "it" || call.callee.name === "test")
      )
    }

    function nearestInteractionScope(node) {
      let current = node.parent
      let fallback
      while (current) {
        if (
          current.type === "ArrowFunctionExpression" ||
          current.type === "FunctionExpression" ||
          current.type === "FunctionDeclaration"
        ) {
          if (isTestCallback(current)) return current
          fallback ||= current
        }
        current = current.parent
      }
      return fallback ?? context.sourceCode.ast
    }

    function stateFor(node) {
      const scope = nearestInteractionScope(node)
      let state = stateByScope.get(scope)
      if (!state) {
        state = { hasGroupedChartWithAutomaticLegend: false, hardcodedMoves: [] }
        stateByScope.set(scope, state)
      }
      return state
    }

    return {
      JSXOpeningElement(node) {
        const name = jsxName(node.name)
        if (!name.endsWith("Chart")) return
        const attributes = node.attributes
        const hasGrouping = attributes.some(attribute => GROUPING_PROPS.has(attributeName(attribute)))
        const showLegend = attributes.find(attribute => attributeName(attribute) === "showLegend")
        if (hasGrouping && !isExplicitFalse(showLegend)) {
          stateFor(node).hasGroupedChartWithAutomaticLegend = true
        }
      },
      CallExpression(node) {
        if (isHardcodedFireEventMove(node)) stateFor(node).hardcodedMoves.push(node)
      },
      "Program:exit"() {
        for (const state of stateByScope.values()) {
          if (!state.hasGroupedChartWithAutomaticLegend) continue
          for (const node of state.hardcodedMoves) {
            context.report({ node, messageId: "uncontrolledLayout" })
          }
        }
      }
    }
  }
}
