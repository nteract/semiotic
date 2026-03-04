import React from "react"
import { render } from "@testing-library/react"
import { LinkedCharts } from "./LinkedCharts"

describe("LinkedCharts", () => {
  it("renders children", () => {
    const { container } = render(
      <LinkedCharts>
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("renders multiple children", () => {
    const { container } = render(
      <LinkedCharts>
        <div data-testid="chart-1">Chart 1</div>
        <div data-testid="chart-2">Chart 2</div>
        <div data-testid="chart-3">Chart 3</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='chart-1']")).toBeTruthy()
    expect(container.querySelector("[data-testid='chart-2']")).toBeTruthy()
    expect(container.querySelector("[data-testid='chart-3']")).toBeTruthy()
  })

  it("renders deeply nested children", () => {
    const { container } = render(
      <LinkedCharts>
        <div>
          <div>
            <div data-testid="deep">Deep child</div>
          </div>
        </div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='deep']")).toBeTruthy()
  })

  it("accepts selections configuration prop without error", () => {
    const { container } = render(
      <LinkedCharts selections={{ dash: { resolution: "crossfilter" } }}>
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("accepts multiple selection configurations", () => {
    const { container } = render(
      <LinkedCharts
        selections={{
          highlight: { resolution: "union" },
          brush: { resolution: "intersect" },
          filter: { resolution: "crossfilter" }
        }}
      >
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("renders without selections prop", () => {
    const { container } = render(
      <LinkedCharts>
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("preserves child content text", () => {
    const { getByText } = render(
      <LinkedCharts>
        <span>Hello World</span>
      </LinkedCharts>
    )
    expect(getByText("Hello World")).toBeTruthy()
  })
})
