import React from "react"
import { render } from "@testing-library/react"
import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"
const OrdinalFrame = StreamOrdinalFrame
import NetworkFrame from "./NetworkFrame"
import { TooltipProvider } from "./store/TooltipStore"

describe("Data Update Behavior", () => {
  describe("OrdinalFrame data updates", () => {
    it("updates pieces when data changes", () => {
      const initialData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <OrdinalFrame
            data={initialData}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
          />
        </TooltipProvider>
      )

      // Verify initial render
      const initialFrame = container.querySelector(".ordinalframe")
      expect(initialFrame).toBeTruthy()

      // Update with new data
      const newData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 },
        { category: "C", value: 30 }
      ]

      rerender(
        <TooltipProvider>
          <OrdinalFrame
            data={newData}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
          />
        </TooltipProvider>
      )

      // Verify updated render
      const updatedFrame = container.querySelector(".ordinalframe")
      expect(updatedFrame).toBeTruthy()
    })

    it("respects dataVersion for OrdinalFrame", () => {
      const data = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <OrdinalFrame
            data={data}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
            dataVersion="v1"
          />
        </TooltipProvider>
      )

      const initialFrame = container.querySelector(".ordinalframe")
      expect(initialFrame).toBeTruthy()

      // Update dataVersion to trigger recalculation
      rerender(
        <TooltipProvider>
          <OrdinalFrame
            data={data}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
            dataVersion="v2"
          />
        </TooltipProvider>
      )

      const updatedFrame = container.querySelector(".ordinalframe")
      expect(updatedFrame).toBeTruthy()
    })
  })

  describe("NetworkFrame data updates", () => {
    it("updates nodes when data changes", () => {
      const initialNodes = [
        { id: "A" },
        { id: "B" }
      ]

      const initialEdges = [
        { source: "A", target: "B" }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <NetworkFrame
            nodes={initialNodes}
            edges={initialEdges}
            nodeIDAccessor="id"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify initial render
      const initialNodeElements = container.querySelectorAll(".node")
      expect(initialNodeElements.length).toBeGreaterThan(0)

      // Update with new nodes
      const newNodes = [
        { id: "A" },
        { id: "B" },
        { id: "C" }
      ]

      const newEdges = [
        { source: "A", target: "B" },
        { source: "B", target: "C" }
      ]

      rerender(
        <TooltipProvider>
          <NetworkFrame
            nodes={newNodes}
            edges={newEdges}
            nodeIDAccessor="id"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify updated render
      const updatedNodeElements = container.querySelectorAll(".node")
      expect(updatedNodeElements.length).toBeGreaterThan(initialNodeElements.length)
    })

    it("respects dataVersion for NetworkFrame", () => {
      const nodes = [
        { id: "A" },
        { id: "B" }
      ]

      const edges = [
        { source: "A", target: "B" }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <NetworkFrame
            nodes={nodes}
            edges={edges}
            nodeIDAccessor="id"
            size={[500, 500]}
            dataVersion="v1"
          />
        </TooltipProvider>
      )

      const initialNodes = container.querySelectorAll(".node")
      const initialCount = initialNodes.length

      // Update dataVersion
      rerender(
        <TooltipProvider>
          <NetworkFrame
            nodes={nodes}
            edges={edges}
            nodeIDAccessor="id"
            size={[500, 500]}
            dataVersion="v2"
          />
        </TooltipProvider>
      )

      const updatedNodes = container.querySelectorAll(".node")
      expect(updatedNodes.length).toBe(initialCount)
    })
  })
})
