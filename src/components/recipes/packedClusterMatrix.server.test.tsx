import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import { packedClusterMatrix } from "./packedClusterMatrix"

describe("packed matrix static renderer", () => {
  it.each(["banded", "stacked"])(
    "retains every record with finite SVG marks in %s mode",
    (rowMode) => {
      const nodes = Array.from({ length: 80 }, (_, i) => ({
        id: `satellite-${i}`,
        column: i < 40 ? "A" : "B",
        row: i < 40 ? "one" : "two",
        size: i === 7 ? "n/a" : (i % 8) + 1
      }))
      const result = renderChartWithEvidence("NetworkCustomChart", {
        nodes,
        edges: [],
        layout: packedClusterMatrix,
        layoutConfig: {
          rowMode,
          columnOrder: ["B"],
          rowOrder: ["two"],
          sizeAccessor: "size"
        },
        width: 400,
        height: 300,
        title: "Satellite matrix",
        description: "Eighty satellites across two regions and orbits.",
        accessibleTable: true
      })
      expect(result.evidence.markCount).toBe(nodes.length)
      expect(result.svg.match(/<path\b/g)).toHaveLength(nodes.length)
      expect(result.svg).not.toMatch(/NaN|Infinity/)
      expect(result.svg).toContain("Satellite matrix")
    }
  )
})
