import { describe, it, expect } from "vitest"
import { compactPublicChartProps } from "./mcp-public-chart-props"

describe("public chart prop projection", () => {
  it("omits prepared artifacts, nested rows and unknown objects without mutating rendering input", () => {
    const secret = { id: "private-row", password: "not-for-model-output" }
    const props = {
      title: "Authored chart",
      width: 400,
      fields: ["x", "y"],
      data: [secret],
      nodes: [secret],
      edges: [secret],
      links: [secret],
      atlas: {
        source: { nodes: [secret], edges: [secret], occurrences: [secret] }
      },
      projection: { atlas: { source: [secret] } },
      circuit: { source: secret },
      edition: { intervals: [secret] },
      layout: { words: [{ text: "private-row", value: 12 }] },
      futureArtifact: { records: [secret] },
      futureRows: [secret],
      frameProps: {
        margin: { left: 12 },
        nodes: [secret],
        atlas: { source: secret },
        apiToken: "secret"
      },
      colorScheme: { alpha: "red", beta: "blue" }
    }
    const original = structuredClone(props)
    const projected = compactPublicChartProps(props)
    expect(projected).toEqual({
      title: "Authored chart",
      width: 400,
      fields: ["x", "y"],
      frameProps: { margin: { left: 12 } },
      colorScheme: { alpha: "red", beta: "blue" }
    })
    expect(JSON.stringify(projected)).not.toContain("private-row")
    expect(props).toEqual(original)
  })
})
