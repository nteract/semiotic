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

function unwrap(node) {
  while (node && ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion"].includes(node.type)) {
    node = node.expression
  }
  return node
}

function isExplicitFalse(expression) {
  const node = unwrap(expression)
  return node?.type === "Literal" && node.value === false
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

    function copiedConst(identifier) {
      let variable
      for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
        variable = scope.set.get(identifier.name)
        if (variable) break
      }
      const definition = variable?.defs.length === 1 && variable.defs[0]
      if (definition?.type !== "Variable" || definition.parent.kind !== "const" ||
        definition.node.id.type !== "Identifier") return undefined
      // `const` does not freeze an object. Accept bindings whose reads only
      // copy their properties; member writes, aliases and calls can mutate it.
      if (!variable.references.every(reference => {
        if (reference.init) return true
        if (reference.isWrite()) return false
        let node = reference.identifier
        while (unwrap(node.parent) === node) node = node.parent
        return node.parent?.type === "JSXSpreadAttribute" ||
          (node.parent?.type === "SpreadElement" && node.parent.parent.type === "ObjectExpression")
      })) return undefined
      return definition.node
    }

    function applyProperty(layout, name, value) {
      if (GROUPING_PROPS.has(name)) layout.grouped = true
      if (name === "showLegend") layout.legendDisabled = isExplicitFalse(value)
    }

    function applySpread(layout, expression, seen = new Set()) {
      const node = unwrap(expression)
      if (node?.type === "Identifier") {
        const declaration = copiedConst(node)
        if (declaration && !seen.has(declaration)) {
          seen.add(declaration)
          applySpread(layout, declaration.init, seen)
          seen.delete(declaration)
          return
        }
      } else if (node?.type === "ObjectExpression" &&
        node.properties.every(property => property.type === "SpreadElement" || property.kind === "init")) {
        for (const property of node.properties) {
          if (property.type === "SpreadElement") {
            applySpread(layout, property.argument, seen)
          } else {
            const name = !property.computed && property.key.type === "Identifier"
              ? property.key.name
              : property.key.type === "Literal" ? property.key.value : undefined
            if (name === undefined) layout.legendDisabled = false
            else applyProperty(layout, name, property.value)
          }
        }
        return
      }
      // A later dynamic spread may override an earlier showLegend={false}.
      layout.legendDisabled = false
    }

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
        const layout = { grouped: false, legendDisabled: false }
        for (const attribute of node.attributes) {
          if (attribute.type === "JSXSpreadAttribute") {
            applySpread(layout, attribute.argument)
          } else {
            applyProperty(layout, attributeName(attribute), attribute.value?.expression)
          }
        }
        if (layout.grouped && !layout.legendDisabled) {
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
