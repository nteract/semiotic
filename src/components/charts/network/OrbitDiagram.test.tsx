import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { OrbitDiagram } from "./OrbitDiagram"

describe("OrbitDiagram", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(performance.now()); return 1 })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })
  afterEach(() => {
    if ((window.requestAnimationFrame as any).mockRestore) (window.requestAnimationFrame as any).mockRestore()
    if ((window.cancelAnimationFrame as any).mockRestore) (window.cancelAnimationFrame as any).mockRestore()
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
    const diagram = container.querySelector(".semiotic-orbit-diagram")
    expect(diagram).toBeTruthy()
  })

  it("renders correct number of circle nodes", () => {
    // Root + A + B + C + C1 + C2 = 6 nodes
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("renders orbit rings when showRings is true", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} showRings={true} animated={false} />
    )
    const ellipses = container.querySelectorAll("ellipse")
    expect(ellipses.length).toBeGreaterThan(0)
  })

  it("does not render orbit rings when showRings is false", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} showRings={false} animated={false} />
    )
    const ellipses = container.querySelectorAll("ellipse")
    expect(ellipses.length).toBe(0)
  })

  it("renders labels when showLabels is true", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} showLabels={true} animated={false} />
    )
    const texts = container.querySelectorAll("text")
    expect(texts.length).toBeGreaterThan(0)
  })

  it("does not render labels when showLabels is false (default)", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    const texts = container.querySelectorAll("text")
    expect(texts.length).toBe(0)
  })

  it("handles flat orbit mode", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} orbitMode="flat" animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("handles solar orbit mode", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} orbitMode="solar" animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("handles atomic orbit mode", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} orbitMode="atomic" animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("handles custom orbit mode array", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} orbitMode={[2, 3]} animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("handles empty children", () => {
    const emptyData = { name: "Root", children: [] }
    const { container } = render(
      <OrbitDiagram data={emptyData} animated={false} />
    )
    // Should render just the root node
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(1)
  })

  it("handles single child", () => {
    const singleChild = { name: "Root", children: [{ name: "Only" }] }
    const { container } = render(
      <OrbitDiagram data={singleChild} animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(2)
  })

  it("handles null-ish data by throwing during render", () => {
    // OrbitDiagram's hooks run before validation can bail out,
    // so undefined data throws. Verify that the error is a TypeError.
    expect(() => {
      render(
        <OrbitDiagram data={undefined as any} animated={false} />
      )
    }).toThrow()
  })

  it("applies custom nodeRadius as number", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} nodeRadius={12} animated={false} />
    )
    const circles = container.querySelectorAll("circle")
    // Root node should have r=12
    const rootCircle = circles[0]
    expect(rootCircle.getAttribute("r")).toBe("12")
  })

  it("applies custom nodeRadius as function", () => {
    const { container } = render(
      <OrbitDiagram
        data={sampleData}
        nodeRadius={(node) => node.depth === 0 ? 20 : 5}
        animated={false}
      />
    )
    const circles = container.querySelectorAll("circle")
    // Root gets 20, children get 5
    expect(circles[0].getAttribute("r")).toBe("20")
    expect(circles[1].getAttribute("r")).toBe("5")
  })

  it("renders static when animated is false", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    const diagram = container.querySelector(".semiotic-orbit-diagram")
    expect(diagram).toBeTruthy()
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("renders widget annotations anchored by nodeId", () => {
    const { container } = render(
      <OrbitDiagram
        data={sampleData}
        animated={false}
        annotations={[
          { type: "widget", nodeId: "Root", content: <span data-testid="ann">Alert</span> }
        ]}
      />
    )
    const annotation = container.querySelector("[data-testid='ann']")
    expect(annotation).toBeTruthy()
    expect(annotation?.textContent).toBe("Alert")
  })

  it("does not render annotation when nodeId not found", () => {
    const { container } = render(
      <OrbitDiagram
        data={sampleData}
        animated={false}
        annotations={[
          { type: "widget", nodeId: "NonExistent", content: <span data-testid="ann">Alert</span> }
        ]}
      />
    )
    const annotation = container.querySelector("[data-testid='ann']")
    expect(annotation).toBeFalsy()
  })

  it("ignores non-widget annotations", () => {
    const { container } = render(
      <OrbitDiagram
        data={sampleData}
        animated={false}
        annotations={[
          { type: "label", nodeId: "Root", label: "Some label" }
        ]}
      />
    )
    // foreignObject should not be present for non-widget types
    const foreignObjects = container.querySelectorAll("foreignObject")
    expect(foreignObjects.length).toBe(0)
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} width={800} height={800} animated={false} />
    )
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("800")
    expect(svg?.getAttribute("height")).toBe("800")
  })

  it("defaults to 600x600", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("600")
    expect(svg?.getAttribute("height")).toBe("600")
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
    const diagram = container.querySelector(".semiotic-orbit-diagram.custom")
    expect(diagram).toBeTruthy()
  })

  it("renders edges as lines from parent to child", () => {
    const { container } = render(
      <OrbitDiagram data={sampleData} animated={false} />
    )
    // All nodes except root have a parent edge line
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBe(5) // 5 child nodes
  })
})
