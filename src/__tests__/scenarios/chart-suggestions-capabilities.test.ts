/**
 * Unit-test the capability-filter logic in `ai/chartSuggestions.cjs`
 * directly. The MCP-level integration is covered in
 * `mcp-protocol.test.ts`; this file pins down the behavior at the
 * function boundary so a chartSpecs change can't quietly break the
 * suggestion ranking.
 */
import { describe, it, expect } from "vitest"
// Dynamic require: the cjs module ships in `ai/` and we run vitest
// in mixed-module mode. Casting to `any` keeps the test ergonomic
// without authoring a `.d.ts` stub.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { suggestCharts, chartSatisfiesCapabilities, VALID_CAPABILITY_KEYS } =
  require("../../../ai/chartSuggestions.cjs") as {
    suggestCharts: (args: any) => any
    chartSatisfiesCapabilities: (chartName: string, requirements: any) => boolean
    VALID_CAPABILITY_KEYS: string[]
  }

describe("chartSuggestions — capability filter", () => {
  describe("VALID_CAPABILITY_KEYS", () => {
    it("exposes the supported capability constraints", () => {
      expect(VALID_CAPABILITY_KEYS.sort()).toEqual([
        "legend", "linkedHover", "push", "selection", "ssr",
      ])
    })
  })

  describe("chartSatisfiesCapabilities", () => {
    it("returns true when no constraints are set", () => {
      expect(chartSatisfiesCapabilities("Scatterplot", {})).toBe(true)
      expect(chartSatisfiesCapabilities("Scatterplot", undefined)).toBe(true)
    })

    it("returns true when chart satisfies a single requirement", () => {
      // Scatterplot supports both push and SSR (verified in chartSpecs).
      expect(chartSatisfiesCapabilities("Scatterplot", { push: true })).toBe(true)
      expect(chartSatisfiesCapabilities("Scatterplot", { ssr: true })).toBe(true)
    })

    it("returns false when chart fails a single requirement", () => {
      // GaugeChart's chartSpecs entry has supportsPush: false.
      expect(chartSatisfiesCapabilities("GaugeChart", { push: true })).toBe(false)
      // ChoroplethMap also does not support push.
      expect(chartSatisfiesCapabilities("ChoroplethMap", { push: true })).toBe(false)
    })

    it("returns true when all multi-key requirements pass", () => {
      expect(chartSatisfiesCapabilities("Scatterplot", { push: true, ssr: true, linkedHover: true })).toBe(true)
    })

    it("returns false when any multi-key requirement fails", () => {
      // GaugeChart has push: false, ssr: true. Asking for both fails.
      expect(chartSatisfiesCapabilities("GaugeChart", { push: true, ssr: true })).toBe(false)
    })

    it("supports forbid-style constraints (require: false)", () => {
      // Asking for a chart that does NOT support push.
      expect(chartSatisfiesCapabilities("GaugeChart", { push: false })).toBe(true)
      expect(chartSatisfiesCapabilities("Scatterplot", { push: false })).toBe(false)
    })

    it("fails closed for unknown chart names", () => {
      expect(chartSatisfiesCapabilities("NotARealChart", { push: true })).toBe(false)
    })
  })

  describe("suggestCharts({ capabilities })", () => {
    const numericData = [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }]
    const networkData = [{ source: "A", target: "B", value: 5 }, { source: "B", target: "C", value: 3 }]

    it("filters out non-push charts when push is required", () => {
      // Network data normally suggests SankeyDiagram + ForceDirectedGraph.
      // Both should support push (verified in chartSpecs).
      const result = suggestCharts({ data: networkData, capabilities: { push: true } })
      expect(result.ok).toBe(true)
      // Every returned suggestion should claim push support.
      for (const s of result.suggestions) {
        expect(chartSatisfiesCapabilities(s.component, { push: true })).toBe(true)
      }
    })

    it("preserves confidence ordering after filtering", () => {
      const result = suggestCharts({ data: numericData, capabilities: { push: true } })
      expect(result.ok).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
      // Scatterplot is the highest-confidence suggestion for two-numeric data.
      expect(result.suggestions[0].component).toBe("Scatterplot")
    })

    it("surfaces filteredOut when constraints drop suggestions", () => {
      // Force a constraint that nothing satisfies — `push: false` for
      // tabular numeric data which only suggests push-supporting charts.
      const allPushOnlySuggested = suggestCharts({ data: numericData })
      expect(allPushOnlySuggested.suggestions.every((s: any) =>
        chartSatisfiesCapabilities(s.component, { push: true })
      )).toBe(true)

      const filtered = suggestCharts({ data: numericData, capabilities: { push: false } })
      expect(filtered.ok).toBe(true)
      expect(filtered.suggestions.length).toBe(0)
      expect(filtered.filteredOut).toBeDefined()
      expect(filtered.filteredOut.length).toBeGreaterThan(0)
      expect(filtered.filteredOut[0]).toHaveProperty("component")
      expect(filtered.filteredOut[0]).toHaveProperty("reason")
    })

    it("rejects unknown capability keys", () => {
      const result = suggestCharts({
        data: numericData,
        capabilities: { wibble: true },
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain("Unknown capability")
    })

    it("rejects non-object capabilities", () => {
      const result = suggestCharts({
        data: numericData,
        capabilities: "push" as any,
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain("must be an object")
    })

    it("echoes the capabilities arg in the result for caller visibility", () => {
      const reqs = { push: true, ssr: true }
      const result = suggestCharts({ data: numericData, capabilities: reqs })
      expect(result.capabilities).toEqual(reqs)
    })
  })
})
