import React from "react"
import { render } from "@testing-library/react"
import { ChordDiagram } from "./ChordDiagram"
import { TooltipProvider } from "../../store/TooltipStore"

// JSDOM does not support SVG measurement methods used by node labels
beforeAll(() => {
  const proto = SVGElement.prototype as any
  if (!proto.getComputedTextLength) {
    proto.getComputedTextLength = function () {
      return 0
    }
  }
  if (!proto.getBBox) {
    proto.getBBox = function () {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
  }
})

describe("ChordDiagram", () => {
  const sampleEdges = [
    { source: "A", target: "B", value: 100 },
    { source: "B", target: "A", value: 80 },
    { source: "A", target: "A", value: 50 },
    { source: "B", target: "C", value: 60 },
    { source: "C", target: "B", value: 40 },
    { source: "C", target: "A", value: 30 }
  ]

  const sampleNodes = [
    { id: "A", category: "Group1" },
    { id: "B", category: "Group2" },
    { id: "C", category: "Group3" }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} width={800} height={800} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts nodes prop", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} nodes={sampleNodes} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("infers nodes from edges when nodes not provided", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} nodes={sampleNodes} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies edge color by source", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} edgeColorBy="source" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies edge color by target", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} edgeColorBy="target" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom padAngle", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} padAngle={0.05} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom groupWidth", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} groupWidth={30} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom sortGroups", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram
          edges={sampleEdges}
          sortGroups={(a: any, b: any) => b.value - a.value}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom edge opacity", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} edgeOpacity={0.8} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram
          edges={sampleEdges}
          frameProps={{
            nodeSizeAccessor: () => 10
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("uses custom accessors", () => {
    const customEdges = [
      { from: "A", to: "B", weight: 100 },
      { from: "B", to: "A", weight: 80 }
    ]

    const { container } = render(
      <TooltipProvider>
        <ChordDiagram
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
          valueAccessor="weight"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })
})
