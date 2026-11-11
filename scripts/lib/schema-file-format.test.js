// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { serializeSchemaFile } from "./schema-file-format.mjs"

describe("ai/schema.json file format", () => {
  it("round-trips the value and writes one tool per line", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      name: "semiotic",
      version: "1.2.3",
      tools: [
        { type: "function", function: { name: "A", parameters: { a: [1, 2] } } },
        { type: "function", function: { name: "B", description: "line\nbreak" } }
      ]
    }
    const text = serializeSchemaFile(schema)

    expect(JSON.parse(text)).toEqual(schema)
    expect(text.endsWith("}\n")).toBe(true)
    const lines = text.split("\n")
    expect(lines.filter((line) => line.includes('"type":"function"'))).toHaveLength(2)
    // An escaped newline inside a string must not split a component's line.
    expect(lines.find((line) => line.includes('"name":"B"'))).toContain("line\\nbreak")
  })

  it("preserves field order and tolerates files without tools", () => {
    expect(serializeSchemaFile({ version: "1.0.0", preserved: "schema" })).toBe(
      '{\n"version":"1.0.0",\n"preserved":"schema"\n}\n'
    )
    expect(serializeSchemaFile({ tools: [], name: "x" })).toBe(
      '{\n"tools":[],\n"name":"x"\n}\n'
    )
    expect(() => serializeSchemaFile([])).toThrow(TypeError)
  })

  it("is the format of the committed schema", () => {
    const committed = readFileSync("ai/schema.json", "utf8")
    expect(serializeSchemaFile(JSON.parse(committed))).toBe(committed)
  })
})
