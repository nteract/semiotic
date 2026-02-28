import React from "react"
import { render } from "@testing-library/react"
import { DonutChart } from "./DonutChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
jest.mock("../../OrdinalFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastOrdinalFrameProps = props
      return <div className="ordinalframe"><svg /></div>
    }
  }
})

describe("DonutChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { category: "A", value: 30 },
    { category: "B", value: 50 },
    { category: "C", value: 20 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("sets radial projection", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("includes innerRadius in type config", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.type.innerRadius).toBe(60)
  })

  it("accepts custom innerRadius", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} innerRadius={100} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.type.innerRadius).toBe(100)
  })

  it("renders centerContent via foregroundGraphics", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          centerContent={<span>Total: 100</span>}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.foregroundGraphics).toBeDefined()
  })

  it("does not render foregroundGraphics without centerContent", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.foregroundGraphics).toBeUndefined()
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([400, 400])
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          frameProps={{ oLabel: true }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe(true)
  })
})
