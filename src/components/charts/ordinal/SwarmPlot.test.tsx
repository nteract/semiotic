import React from "react"
import { render } from "@testing-library/react"
import { SwarmPlot } from "./SwarmPlot"
import { TooltipProvider } from "../../store/TooltipStore"

describe("SwarmPlot", () => {
  const sampleData = [
    { category: "Group A", value: 10 },
    { category: "Group A", value: 12 },
    { category: "Group A", value: 15 },
    { category: "Group A", value: 18 },
    { category: "Group B", value: 20 },
    { category: "Group B", value: 22 },
    { category: "Group B", value: 24 },
    { category: "Group C", value: 8 },
    { category: "Group C", value: 10 },
    { category: "Group C", value: 12 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies size encoding", () => {
    const dataWithSize = sampleData.map(d => ({ ...d, size: d.value * 2 }))
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={dataWithSize} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom categoryPadding", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} categoryPadding={50} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot
          data={sampleData}
          frameProps={{
            pieceHoverAnnotation: true
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("uses custom accessors", () => {
    const customData = [
      { name: "A", amount: 10 },
      { name: "A", amount: 12 },
      { name: "B", amount: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <SwarmPlot
          data={customData}
          categoryAccessor="name"
          valueAccessor="amount"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })
})
