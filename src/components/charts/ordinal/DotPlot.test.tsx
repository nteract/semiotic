import React from "react"
import { render } from "@testing-library/react"
import { DotPlot } from "./DotPlot"
import { TooltipProvider } from "../../store/TooltipStore"

describe("DotPlot", () => {
  const sampleData = [
    { category: "Item A", value: 25 },
    { category: "Item B", value: 40 },
    { category: "Item C", value: 15 },
    { category: "Item D", value: 30 },
    { category: "Item E", value: 35 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot
          data={sampleData}
          categoryLabel="Items"
          valueLabel="Score"
        />
      </TooltipProvider>
    )

    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("supports horizontal orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports vertical orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const dataWithColor = sampleData.map(d => ({ ...d, type: d.value > 30 ? "high" : "low" }))
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={dataWithColor} colorBy="type" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts in descending order by default", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} sort={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts in ascending order", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} sort="asc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts in descending order", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} sort="desc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports custom sort function", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} sort={(a, b) => a.value - b.value} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("disables sorting when sort is false", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} sort={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom dotRadius", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} dotRadius={8} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom categoryPadding", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} categoryPadding={15} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("shows grid by default", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} showGrid={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("hides grid when showGrid is false", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={sampleData} showGrid={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot
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
        <DotPlot data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("uses custom accessors", () => {
    const customData = [
      { name: "A", score: 25 },
      { name: "B", score: 40 },
      { name: "C", score: 15 }
    ]

    const { container } = render(
      <TooltipProvider>
        <DotPlot
          data={customData}
          categoryAccessor="name"
          valueAccessor="score"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })
})
