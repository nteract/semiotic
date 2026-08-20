import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { RadarChart } from "./RadarChart"
import { TooltipProvider } from "../../store/TooltipStore"

let lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamOrdinalFrameHandle>, CapturedOrdinalFrameProps>((props, _ref) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

const sample = [
  { name: "A", attribute: "speed", value: 80 },
  { name: "A", attribute: "power", value: 40 },
  { name: "B", attribute: "speed", value: 55 },
  { name: "B", attribute: "power", value: 70 },
  { name: "A", attribute: "range", value: 60 },
  { name: "B", attribute: "range", value: 45 },
]

describe("RadarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
  })

  it("forwards radial point + connector frame props", () => {
    const { container } = render(
      <TooltipProvider>
        <RadarChart
          data={sample}
          categoryAccessor="attribute"
          valueAccessor="value"
          seriesAccessor="name"
          colorBy="name"
          width={400}
          height={400}
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    expect(lastOrdinalFrameProps.chartType).toBe("point")
    expect(lastOrdinalFrameProps.projection).toBe("radial")
    expect(lastOrdinalFrameProps.oAccessor).toBe("attribute")
    expect(lastOrdinalFrameProps.rAccessor).toBe("value")
    expect(lastOrdinalFrameProps.connectorAccessor).toBe("name")
    expect(lastOrdinalFrameProps.data).toEqual(sample)
    expect(typeof lastOrdinalFrameProps.connectorStyle).toBe("function")
  })

  it("defaults series connectors to colorBy when seriesAccessor is omitted", () => {
    render(
      <TooltipProvider>
        <RadarChart data={sample} colorBy="name" width={400} height={400} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.connectorAccessor).toBe("name")
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <RadarChart data={[]} width={400} height={400} />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-ordinal-frame")).toBeFalsy()
  })
})
