import React from "react"
import { render } from "@testing-library/react"
import { ViolinPlot } from "./ViolinPlot"
import { TooltipProvider } from "../../store/TooltipStore"

let lastOrdinalFrameProps: any = null
jest.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    }
  }
})

describe("ViolinPlot", () => {
  const sampleData = [
    { category: "A", value: 10 },
    { category: "A", value: 15 },
    { category: "A", value: 12 },
    { category: "B", value: 20 },
    { category: "B", value: 25 },
    { category: "B", value: 22 }
  ]

  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
    expect(lastOrdinalFrameProps).toBeTruthy()
    expect(lastOrdinalFrameProps.chartType).toBe("violin")
    expect(lastOrdinalFrameProps.data).toBe(sampleData)
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ViolinPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} width={800} height={500} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([800, 500])
  })

  it("accepts custom categoryAccessor and valueAccessor", () => {
    const customData = [
      { name: "X", amount: 5 },
      { name: "X", amount: 8 },
      { name: "Y", amount: 12 },
      { name: "Y", amount: 15 }
    ]

    render(
      <TooltipProvider>
        <ViolinPlot data={customData} categoryAccessor="name" valueAccessor="amount" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("name")
    expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
  })

  it("passes orientation prop (vertical default)", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  it("passes orientation prop (horizontal)", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} orientation="horizontal" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  it("passes bins prop", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} bins={15} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.bins).toBe(15)
  })

  it("passes showIQR prop", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} showIQR={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.showIQR).toBe(false)
  })

  it("defaults showIQR to true", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.showIQR).toBe(true)
  })

  it("applies color encoding with summaryStyle function and legend", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} colorBy="category" />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.summaryStyle).toBe("function")
    const style = lastOrdinalFrameProps.summaryStyle({ category: "A" })
    expect(style.fill).toBeTruthy()
    expect(typeof style.fill).toBe("string")
    expect(lastOrdinalFrameProps.legend).toBeTruthy()
  })

  it("hides legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} colorBy="category" showLegend={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeFalsy()
  })

  it("accepts function accessors", () => {
    render(
      <TooltipProvider>
        <ViolinPlot
          data={sampleData}
          categoryAccessor={(d: any) => d.category}
          valueAccessor={(d: any) => d.value}
        />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.oAccessor).toBe("function")
    expect(typeof lastOrdinalFrameProps.rAccessor).toBe("function")
  })

  it("renders with custom categoryPadding", () => {
    render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} categoryPadding={40} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.barPadding).toBe(40)
  })

  it("updates when data changes", () => {
    const { rerender } = render(
      <TooltipProvider>
        <ViolinPlot data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.data).toBe(sampleData)

    const newData = [
      { category: "C", value: 30 },
      { category: "C", value: 35 }
    ]

    rerender(
      <TooltipProvider>
        <ViolinPlot data={newData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.data).toBe(newData)
  })
})
