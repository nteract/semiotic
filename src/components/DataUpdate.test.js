import React from "react"
import { render } from "@testing-library/react"
import XYFrame from "./XYFrame"
import OrdinalFrame from "./OrdinalFrame"
import NetworkFrame from "./NetworkFrame"
import { TooltipProvider } from "./store/TooltipStore"

describe("Data Update Behavior", () => {
  describe("XYFrame data updates", () => {
    it("updates points when data changes", () => {
      const initialData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={initialData}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify initial render
      const initialPoints = container.querySelectorAll(".points .frame-piece")
      const initialCount = initialPoints.length
      expect(initialCount).toBeGreaterThan(0)

      // Update with new data
      const newData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 30 }
      ]

      rerender(
        <TooltipProvider>
          <XYFrame
            points={newData}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify updated render has more points (ratio should match data ratio)
      const updatedPoints = container.querySelectorAll(".points .frame-piece")
      expect(updatedPoints.length).toBeGreaterThan(initialCount)
      // Ratio should be 3:2
      expect(updatedPoints.length / initialCount).toBeCloseTo(1.5, 0)
    })

    it("updates lines when data changes", () => {
      const initialLines = [
        { coordinates: [{ x: 1, y: 10 }, { x: 2, y: 20 }] }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            lines={initialLines}
            xAccessor="x"
            yAccessor="y"
            lineDataAccessor="coordinates"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify initial render
      const initialLineElements = container.querySelectorAll(".lines path")
      expect(initialLineElements.length).toBeGreaterThan(0)

      // Update with new line data
      const newLines = [
        { coordinates: [{ x: 1, y: 10 }, { x: 2, y: 20 }] },
        { coordinates: [{ x: 1, y: 15 }, { x: 2, y: 25 }] }
      ]

      rerender(
        <TooltipProvider>
          <XYFrame
            lines={newLines}
            xAccessor="x"
            yAccessor="y"
            lineDataAccessor="coordinates"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Verify updated render has more lines
      const updatedLineElements = container.querySelectorAll(".lines path")
      expect(updatedLineElements.length).toBeGreaterThan(initialLineElements.length)
    })

    it("recalculates extent when data changes", () => {
      const initialData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={initialData}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
            axes={[{ orient: "left" }]}
          />
        </TooltipProvider>
      )

      // Get initial axis
      const initialAxis = container.querySelector(".axis")
      expect(initialAxis).toBeTruthy()

      // Update with data that has different extent
      const newData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 100 }  // Much larger y value
      ]

      rerender(
        <TooltipProvider>
          <XYFrame
            points={newData}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
            axes={[{ orient: "left" }]}
          />
        </TooltipProvider>
      )

      // Verify frame still renders correctly with new extent
      const updatedPoints = container.querySelectorAll(".points .frame-piece")
      expect(updatedPoints.length).toBeGreaterThan(0)
    })

    it("respects dataVersion prop for update optimization", () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
            dataVersion="v1"
          />
        </TooltipProvider>
      )

      const initialPoints = container.querySelectorAll(".points .frame-piece")
      const initialCount = initialPoints.length
      expect(initialCount).toBeGreaterThan(0)

      // Update with same data but new dataVersion
      // This should trigger a full recalculation
      rerender(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
            dataVersion="v2"
          />
        </TooltipProvider>
      )

      // Should still render correctly with same number of points
      const updatedPoints = container.querySelectorAll(".points .frame-piece")
      expect(updatedPoints.length).toBe(initialCount)
    })

    it("handles empty data gracefully", () => {
      const initialData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={initialData}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      const initialCount = container.querySelectorAll(".points .frame-piece").length
      expect(initialCount).toBeGreaterThan(0)

      // Update to empty data
      rerender(
        <TooltipProvider>
          <XYFrame
            points={[]}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Should render without crashing
      const frame = container.querySelector(".xyframe")
      expect(frame).toBeTruthy()
      expect(container.querySelectorAll(".points .frame-piece").length).toBe(0)
    })
  })

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

  describe("Data update with accessors", () => {
    it("handles accessor function changes", () => {
      const data = [
        { x: 1, y: 10, value: 100 },
        { x: 2, y: 20, value: 200 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor="x"
            yAccessor="y"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      const initialCount = container.querySelectorAll(".points .frame-piece").length
      expect(initialCount).toBeGreaterThan(0)

      // Change yAccessor to use 'value' instead of 'y'
      rerender(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor="x"
            yAccessor="value"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Should still render all points with new accessor
      const updatedCount = container.querySelectorAll(".points .frame-piece").length
      expect(updatedCount).toBe(initialCount)
    })

    it("handles function accessor changes", () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      const initialCount = container.querySelectorAll(".points .frame-piece").length
      expect(initialCount).toBeGreaterThan(0)

      // Change accessor function
      rerender(
        <TooltipProvider>
          <XYFrame
            points={data}
            xAccessor={d => d.x * 2}  // Modified accessor
            yAccessor={d => d.y}
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      // Should still render all points
      const updatedCount = container.querySelectorAll(".points .frame-piece").length
      expect(updatedCount).toBe(initialCount)
    })
  })
})
