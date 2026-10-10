import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import sharp from "sharp"
import { renderChart, renderDashboard } from "./renderToStaticSVG"
import { generateFrameSequence } from "./animatedGif"

const bars = {
  data: [
    { category: "A", value: 3 },
    { category: "B", value: 5 }
  ],
  categoryAccessor: "category",
  valueAccessor: "value",
  height: 180,
  showAxes: false,
  showGrid: false
}

function parse(svg: string) {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(document.querySelector("parsererror")).toBeNull()
  return document
}

describe("standalone SVG portability", () => {
  it("paints native dashboard charts in both cells when rasterized", async () => {
    const svg = renderDashboard(
      [
        { component: "BarChart", props: bars },
        { component: "BarChart", props: bars }
      ],
      {
        width: 600,
        background: "#fff",
        subtitle: "Two comparisons",
        layout: { gap: 0 }
      }
    )
    const document = parse(svg)
    expect(document.querySelectorAll("foreignObject")).toHaveLength(0)
    expect(document.querySelectorAll("svg svg")).toHaveLength(2)
    expect(document.querySelector("desc")?.textContent).toBe("Two comparisons")
    const { data, info } = await sharp(Buffer.from(svg))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (const [left, right] of [
      [0, 300],
      [300, 600]
    ]) {
      let coloredPixels = 0
      for (let y = 50; y < info.height; y++) {
        for (let x = left; x < right; x++) {
          const offset = (y * info.width + x) * info.channels
          if (
            Math.max(data[offset], data[offset + 1], data[offset + 2]) -
              Math.min(data[offset], data[offset + 1], data[offset + 2]) >
            40
          )
            coloredPixels++
        }
      }
      expect(coloredPixels).toBeGreaterThan(1000)
    }
  })

  it("rejects malformed dimensions in dashboard and GIF fallback SVGs", () => {
    const hostile = '1"><script>injected</script>'
    const dashboard = parse(
      renderDashboard([{ props: { height: hostile } }], {
        width: NaN,
        layout: { columns: -2, gap: Infinity }
      })
    )
    expect(dashboard.querySelector("script")).toBeNull()
    expect(Number(dashboard.documentElement.getAttribute("width"))).toBe(1200)
    expect(
      Number(dashboard.documentElement.getAttribute("height"))
    ).toBeGreaterThan(0)
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const [svg] = generateFrameSequence("UnknownChart", [
        { width: hostile, height: Infinity }
      ])
      const frame = parse(svg)
      expect(frame.querySelector("script")).toBeNull()
      expect(frame.documentElement.getAttribute("width")).toBe("600")
      expect(frame.documentElement.getAttribute("height")).toBe("400")
    } finally {
      warning.mockRestore()
    }
  })

  it.each(["Total", 0])(
    "renders the donut center %s as native SVG text",
    (centerContent) => {
      const document = parse(
        renderChart("DonutChart", { ...bars, centerContent })
      )
      expect(document.querySelector("foreignObject")).toBeNull()
      expect(
        [...document.querySelectorAll("text")].some(
          (node) => node.textContent === String(centerContent)
        )
      ).toBe(true)
    }
  )

  it("places arbitrary center, tick and widget HTML in the XHTML namespace", () => {
    const svgs = [
      renderChart("DonutChart", { ...bars, centerContent: <span>Total</span> }),
      renderChart("LineChart", {
        data: [
          { x: 0, y: 0 },
          { x: 1, y: 1 }
        ],
        xFormat: (value: number) => <span>{value}</span>
      }),
      renderChart("LineChart", {
        data: [
          { x: 0, y: 0 },
          { x: 1, y: 1 }
        ],
        annotations: [
          { type: "widget", x: 0.5, y: 0.5, content: <span>Info</span> }
        ]
      })
    ]
    for (const svg of svgs) {
      const objects = parse(svg).querySelectorAll("foreignObject")
      expect(objects.length).toBeGreaterThan(0)
      for (const object of objects) {
        expect(object.firstElementChild?.namespaceURI).toBe(
          "http://www.w3.org/1999/xhtml"
        )
        expect(object.querySelector("span")?.namespaceURI).toBe(
          "http://www.w3.org/1999/xhtml"
        )
      }
    }
  })
})
