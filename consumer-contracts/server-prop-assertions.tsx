/** Test-only executable observables. Kept out of the source-only inventory. */
import React from "react"
import { expect, vi } from "vitest"
import type { LoadedContract } from "./types"
import type { ServerPropContract } from "./server-props"
import { renderChartWithEvidence } from "../src/components/server/renderToStaticSVG"

interface Context {
  contract: ServerPropContract
  seed?: LoadedContract
}
const render = (component: string, props: Record<string, unknown>) => {
  const result = renderChartWithEvidence(component, props)
  const doc = new DOMParser().parseFromString(result.svg, "image/svg+xml")
  expect(doc.querySelector("parsererror")).toBeNull()
  return { ...result, doc }
}
const propsFor = ({ seed }: Context) => structuredClone(seed!.config.props)
const filledPaths = (doc: Document) => [
  ...doc.querySelectorAll('path[fill]:not([fill="none"])')
]
const text = (doc: Document) =>
  [...doc.querySelectorAll("text")].map((node) => node.textContent)
const opacity = (node: Element) =>
  Number(
    node.getAttribute("fill-opacity") ?? (node as SVGElement).style.fillOpacity
  )

function lineArea(context: Context) {
  const props: Record<string, unknown> = {
    ...propsFor(context),
    frameProps: {}
  }
  for (const value of [0, 0.23, 0.3]) {
    const result = render("LineChart", { ...props, areaOpacity: value })
    expect(
      result.evidence.markCountByType,
      "fillArea must produce one area and one line"
    ).toEqual({ area: 1, line: 1 })
    expect(filledPaths(result.doc)).toHaveLength(1)
    expect(
      opacity(filledPaths(result.doc)[0]),
      "areaOpacity must reach the painted area"
    ).toBe(value)
  }
  const defaultProps = { ...props }
  delete defaultProps.areaOpacity
  expect(opacity(filledPaths(render("LineChart", defaultProps).doc)[0])).toBe(
    0.3
  )
  for (const fillArea of [false, undefined]) {
    const result = render("LineChart", { ...props, fillArea })
    expect(result.evidence.markCountByType).toEqual({ line: 2 })
    expect(filledPaths(result.doc)).toHaveLength(0)
  }
}

function lineBand(context: Context) {
  const props = propsFor(context)
  const withBand = render("LineChart", props)
  const without = render("LineChart", { ...props, band: undefined })
  expect(
    withBand.evidence.markCountByType,
    "band must produce envelope marks"
  ).toEqual({ area: 2, line: 2 })
  expect(without.evidence.markCountByType).toEqual({ line: 2 })
  expect(withBand.evidence.yDomain![0]).toBeLessThan(
    without.evidence.yDomain![0]
  )
  expect(withBand.evidence.yDomain![1]).toBeGreaterThan(
    without.evidence.yDomain![1]
  )
}

function areaGradient(context: Context) {
  const props = propsFor(context)
  const gradient = render("AreaChart", props)
  expect(gradient.evidence.markCountByType).toEqual({ area: 1 })
  expect(
    [...gradient.doc.querySelectorAll("stop")].map((node) =>
      node.getAttribute("stop-color")
    )
  ).toEqual(["#FF7077", "#FF8000", "#E5A800"])
  expect(filledPaths(gradient.doc)[0].getAttribute("fill")).toMatch(/^url\(#/)
  // semanticGradient owns stop opacities; areaOpacity governs ordinary fills.
  for (const value of [undefined, 0, 0.21, 0.7]) {
    const plain = render("AreaChart", {
      ...props,
      semanticGradient: undefined,
      areaOpacity: value
    })
    expect(plain.doc.querySelector("linearGradient")).toBeNull()
    expect(opacity(filledPaths(plain.doc)[0])).toBe(value ?? 0.7)
  }
}

function radial(context: Context) {
  const { component } = context.contract
  const props = { ...propsFor(context), cornerRadius: 0 }
  const angleOf = (doc: Document) => {
    const start = filledPaths(doc)[0]
      .getAttribute("d")!
      .match(/^M([\d.e+-]+),([\d.e+-]+)/i)!
    return (
      ((Math.atan2(Number(start[1]), -Number(start[2])) * 180) / Math.PI +
        360) %
      360
    )
  }
  for (const angle of [0, 45, 90, undefined]) {
    const result = render(component, { ...props, startAngle: angle })
    expect(result.evidence.markCountByType).toEqual({ wedge: 3 })
    expect(angleOf(result.doc)).toBeCloseTo(angle ?? 0, 2)
  }
  for (const showLegend of [true, false]) {
    const result = render(component, { ...props, showLegend })
    expect(result.doc.querySelectorAll(".semiotic-legend text")).toHaveLength(
      showLegend ? 3 : 0
    )
  }
}

function bars(context: Context) {
  const { component } = context.contract
  const props = {
    ...propsFor(context),
    orientation: "vertical",
    margin: 0,
    showLegend: false,
    frameProps: { showAxes: false },
    trackFill: undefined,
    color: "#123abc",
    colorScheme: ["#123abc"],
    barPadding: 0,
    roundedTop: 0,
    valueExtent: [0, 100]
  }
  const square = render(component, props)
  expect(
    square.evidence.yDomain,
    "valueExtent must pin the ordinal value domain"
  ).toEqual([0, 100])
  const marks = square.doc.querySelectorAll('rect[fill="#123abc"]')
  expect(marks.length).toBeGreaterThan(0)
  const width = Number(marks[0].getAttribute("width"))
  expect(width).toBeGreaterThan(0)
  const padded = render(component, { ...props, barPadding: 20 })
  const thinner = padded.doc.querySelector('rect[fill="#123abc"]')!
  // Padding is converted to the ordinal scale's band ratio, not subtracted
  // once from each bar (grouped charts also reserve their inner group gap).
  expect(Number(thinner.getAttribute("width"))).toBeGreaterThan(0)
  expect(Number(thinner.getAttribute("width"))).toBeLessThan(width)
  expect(
    render(component, { ...props, valueExtent: undefined }).evidence.yDomain![1]
  ).toBeLessThan(100)
  const rounded = render(component, { ...props, roundedTop: 6 })
  const paths = rounded.doc.querySelectorAll('path[fill="#123abc"]')
  expect(
    paths.length,
    "roundedTop must create curved bar tips"
  ).toBeGreaterThan(0)
  expect(paths[0].getAttribute("d")).toMatch(/(?:A6,6|Q)/)
  const radius = vi.fn((_width: number) => 6)
  const callback = render(component, { ...props, roundedTop: radius })
  expect(radius).toHaveBeenCalled()
  expect(
    radius.mock.calls.every(([value]) => typeof value === "number" && value > 0)
  ).toBe(true)
  expect(
    callback.doc.querySelector('path[fill="#123abc"]')?.getAttribute("d")
  ).toBe(paths[0].getAttribute("d"))
}

function axes(context: Context) {
  const props = propsFor(context)
  const selector = ".ordinal-axes, .stream-axes"
  const { component } = context.contract
  const visible = render(component, {
    ...props,
    frameProps: { showAxes: true }
  })
  expect(visible.doc.querySelectorAll(`${selector}`).length).toBeGreaterThan(0)
  expect(text(visible.doc).length).toBeGreaterThan(0)
  for (const showAxes of [undefined, true, false]) {
    const hidden = render(component, {
      ...props,
      showAxes,
      frameProps: { showAxes: false }
    })
    expect(hidden.doc.querySelector(selector)).toBeNull()
    expect(hidden.evidence.markCount).toBe(visible.evidence.markCount)
  }
  const forced = render(component, {
    ...props,
    mode: "sparkline",
    showAxes: false,
    frameProps: { showAxes: true }
  })
  expect(forced.doc.querySelector(selector)).not.toBeNull()
  expect(
    render(component, {
      ...props,
      mode: "sparkline",
      frameProps: {}
    }).doc.querySelector(selector)
  ).toBeNull()
}

function ordinalLabels(context: Context) {
  const props = propsFor(context)
  const format = vi.fn((value: number) => `units:${value}`)
  const labeled = render("BarChart", {
    ...props,
    categoryLabel: "Regions",
    valueLabel: "Revenue",
    valueFormat: format
  })
  expect(text(labeled.doc)).toContain("Regions")
  expect(text(labeled.doc)).toContain("Revenue")
  expect(text(labeled.doc)).toContain("units:47")
  expect(format).toHaveBeenCalledWith(47)
  const plain = text(render("BarChart", props).doc)
  expect(plain).toContain("47")
  expect(plain).not.toContain("Regions")
  expect(plain).not.toContain("Revenue")
  expect(
    render("BarChart", {
      ...props,
      categoryLabel: "Regions",
      valueLabel: "Revenue",
      frameProps: { showAxes: false }
    }).doc.querySelector(".ordinal-axes")
  ).toBeNull()
}

function gauge() {
  const props = {
    value: 140,
    min: 10,
    max: 80,
    centerLabel: "CPU",
    width: 360,
    height: 300,
    thresholds: [
      { value: 40, color: "#2a2", label: "Low" },
      { value: 80, color: "#a22", label: "High" }
    ]
  }
  const format = vi.fn((value: number) => `${value}%`)
  const result = render("GaugeChart", { ...props, valueFormat: format })
  expect(result.evidence.markCount).toBeGreaterThan(0)
  expect(text(result.doc)).toContain("80%")
  expect(text(result.doc)).toContain("CPU")
  expect(text(result.doc)).toContain("10 – 80")
  expect(text(result.doc)).toContain("Low")
  expect(result.doc.querySelector('line[stroke-width="2.5"]')).not.toBeNull()
  const hidden = render("GaugeChart", {
    ...props,
    showNeedle: false,
    showScaleLabels: false,
    centerLabel: undefined
  })
  expect(hidden.doc.querySelector('line[stroke-width="2.5"]')).toBeNull()
  expect(text(hidden.doc)).not.toContain("Low")
  expect(text(hidden.doc)).not.toContain("CPU")
  expect(text(hidden.doc)).toContain("80")
  expect(text(render("GaugeChart", { ...props, value: -20 }).doc)).toContain(
    "10"
  )
  expect(text(render("GaugeChart", { value: 64 }).doc)).toContain("64")
  expect(text(render("GaugeChart", { value: 64 }).doc)).toContain("0 – 100")
}

function accessibility(context: Context) {
  const props = propsFor(context)
  for (const data of [props.data, []]) {
    const result = render("LineChart", {
      ...props,
      data,
      title: "Service demand",
      description: "Volume and latency over time"
    })
    expect(result.doc.querySelector("title")?.textContent).toBe(
      "Service demand"
    )
    expect(result.doc.querySelector("desc")?.textContent).toBe(
      "Volume and latency over time"
    )
    expect(result.evidence.ariaLabel).toBe("Volume and latency over time")
    expect(result.evidence.empty).toBe(Array.isArray(data) && data.length === 0)
    if (result.evidence.empty) expect(result.evidence.markCount).toBe(0)
  }
  const titleOnly = render("LineChart", { ...props, title: "Service demand" })
  expect(titleOnly.evidence.ariaLabel).toBe("Service demand")
  expect(titleOnly.doc.querySelector("desc")).toBeNull()
  const onClick = vi.fn()
  for (const data of [props.data, []]) {
    const result = render("LineChart", {
      ...props,
      data,
      onClick,
      enableHover: true,
      emptyContent: <text>Client empty state</text>
    })
    expect(result.doc.documentElement.textContent).not.toContain(
      "Client empty state"
    )
    expect(result.doc.querySelector(".stream-frame-tooltip")).toBeNull()
  }
  expect(onClick).not.toHaveBeenCalled()
}

function cursorTarget({ contract }: Context) {
  const props: Record<string, unknown> = {
    data: [
      { x: 1, y: 3 },
      { x: 2, y: 9 },
      { x: 3, y: 5 },
      { x: 4, y: 7 }
    ],
    xAccessor: "x",
    yAccessor: "y",
    ...(contract.component === "LineChart" ? { fillArea: true } : {}),
    frameProps: { areaStyle: () => ({ fill: "#888", cursor: "pointer" }) }
  }
  const targets = (input: Record<string, unknown>) => [
    ...render(contract.component, input).doc.querySelectorAll(
      '[data-semiotic-cursor-hit-target="area-top-path"]'
    )
  ]
  const width = (hoverRadius?: number) => {
    const found = targets(
      hoverRadius === undefined ? props : { ...props, hoverRadius }
    )
    expect(
      found,
      "a cursor-styled area must emit one hit target"
    ).toHaveLength(1)
    return Number(found[0].getAttribute("stroke-width"))
  }
  expect(width(), "the default hit target is 60px wide").toBe(60)
  expect(width(12), "hoverRadius must set the hit target width").toBe(24)
  expect(width(0), "a zero radius clamps to a 1px target").toBe(1)
  // Without a cursor style there is no hit target for hoverRadius to size.
  expect(targets({ ...props, frameProps: {}, hoverRadius: 12 })).toHaveLength(0)
}

// Source inventory parses these keys without loading React, Vitest, or a renderer.
// The test runner also checks exact agreement before executing every contract.
export const serverPropAssertions: Record<string, (context: Context) => void> =
  {
    "line-area": lineArea,
    "line-band": lineBand,
    "area-gradient": areaGradient,
    "PieChart-angle": radial,
    "DonutChart-angle": radial,
    "BarChart-bars": bars,
    "StackedBarChart-bars": bars,
    "GroupedBarChart-bars": bars,
    "SwimlaneChart-bars": bars,
    "LineChart-axes": axes,
    "SwimlaneChart-axes": axes,
    "ordinal-labels": ordinalLabels,
    "gauge-readout": gauge,
    "line-accessibility": accessibility,
    "AreaChart-cursor-target": cursorTarget,
    "LineChart-cursor-target": cursorTarget
  }
