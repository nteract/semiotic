import { afterEach, beforeEach, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { QuadrantChart } from "./QuadrantChart"
import type { QuadrantChartProps } from "./QuadrantChart"
import { recordCanvasOps, setupCanvasMock } from "../../../test-utils/canvasMock"
import type { CanvasContextMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../../stream/test-utils/frameScheduler"

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

  describe("quadrant defaults", () => {
    let restoreCanvas: () => void
    beforeEach(() => {
      restoreCanvas = setupCanvasMock({ stubRaf: false })
    })
    afterEach(() => {
      cleanup()
      vi.restoreAllMocks()
      restoreCanvas()
    })

    const cases: Array<{
      name: string
      quadrants?: QuadrantChartProps["quadrants"]
      labels: string[]
      colors: string[]
    }> = [
      {
        name: "renders with default quadrants when quadrants is omitted",
        labels: ["Low / High", "High / High", "Low / Low", "High / Low"],
        colors: ["#E9C46A", "#2A9D8F", "#E76F51", "#86BBD8"]
      },
      {
        name: "accepts partial quadrant overrides",
        quadrants: {
          topRight: { label: "Stars" },
          bottomLeft: { color: "#ccc" }
        },
        labels: ["Low / High", "Stars", "Low / Low", "High / Low"],
        colors: ["#E9C46A", "#2A9D8F", "#ccc", "#86BBD8"]
      }
    ]

    it.each(cases)("$name", ({ quadrants, labels, colors }) => {
      const scheduler = createFrameScheduler()
      const data = [
        { x: 0.2, y: 0.8 },
        { x: 0.8, y: 0.8 },
        { x: 0.2, y: 0.3 },
        { x: 0.8, y: 0.3 }
      ]
      const { container } = render(
        <QuadrantChart
          data={data}
          xCenter={0.5}
          yCenter={0.5}
          quadrants={quadrants}
          width={600}
          height={400}
          animate={false}
          frameProps={{ frameScheduler: scheduler.scheduler }}
        />
      )
      const ctx = container.querySelector("canvas")!.getContext("2d")!
      const pointOps = recordCanvasOps(ctx as unknown as CanvasContextMock)
      const paintedLabels: Array<{ label: string; color: string }> = []
      const paintedFills: Array<{
        color: string
        opacity: number
        width: number
        height: number
      }> = []
      vi.spyOn(ctx, "fillText").mockImplementation((label) => {
        paintedLabels.push({ label, color: String(ctx.fillStyle) })
      })
      vi.spyOn(ctx, "fillRect").mockImplementation((_x, _y, width, height) => {
        paintedFills.push({
          color: String(ctx.fillStyle),
          opacity: ctx.globalAlpha,
          width,
          height
        })
      })

      // A fresh client mount paints through the frame scheduler after data
      // ingestion. Flush that paint before inspecting axes or canvas output.
      act(() => scheduler.flush())

      expect(container.querySelector(".semiotic-chart-error")).toBeFalsy()
      expect(
        container.querySelectorAll(".semiotic-axis-tick").length
      ).toBeGreaterThan(0)
      expect(paintedLabels).toEqual(
        labels.map((label, i) => ({ label, color: colors[i] }))
      )
      expect(
        paintedFills
          .filter(({ opacity }) => opacity === 0.08)
          .map(({ color, width, height }) => {
            expect(width).toBeGreaterThan(0)
            expect(height).toBeGreaterThan(0)
            return color
          })
      ).toEqual(colors)
      expect(pointOps.fillStyles).toEqual(colors)
    })

    it.each(cases)(
      "preserves the same labels and colors in SSR: $name",
      ({ quadrants, labels, colors }) => {
        const container = document.createElement("div")
        container.innerHTML = renderToStaticMarkup(
          <QuadrantChart
            data={[
              { x: 0.2, y: 0.8 },
              { x: 0.8, y: 0.8 },
              { x: 0.2, y: 0.3 },
              { x: 0.8, y: 0.3 }
            ]}
            xCenter={0.5}
            yCenter={0.5}
            quadrants={quadrants}
            width={600}
            height={400}
          />
        )
        expect(
          Array.from(
            container.querySelectorAll('text[opacity="0.5"]'),
            (node) => ({
              label: node.textContent,
              color: node.getAttribute("fill")
            })
          )
        ).toEqual(labels.map((label, i) => ({ label, color: colors[i] })))
        expect(
          Array.from(
            container.querySelectorAll('rect[opacity="0.08"]'),
            (node) => node.getAttribute("fill")
          )
        ).toEqual(colors)
        expect(
          Array.from(container.querySelectorAll("circle"), (node) =>
            node.getAttribute("fill")
          )
        ).toEqual(colors)
        expect(
          container.querySelectorAll(".semiotic-axis-tick").length
        ).toBeGreaterThan(0)
      }
    )
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
