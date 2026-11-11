/**
 * Signature-only component card for the evaluation runner's `minimal`
 * context: one component's props with their types, allowed values, and
 * defaults, and no prose descriptions. It is the unit an agent would fetch
 * after choosing a component, so the `minimal` context measures whether that
 * small payload is enough to produce a correct chart.
 */

function propType(prop) {
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return prop.enum.map((value) => JSON.stringify(value)).join(" | ")
  }
  if (Array.isArray(prop.type)) return prop.type.join(" | ")
  if (prop.type === "array" && prop.items?.type) return `${prop.items.type}[]`
  return prop.type ?? "any"
}

function firstSentence(text) {
  const sentence = /^.*?[.!?](?=\s|$)/s.exec(String(text ?? "").trim())
  return (sentence?.[0] ?? String(text ?? "")).replace(/\s+/g, " ").trim()
}

/**
 * @param {{ tools: Array<{ function: { name: string, description?: string, parameters: { required?: string[], properties: Record<string, any> } } }> }} schema
 *   Parsed `ai/schema.json`.
 * @param {string} component
 * @param {{ importPath?: string }} [options]
 * @returns {string}
 */
export function componentSignatureCard(schema, component, { importPath } = {}) {
  const entry = schema.tools.find(
    (tool) => tool.function.name === component
  )?.function
  if (!entry) {
    throw new Error(`No schema entry for component "${component}"`)
  }
  const required = new Set(entry.parameters.required ?? [])
  const props = Object.entries(entry.parameters.properties ?? {}).map(
    ([name, prop]) =>
      `- ${name}${required.has(name) ? " (required)" : ""}: ${propType(prop)}${
        prop.default === undefined ? "" : ` = ${JSON.stringify(prop.default)}`
      }`
  )
  return [
    `## ${component}`,
    ...(importPath ? [`import { ${component} } from "${importPath}"`] : []),
    firstSentence(entry.description),
    "Props (name: type = default):",
    ...props
  ].join("\n")
}
