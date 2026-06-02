import { vi } from "vitest"
import { render } from "@testing-library/react"
import { QuadrantChart } from "./QuadrantChart"

const riskData = [
  { item: "Deploying on Friday afternoon", likelihood: 8.5, severity: 9.2 },
  { item: "Forgetting to update .env", likelihood: 7.0, severity: 8.8 },
  { item: "npm audit finding something scary", likelihood: 6.5, severity: 3.0 },
  { item: "Intern refactoring auth", likelihood: 2.0, severity: 9.5 },
  { item: "Dependency bot PR avalanche", likelihood: 9.0, severity: 2.5 },
]

const riskQuadrants = {
  topLeft: { label: "Low Likelihood / High Impact", color: "#9C27B0", opacity: 0.10 },
  topRight: { label: "Critical", color: "#F44336", opacity: 0.12 },
  bottomLeft: { label: "Negligible", color: "#9E9E9E", opacity: 0.06 },
  bottomRight: { label: "Annoying but Survivable", color: "#FF9800", opacity: 0.08 },
}

const unitQuadrants = {
  topLeft: { label: "Question Marks", color: "#FF9800" },
  topRight: { label: "Stars", color: "#4CAF50" },
  bottomLeft: { label: "Dogs", color: "#F44336" },
  bottomRight: { label: "Cash Cows", color: "#2196F3" },
}

describe("QuadrantChart", () => {
  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton) then re-rendering as data arrives must
    // not call a different number of hooks between renders — otherwise React
    // throws "Rendered more hooks than during the previous render". Regression
    // guard for the misplaced `setup.earlyReturn` return (QuadrantChart has
    // several trailing pre-renderer hooks after the guard's old position).
    const sample = [{ x: 1, y: 10 }, { x: 5, y: 3 }]
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender, container } = render(<QuadrantChart loading />)
      expect(() =>
        rerender(<QuadrantChart data={sample} xAccessor="x" yAccessor="y" />)
      ).not.toThrow()
      // A hooks-count error would be swallowed by the error boundary — assert
      // the chart rendered cleanly with no error placeholder.
      expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
      const hookErr = errSpy.mock.calls.some((c) =>
        String(c[0]).includes("Rendered more hooks") ||
        String(c[0]).includes("change in the order of Hooks")
      )
      expect(hookErr).toBe(false)
    } finally {
      errSpy.mockRestore()
    }
  })

  it("renders with non-default accessors and asymmetric center", () => {
    const { container } = render(
      <QuadrantChart
        data={riskData}
        xAccessor="likelihood"
        yAccessor="severity"
        xCenter={6.0}
        yCenter={6.0}
        quadrants={riskQuadrants}
        pointRadius={7}
        width={600}
        height={400}
      />
    )

    const canvas = container.querySelector("canvas")
    expect(canvas).toBeTruthy()
    expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
    expect(container.textContent).not.toContain("No data available")
  })

  it("renders with 0-1 unitized scale", () => {
    const data = [
      { x: 0.2, y: 0.8, category: "Stars" },
      { x: 0.8, y: 0.3, category: "Cash Cows" },
    ]
    const { container } = render(
      <QuadrantChart
        data={data}
        xCenter={0.5}
        yCenter={0.5}
        quadrants={unitQuadrants}
        width={600}
        height={400}
      />
    )

    expect(container.querySelector("canvas")).toBeTruthy()
    expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
  })

  it("renders with default quadrants when quadrants is omitted", () => {
    const data = [
      { x: 0.2, y: 0.8 },
      { x: 0.8, y: 0.3 },
    ]
    const { container } = render(
      <QuadrantChart
        data={data}
        xCenter={0.5}
        yCenter={0.5}
        width={600}
        height={400}
      />
    )

    expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
    expect(container.querySelectorAll(".semiotic-axis-tick").length).toBeGreaterThan(0)
  })

  it("accepts partial quadrant overrides", () => {
    const data = [
      { x: 0.2, y: 0.8 },
      { x: 0.8, y: 0.3 },
    ]
    const { container } = render(
      <QuadrantChart
        data={data}
        xCenter={0.5}
        yCenter={0.5}
        quadrants={{ topRight: { label: "Stars" }, bottomLeft: { color: "#ccc" } }}
        width={600}
        height={400}
      />
    )

    expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
    expect(container.querySelectorAll(".semiotic-axis-tick").length).toBeGreaterThan(0)
  })

  it("renders without data (push API mode)", () => {
    const { container } = render(
      <QuadrantChart
        xCenter={0.5}
        yCenter={0.5}
        quadrants={unitQuadrants}
        width={600}
        height={400}
      />
    )

    expect(container.querySelector("canvas")).toBeTruthy()
    expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
  })
})
