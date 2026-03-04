import React from "react"
import { render } from "@testing-library/react"
import { Histogram } from "./Histogram"
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

describe("Histogram", () => {
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
        <Histogram data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
    expect(lastOrdinalFrameProps).toBeTruthy()
    expect(lastOrdinalFrameProps.chartType).toBe("histogram")
    expect(lastOrdinalFrameProps.data).toBe(sampleData)
  })

  it("handles empty data gracefully (no frame rendered)", () => {
    const { container } = render(
      <TooltipProvider>
        <Histogram data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} width={800} height={500} />
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
        <Histogram data={customData} categoryAccessor="name" valueAccessor="amount" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("name")
    expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
  })

  it("passes bins prop to frame", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} bins={15} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.bins).toBe(15)
  })

  it("passes relative prop to frame as normalize", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} relative={true} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.normalize).toBe(true)
  })

  it("applies color encoding with summaryStyle function and legend", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} colorBy="category" />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.summaryStyle).toBe("function")
    // summaryStyle should return an object with a fill property
    const style = lastOrdinalFrameProps.summaryStyle({ category: "A" })
    expect(style.fill).toBeTruthy()
    expect(typeof style.fill).toBe("string")
    // legend should be generated
    expect(lastOrdinalFrameProps.legend).toBeTruthy()
  })

  it("hides legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} colorBy="category" showLegend={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeFalsy()
  })

  it("renders with custom categoryPadding", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} categoryPadding={40} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.barPadding).toBe(40)
  })

  it("updates when data changes", () => {
    const { rerender } = render(
      <TooltipProvider>
        <Histogram data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.data).toBe(sampleData)

    const newData = [
      { category: "C", value: 30 },
      { category: "C", value: 35 }
    ]

    rerender(
      <TooltipProvider>
        <Histogram data={newData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.data).toBe(newData)
  })

  it("always projects horizontally", () => {
    render(
      <TooltipProvider>
        <Histogram data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  it("accepts function accessors", () => {
    const fnData = [
      { n: "X", amt: 5 },
      { n: "Y", amt: 12 }
    ]
    render(
      <TooltipProvider>
        <Histogram
          data={fnData}
          categoryAccessor={(d: any) => d.n}
          valueAccessor={(d: any) => d.amt}
        />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.oAccessor).toBe("function")
    expect(typeof lastOrdinalFrameProps.rAccessor).toBe("function")
  })
})
