import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SankeyDiagram } from "./SankeyDiagram"
import { TooltipProvider } from "../../store/TooltipStore"
import { sankeyLayoutPlugin } from "../../stream/layouts/sankeyLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../../stream/networkTypes"

// ── Mock StreamNetworkFrame to capture props ────────────────────────────
let lastFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    })
  }
})

// ── Test data matching the user's real-world scenario ───────────────────
const nodes = [
  { id: "comparison", name: "Comparison", nodeType: "category" },
  { id: "bar", name: "Bar Chart", nodeType: "viz" },
  { id: "grouped-bar", name: "Grouped Bar", nodeType: "viz" },
]
const edges = [
  { source: "comparison", target: "bar", value: 1 },
  { source: "comparison", target: "grouped-bar", value: 2 },
]

describe("SankeyDiagram label bug", () => {
  beforeEach(() => {
    lastFrameProps = null
  })

  // ── 1. HOC forwards nodeLabel and showLabels to StreamNetworkFrame ──

  it("passes showLabels=true to StreamNetworkFrame", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram
          nodes={nodes}
          edges={edges}
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
          nodeLabel="name"
          showLabels={true}
          width={700}
          height={500}
        />
      </TooltipProvider>
    )
    expect(lastFrameProps.showLabels).toBe(true)
  })

  it("passes a nodeLabel function to StreamNetworkFrame when nodeLabel='name'", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram
          nodes={nodes}
          edges={edges}
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
          nodeLabel="name"
          showLabels={true}
          width={700}
          height={500}
        />
      </TooltipProvider>
    )
    expect(lastFrameProps.nodeLabel).toBeDefined()
    expect(typeof lastFrameProps.nodeLabel).toBe("function")
  })

  // ── 2. The core bug: HOC's nodeLabelFn receives RealtimeNode, not raw data ──

  it("HOC nodeLabelFn resolves label from RealtimeNode.data", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram
          nodes={nodes}
          edges={edges}
          nodeIDAccessor="id"
          nodeLabel="name"
          showLabels={true}
          width={700}
          height={500}
        />
      </TooltipProvider>
    )
    const labelFn = lastFrameProps.nodeLabel

    // Simulate what the layout plugin passes: a RealtimeNode with user data nested in .data
    const realtimeNode: Record<string, any> = {
      id: "comparison",
      x: 50, y: 100,
      x0: 40, x1: 55, y0: 80, y1: 200,
      width: 15, height: 120,
      value: 3,
      data: { id: "comparison", name: "Comparison", nodeType: "category" },
    }

    // The HOC unwraps d.data to find the "name" field
    const result = labelFn(realtimeNode)
    expect(result).toBe("Comparison")
  })

  it("HOC nodeLabelFn works on raw data object (no .data nesting)", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram
          nodes={nodes}
          edges={edges}
          nodeIDAccessor="id"
          nodeLabel="name"
          showLabels={true}
          width={700}
          height={500}
        />
      </TooltipProvider>
    )
    const labelFn = lastFrameProps.nodeLabel

    // If the function received the raw node directly, it would work
    const rawNode = { id: "comparison", name: "Comparison", nodeType: "category" }
    const result = labelFn(rawNode)
    expect(result).toBe("Comparison")
  })

  // ── 3. Layout plugin's resolveLabelFn also has the issue ──────────────

  describe("sankeyLayoutPlugin.buildScene label resolution", () => {
    function makeRealtimeNode(id: string, data: Record<string, any>): RealtimeNode {
      return {
        id,
        x: 0, y: 0,
        x0: 0, x1: 0, y0: 0, y1: 0,
        width: 0, height: 0,
        value: 0,
        data,
      }
    }

    function makeRealtimeEdge(source: string, target: string, value: number): RealtimeEdge {
      return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
    }

    it("labels fall back to node.id when nodeLabel string resolves to undefined on RealtimeNode", () => {
      // When nodeLabel is passed as a raw string (not pre-wrapped by the HOC),
      // resolveLabelFn builds `(d) => d["name"] || d.id` — the fallback to d.id
      // means labels show up but with the wrong text (id instead of name).
      const rtNodes = [
        makeRealtimeNode("comparison", { id: "comparison", name: "Comparison", nodeType: "category" }),
        makeRealtimeNode("bar", { id: "bar", name: "Bar Chart", nodeType: "viz" }),
      ]
      const rtEdges = [makeRealtimeEdge("comparison", "bar", 1)]

      const config: NetworkPipelineConfig = {
        chartType: "sankey",
        showLabels: true,
        nodeLabel: "name",  // string, not a function
      }
      const size: [number, number] = [700, 500]

      sankeyLayoutPlugin.computeLayout(rtNodes, rtEdges, config, size)
      const scene = sankeyLayoutPlugin.buildScene(rtNodes, rtEdges, config, size)

      // resolveLabelFn for string "name" does: d["name"] || d.id
      // d["name"] is undefined on RealtimeNode, so falls back to d.id
      for (const label of scene.labels) {
        // BUG: Labels show the node ID, not the human-readable name
        expect(["comparison", "bar"]).toContain(label.text)
        // The user expects "Comparison" or "Bar Chart"
        expect(["Comparison", "Bar Chart"]).not.toContain(label.text)
      }
    })

    it("labels show no text when HOC pre-wraps nodeLabel as a function", () => {
      // When the HOC wraps nodeLabel="name" into (d) => d["name"], the layout
      // plugin's resolveLabelFn sees a function and returns it directly — no
      // d.id fallback. The function returns undefined on RealtimeNode.
      const rtNodes = [
        makeRealtimeNode("comparison", { id: "comparison", name: "Comparison", nodeType: "category" }),
        makeRealtimeNode("bar", { id: "bar", name: "Bar Chart", nodeType: "viz" }),
      ]
      const rtEdges = [makeRealtimeEdge("comparison", "bar", 1)]

      // Simulate what the HOC passes: a function that does d["name"]
      const nodeLabelFn = (d: Record<string, any>) => d["name"]

      const config: NetworkPipelineConfig = {
        chartType: "sankey",
        showLabels: true,
        nodeLabel: nodeLabelFn,
      }
      const size: [number, number] = [700, 500]

      sankeyLayoutPlugin.computeLayout(rtNodes, rtEdges, config, size)
      const scene = sankeyLayoutPlugin.buildScene(rtNodes, rtEdges, config, size)

      // BUG: d["name"] is undefined on RealtimeNode, labels are empty
      // The buildScene code does `if (!text) continue` so labels are skipped entirely
      expect(scene.labels.length).toBe(0)
    })

    it("labels would work if the function accessed d.data.name", () => {
      // Demonstrates the fix: label function should look at d.data[field]
      const rtNodes = [
        makeRealtimeNode("comparison", { id: "comparison", name: "Comparison", nodeType: "category" }),
        makeRealtimeNode("bar", { id: "bar", name: "Bar Chart", nodeType: "viz" }),
      ]
      const rtEdges = [makeRealtimeEdge("comparison", "bar", 1)]

      // Correct label function that unwraps .data
      const fixedLabelFn = (d: Record<string, any>) => d.data?.name ?? d.id

      const config: NetworkPipelineConfig = {
        chartType: "sankey",
        showLabels: true,
        nodeLabel: fixedLabelFn,
      }
      const size: [number, number] = [700, 500]

      sankeyLayoutPlugin.computeLayout(rtNodes, rtEdges, config, size)
      const scene = sankeyLayoutPlugin.buildScene(rtNodes, rtEdges, config, size)

      expect(scene.labels.length).toBe(2)
      const labelTexts = scene.labels.map(l => l.text)
      expect(labelTexts).toContain("Comparison")
      expect(labelTexts).toContain("Bar Chart")
    })
  })

  // ── 4. Full user scenario with exact props from bug report ────────────

  it("reproduces the exact user configuration where labels are missing", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram
          nodes={nodes}
          edges={edges}
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
          nodeLabel="name"
          showLabels={true}
          edgeColorBy="source"
          nodeWidth={14}
          edgeOpacity={0.4}
          width={700}
          height={500}
          frameProps={{
            background: "#13132a",
            margin: { top: 20, bottom: 20, left: 20, right: 120 },
            enableHover: true,
          }}
        />
      </TooltipProvider>
    )

    // Verify all label-related props are forwarded
    expect(lastFrameProps.showLabels).toBe(true)
    expect(typeof lastFrameProps.nodeLabel).toBe("function")

    // The nodeLabel function the HOC builds does d["name"] on a RealtimeNode.
    // RealtimeNode has: { id, x, y, x0, x1, y0, y1, width, height, value, data: {...} }
    // The "name" field is inside .data, not at the top level.
    const mockRealtimeNode = {
      id: "bar",
      x: 100, y: 200,
      x0: 93, x1: 107, y0: 50, y1: 350,
      width: 14, height: 300,
      value: 1,
      data: { id: "bar", name: "Bar Chart", nodeType: "viz" },
    }
    const labelResult = lastFrameProps.nodeLabel(mockRealtimeNode)

    // Fixed: resolves label from d.data.name
    expect(labelResult).toBe("Bar Chart")
  })
})
