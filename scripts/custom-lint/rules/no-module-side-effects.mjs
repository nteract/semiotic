// Published ESM chunks merge many modules. A module-scope statement a bundler
// cannot prove pure is retained, with everything it references, in every
// consumer bundle that imports anything from the same chunk. The 3.11 audit
// found component `displayName` assignments, top-level plugin registration,
// prototype mixins, and un-annotated React factories pinning unrelated charts.
const REACT_FACTORIES = new Set(["forwardRef", "memo", "createContext", "lazy"])
const PURE_COMMENT = /^\s*[@#]__PURE__\s*$/

function isExemptFile(filename) {
  // Library source only; the docs app (docs/src/components) is not published.
  if (!/(?:^|\/)src\/components\//.test(filename) || /(?:^|\/)docs\/src\//.test(filename)) return true
  if (/\.(test|spec)\.[jt]sx?$/.test(filename)) return true
  if (/\/(test-utils|__tests__|__scratch)\//.test(filename)) return true
  // The server group is its own published graph and registers synchronously.
  if (filename.includes("src/components/server/")) return true
  if (/Worker\.[jt]s$|\.worker\.[jt]s$/.test(filename)) return true
  // Entry modules are the realm boundary; entry-level registration only runs
  // for consumers of that entry and cannot pin another entry's chunks.
  if (/src\/components\/semiotic(?:-[a-z0-9-]+)?\.tsx?$/.test(filename)) return true
  return false
}

function unwrap(node) {
  let current = node
  while (
    current &&
    (current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "TSTypeAssertion")
  ) {
    current = current.expression
  }
  return current
}

function factoryName(call) {
  const callee = call.callee
  if (callee.type === "Identifier" && REACT_FACTORIES.has(callee.name)) return callee.name
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    /^React\d*$/.test(callee.object.name) &&
    callee.property.type === "Identifier" &&
    REACT_FACTORIES.has(callee.property.name)
  ) {
    return `React.${callee.property.name}`
  }
  return null
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Keep module scope free of side effects that defeat consumer tree-shaking"
    },
    schema: [],
    messages: {
      sideEffectStatement:
        "Module-scope statement runs on import. Consumer bundlers must keep it, and everything it references, for every bundle that shares its published chunk. Move it into a function called at render or first use (or into an entry module), or express it as a /* @__PURE__ */ initializer.",
      unannotatedFactory:
        "Module-scope {{name}}(...) needs a /* @__PURE__ */ annotation so an unused component can be tree-shaken."
    }
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/")
    if (isExemptFile(filename)) return {}
    const sourceCode = context.sourceCode

    const isPureAnnotated = (call) =>
      sourceCode.getCommentsBefore(call).some((comment) => PURE_COMMENT.test(comment.value))

    function checkInitializer(expression) {
      const node = unwrap(expression)
      if (!node || node.type !== "CallExpression") return
      const name = factoryName(node)
      const pure = isPureAnnotated(node)
      if (name && !pure) {
        context.report({ node, messageId: "unannotatedFactory", data: { name } })
      }
      // A PURE call's arguments are still evaluated, so factories nested in a
      // pure wrapper (withDisplayName(forwardRef(...))) need their own annotation.
      if (name || pure) for (const argument of node.arguments) checkInitializer(argument)
    }

    function checkStatement(statement) {
      if (statement.type === "ExportNamedDeclaration" && statement.declaration) {
        checkStatement(statement.declaration)
        return
      }
      if (statement.type === "ExportDefaultDeclaration") {
        checkInitializer(statement.declaration)
        return
      }
      if (statement.type === "VariableDeclaration") {
        for (const declarator of statement.declarations) {
          if (declarator.init) checkInitializer(declarator.init)
        }
        return
      }
      if (statement.type === "ExpressionStatement") {
        if (statement.directive) return
        const expression = statement.expression
        if (expression.type === "UnaryExpression" && expression.operator === "void" && expression.argument.type === "Identifier") {
          return
        }
        context.report({ node: statement, messageId: "sideEffectStatement" })
      }
    }

    return {
      Program(program) {
        for (const statement of program.body) checkStatement(statement)
      }
    }
  }
}
