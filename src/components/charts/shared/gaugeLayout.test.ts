import { describe, expect, it } from "vitest"
import {
  computeGaugeLayout,
  gaugeScaleLabelAlignment,
  GAUGE_LABEL_FONT_SIZE,
  GAUGE_LABEL_OFFSET,
  type GaugeLayout,
} from "./gaugeLayout"
import { gaugeReadoutExtent, gaugeReadoutFontSize } from "./GaugeReadout"
import { estimateLabelWidth } from "./AnnotationLabel"
import { computeArcBoundingBox, sweepToAngles } from "./radialGeometry"

/** Arc + readout extents in chart coordinates. */
function measure(layout: GaugeLayout, sweep: number, value: string, captionLines: number) {
  const box = computeArcBoundingBox(sweep)
  const fontSize = gaugeReadoutFontSize(value, layout.radius, layout.innerRadius)
  const reach = gaugeReadoutExtent(fontSize, captionLines)
  const valueCenter = layout.centerY + layout.readoutOffset
  return {
    arcTop: layout.centerY + box.minY * layout.radius,
    arcBottom: layout.centerY + box.maxY * layout.radius,
    valueBottom: valueCenter + fontSize / 2,
    readoutBottom: valueCenter + reach.below,
  }
}

/** The layout's frame margins reproduce its radius around its center. */
function expectFrameReproducesLayout(layout: GaugeLayout, width: number, height: number) {
  const { margin } = layout
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  expect(Math.min(plotWidth, plotHeight) / 2 - 4).toBeCloseTo(layout.radius)
  expect(margin.top + plotHeight / 2).toBeCloseTo(layout.centerY)
  expect(margin.left + plotWidth / 2).toBeCloseTo(layout.centerX)
}

describe("computeGaugeLayout", () => {
  it("fits a half-circle gauge and its readout inside a short card", () => {
    const [width, height] = [850, 158]
    const layout = computeGaugeLayout({
      width, height, sweep: 180, arcWidth: 0.3,
      readout: { value: "62", captionLines: 1 },
    })
    const { arcTop, arcBottom, valueBottom, readoutBottom } = measure(layout, 180, "62", 1)
    expect(arcTop).toBeGreaterThanOrEqual(0)
    // The scale caption stays inside the chart instead of below its edge.
    expect(readoutBottom).toBeLessThanOrEqual(height)
    // The value sits inside the arch, above the line through the arc's ends.
    expect(valueBottom).toBeLessThan(arcBottom)
    expectFrameReproducesLayout(layout, width, height)
  })

  it("fits below a title strip the frame reserves", () => {
    const [width, height, topInset] = [850, 158, 36]
    const layout = computeGaugeLayout({
      width, height, sweep: 180, arcWidth: 0.3,
      readout: { value: "62", captionLines: 1 },
      topInset,
    })
    const { arcTop, readoutBottom } = measure(layout, 180, "62", 1)
    expect(arcTop).toBeGreaterThanOrEqual(topInset)
    expect(readoutBottom).toBeLessThanOrEqual(height)
    // Already clear of the strip, so the frame's title floor changes nothing.
    expect(layout.margin.top).toBeGreaterThanOrEqual(topInset)
    expectFrameReproducesLayout(layout, width, height)
  })

  it("shrinks the arc only as much as the readout needs", () => {
    const withoutReadout = computeGaugeLayout({ width: 850, height: 158, sweep: 180, arcWidth: 0.3 })
    const withReadout = computeGaugeLayout({
      width: 850, height: 158, sweep: 180, arcWidth: 0.3,
      readout: { value: "62", captionLines: 1 },
    })
    expect(withoutReadout.radius).toBeCloseTo(136)
    expect(withReadout.radius).toBeLessThan(withoutReadout.radius)
    expect(withReadout.radius).toBeGreaterThan(110)
  })

  it("reserves room for each caption line", () => {
    const [width, height] = [850, 180]
    const layout = computeGaugeLayout({
      width, height, sweep: 180, arcWidth: 0.3,
      readout: { value: "62", captionLines: 2 },
    })
    expect(measure(layout, 180, "62", 2).readoutBottom).toBeLessThanOrEqual(height)
  })

  it("keeps the established 240° layout when the readout already fits in the arc's opening", () => {
    const [width, height] = [300, 250]
    const box = computeArcBoundingBox(240)
    const pad = 10
    const legacyRadius = Math.min((width - 2 * pad) / box.width, (height - 2 * pad) / box.height) - 2
    const layout = computeGaugeLayout({
      width, height, sweep: 240, arcWidth: 0.3,
      readout: { value: "65", captionLines: 1 },
    })
    expect(layout.radius).toBeCloseTo(legacyRadius)
    expect(layout.readoutOffset).toBe(0)
    expect(layout.centerY).toBeCloseTo(height / 2 - box.cy * legacyRadius)
    expectFrameReproducesLayout(layout, width, height)
  })

  it("leaves custom-node and compact gauges sized to the arc alone", () => {
    const box = computeArcBoundingBox(180)
    const layout = computeGaugeLayout({ width: 400, height: 300, sweep: 180, arcWidth: 0.3 })
    expect(layout.radius).toBeCloseTo(188)
    expect(layout.centerY).toBeCloseTo(150 - box.cy * 188)
    expect(layout.readoutOffset).toBe(0)
  })

  it("keeps the sparkline floor", () => {
    const layout = computeGaugeLayout({ width: 120, height: 24, sweep: 240, arcWidth: 0.3 })
    expect(layout.radius).toBeGreaterThanOrEqual(4)
    expect(layout.innerRadius).toBeLessThanOrEqual(layout.radius - 1.5)
  })
})

/** Value text box relative to the arc center. */
function valueBox(layout: GaugeLayout, value: string) {
  const fontSize = gaugeReadoutFontSize(value, layout.radius, layout.innerRadius)
  const halfWidth = estimateLabelWidth(value, fontSize) / 2
  return {
    left: -halfWidth,
    right: halfWidth,
    top: layout.readoutOffset - fontSize / 2,
    bottom: layout.readoutOffset + fontSize / 2,
  }
}

/** Whether a needle at `fraction` of the sweep (drawn as in GaugeChart) crosses the box. */
function needleCrosses(layout: GaugeLayout, sweep: number, fraction: number, box: ReturnType<typeof valueBox>) {
  const { offsetRad, sweepRad } = sweepToAngles(sweep)
  const angle = offsetRad + fraction * sweepRad
  const length = layout.innerRadius > 20 ? layout.innerRadius - 8 : layout.radius - 1
  // Half the 2.5px stroke, so a needle grazing the text counts as crossing.
  const halfStroke = 1.25
  for (let step = 0; step <= 200; step++) {
    const x = Math.cos(angle) * length * (step / 200)
    const y = Math.sin(angle) * length * (step / 200)
    if (x >= box.left - halfStroke && x <= box.right + halfStroke &&
      y >= box.top - halfStroke && y <= box.bottom + halfStroke) return true
  }
  return false
}

describe("computeGaugeLayout with a needle", () => {
  it.each([
    [180, 850, 158],
    [180, 320, 260],
    [240, 300, 250],
    [270, 300, 260],
  ])("keeps the %i° readout out of the needle's sweep (%ix%i)", (sweep, width, height) => {
    const layout = computeGaugeLayout({
      width, height, sweep, arcWidth: 0.3, needle: true,
      readout: { value: "62", captionLines: 1 },
    })
    const box = valueBox(layout, "62")
    for (let fraction = 0; fraction <= 1; fraction += 0.05) {
      expect(needleCrosses(layout, sweep, fraction, box)).toBe(false)
    }
    // The whole readout still fits the chart.
    expect(measure(layout, sweep, "62", 1).readoutBottom).toBeLessThanOrEqual(height)
  })

  it("meets the needle only near min and max on a full circle", () => {
    // A full circle leaves the needle no gap, so some overlap is unavoidable;
    // below the hub it is confined to values near the ends of the scale.
    const layout = computeGaugeLayout({
      width: 300, height: 300, sweep: 360, arcWidth: 0.3, needle: true,
      readout: { value: "30", captionLines: 1 },
    })
    const box = valueBox(layout, "30")
    for (let fraction = 0.25; fraction <= 0.75; fraction += 0.05) {
      expect(needleCrosses(layout, 360, fraction, box)).toBe(false)
    }
  })
})

describe("computeGaugeLayout with threshold labels", () => {
  /** Scale-label text boxes in chart coordinates, matching the rendered labels. */
  function labelBoxes(layout: GaugeLayout, sweep: number, labels: Array<{ fraction: number; text: string }>) {
    const { offsetRad, sweepRad } = sweepToAngles(sweep)
    return labels.map(({ fraction, text }) => {
      const angle = offsetRad + fraction * sweepRad
      const r = layout.radius + GAUGE_LABEL_OFFSET
      const x = layout.centerX + Math.cos(angle) * r
      const y = layout.centerY + Math.sin(angle) * r
      const width = estimateLabelWidth(text, GAUGE_LABEL_FONT_SIZE)
      const { textAnchor, dominantBaseline } = gaugeScaleLabelAlignment(angle)
      const left = textAnchor === "start" ? x : textAnchor === "end" ? x - width : x - width / 2
      const top = dominantBaseline === "auto" ? y - GAUGE_LABEL_FONT_SIZE * 0.8
        : dominantBaseline === "hanging" ? y : y - GAUGE_LABEL_FONT_SIZE / 2
      return { left, right: left + width, top, bottom: top + GAUGE_LABEL_FONT_SIZE }
    })
  }

  it("keeps a 12 o'clock label inside a short chart, below any title strip", () => {
    const labels = [{ fraction: 0.5, text: "Good" }, { fraction: 0.8, text: "Warn" }]
    for (const topInset of [0, 36]) {
      const layout = computeGaugeLayout({
        width: 850, height: 150, sweep: 240, arcWidth: 0.3, needle: true,
        readout: { value: "65", captionLines: 1 }, scaleLabels: labels, topInset,
      })
      for (const box of labelBoxes(layout, 240, labels)) {
        expect(box.top).toBeGreaterThanOrEqual(topInset)
        expect(box.bottom).toBeLessThanOrEqual(150)
      }
      expect(measure(layout, 240, "65", 1).readoutBottom).toBeLessThanOrEqual(150)
    }
  })

  it("keeps side labels inside a narrow chart", () => {
    const labels = [{ fraction: 0.25, text: "Low" }, { fraction: 0.75, text: "High" }]
    const [width, height] = [180, 200]
    const layout = computeGaugeLayout({
      width, height, sweep: 270, arcWidth: 0.3, scaleLabels: labels,
    })
    for (const box of labelBoxes(layout, 270, labels)) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(width)
    }
    expectFrameReproducesLayout(layout, width, height)
  })
})
