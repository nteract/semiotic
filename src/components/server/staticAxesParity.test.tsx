import * as React from "react"
import { describe, expect, it } from "vitest"
import {
  renderOrdinalToStaticSVG,
  renderXYToStaticSVG,
} from "./renderToStaticSVG"

const xyData = [
  { x: 0, y: 10 },
  { x: 1, y: 20 },
  { x: 2, y: 30 },
]

function renderXYWithAxes(
  axes: NonNullable<Parameters<typeof renderXYToStaticSVG>[0]["axes"]>,
  extra: Partial<Parameters<typeof renderXYToStaticSVG>[0]> = {},
): string {
  return renderXYToStaticSVG({
    chartType: "line",
    data: xyData,
    xAccessor: "x",
    yAccessor: "y",
    size: [320, 220],
    axes,
    ...extra,
  })
}

describe("static axis tick parity", () => {
  it("hosts top-level xFormat/yFormat ReactNodes in foreignObjects, including a paired right axis", () => {
    const svg = renderXYWithAxes([
      { orient: "bottom", tickValues: [0, 1, 2] },
      { orient: "left", tickValues: [10, 30] },
      { orient: "right", tickValues: [10, 30] },
    ], {
      xFormat: (value) => <span data-testid={`x-format-${value}`}>X {String(value)}</span>,
      yFormat: (value) => <span data-testid={`y-format-${value}`}>Y {String(value)}</span>,
    })

    expect(svg).toContain("<foreignObject")
    expect(svg).toContain('data-testid="x-format-0"')
    expect(svg).toContain('data-testid="y-format-10"')
    // The right axis receives the same top-level yFormat fallback as the
    // client overlay, instead of serializing the React element inside <text>.
    expect((svg.match(/data-testid="y-format-10"/g) || [])).toHaveLength(2)
    expect(svg).not.toMatch(/<text[^>]*><span[^>]*data-testid="(?:x|y)-format/)
  })

  it("hosts per-axis tickFormat ReactNodes for primary and paired axes", () => {
    const svg = renderXYWithAxes([
      {
        orient: "bottom",
        tickValues: [0, 1, 2],
        tickFormat: (value) => <strong data-testid={`bottom-format-${value}`}>{String(value)}</strong>,
      },
      { orient: "left", tickValues: [10, 30] },
      {
        orient: "right",
        tickValues: [10, 30],
        tickFormat: (value) => <em data-testid={`right-format-${value}`}>{String(value)}</em>,
      },
    ])

    expect(svg).toContain('data-testid="bottom-format-0"')
    expect(svg).toContain('data-testid="right-format-30"')
    expect(svg).not.toMatch(/<text[^>]*><(?:strong|em)[^>]*data-testid=/)
  })

  it("matches live edge anchoring on horizontal, primary vertical, and paired-right ticks", () => {
    const svg = renderXYWithAxes([
      {
        orient: "bottom",
        tickValues: [0, 1, 2],
        tickAnchor: "edges",
        tickFormat: (value) => `x-${value}`,
      },
      {
        orient: "left",
        tickValues: [10, 30],
        tickAnchor: "edges",
        tickFormat: (value) => `left-${value}`,
      },
      {
        orient: "right",
        tickValues: [10, 30],
        tickAnchor: "edges",
        tickFormat: (value) => `right-${value}`,
      },
    ])

    expect(svg).toMatch(/<text y="18" text-anchor="start"[^>]*>x-0<\/text>/)
    expect(svg).toMatch(/<text y="18" text-anchor="end"[^>]*>x-2<\/text>/)
    expect(svg).toMatch(/<text x="-8" text-anchor="end" dominant-baseline="auto"[^>]*>left-10<\/text>/)
    expect(svg).toMatch(/<text x="-8" text-anchor="end" dominant-baseline="hanging"[^>]*>left-30<\/text>/)
    expect(svg).toMatch(/<text x="8" text-anchor="start" dominant-baseline="auto"[^>]*>right-10<\/text>/)
    expect(svg).toMatch(/<text x="8" text-anchor="start" dominant-baseline="hanging"[^>]*>right-30<\/text>/)
  })

  it.each([
    ["bottom", "rotate(-45)", "12"],
    ["top", "rotate(45)", "-12"],
  ] as const)("rotates crowded %s-axis labels like the live overlay", (orient, rotation, y) => {
    const svg = renderXYWithAxes([
      {
        orient,
        tickValues: [0, 1, 2],
        autoRotate: true,
        tickAnchor: "edges",
        tickFormat: (value) => `A deliberately long tick label ${value}`,
        label: "Long axis",
      },
      { orient: "left", tickValues: [10, 30] },
    ], { size: [180, 180] })

    expect(svg).toContain(`transform="${rotation}"`)
    expect(svg).toContain(`<text y="${y}" text-anchor="end"`)
    expect(svg).toContain("Long axis")
  })

  it("filters crowded primary and paired-right tick labels like the live overlay", () => {
    const svg = renderXYWithAxes([
      {
        orient: "bottom",
        tickValues: [0, 0.1, 0.2, 0.3, 2],
        tickFormat: (value) => `bottom-${value}`,
      },
      {
        orient: "left",
        tickValues: [10, 11, 12, 13, 30],
        tickFormat: (value) => `left-${value}`,
      },
      {
        orient: "right",
        tickValues: [10, 11, 12, 13, 30],
        tickFormat: (value) => `right-${value}`,
      },
    ])

    expect(svg).toContain(">bottom-0<")
    expect(svg).toContain(">bottom-2<")
    expect(svg).not.toContain(">bottom-0.1<")
    expect(svg).toContain(">left-10<")
    expect(svg).toContain(">left-30<")
    expect(svg).not.toContain(">left-11<")
    expect(svg).toContain(">right-10<")
    expect(svg).toContain(">right-30<")
    expect(svg).not.toContain(">right-11<")
  })

  it("retains live includeMax, landmark, and jagged-baseline behavior", () => {
    const withMaxAndLandmarks = renderXYWithAxes([
      {
        orient: "bottom",
        ticks: 5,
        includeMax: true,
        landmarkTicks: (_value, index) => index === 1,
        tickFormat: (value) => `x-${value}`,
      },
      {
        orient: "left",
        ticks: 5,
        includeMax: true,
        landmarkTicks: (_value, index) => index === 1,
        tickFormat: (value) => `left-${value}`,
      },
      {
        orient: "right",
        tickValues: [10, 20, 30],
        landmarkTicks: (_value, index) => index === 1,
        tickFormat: (value) => `right-${value}`,
      },
    ], {
      xExtent: [0, 9],
      yExtent: [0, 9],
      extentPadding: 0,
      showGrid: true,
      data: [{ x: 0, y: 0 }, { x: 9, y: 9 }],
    })
    const jagged = renderXYWithAxes([
      { orient: "bottom", baseline: false, jaggedBase: true },
      { orient: "left", baseline: false, jaggedBase: true },
    ], { chartType: "scatter" })
    const pairedRight = renderXYWithAxes([
      { orient: "bottom" },
      { orient: "left" },
      {
        orient: "right",
        baseline: false,
        jaggedBase: true,
        includeMax: true,
        tickFormat: (value) => `right-${value}`,
      },
    ], {
      xExtent: [0, 9],
      yExtent: [0, 9],
      extentPadding: 0,
      data: [{ x: 0, y: 0 }, { x: 9, y: 9 }],
    })

    expect(withMaxAndLandmarks).toContain(">x-9<")
    expect(withMaxAndLandmarks).toContain(">left-9<")
    // Static grid lines use the same includeMax tick set, rather than the
    // raw d3 candidates that omit the endpoint.
    expect(withMaxAndLandmarks).toMatch(/<line x1="210" y1="0" x2="210" y2="110"/)
    expect(withMaxAndLandmarks).toMatch(/<text[^>]*font-weight="600"[^>]*>x-/)
    expect(withMaxAndLandmarks).toMatch(/<text[^>]*font-weight="600"[^>]*>left-/)
    expect(withMaxAndLandmarks).toMatch(/<text[^>]*font-weight="600"[^>]*>right-20<\/text>/)
    expect(jagged.match(/<path d="M0,[^"]+" fill="none"/g)).toHaveLength(2)
    expect(pairedRight).toContain(">right-9<")
    expect(pairedRight).toMatch(/data-orient="right"><path d="M\d+,0[^"]*" fill="none"/)
  })

  it("uses the live readable default formatter for static time ticks", () => {
    // Construct local calendar dates so the assertion is independent of the
    // runner's UTC offset while still exercising scaleTime's Date ticks.
    const first = new Date(2024, 0, 1)
    const last = new Date(2024, 1, 1)
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [{ x: first, y: 10 }, { x: last, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      xScaleType: "time",
      size: [320, 220],
      axes: [
        { orient: "bottom", tickValues: [first, last] },
        { orient: "left", tickValues: [10, 20] },
      ],
    })

    expect(svg).toContain(">Jan 1<")
    expect(svg).toContain(">Feb 1<")
  })

  it("uses foreignObjects for categoryFormat and legacy oFormat ReactNodes in both ordinal projections", () => {
    const base = {
      chartType: "bar" as const,
      data: [
        { category: "Alpha", value: 10 },
        { category: "Beta", value: 20 },
      ],
      oAccessor: "category",
      rAccessor: "value",
      size: [320, 220] as [number, number],
    }
    const vertical = renderOrdinalToStaticSVG({
      ...base,
      categoryFormat: (category, index) => (
        <span data-testid={`category-format-${index}`}>{category}</span>
      ),
    })
    const horizontal = renderOrdinalToStaticSVG({
      ...base,
      projection: "horizontal",
      oFormat: (category, index) => (
        <span data-testid={`o-format-${index}`}>{category}</span>
      ),
    })

    expect(vertical).toContain('data-testid="category-format-0"')
    expect(vertical).toContain('<foreignObject x="-30" y="6"')
    expect(horizontal).toContain('data-testid="o-format-0"')
    expect(horizontal).toContain('<foreignObject x="-68" y="-12"')
    expect(vertical).not.toMatch(/<text[^>]*><span[^>]*data-testid="category-format/)
    expect(horizontal).not.toMatch(/<text[^>]*><span[^>]*data-testid="o-format/)
  })
})
