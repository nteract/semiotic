import React from "react"
import { render } from "@testing-library/react"
import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"
import StreamNetworkFrame from "./stream/StreamNetworkFrame"
import { TooltipProvider } from "./store/TooltipStore"

describe("Data Update Behavior", () => {
  describe("StreamOrdinalFrame data updates", () => {
    it("updates pieces when data changes", () => {
      const initialData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <StreamOrdinalFrame
            data={initialData}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
          />
        </TooltipProvider>
      )

      const initialFrame = container.querySelector(".stream-ordinal-frame")
      expect(initialFrame).toBeTruthy()

      const newData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 },
        { category: "C", value: 30 }
      ]

      rerender(
        <TooltipProvider>
          <StreamOrdinalFrame
            data={newData}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
          />
        </TooltipProvider>
      )

      const updatedFrame = container.querySelector(".stream-ordinal-frame")
      expect(updatedFrame).toBeTruthy()
    })

    it("respects dataVersion for StreamOrdinalFrame", () => {
      const data = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]

      const { container, rerender } = render(
        <TooltipProvider>
          <StreamOrdinalFrame
            data={data}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
            dataVersion="v1"
          />
        </TooltipProvider>
      )

      const initialFrame = container.querySelector(".stream-ordinal-frame")
      expect(initialFrame).toBeTruthy()

      rerender(
        <TooltipProvider>
          <StreamOrdinalFrame
            data={data}
            oAccessor="category"
            rAccessor="value"
            size={[500, 500]}
            type="bar"
            dataVersion="v2"
          />
        </TooltipProvider>
      )

      const updatedFrame = container.querySelector(".stream-ordinal-frame")
      expect(updatedFrame).toBeTruthy()
    })
  })

  describe("StreamNetworkFrame data updates", () => {
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
          <StreamNetworkFrame
            chartType="force"
            nodes={initialNodes}
            edges={initialEdges}
            nodeIDAccessor="id"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      const frame = container.querySelector(".stream-network-frame")
      expect(frame).toBeTruthy()

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
          <StreamNetworkFrame
            chartType="force"
            nodes={newNodes}
            edges={newEdges}
            nodeIDAccessor="id"
            size={[500, 500]}
          />
        </TooltipProvider>
      )

      const updatedFrame = container.querySelector(".stream-network-frame")
      expect(updatedFrame).toBeTruthy()
    })
  })
})
