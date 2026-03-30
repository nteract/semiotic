import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { FunnelChart } from "./FunnelChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("FunnelChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { step: "Awareness", value: 1000 },
    { step: "Interest", value: 600 },
    { step: "Purchase", value: 200 }
  ]

  const multiCategoryData = [
    { step: "Awareness", value: 1000, channel: "web" },
    { step: "Awareness", value: 800, channel: "mobile" },
    { step: "Interest", value: 600, channel: "web" },
    { step: "Interest", value: 400, channel: "mobile" },
    { step: "Purchase", value: 200, channel: "web" },
    { step: "Purchase", value: 100, channel: "mobile" }
  ]

  // ── Test 1: chartType for horizontal vs vertical ──────────────────

  it("sets chartType to 'funnel' for horizontal orientation (default)", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("funnel")
  })

  it("sets chartType to 'bar-funnel' for vertical orientation", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("bar-funnel")
  })

  // ── Test 2: empty data renders nothing ────────────────────────────

  it("renders nothing for empty data (loading/empty guard)", () => {
    const { container } = render(
      <TooltipProvider>
        <FunnelChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  // ── Test 3: horizontal orientation props ──────────────────────────

  it("sets barPadding=0, showAxes=false, projection='horizontal' for horizontal mode", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.barPadding).toBe(0)
    expect(lastOrdinalFrameProps.showAxes).toBe(false)
    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  // ── Test 4: vertical orientation props ────────────────────────────

  it("sets barPadding=40, showAxes=true, showGrid=true, projection='vertical' for vertical mode", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.barPadding).toBe(40)
    expect(lastOrdinalFrameProps.showAxes).toBe(true)
    expect(lastOrdinalFrameProps.showGrid).toBe(true)
    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  // ── Test 5: connectorOpacity forwarded in horizontal mode ─────────

  it("forwards connectorOpacity in horizontal mode", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} connectorOpacity={0.5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.connectorOpacity).toBe(0.5)
  })

  it("uses default connectorOpacity of 0.3 in horizontal mode", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.connectorOpacity).toBe(0.3)
  })

  it("does not set connectorOpacity in vertical mode", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.connectorOpacity).toBeUndefined()
  })

  // ── Test 6: default accessors ─────────────────────────────────────

  it("defaults stepAccessor to 'step' and valueAccessor to 'value'", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("step")
    expect(lastOrdinalFrameProps.rAccessor).toBe("value")
  })

  // ── Test 7: custom accessors ──────────────────────────────────────

  it("forwards custom stepAccessor and valueAccessor as oAccessor and rAccessor", () => {
    const customData = [
      { stage: "Top", amount: 500 },
      { stage: "Middle", amount: 300 },
      { stage: "Bottom", amount: 100 }
    ]

    render(
      <TooltipProvider>
        <FunnelChart data={customData} stepAccessor="stage" valueAccessor="amount" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("stage")
    expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
  })

  // ── Test 8: categoryAccessor sets stackBy ─────────────────────────

  it("sets stackBy when categoryAccessor is provided", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={multiCategoryData} categoryAccessor="channel" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.stackBy).toBe("channel")
  })

  // ── Test 9: no categoryAccessor → no stackBy ─────────────────────

  it("does not set stackBy when categoryAccessor is not provided", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.stackBy).toBeUndefined()
  })

  // ── Test 10: single category → uniform fill ───────────────────────

  it("uses uniform fill color for single-category funnel (no colorBy/categoryAccessor)", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    expect(typeof pieceStyleFn).toBe("function")

    // All steps should get the same fill
    const style1 = pieceStyleFn({ step: "Awareness", value: 1000 })
    const style2 = pieceStyleFn({ step: "Interest", value: 600 })
    const style3 = pieceStyleFn({ step: "Purchase", value: 200 })

    expect(style1.fill).toBeTruthy()
    expect(style1.fill).toBe(style2.fill)
    expect(style2.fill).toBe(style3.fill)
  })

  it("uses explicit color prop for uniform fill when provided", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} color="#ff0000" />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    const style = pieceStyleFn({ step: "Awareness", value: 1000 })
    expect(style.fill).toBe("#ff0000")
  })

  // ── Test 11: multi-category → per-category colors ─────────────────

  it("applies per-category colors when colorBy or categoryAccessor is set", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={multiCategoryData} categoryAccessor="channel" />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    expect(typeof pieceStyleFn).toBe("function")

    // The style function should use the color scale, not uniform fill
    const styleWeb = pieceStyleFn({ step: "Awareness", value: 1000, channel: "web" })
    const styleMobile = pieceStyleFn({ step: "Awareness", value: 800, channel: "mobile" })

    expect(styleWeb.fill).toBeTruthy()
    expect(styleMobile.fill).toBeTruthy()
    // Different categories should get different colors
    expect(styleWeb.fill).not.toBe(styleMobile.fill)
  })

  // ── Test 12: tooltip renders step, value, and percentage ──────────

  it("default tooltip renders step, value, and percentage from horizontal metadata", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    expect(typeof tooltipFn).toBe("function")

    const datum = {
      __funnelStep: "Interest",
      __funnelValue: 600,
      __funnelPercent: 60,
      __funnelIsFirstStep: false
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Interest")
    expect(container.textContent).toContain("600")
    expect(container.textContent).toContain("60%")
  })

  it("default tooltip does not show percentage for first step", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    const datum = {
      __funnelStep: "Awareness",
      __funnelValue: 1000,
      __funnelPercent: 100,
      __funnelIsFirstStep: true
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Awareness")
    expect(container.textContent).toContain("1000")
    expect(container.textContent).not.toContain("100%")
  })

  // ── Test 13: tooltip handles vertical (__barFunnel*) metadata ─────

  it("default tooltip handles vertical bar-funnel metadata fields", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    const datum = {
      __barFunnelStep: "Interest",
      __barFunnelValue: 600,
      __barFunnelPercent: 60,
      __barFunnelIsFirstStep: false,
      __barFunnelIsDropoff: true,
      __barFunnelCategory: "web"
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Interest")
    expect(container.textContent).toContain("600")
    expect(container.textContent).toContain("60%")
    expect(container.textContent).toContain("Dropoff")
    expect(container.textContent).toContain("web")
  })

  it("tooltip works when data is wrapped in .data property", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    const datum = {
      data: {
        __funnelStep: "Purchase",
        __funnelValue: 200,
        __funnelPercent: 20,
        __funnelIsFirstStep: false
      }
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Purchase")
    expect(container.textContent).toContain("200")
    expect(container.textContent).toContain("20%")
  })

  // ── Test 14: legend auto-shows when categoryAccessor present ──────

  it("auto-shows legend when categoryAccessor is present", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={multiCategoryData} categoryAccessor="channel" showLegend />
      </TooltipProvider>
    )

    // Legend config should be present on frame props
    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("does not show legend for single-category funnel without showLegend", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    // No legend config without colorBy/categoryAccessor
    expect(lastOrdinalFrameProps.legend).toBeUndefined()
  })

  // ── Test 15: width/height forwarded as size ───────────────────────

  it("forwards width and height as size array", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} width={800} height={500} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([800, 500])
  })

  it("uses default width=600 and height=400 when not specified", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([600, 400])
  })

  // ── Additional: tooltip disabled ──────────────────────────────────

  it("returns null tooltip when tooltip={false}", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} tooltip={false} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    expect(lastOrdinalFrameProps.tooltipContent({ step: "A", value: 10 })).toBeNull()
  })

  // ── Push API ──────────────────────────────────────────────────────

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <FunnelChart ref={ref} stepAccessor="step" valueAccessor="value" />
      </TooltipProvider>
    )

    expect(ref.current).toBeTruthy()
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  // ── frameProps passthrough ────────────────────────────────────────

  it("spreads frameProps onto StreamOrdinalFrame", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} frameProps={{ hoverAnnotation: true }} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.hoverAnnotation).toBe(true)
  })

  // ── annotations ───────────────────────────────────────────────────

  it("forwards annotations to StreamOrdinalFrame", () => {
    const annotations = [{ type: "category-highlight", category: "Interest" }]
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} annotations={annotations} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.annotations).toEqual(annotations)
  })

  it("does not forward empty annotations array", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} annotations={[]} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.annotations).toBeUndefined()
  })

  // ── showCategoryTicks forced off for horizontal funnel ────────────

  it("sets showCategoryTicks to true for vertical, false for horizontal", () => {
    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBe(true)

    render(
      <TooltipProvider>
        <FunnelChart data={sampleData} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBe(false)
  })
})
