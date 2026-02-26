import React from "react"
import { render } from "@testing-library/react"
import { SankeyDiagram } from "./SankeyDiagram"
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

describe("SankeyDiagram", () => {
  const sampleEdges = [
    { source: "A", target: "D", value: 100 },
    { source: "B", target: "D", value: 80 },
    { source: "C", target: "D", value: 60 },
    { source: "D", target: "E", value: 150 },
    { source: "D", target: "F", value: 90 }
  ]

  const sampleNodes = [
    { id: "A", category: "Source" },
    { id: "B", category: "Source" },
    { id: "C", category: "Source" },
    { id: "D", category: "Middle" },
    { id: "E", category: "Target" },
    { id: "F", category: "Target" }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} width={1000} height={800} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts nodes prop", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodes={sampleNodes} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("infers nodes from edges when nodes not provided", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodes={sampleNodes} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports vertical orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies edge color by source", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeColorBy="source" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies edge color by target", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeColorBy="target" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies edge color with gradient", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeColorBy="gradient" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies nodeAlign justify", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodeAlign="justify" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies nodeAlign left", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodeAlign="left" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom nodeWidth", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodeWidth={25} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom nodePaddingRatio", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodePaddingRatio={0.1} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom edge opacity", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeOpacity={0.7} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom edgeSort", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram
          edges={sampleEdges}
          edgeSort={(a: any, b: any) => b.value - a.value}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram
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
        <SankeyDiagram edges={sampleEdges} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("uses custom accessors", () => {
    const customEdges = [
      { from: "A", to: "B", flow: 100 },
      { from: "B", to: "C", flow: 80 }
    ]

    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
          valueAccessor="flow"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })
})
