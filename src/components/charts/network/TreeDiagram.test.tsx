import React from "react"
import { render } from "@testing-library/react"
import { TreeDiagram } from "./TreeDiagram"
import { TooltipProvider } from "../../store/TooltipStore"

describe("TreeDiagram", () => {
  const sampleHierarchy = {
    name: "Root",
    children: [
      {
        name: "A",
        children: [
          { name: "A1", value: 10 },
          { name: "A2", value: 15 }
        ]
      },
      {
        name: "B",
        children: [
          { name: "B1", value: 20 },
          { name: "B2", value: 25 }
        ]
      },
      {
        name: "C",
        value: 30
      }
    ]
  }

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={undefined as any} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} width={800} height={800} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("supports tree layout (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="tree" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports cluster layout", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="cluster" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports treemap layout", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="treemap" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports partition layout", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="partition" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports circlepack layout", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="circlepack" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("supports radial orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} orientation="radial" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const hierarchyWithCategories = {
      name: "Root",
      category: "A",
      children: [
        { name: "Child1", category: "B" },
        { name: "Child2", category: "C" }
      ]
    }

    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={hierarchyWithCategories} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("colors by depth when colorByDepth is true", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} colorByDepth={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom nodeSize", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} nodeSize={10} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("uses custom childrenAccessor", () => {
    const customHierarchy = {
      id: "Root",
      kids: [
        { id: "A", kids: [{ id: "A1" }] },
        { id: "B" }
      ]
    }

    const { container } = render(
      <TooltipProvider>
        <TreeDiagram
          data={customHierarchy}
          childrenAccessor="kids"
          nodeIdAccessor="id"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("uses custom valueAccessor for sizing layouts", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram
          data={sampleHierarchy}
          layout="treemap"
          valueAccessor="value"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram
          data={sampleHierarchy}
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
        <TreeDiagram data={sampleHierarchy} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })

  it("handles flat hierarchy (single node)", () => {
    const flatHierarchy = {
      name: "Single Node"
    }

    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={flatHierarchy} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".frame")
    expect(frame).toBeTruthy()
  })
})
