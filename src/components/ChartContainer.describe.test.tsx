import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import * as React from "react"
import { ChartContainer } from "./ChartContainer"

// The auto-description is the opt-in full-accessibility affordance at the
// ChartContainer layer (not baked into the bare chart). It needs chartConfig.

const config = {
  component: "LineChart",
  props: {
    data: [
      { month: "Jan", sales: 100 },
      { month: "Feb", sales: 250 },
    ],
    xAccessor: "month",
    yAccessor: "sales",
  },
}

describe("ChartContainer describe", () => {
  it("renders an auto-generated description (role=note) when describe + chartConfig are set", () => {
    render(
      <ChartContainer title="Sales" chartConfig={config} describe>
        <div>chart</div>
      </ChartContainer>
    )
    const note = screen.getByRole("note")
    expect(note.className).toContain("semiotic-chart-description")
    expect(note.textContent).toContain("A line chart of sales by month.")
    expect(note.textContent).toContain("sales ranges from 100 (Jan) to 250 (Feb)")
  })

  it("does not render a description without chartConfig", () => {
    render(
      <ChartContainer title="Sales" describe>
        <div>chart</div>
      </ChartContainer>
    )
    expect(screen.queryByRole("note")).toBeNull()
  })

  it("does not render a description when describe is omitted", () => {
    render(
      <ChartContainer title="Sales" chartConfig={config}>
        <div>chart</div>
      </ChartContainer>
    )
    expect(screen.queryByRole("note")).toBeNull()
  })

  it("honors a restricted level set", () => {
    render(
      <ChartContainer title="Sales" chartConfig={config} describe={{ levels: ["l1"] }}>
        <div>chart</div>
      </ChartContainer>
    )
    const note = screen.getByRole("note")
    expect(note.textContent).toBe("A line chart of sales by month.")
  })

  it("mounts a navigable tree when navigable + chartConfig are set", () => {
    render(
      <ChartContainer title="Sales" chartConfig={config} navigable>
        <div>chart</div>
      </ChartContainer>
    )
    const tree = screen.getByRole("tree", { name: /Sales — navigable structure/ })
    expect(tree).toBeInTheDocument()
    expect(screen.getAllByRole("treeitem").length).toBeGreaterThan(1)
  })

  it("does not mount a navigable tree without chartConfig or without navigable", () => {
    const { rerender } = render(
      <ChartContainer title="Sales" navigable>
        <div>chart</div>
      </ChartContainer>
    )
    expect(screen.queryByRole("tree")).toBeNull()
    rerender(
      <ChartContainer title="Sales" chartConfig={config}>
        <div>chart</div>
      </ChartContainer>
    )
    expect(screen.queryByRole("tree")).toBeNull()
  })

  it("keeps banner content visible while the chart body is loading", () => {
    render(
      <ChartContainer
        title="Weather"
        loading
        banner={<div role="alert">This is taking longer than expected.</div>}
      >
        <div>weather chart</div>
      </ChartContainer>
    )

    expect(screen.getByRole("alert")).toHaveTextContent("taking longer")
    expect(screen.getByRole("status", { name: "Loading chart" })).toBeInTheDocument()
    expect(screen.queryByText("weather chart")).toBeNull()
  })
})
