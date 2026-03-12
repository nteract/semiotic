import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { TreeDiagram } from "./TreeDiagram"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    }
  }
})

describe("TreeDiagram", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

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

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <TreeDiagram data={undefined as any} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("maps layout='tree' to chartType='tree'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="tree" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("tree")
  })

  it("maps layout='cluster' to chartType='cluster'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="cluster" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("cluster")
  })

  it("maps layout='treemap' to chartType='treemap'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="treemap" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("treemap")
  })

  it("maps layout='partition' to chartType='partition'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="partition" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("partition")
  })

  it("maps layout='circlepack' to chartType='circlepack'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="circlepack" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("circlepack")
  })

  it("defaults layout to 'tree'", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("tree")
  })

  it("forwards orientation as treeOrientation", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} orientation="horizontal" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.treeOrientation).toBe("horizontal")
  })

  it("forwards radial orientation", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} orientation="radial" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.treeOrientation).toBe("radial")
  })

  it("defaults orientation to vertical", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.treeOrientation).toBe("vertical")
  })

  it("forwards colorByDepth", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} colorByDepth={true} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.colorByDepth).toBe(true)
  })

  it("colorByDepth defaults to false", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.colorByDepth).toBe(false)
  })

  it("nodeStyle uses DEPTH_PALETTE_COLORS when colorByDepth is true", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} colorByDepth={true} />
      </TooltipProvider>
    )
    const styleFn = lastNetworkFrameProps.nodeStyle
    expect(typeof styleFn).toBe("function")
    const style0 = styleFn({ depth: 0, data: { name: "Root" } })
    const style1 = styleFn({ depth: 1, data: { name: "A" } })
    // Different depths should get different colors
    expect(typeof style0.fill).toBe("string")
    expect(typeof style1.fill).toBe("string")
    expect(style0.fill).not.toBe(style1.fill)
  })

  it("nodeStyle uses colorBy when specified", () => {
    const hierarchyWithCategories = {
      name: "Root",
      category: "A",
      children: [
        { name: "Child1", category: "B" },
        { name: "Child2", category: "C" }
      ]
    }

    render(
      <TooltipProvider>
        <TreeDiagram data={hierarchyWithCategories} colorBy="category" />
      </TooltipProvider>
    )
    const styleFn = lastNetworkFrameProps.nodeStyle
    const style = styleFn({ depth: 0, data: { category: "A" } })
    expect(typeof style.fill).toBe("string")
  })

  it("forwards edgeStyle as edgeType", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} edgeStyle="line" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeType).toBe("line")
  })

  it("defaults edgeStyle to curve", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeType).toBe("curve")
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} width={800} height={800} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([800, 800])
  })

  it("defaults to 600x600", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("forwards nodeSize", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} nodeSize={10} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeSize).toBe(10)
  })

  it("defaults nodeSize to 5", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeSize).toBe(5)
  })

  it("sets hierarchySum for treemap layout", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="treemap" />
      </TooltipProvider>
    )
    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
  })

  it("sets hierarchySum for circlepack layout", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="circlepack" />
      </TooltipProvider>
    )
    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
  })

  it("does not set hierarchySum for tree layout", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} layout="tree" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.hierarchySum).toBeUndefined()
  })

  it("uses custom childrenAccessor", () => {
    const customHierarchy = {
      id: "Root",
      kids: [
        { id: "A", kids: [{ id: "A1" }] },
        { id: "B" }
      ]
    }

    render(
      <TooltipProvider>
        <TreeDiagram
          data={customHierarchy}
          childrenAccessor="kids"
          nodeIdAccessor="id"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.childrenAccessor).toBe("kids")
    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <TreeDiagram data={sampleHierarchy} enableHover={false} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(false)
  })

  it("handles flat hierarchy (single node)", () => {
    const flatHierarchy = { name: "Single Node" }

    render(
      <TooltipProvider>
        <TreeDiagram data={flatHierarchy} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.data).toBe(flatHierarchy)
    expect(lastNetworkFrameProps.chartType).toBe("tree")
  })

})
