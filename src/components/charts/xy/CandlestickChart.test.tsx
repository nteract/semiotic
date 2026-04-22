import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { CandlestickChart } from "./CandlestickChart"
import { TooltipProvider } from "../../store/TooltipStore"

let lastXYFrameProps: any = null
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><svg /></div>
    })
  }
})

const ohlc = [
  { t: 1, o: 10, h: 15, l: 8, c: 12 },
  { t: 2, o: 12, h: 18, l: 11, c: 17 },
  { t: 3, o: 17, h: 20, l: 14, c: 15 },
]
const range = [
  { t: 1, min: 8, max: 15 },
  { t: 2, min: 11, max: 18 },
]

describe("CandlestickChart", () => {
  beforeEach(() => { lastXYFrameProps = null })

  it("renders without crashing with full OHLC", () => {
    const { container } = render(
      <TooltipProvider>
        <CandlestickChart data={ohlc} xAccessor="t"
          openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c" />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <CandlestickChart data={[]} highAccessor="h" lowAccessor="l" />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeFalsy()
  })

  describe("chart type + accessor forwarding", () => {
    it("sets chartType to 'candlestick'", () => {
      render(<TooltipProvider><CandlestickChart data={ohlc} xAccessor="t"
        openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c" /></TooltipProvider>)
      expect(lastXYFrameProps.chartType).toBe("candlestick")
    })

    it("forwards all four OHLC accessors when provided", () => {
      render(<TooltipProvider><CandlestickChart data={ohlc} xAccessor="t"
        openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c" /></TooltipProvider>)
      expect(lastXYFrameProps.openAccessor).toBe("o")
      expect(lastXYFrameProps.highAccessor).toBe("h")
      expect(lastXYFrameProps.lowAccessor).toBe("l")
      expect(lastXYFrameProps.closeAccessor).toBe("c")
    })

    it("omits open/close when only high/low are provided (range mode)", () => {
      render(<TooltipProvider><CandlestickChart data={range} xAccessor="t"
        highAccessor="max" lowAccessor="min" /></TooltipProvider>)
      expect(lastXYFrameProps.chartType).toBe("candlestick")
      expect(lastXYFrameProps.highAccessor).toBe("max")
      expect(lastXYFrameProps.lowAccessor).toBe("min")
      expect(lastXYFrameProps.openAccessor).toBeUndefined()
      expect(lastXYFrameProps.closeAccessor).toBeUndefined()
    })

    it("treats one-sided open/close as range mode", () => {
      // Providing only openAccessor without closeAccessor is ambiguous — we
      // degrade rather than error so the chart still renders.
      render(<TooltipProvider><CandlestickChart data={ohlc} xAccessor="t"
        openAccessor="o" highAccessor="h" lowAccessor="l" /></TooltipProvider>)
      expect(lastXYFrameProps.openAccessor).toBeUndefined()
      expect(lastXYFrameProps.closeAccessor).toBeUndefined()
    })

    it("uses highAccessor as yAccessor to drive scale extent", () => {
      render(<TooltipProvider><CandlestickChart data={range} xAccessor="t"
        highAccessor="max" lowAccessor="min" /></TooltipProvider>)
      expect(lastXYFrameProps.yAccessor).toBe("max")
    })

    it("forwards candlestickStyle", () => {
      render(<TooltipProvider><CandlestickChart data={ohlc} xAccessor="t"
        openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c"
        candlestickStyle={{ upColor: "#0a0", downColor: "#a00", rangeColor: "#55f" }} /></TooltipProvider>)
      expect(lastXYFrameProps.candlestickStyle).toEqual({ upColor: "#0a0", downColor: "#a00", rangeColor: "#55f" })
    })
  })

  describe("chart mode resolution", () => {
    const base = { data: range, xAccessor: "t", highAccessor: "max", lowAccessor: "min" } as const

    it("primary mode uses 600×400 with axes on", () => {
      render(<TooltipProvider><CandlestickChart {...base} /></TooltipProvider>)
      expect(lastXYFrameProps.size).toEqual([600, 400])
      expect(lastXYFrameProps.showAxes).toBe(true)
    })

    it("context mode uses 400×250 with axes off", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="context" /></TooltipProvider>)
      expect(lastXYFrameProps.size).toEqual([400, 250])
      expect(lastXYFrameProps.showAxes).toBe(false)
    })

    it("sparkline mode uses 120×24 with axes off", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" /></TooltipProvider>)
      expect(lastXYFrameProps.size).toEqual([120, 24])
      expect(lastXYFrameProps.showAxes).toBe(false)
    })

    it("explicit width/height override mode defaults", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" width={200} height={40} /></TooltipProvider>)
      expect(lastXYFrameProps.size).toEqual([200, 40])
    })

    it("suppresses title in compact modes", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" title="OHLC" /></TooltipProvider>)
      expect(lastXYFrameProps.title).toBeUndefined()
    })
  })

  describe("mode-aware layout defaults", () => {
    const base = { data: range, xAccessor: "t", highAccessor: "max", lowAccessor: "min" } as const

    it("primary mode: scalePadding=12, extentPadding=0.1, inherits top/bottom margin", () => {
      render(<TooltipProvider><CandlestickChart {...base} /></TooltipProvider>)
      // width=600 → round(600/40)=15, clamped to 12
      expect(lastXYFrameProps.scalePadding).toBe(12)
      expect(lastXYFrameProps.extentPadding).toBe(0.1)
      expect(lastXYFrameProps.margin.top).toBeGreaterThan(0)
    })

    it("context mode: scalePadding scales to 10, extentPadding stays at 0.1", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="context" /></TooltipProvider>)
      expect(lastXYFrameProps.scalePadding).toBe(10) // round(400/40)
      expect(lastXYFrameProps.extentPadding).toBe(0.1)
    })

    it("sparkline mode: scalePadding=3, extentPadding=0.02, top/bottom margin zeroed", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" /></TooltipProvider>)
      expect(lastXYFrameProps.scalePadding).toBe(3)  // round(120/40)
      expect(lastXYFrameProps.extentPadding).toBe(0.02)
      expect(lastXYFrameProps.margin.top).toBe(0)
      expect(lastXYFrameProps.margin.bottom).toBe(0)
    })

    it("scalePadding floor at 2 for very small widths", () => {
      // width=40 would round to 1 without the floor
      render(<TooltipProvider><CandlestickChart {...base} width={40} height={40} /></TooltipProvider>)
      expect(lastXYFrameProps.scalePadding).toBe(2)
    })

    it("user frameProps.scalePadding overrides the mode default", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" frameProps={{ scalePadding: 20 }} /></TooltipProvider>)
      expect(lastXYFrameProps.scalePadding).toBe(20)
    })

    it("user frameProps.extentPadding overrides the mode default", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" frameProps={{ extentPadding: 0.25 }} /></TooltipProvider>)
      expect(lastXYFrameProps.extentPadding).toBe(0.25)
    })

    it("user margin merges with mode defaults", () => {
      render(<TooltipProvider><CandlestickChart {...base} mode="sparkline" margin={{ top: 6 }} /></TooltipProvider>)
      expect(lastXYFrameProps.margin.top).toBe(6)
      expect(lastXYFrameProps.margin.bottom).toBe(0)  // sparkline default still applies to unset sides
    })
  })

  describe("tooltip", () => {
    it("renders OHLC rows when open/close provided", () => {
      render(<TooltipProvider><CandlestickChart data={ohlc} xAccessor="t"
        openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c" /></TooltipProvider>)
      const content = lastXYFrameProps.tooltipContent({ data: ohlc[0] })
      const text = JSON.stringify(content)
      expect(text).toContain("Open")
      expect(text).toContain("High")
      expect(text).toContain("Low")
      expect(text).toContain("Close")
    })

    it("renders only high/low rows in range mode", () => {
      render(<TooltipProvider><CandlestickChart data={range} xAccessor="t"
        highAccessor="max" lowAccessor="min" /></TooltipProvider>)
      const content = lastXYFrameProps.tooltipContent({ data: range[0] })
      const text = JSON.stringify(content)
      expect(text).toContain("High")
      expect(text).toContain("Low")
      expect(text).not.toContain("Open")
      expect(text).not.toContain("Close")
    })

    it("passes noop tooltip when tooltip={false}", () => {
      render(<TooltipProvider><CandlestickChart data={range} xAccessor="t"
        highAccessor="max" lowAccessor="min" tooltip={false} /></TooltipProvider>)
      expect(lastXYFrameProps.tooltipContent({ data: range[0] })).toBeNull()
    })
  })

  describe("push API", () => {
    it("ref exposes push/pushMany/clear/getData", () => {
      const ref = React.createRef<any>()
      render(<TooltipProvider><CandlestickChart ref={ref} xAccessor="t"
        highAccessor="max" lowAccessor="min" /></TooltipProvider>)
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current.push).toBe("function")
      expect(typeof ref.current.pushMany).toBe("function")
      expect(typeof ref.current.clear).toBe("function")
      expect(typeof ref.current.getData).toBe("function")
    })
  })
})
