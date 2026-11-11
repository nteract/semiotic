import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { componentSignatureCard } from "./ai-eval-component-card.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const schema = JSON.parse(await readFile(join(root, "ai/schema.json"), "utf8"))

test("a signature card lists props with types, allowed values, and defaults", () => {
  const card = componentSignatureCard(schema, "LineChart", {
    importPath: "semiotic/xy"
  })
  const lines = card.split("\n")
  assert.equal(lines[0], "## LineChart")
  assert.equal(lines[1], 'import { LineChart } from "semiotic/xy"')
  assert.ok(lines.includes("- data (required): array"))
  assert.ok(lines.includes('- xAccessor: string = "x"'))
  assert.ok(
    lines.some(
      (line) =>
        line.startsWith('- curve: "linear" | "monotoneX"') &&
        line.endsWith('= "linear"')
    )
  )
  assert.ok(lines.includes("- margin: number | object"))
})

test("a card carries signatures, not the schema's prose", () => {
  const entry = schema.tools.find(
    (tool) => tool.function.name === "LineChart"
  ).function
  const card = componentSignatureCard(schema, "LineChart")
  // One line per prop plus the heading, summary sentence, and section label.
  assert.equal(
    card.split("\n").length,
    Object.keys(entry.parameters.properties).length + 3
  )
  assert.ok(!card.includes(entry.parameters.properties.annotations.description))
  assert.ok(
    card.length < JSON.stringify(entry).length / 4,
    `card ${card.length} bytes vs schema entry ${JSON.stringify(entry).length}`
  )
})

test("every component in the schema has a card and unknown names are rejected", () => {
  for (const tool of schema.tools) {
    assert.ok(
      componentSignatureCard(schema, tool.function.name).startsWith(
        `## ${tool.function.name}\n`
      )
    )
  }
  assert.throws(
    () => componentSignatureCard(schema, "ImaginaryChart"),
    /No schema entry for component "ImaginaryChart"/
  )
})
