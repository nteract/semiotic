/**
 * Scenario tests for agent-visible behavior contracts.
 *
 * These pin semantic rules that schema/surface parity checks cannot express:
 * color precedence, non-obvious required prop combinations, and push/ref mode.
 */

import * as React from "react"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { act, render, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CategoryColorProvider } from "../../components/CategoryColors"
import { ThemeProvider } from "../../components/ThemeProvider"
import { LineChart } from "../../components/charts/xy/LineChart"
import { useColorScale } from "../../components/charts/shared/hooks"
import { validateProps } from "../../components/charts/shared/validateProps"
import type { RealtimeFrameHandle } from "../../components/realtime/types"

const require = createRequire(import.meta.url)
const {
  BEHAVIOR_CONTRACTS,
  DOC_MARKER_END,
  DOC_MARKER_START,
  behaviorContractsFor,
  dataRequiredForUsageMode,
  requiredCombinationsFor,
} = require("../../../ai/behaviorContracts.cjs") as {
  BEHAVIOR_CONTRACTS: Array<{ id: string; title: string }>
  DOC_MARKER_END: string
  DOC_MARKER_START: string
  behaviorContractsFor: (args: { component?: string; props?: Record<string, unknown> }) => Array<{ id: string }>
  dataRequiredForUsageMode: (component: string, usageMode?: string) => boolean
  requiredCombinationsFor: (component?: string) => Array<{ component: string; required: string[] }>
}
const schema = require("../../../ai/schema.json") as {
  tools: Array<{ function: { name: string; parameters: { required?: string[] } } }>
}

describe("AI behavior contract metadata", () => {
  it("has stable unique rule IDs and generated docs sections", () => {
    const ids = BEHAVIOR_CONTRACTS.map((contract) => contract.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining([
      "props.data-required-by-usage-mode",
      "color.category-precedence",
      "props.required-combinations",
      "streaming.push-mode-data",
      "streaming.ref-mutations-require-id-accessors",
      "rendering.renderchart-static-props",
    ]))

    for (const filePath of ["CLAUDE.md", "docs/public/llms-full.txt", "ai/system-prompt.md"]) {
      const text = readFileSync(resolve(process.cwd(), filePath), "utf8")
      expect(text).toContain(DOC_MARKER_START)
      expect(text).toContain(DOC_MARKER_END)
      for (const id of ids) {
        expect(text).toContain(id)
      }
    }
  })

  it("filters rules for the props --doctor sees", () => {
    const colorRules = behaviorContractsFor({
      component: "LineChart",
      props: { data: [{ x: 1, y: 2, series: "A" }], colorBy: "series" },
    }).map((rule) => rule.id)

    expect(colorRules).toContain("color.category-precedence")
    expect(colorRules).toContain("streaming.push-mode-data")
  })

  it("treats data as required for static configs but optional for push-mode HOCs", () => {
    expect(dataRequiredForUsageMode("LineChart", "static")).toBe(true)
    expect(dataRequiredForUsageMode("LineChart", "renderChart")).toBe(true)
    expect(dataRequiredForUsageMode("LineChart", "push")).toBe(false)
    expect(dataRequiredForUsageMode("GaugeChart", "push")).toBe(false)
  })

  it("keeps data required for components that don't support push mode, regardless of usageMode", () => {
    // These components are schema-required to have data but aren't part of
    // the push-mode allowlist — Heatmap/FunnelChart/MinimapChart/ScatterplotMatrix
    // are HOCs without a ref-push API, and the hierarchy charts (Treemap,
    // CirclePack, TreeDiagram, OrbitDiagram) take a single root object.
    // Passing usageMode="push" must NOT suppress the "data is required"
    // error for them (regression test for the static-data list silently
    // omitting these components and letting agents skip required data).
    for (const c of ["Heatmap", "FunnelChart", "MinimapChart", "ScatterplotMatrix",
                     "Treemap", "CirclePack", "TreeDiagram", "OrbitDiagram"]) {
      expect(dataRequiredForUsageMode(c, "static")).toBe(true)
      expect(dataRequiredForUsageMode(c, "push")).toBe(true)
    }
  })
})

describe("AI behavior contracts — color precedence", () => {
  const data = [
    { group: "A", value: 1 },
    { group: "B", value: 2 },
  ]

  it("uses CategoryColorProvider colors before explicit fallback palettes", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { categorical: ["#00ff00"] } }}>
        <CategoryColorProvider colors={{ A: "#ff0000" }}>
          {children}
        </CategoryColorProvider>
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useColorScale(data, "group", ["#111111"]),
      { wrapper }
    )

    expect(result.current?.("A")).toBe("#ff0000")
    expect(result.current?.("B")).toBe("#111111")
  })

  it("uses ThemeProvider categorical colors when no explicit palette or provider map exists", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { categorical: ["#00ff00"] } }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useColorScale(data, "group"),
      { wrapper }
    )

    expect(result.current?.("A")).toBe("#00ff00")
  })
})

describe("AI behavior contracts — required prop combinations", () => {
  it("keeps ForceDirectedGraph nodes+edges aligned across metadata, schema, and validation", () => {
    const rule = requiredCombinationsFor("ForceDirectedGraph")[0]
    expect(rule.required).toEqual(["nodes", "edges"])

    const schemaEntry = schema.tools.find((tool) => tool.function.name === "ForceDirectedGraph")!
    expect(schemaEntry.function.parameters.required).toEqual(["nodes", "edges"])

    const result = validateProps("ForceDirectedGraph", {
      edges: [{ source: "A", target: "B" }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('"nodes" is required for ForceDirectedGraph.')
  })

  it("keeps required semantic props visible for stacked/grouped/bubble charts", () => {
    const expected = new Map([
      ["StackedAreaChart", "areaBy"],
      ["BubbleChart", "sizeBy"],
      ["StackedBarChart", "stackBy"],
      ["GroupedBarChart", "groupBy"],
    ])

    for (const [component, prop] of expected) {
      expect(requiredCombinationsFor(component)[0]?.required).toContain(prop)
      expect(requiredCombinationsFor(component)[0]?.required).not.toContain("data")
      const schemaEntry = schema.tools.find((tool) => tool.function.name === component)!
      expect(schemaEntry.function.parameters.required).toContain(prop)
    }
  })
})

describe("AI behavior contracts — push/ref behavior", () => {
  it("supports HOC push mode by omitting data and mutating through the ref", () => {
    const ref = React.createRef<RealtimeFrameHandle>()

    render(
      <LineChart
        ref={ref}
        xAccessor="x"
        yAccessor="y"
        colorBy="series"
        pointIdAccessor="id"
        width={400}
        height={300}
      />
    )

    expect(ref.current).toBeTruthy()
    expect(typeof ref.current?.push).toBe("function")
    expect(typeof ref.current?.pushMany).toBe("function")
    expect(typeof ref.current?.remove).toBe("function")
    expect(typeof ref.current?.update).toBe("function")
    expect(typeof ref.current?.clear).toBe("function")

    act(() => {
      ref.current?.push({ id: "a", x: 1, y: 2, series: "A" })
      ref.current?.update("a", (d) => ({ ...d, y: 3 }))
    })

    expect(ref.current?.getData()).toEqual([
      expect.objectContaining({ id: "a", y: 3 }),
    ])
  })
})
