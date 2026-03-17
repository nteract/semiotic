import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { OrbitDiagram } from "./OrbitDiagram"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastNetworkFrameProps = props
      return (
        <div className={`stream-network-frame${props.className ? ` ${props.className}` : ""}`}>
          <canvas />
          {props.title && <div className="semiotic-chart-title">{props.title}</div>}
        </div>
      )
    }
  }
})

describe("OrbitDiagram", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

  const sampleData = {
    name: "Root",
    children: [
      { name: "A" },
      { name: "B" },
      { name: "C", children: [
        { name: "C1" },
        { name: "C2" }
      ]}
    ]
  }

  it("renders without crashing with valid data", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeTruthy()
  })

  it("passes chartType='orbit' to StreamNetworkFrame", () => {
    render(<OrbitDiagram data={sampleData} animated={false} />)
    expect(lastNetworkFrameProps.chartType).toBe("orbit")
  })

  it("passes data to StreamNetworkFrame", () => {
    render(<OrbitDiagram data={sampleData} animated={false} />)
    expect(lastNetworkFrameProps.data).toBe(sampleData)
  })

  it("passes orbit config props", () => {
    render(
      <OrbitDiagram
        data={sampleData}
        orbitMode="solar"
        orbitSize={3}
        speed={0.5}
        eccentricity={0.8}
        showRings={false}
        animated={false}
      />
    )
    expect(lastNetworkFrameProps.orbitMode).toBe("solar")
    expect(lastNetworkFrameProps.orbitSize).toBe(3)
    expect(lastNetworkFrameProps.orbitSpeed).toBe(0.5)
    expect(lastNetworkFrameProps.orbitEccentricity).toBe(0.8)
    expect(lastNetworkFrameProps.orbitShowRings).toBe(false)
    expect(lastNetworkFrameProps.orbitAnimated).toBe(false)
  })

  it("handles flat orbit mode", () => {
    render(<OrbitDiagram data={sampleData} orbitMode="flat" animated={false} />)
    expect(lastNetworkFrameProps.orbitMode).toBe("flat")
  })

  it("handles atomic orbit mode", () => {
    render(<OrbitDiagram data={sampleData} orbitMode="atomic" animated={false} />)
    expect(lastNetworkFrameProps.orbitMode).toBe("atomic")
  })

  it("handles custom orbit mode array", () => {
    render(<OrbitDiagram data={sampleData} orbitMode={[2, 3]} animated={false} />)
    expect(lastNetworkFrameProps.orbitMode).toEqual([2, 3])
  })

  it("passes nodeRadius as nodeSize", () => {
    render(<OrbitDiagram data={sampleData} nodeRadius={12} animated={false} />)
    expect(lastNetworkFrameProps.nodeSize).toBe(12)
  })

  it("passes nodeRadius function as nodeSize", () => {
    const radiusFn = (node: any) => node.depth === 0 ? 20 : 5
    render(<OrbitDiagram data={sampleData} nodeRadius={radiusFn} animated={false} />)
    expect(lastNetworkFrameProps.nodeSize).toBe(radiusFn)
  })

  it("defaults to 600x600", () => {
    render(<OrbitDiagram data={sampleData} animated={false} />)
    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("applies custom width and height", () => {
    render(<OrbitDiagram data={sampleData} width={800} height={800} animated={false} />)
    expect(lastNetworkFrameProps.size).toEqual([800, 800])
  })

  it("renders title when provided", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} title="My Orbit" animated={false} />
    )
    expect(container.textContent).toContain("My Orbit")
  })

  it("applies className", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} className="custom" animated={false} />
    )
    expect(lastNetworkFrameProps.className).toBe("custom")
  })

  it("passes showLabels=false by default", () => {
    render(<OrbitDiagram data={sampleData} animated={false} />)
    expect(lastNetworkFrameProps.showLabels).toBe(false)
  })

  it("passes showLabels when enabled", () => {
    render(<OrbitDiagram data={sampleData} showLabels animated={false} />)
    expect(lastNetworkFrameProps.showLabels).toBe(true)
    expect(lastNetworkFrameProps.nodeLabel).toBe("name")
  })

  it("passes nodeIdAccessor as childrenAccessor and nodeIDAccessor", () => {
    render(<OrbitDiagram data={sampleData} nodeIdAccessor="id" childrenAccessor="kids" animated={false} />)
    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
    // childrenAccessor is cast but still forwarded
    expect(lastNetworkFrameProps.childrenAccessor).toBeTruthy()
  })

  it("passes enableHover", () => {
    render(<OrbitDiagram data={sampleData} enableHover={false} animated={false} />)
    expect(lastNetworkFrameProps.enableHover).toBe(false)
  })

  it("passes colorBy and colorScheme", () => {
    render(<OrbitDiagram data={sampleData} colorBy="group" colorScheme="viridis" animated={false} />)
    expect(lastNetworkFrameProps.colorBy).toBe("group")
    expect(lastNetworkFrameProps.colorScheme).toBe("viridis")
  })

  it("passes colorByDepth", () => {
    render(<OrbitDiagram data={sampleData} colorByDepth animated={false} />)
    expect(lastNetworkFrameProps.colorByDepth).toBe(true)
  })

  it("passes annotations", () => {
    const annotations = [{ type: "widget", nodeId: "Root", content: <span>Alert</span> }]
    render(<OrbitDiagram data={sampleData} annotations={annotations} animated={false} />)
    expect(lastNetworkFrameProps.annotations).toBe(annotations)
  })

  it("passes foregroundGraphics", () => {
    const fg = <circle cx={0} cy={0} r={5} />
    render(<OrbitDiagram data={sampleData} foregroundGraphics={fg} animated={false} />)
    expect(lastNetworkFrameProps.foregroundGraphics).toBe(fg)
  })

  it("passes revolution function as orbitRevolution", () => {
    const revFn = (n: any) => 1 / (n.depth + 2)
    render(<OrbitDiagram data={sampleData} revolution={revFn} animated={false} />)
    expect(lastNetworkFrameProps.orbitRevolution).toBe(revFn)
  })

  it("handles empty children", () => {
    const emptyData = { name: "Root", children: [] }
    const { container } = render(
      <OrbitDiagram data={emptyData} animated={false} />
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeTruthy()
  })

  it("handles single child", () => {
    const singleChild = { name: "Root", children: [{ name: "Only" }] }
    render(<OrbitDiagram data={singleChild} animated={false} />)
    expect(lastNetworkFrameProps.data).toBe(singleChild)
  })
})
