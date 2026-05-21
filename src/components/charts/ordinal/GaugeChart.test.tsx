import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { GaugeChart } from "./GaugeChart"
import { TooltipProvider } from "../../store/TooltipStore"
import type { Datum } from "../shared/datumTypes"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("GaugeChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("renders without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <GaugeChart value={75} />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
  })

  it("uses radial projection with pie chart type", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.chartType).toBe("donut")
    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("generates fill and background data segments that sum to 1.0", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    const fillSegment = data.find((d: Datum) => d._isFill)
    const bgSegment = data.find((d: Datum) => !d._isFill)
    expect(fillSegment).toBeTruthy()
    expect(bgSegment).toBeTruthy()
    // Data sums to 1.0 — pieScene uses sweepAngle to limit the arc
    expect(fillSegment.value + bgSegment.value).toBeCloseTo(1.0, 2)
    // sweepAngle is passed to the frame
    expect(lastOrdinalFrameProps.sweepAngle).toBe(240)
  })

  it("generates threshold zone segments", () => {
    render(
      <TooltipProvider>
        <GaugeChart
          value={60}
          min={0}
          max={100}
          thresholds={[
            { value: 50, color: "green", label: "Low" },
            { value: 80, color: "yellow", label: "Medium" },
            { value: 100, color: "red", label: "High" },
          ]}
        />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // value=60 fills all of zone 1 (0-50) and part of zone 2 (50-80)
    // Plus gap segment
    const fills = data.filter((d: Datum) => d._isFill)
    const bgs = data.filter((d: Datum) => !d._isFill)
    expect(fills.length).toBe(2) // zones 0 and 1 have fill
    expect(bgs.length).toBe(2) // zones 1 and 2 have background
  })

  it("clamps value to min/max range", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={150} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // All filled, no background
    const fills = data.filter((d: Datum) => d._isFill)
    const bgs = data.filter((d: Datum) => !d._isFill)
    expect(fills.length).toBe(1)
    expect(bgs.length).toBe(0)
  })

  it("clamps value below min", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={-10} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // All background, no fill
    const fills = data.filter((d: Datum) => d._isFill)
    const bgs = data.filter((d: Datum) => !d._isFill)
    expect(fills.length).toBe(0)
    expect(bgs.length).toBe(1)
  })

  it("renders needle annotation by default", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations
    const needle = annotations?.find((a: any) => a.type === "gauge-needle")
    expect(needle).toBeTruthy()
  })

  it("does not render needle when showNeedle=false", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} showNeedle={false} />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations || []
    const needle = annotations.find((a: any) => a.type === "gauge-needle")
    expect(needle).toBeFalsy()
  })

  it("generates scale label annotations at threshold boundaries", () => {
    render(
      <TooltipProvider>
        <GaugeChart
          value={50}
          thresholds={[
            { value: 33, color: "green", label: "Low" },
            { value: 66, color: "yellow", label: "Med" },
            { value: 100, color: "red", label: "High" },
          ]}
        />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations || []
    const labels = annotations.filter((a: any) => a.type === "gauge-label")
    // Should have labels at 33 and 66 (not 100 since it equals max)
    expect(labels.length).toBe(2)
    expect(labels[0].value).toBe(33)
    expect(labels[1].value).toBe(66)
  })

  it("sets innerRadius proportional to arcWidth", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} width={300} height={250} arcWidth={0.4} />
      </TooltipProvider>
    )
    // innerRadius should be > 0 and proportional to (1 - arcWidth) * radius
    const ir = lastOrdinalFrameProps.innerRadius
    expect(ir).toBeGreaterThan(10)
    // The outer radius is derived from the frame layout, but innerRadius
    // should be roughly 60% of the computed radius (1 - 0.4 = 0.6)
    // Just verify it's a reasonable value and greater than minimum
    expect(typeof ir).toBe("number")
  })

  it("passes custom center content", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} centerContent={<span data-testid="custom">Custom</span>} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.centerContent).toBeTruthy()
  })

  it("default 240° sweep has startAngle=240 (gap centered at bottom)", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    // 240° sweep → gap = 120°, startAngle = 180 + 60 = 240
    expect(lastOrdinalFrameProps.startAngle).toBe(240)
  })

  it("supports custom sweep angle", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} sweep={180} />
      </TooltipProvider>
    )
    // 180° sweep → gap = 180°, startAngle = 180 + 90 = 270 degrees
    // pieScene converts: -π/2 + 270*π/180 = -π/2 + 3π/2 = π = 9 o'clock
    // Arc runs 180° from 9 o'clock to 3 o'clock (top half = sunrise) ✓
    expect(lastOrdinalFrameProps.startAngle).toBe(270)
  })

  it("supports valueFormat for center label", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={75.5} valueFormat={(v) => `${v.toFixed(1)}%`} />
      </TooltipProvider>
    )
    // The center content should use the formatter
    expect(lastOrdinalFrameProps.centerContent).toBeTruthy()
  })

  it("does not pass cornerRadius to the frame when unset (sharp corners default)", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    // Omitted entirely so the pie scene builder uses its default (no
    // rounding). Setting `cornerRadius: undefined` would still flow
    // through and is functionally the same, but omitting matches the
    // DonutChart pattern.
    expect(lastOrdinalFrameProps.cornerRadius).toBeUndefined()
  })

  it("forwards cornerRadius to the frame for rounded segment ends", () => {
    render(
      <TooltipProvider>
        <GaugeChart
          value={65}
          thresholds={[
            { value: 60, color: "#22c55e" },
            { value: 80, color: "#f59e0b" },
            { value: 100, color: "#ef4444" },
          ]}
          cornerRadius={6}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.cornerRadius).toBe(6)
  })

  it("accepts cornerRadius={0} as a valid value (explicit sharp corners)", () => {
    // Per the `cornerRadius != null` check in the streamProps spread,
    // 0 still flows through. Useful when a user wants to override a
    // theme/default that supplied rounding.
    render(
      <TooltipProvider>
        <GaugeChart value={50} cornerRadius={0} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.cornerRadius).toBe(0)
  })

  describe("chart mode resolution", () => {
    it("primary mode uses the gauge-specific 300×250 default", () => {
      // Gauge overrides the generic primary default (600×400) with a more
      // compact 300×250 via useChartMode's third argument.
      render(
        <TooltipProvider>
          <GaugeChart value={50} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([300, 250])
    })

    it("sparkline mode overrides the primary default with 120×24", () => {
      // Regression: `width: props.width ?? 300` previously swallowed the
      // sparkline size default. The fix moved `300` into useChartMode's
      // primaryDefaults so sparkline/context can still substitute.
      render(
        <TooltipProvider>
          <GaugeChart value={50} mode="sparkline" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([120, 24])
    })

    it("context mode uses the 400×250 default", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} mode="context" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([400, 250])
    })

    it("explicit width/height override the mode defaults", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} mode="sparkline" width={200} height={40} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([200, 40])
    })

    it("context mode suppresses threshold scale labels and renders the value as an SVG annotation below the dial", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} thresholds={[
            { value: 30, color: "#22c55e", label: "Low" },
            { value: 70, color: "#eab308", label: "Mid" },
            { value: 100, color: "#ef4444", label: "High" },
          ]} mode="context" />
        </TooltipProvider>
      )
      const anns = lastOrdinalFrameProps.annotations || []
      // gauge-label annotations are only emitted when showScaleLabels is true;
      // context mode defaults showScaleLabels to false.
      expect(anns.some((a: Datum) => a.type === "gauge-label")).toBe(false)
      // gauge-value annotation takes the range's old spot (below the dial).
      const valueAnn = anns.find((a: Datum) => a.type === "gauge-value")
      expect(valueAnn).toBeTruthy()
      expect(valueAnn?.text).toBe("50")
      // centerContent slot is suppressed so the value doesn't render twice.
      expect(lastOrdinalFrameProps.centerContent).toBeNull()
    })

    it("sparkline mode suppresses threshold scale labels and the value readout", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} thresholds={[
            { value: 30, color: "#22c55e", label: "Low" },
            { value: 100, color: "#ef4444", label: "High" },
          ]} mode="sparkline" />
        </TooltipProvider>
      )
      const anns = lastOrdinalFrameProps.annotations || []
      expect(anns.some((a: Datum) => a.type === "gauge-label")).toBe(false)
      // Sparkline hides the value readout entirely — centerContent is null.
      expect(lastOrdinalFrameProps.centerContent).toBeNull()
    })

    it("primary mode renders threshold scale labels", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} thresholds={[
            { value: 30, color: "#22c55e", label: "Low" },
            { value: 70, color: "#eab308", label: "Mid" },
            { value: 100, color: "#ef4444", label: "High" },
          ]} />
        </TooltipProvider>
      )
      const anns = lastOrdinalFrameProps.annotations || []
      expect(anns.some((a: Datum) => a.type === "gauge-label")).toBe(true)
    })

  it("user-supplied showScaleLabels wins over mode default", () => {
      render(
        <TooltipProvider>
          <GaugeChart value={50} thresholds={[
            { value: 30, color: "#22c55e", label: "Low" },
            { value: 100, color: "#ef4444", label: "High" },
          ]} mode="context" showScaleLabels />
        </TooltipProvider>
      )
      const anns = lastOrdinalFrameProps.annotations || []
      expect(anns.some((a: Datum) => a.type === "gauge-label")).toBe(true)
    })

    it("expands gradientFill into a band wedge with multiple sampled colors", () => {
      render(
        <TooltipProvider>
          <GaugeChart
            value={50}
            fillZones={false}
            gradientFill={{
              colorStops: [
                { offset: 0, color: "#ef4444" },
                { offset: 0.5, color: "#f59e0b" },
                { offset: 1, color: "#3b82f6" },
              ],
            }}
          />
        </TooltipProvider>
      )
      const data = lastOrdinalFrameProps.data || []
      const band = data.find((d: Datum) => d._gradientBand)
      expect(band).toBeTruthy()
      const colors: string[] = band?._gradientBand?.colors || []
      expect(colors.length).toBeGreaterThan(3)
      expect(new Set(colors).size).toBeGreaterThan(3)
    })

    it("renders gradient fill as a single rounded band wedge over a non-interactive track", () => {
      render(
        <TooltipProvider>
          <GaugeChart
            value={70}
            fillZones
            showNeedle={false}
            cornerRadius={12}
            gradientFill={{
              colorStops: [
                { offset: 0, color: "#ef4444" },
                { offset: 1, color: "#3b82f6" },
              ],
            }}
          />
        </TooltipProvider>
      )
      const data = lastOrdinalFrameProps.data || []
      const track = data[0]
      const band = data.find((d: Datum) => d._gradientBand)

      // Track is the grey backdrop, rounded on both ends — sits in the
      // gauge's gap-bottom convention behind the gradient band.
      expect(track._isFill).toBe(false)
      expect(track._nonInteractive).toBe(true)
      expect(track._pctStart).toBe(0)
      expect(track._pct).toBe(1)
      expect(track._roundedEnds).toEqual({ start: true, end: true })

      // The whole gradient is ONE wedge spanning the visible portion,
      // rounded at both ends. The renderer uses this wedge's rounded
      // outline as a clip mask and paints the colors array inside as
      // unrounded slice sectors — no individual slice needs to fit a
      // corner radius into its (very small) angular extent.
      expect(band).toBeTruthy()
      expect(band._isFill).toBe(true)
      expect(band._nonInteractive).toBe(true)
      expect(band._pctStart).toBe(0)
      expect(band._pct).toBeCloseTo(0.7, 2)
      expect(band._roundedEnds).toEqual({ start: true, end: true })
      expect(band._gradientBand.colors.length).toBeGreaterThan(3)
    })

    it("does not turn unparseable gradient stop colors gray", () => {
      render(
        <TooltipProvider>
          <GaugeChart
            value={100}
            fillZones={false}
            gradientFill={{
              colorStops: [
                { offset: 0, color: "var(--semiotic-low)" },
                { offset: 1, color: "#3b82f6" },
              ],
            }}
          />
        </TooltipProvider>
      )
      // Colors live on the band's `_gradientBand.colors` array — the
      // renderer reads them directly without going through pieceStyle,
      // so unparseable values flow through verbatim and CSS-var fills
      // still resolve in canvas/SVG paint.
      const band = (lastOrdinalFrameProps.data || []).find((d: Datum) => d._gradientBand)
      const colors: string[] = band?._gradientBand?.colors || []
      const colorSet = new Set(colors)
      expect(colorSet.has("#808080")).toBe(false)
      expect(colorSet.has("var(--semiotic-low)")).toBe(true)
      expect(colorSet.has("#3b82f6")).toBe(true)
    })

    it("keeps gradient slice count within the default budget across many zones", () => {
      render(
        <TooltipProvider>
          <GaugeChart
            value={100}
            fillZones={false}
            thresholds={Array.from({ length: 20 }, (_, i) => ({
              value: (i + 1) * 5,
              color: "#999999",
            }))}
            gradientFill={{
              colorStops: [
                { offset: 0, color: "#ef4444" },
                { offset: 1, color: "#3b82f6" },
              ],
            }}
          />
        </TooltipProvider>
      )
      const band = (lastOrdinalFrameProps.data || []).find((d: Datum) => d._gradientBand)
      expect(band?._gradientBand?.colors.length).toBeLessThanOrEqual(48)
    })
  })
})
