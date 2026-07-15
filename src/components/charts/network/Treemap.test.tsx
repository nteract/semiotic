import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamNetworkFrameHandle } from "../../stream/networkTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { Treemap, type TreemapProps } from "./Treemap"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps = {} as CapturedNetworkFrameProps
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamNetworkFrameHandle>, CapturedNetworkFrameProps>((props, _ref) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    })
  }
})

describe("Treemap", () => {
  beforeEach(() => {
    lastNetworkFrameProps = {} as CapturedNetworkFrameProps
  })

  const sampleData = {
    name: "root",
    children: [
      { name: "A", value: 100 },
      { name: "B", value: 200 },
      { name: "C", children: [
        { name: "C1", value: 50 },
        { name: "C2", value: 30 }
      ]}
    ]
  }
  type TreemapData = TreemapProps<typeof sampleData>["data"]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Treemap data={null as unknown as TreemapData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets treemap chartType with hierarchy accessors", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.chartType).toBe("treemap")
    expect(lastNetworkFrameProps.childrenAccessor).toBe("children")
    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
  })

  it("sets hierarchySum from valueAccessor as a direct prop", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.hierarchySum({ value: 42 })).toBe(42)
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} width={800} height={400} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.size).toEqual([800, 400])
  })

  it("accepts custom accessors", () => {
    const customData = {
      id: "root",
      items: [
        { id: "A", size: 100 },
        { id: "B", size: 200 }
      ]
    }

    render(
      <TooltipProvider>
        <Treemap
          data={customData}
          childrenAccessor="items"
          valueAccessor={(d) => d.size as number}
          nodeIdAccessor="id"
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
    expect(lastNetworkFrameProps.childrenAccessor).toBe("items")
    expect(lastNetworkFrameProps.hierarchySum({ size: 42 })).toBe(42)
  })

  it("passes data as the data prop", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.data).toBe(sampleData)
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <Treemap
          data={sampleData}
          frameProps={{}}
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps).toBeDefined()
  })

  it("composes frameProps.nodeStyle on top of treemap color encoding", () => {
    // Leaf descendants carry a `group` field that drives colorBy. The
    // root only declares name/children, so colorBy="group" is typed
    // against the inferred TNode via an explicit cast to the union
    // of root + leaf keys.
    type GroupedNode = {
      name: string
      group?: string
      value?: number
      children?: GroupedNode[]
    }
    const data: GroupedNode = {
      name: "root",
      children: [
        { name: "A", group: "alpha", value: 100 },
        { name: "B", group: "beta", value: 50 },
      ]
    }

    render(
      <TooltipProvider>
        <Treemap<GroupedNode>
          data={data}
          colorBy="group"
          colorScheme={["#111111", "#222222"]}
          frameProps={{
            nodeStyle: (d) => d.depth === 0
              ? { fill: "transparent", pointerEvents: "none" }
              : { stroke: "#custom" }
          }}
        />
      </TooltipProvider>
    )

    const leafStyle = lastNetworkFrameProps.nodeStyle({
      depth: 1,
      data: { name: "A", group: "alpha", value: 100 }
    })
    expect(leafStyle.fill).toBe("#111111")
    expect(leafStyle.stroke).toBe("#custom")

    const rootStyle = lastNetworkFrameProps.nodeStyle({ depth: 0, data })
    expect(rootStyle.fill).toBe("transparent")
    expect(rootStyle.pointerEvents).toBe("none")
  })

  it("uses the theme cell-border CSS variable as the default tile stroke", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.nodeStyle({ depth: 1, data: { name: "A", value: 100 } })
    expect(style.stroke).toBe("var(--semiotic-cell-border, var(--semiotic-border, #fff))")
  })
})
