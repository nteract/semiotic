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
const { suggestCharts, chartSatisfiesCapabilities, explainCapabilityMismatch, VALID_CAPABILITY_KEYS } =
  require("../../../ai/chartSuggestions.cjs") as {
    suggestCharts: (args: any) => any
    chartSatisfiesCapabilities: (chartName: string, requirements: any) => boolean
    explainCapabilityMismatch: (chartName: string, requirements: any) => string | null
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

  describe("explainCapabilityMismatch", () => {
    it("returns null when no mismatch", () => {
      expect(explainCapabilityMismatch("Scatterplot", { push: true })).toBeNull()
    })

    it("describes a single-constraint mismatch", () => {
      // GaugeChart has supportsPush: false. Asking for push: true mismatches.
      const reason = explainCapabilityMismatch("GaugeChart", { push: true })
      expect(reason).toContain("push=true")
      expect(reason).toContain("supportsPush=false")
    })

    it("describes multiple-constraint mismatches with separator", () => {
      // GaugeChart: supportsLegend=false, supportsLinkedHover=false.
      // Asking for both should surface both.
      const reason = explainCapabilityMismatch("GaugeChart", { legend: true, linkedHover: true })
      expect(reason).toContain("legend=true")
      expect(reason).toContain("linkedHover=true")
      expect(reason).toContain(";")
    })

    it("explains unknown chart name", () => {
      const reason = explainCapabilityMismatch("NotARealChart", { push: true })
      expect(reason).toContain("not found")
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

    it("filteredOut.reason cites the specific capability mismatch", () => {
      // Drop GaugeChart-style data (single-value would never match
      // here anyway) — instead use Scatterplot which we know
      // supports push, and forbid push to force a mismatch.
      const filtered = suggestCharts({ data: numericData, capabilities: { push: false } })
      expect(filtered.ok).toBe(true)
      const scatterFiltered = filtered.filteredOut.find((f: any) => f.component === "Scatterplot")
      expect(scatterFiltered).toBeDefined()
      // Reason should mention the failed constraint, not the data-shape rationale.
      expect(scatterFiltered.reason).toMatch(/push=false/)
      expect(scatterFiltered.reason).toMatch(/supportsPush=true/)
      // Sanity — the data-shape rationale (which used to be the
      // reason) should not be the value here.
      expect(scatterFiltered.reason).not.toMatch(/scatterplot shows relationships/)
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
