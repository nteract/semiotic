const FRAME_PROPS_RE = /^frameProps(?:Without[A-Z][A-Za-z0-9]*)?$/

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Keep frameProps last or document intentional chart-owned overrides"
    },
    schema: [],
    messages: {
      framePropsLast: "Properties after {{name}} override the advanced Stream Frame escape hatch. Keep the spread last or add a nearby comment explaining the intentional chart-owned composition."
    }
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/")
    if (!filename.includes("src/components/charts/")) return {}
    const sourceCode = context.sourceCode
    return {
      ObjectExpression(node) {
        for (let index = 0; index < node.properties.length - 1; index += 1) {
          const property = node.properties[index]
          if (
            property.type === "SpreadElement" &&
            property.argument.type === "Identifier" &&
            FRAME_PROPS_RE.test(property.argument.name)
          ) {
            const firstOverride = node.properties[index + 1]
            const comments = sourceCode.getAllComments().filter(comment =>
              comment.range[0] >= property.range[1] && comment.range[1] <= firstOverride.range[0]
            )
            const explainsOverride = comments.some(comment =>
              /frame\s*props/i.test(comment.value) &&
              /override|precedence|compose|preserve|clobber|after (?:the )?spread/i.test(comment.value)
            )
            if (explainsOverride) continue
            context.report({
              node: property,
              messageId: "framePropsLast",
              data: { name: property.argument.name }
            })
          }
        }
      }
    }
  }
}
