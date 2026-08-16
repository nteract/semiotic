function isProductionExample(filename) {
  const normalized = filename.replace(/\\/g, "/")
  return normalized.includes("docs/src/examples/") && !/\.(test|spec)\.[^.]+$/.test(normalized)
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Use family subpath imports in production documentation examples"
    },
    schema: [],
    messages: {
      familySubpath: "Production examples should import from a family subpath such as semiotic/xy or semiotic/network instead of the root semiotic entry. Split mixed-family imports when needed."
    }
  },
  create(context) {
    if (!isProductionExample(context.filename)) return {}
    return {
      ImportDeclaration(node) {
        if (node.source.value === "semiotic") {
          context.report({ node: node.source, messageId: "familySubpath" })
        }
      }
    }
  }
}
