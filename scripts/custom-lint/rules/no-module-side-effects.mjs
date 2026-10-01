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
        "Module-scope {{name}}(...) needs a /* @__PURE__ */ annotation so an unused component can be tree-shaken.",
      unannotatedCall:
        "Module-scope {{name}} runs on import. Move observable work to first use; annotate with /* @__PURE__ */ only if discarding this call or construction is safe."
    }
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/")
    if (isExemptFile(filename)) return {}
    const sourceCode = context.sourceCode

    const isPureAnnotated = (call) => {
      for (let parent = call.parent; parent?.range[0] === call.range[0]; parent = parent.parent) {
        if (parent.type === "CallExpression" || parent.type === "NewExpression") return false
      }
      const comment = sourceCode.getCommentsBefore(call).at(-1)
      return comment && PURE_COMMENT.test(comment.value) &&
        sourceCode.text.slice(comment.range[1], call.range[0]).trim() === ""
    }

    const isNative = (node, name) => {
      for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(name)
        if (variable) return variable.defs.length === 0
      }
      return true
    }
    const literalTree = (value) => {
      const node = unwrap(value)
      return node?.type === "Literal" ||
        (node?.type === "ArrayExpression" && node.elements.every((item) => item == null || literalTree(item)))
    }
    const inertBuiltin = (node) => {
      const callee = node.callee
      if (callee.type === "Identifier" && isNative(node, callee.name)) {
        // Literal arrays use native iteration; arbitrary iterables and
        // shadowed constructors can execute user code and are not exempt.
        if (node.type === "NewExpression" && /^(Set|Map|WeakSet|WeakMap)$/.test(callee.name)) {
          return node.arguments.length === 0 ||
            (node.arguments.length === 1 && unwrap(node.arguments[0])?.type === "ArrayExpression" && literalTree(node.arguments[0]))
        }
        if (callee.name === "Symbol" && node.type === "CallExpression") return node.arguments.every(literalTree)
      }
      if (node.type !== "CallExpression" || callee.type !== "MemberExpression" || callee.computed ||
        callee.object.type !== "Identifier" || !isNative(node, callee.object.name)) return false
      const name = `${callee.object.name}.${callee.property.name}`
      if (name === "Symbol.for") return node.arguments.length === 1 && literalTree(node.arguments[0])
      if (name === "Object.create") return node.arguments.length === 1 && node.arguments[0].type === "Literal" && node.arguments[0].value === null
      // Freezing a fresh literal cannot mutate a shared object. Children are
      // still checked below, including any calls that build its properties.
      if (name === "Object.freeze" && node.arguments.length === 1) {
        return ["ObjectExpression", "ArrayExpression"].includes(unwrap(node.arguments[0])?.type)
      }
      return false
    }

    function checkInitializer(expression) {
      const node = unwrap(expression)
      if (!node) return
      if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) return
      if (["AssignmentExpression", "UpdateExpression", "AwaitExpression", "TaggedTemplateExpression"].includes(node.type) ||
        (node.type === "UnaryExpression" && node.operator === "delete")) {
        context.report({ node, messageId: "sideEffectStatement" })
      }
      if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
        checkInitializer(node.superClass)
        for (const decorator of node.decorators ?? []) checkInitializer(decorator.expression)
        for (const member of node.body.body) {
          if (member.computed) checkInitializer(member.key)
          for (const decorator of member.decorators ?? []) checkInitializer(decorator.expression)
          if (member.type === "StaticBlock") {
            context.report({ node: member, messageId: "sideEffectStatement" })
          } else if (member.static) checkInitializer(member.value)
        }
        return
      }
      if (node.type === "CallExpression" || node.type === "NewExpression") {
        const name = factoryName(node)
        if (!isPureAnnotated(node) && !inertBuiltin(node)) {
          context.report({
            node,
            messageId: name ? "unannotatedFactory" : "unannotatedCall",
            data: { name: name ?? sourceCode.getText(node.callee) }
          })
        }
      }
      // PURE only covers the call itself: callee expressions, arguments,
      // object/array entries, conditional branches and TS wrappers still run.
      for (const key of sourceCode.visitorKeys[node.type] ?? []) {
        const child = node[key]
        if (Array.isArray(child)) child.forEach(checkInitializer)
        else if (child) checkInitializer(child)
      }
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
          checkInitializer(declarator.id)
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
        return
      }
      checkInitializer(statement)
    }

    return {
      Program(program) {
        for (const statement of program.body) checkStatement(statement)
      }
    }
  }
}
