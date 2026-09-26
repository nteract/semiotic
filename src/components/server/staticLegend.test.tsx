// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import {
  renderStaticLegend,
  renderStaticLegendGroups,
  renderStaticGradientLegend,
  measureStaticLegend,
  measureStaticLegendGroups,
  extractCategories,
} from "./staticLegend"
import { LIGHT_THEME, DARK_THEME } from "../store/ThemeStore"

function renderLegendString(config: Parameters<typeof renderStaticLegend>[0]): string {
  const node = renderStaticLegend(config)
  if (!node) return ""
  return ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
}

describe("renderStaticLegend", () => {
  const baseConfig = {
    categories: ["A", "B", "C"],
    theme: LIGHT_THEME,
    totalWidth: 600,
    totalHeight: 400,
    margin: { top: 20, right: 20, bottom: 30, left: 40 },
  }

  it.each(["right", "bottom"] as const)("measures a large %s legend without an argument-limit overflow", position => {
    const measured = measureStaticLegend({
      ...baseConfig,
      position,
      categories: Array.from({ length: 150000 }, () => "A"),
      legendLayout: { maxWidth: 1 }
    })
    expect(measured.width).toBe(29)
    expect(measured.height).toBe(150000 * 22)
  })

  it("returns null for empty categories", () => {
    expect(renderStaticLegend({ ...baseConfig, categories: [] })).toBeNull()
  })

  it("renders swatch rects for each category", () => {
    const svg = renderLegendString(baseConfig)
    expect(svg).toContain("semiotic-legend")
    // 3 categories = 3 rect elements
    expect((svg.match(/<rect /g) || []).length).toBe(3)
  })

  it("renders labels for each category", () => {
    const svg = renderLegendString(baseConfig)
    expect(svg).toContain(">A<")
    expect(svg).toContain(">B<")
    expect(svg).toContain(">C<")
  })

  it.each(["right", "left", "top", "bottom"] as const)(
    "preserves item geometry, colors and labels in a %s legend",
    (position) => {
      const svg = renderLegendString({
        ...baseConfig,
        position,
        colorScheme: ["#123456", "#abcdef", "#654321"],
        legendLayout: { swatchSize: 12, rowHeight: 26 }
      })
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      const legend = document.querySelector(".semiotic-legend")!
      const items = Array.from(legend.children).filter(node => node.tagName === "g")
      expect(items.map(item => item.querySelector("text")?.textContent)).toEqual(["A", "B", "C"])
      expect(items.map(item => item.querySelector("rect")?.getAttribute("fill"))).toEqual(["#123456", "#abcdef", "#654321"])
      for (const item of items) {
        expect(item.querySelector("rect")?.getAttribute("width")).toBe("12")
        expect(item.querySelector("rect")?.getAttribute("height")).toBe("12")
        expect(item.querySelector("text")?.getAttribute("y")).toBe("6")
        expect(item.querySelector("text")?.getAttribute("dominant-baseline")).toBe("central")
      }
      const horizontal = position === "top" || position === "bottom"
      expect(legend.querySelectorAll("line")).toHaveLength(horizontal ? 0 : 1)
      expect(items.map(item => item.getAttribute("transform"))).toEqual(horizontal
        ? ["translate(0,0)", "translate(35,0)", "translate(70,0)"]
        : ["translate(0,37)", "translate(0,63)", "translate(0,89)"])
    }
  )

  it("uses the shared client vertical header geometry", () => {
    const svg = renderLegendString(baseConfig)
    expect(svg).toContain('y1="29" x2="100" y2="29"')
    expect(svg).toContain('transform="translate(0,37)"')
  })

  it("uses theme text color for labels", () => {
    const svg = renderLegendString({ ...baseConfig, theme: DARK_THEME })
    expect(svg).toContain(DARK_THEME.colors.text)
  })

  it("uses custom colorScheme array", () => {
    const svg = renderLegendString({
      ...baseConfig,
      colorScheme: ["#ff0000", "#00ff00", "#0000ff"],
    })
    expect(svg).toContain("#ff0000")
    expect(svg).toContain("#00ff00")
    expect(svg).toContain("#0000ff")
  })

  it("positions legend on the right by default", () => {
    const svg = renderLegendString({
      ...baseConfig,
      margin: { ...baseConfig.margin, right: 100 },
    })
    expect(svg).toContain("translate(497,")
  })

  it("positions legend at top", () => {
    const svg = renderLegendString({ ...baseConfig, position: "top" })
    // Top position uses margin.left as tx
    expect(svg).toContain("translate(40,")
  })

  it("matches the client bottom legend placement", () => {
    const svg = renderLegendString({ ...baseConfig, position: "bottom" })
    expect(svg).toContain("translate(40,380)")
  })

  it("positions legend at left", () => {
    const svg = renderLegendString({
      ...baseConfig,
      position: "left",
      margin: { ...baseConfig.margin, left: 100 },
    })
    expect(svg).toContain("translate(3,")
  })

  it("uses legendDistance as the plot-to-legend gap", () => {
    const svg = renderLegendString({
      ...baseConfig,
      margin: { ...baseConfig.margin, right: 140 },
      legendDistance: 24,
    })
    expect(svg).toContain("translate(484,")
  })

  it("matches client placement when side chrome separates plot and legend", () => {
    const right = renderLegendString({
      ...baseConfig,
      margin: { ...baseConfig.margin, right: 183 },
      legendLayout: { sideGutter: 70, edgeGutter: 3 },
    })
    const left = renderLegendString({
      ...baseConfig,
      position: "left",
      margin: { ...baseConfig.margin, left: 183 },
      legendLayout: { sideGutter: 70, edgeGutter: 3 },
    })

    expect(right).toContain("translate(497,")
    expect(left).toContain("translate(3,")
  })

  it("preserves the focus-ring edge gutter for explicitly owned side margins", () => {
    const right = renderLegendString({
      ...baseConfig,
      margin: { ...baseConfig.margin, right: 110 },
      legendLayout: { edgeGutter: 3 },
    })
    const left = renderLegendString({
      ...baseConfig,
      position: "left",
      margin: { ...baseConfig.margin, left: 110 },
      legendLayout: { edgeGutter: 3 },
    })

    expect(right).toContain("translate(497,")
    expect(left).toContain("translate(3,")
  })

  it("uses legendSize when estimating label width", () => {
    const compact = renderLegendString({
      ...baseConfig,
      theme: {
        ...LIGHT_THEME,
        typography: {
          ...LIGHT_THEME.typography,
          tickSize: 10,
          legendSize: 20,
        },
      },
    })
    expect(compact).toContain("font-size=\"20\"")
  })

  it("uses legend typography family and weight from the theme", () => {
    const svg = renderLegendString({
      ...baseConfig,
      theme: {
        ...LIGHT_THEME,
        typography: {
          ...LIGHT_THEME.typography,
          legendFontFamily: "Courier New",
          legendFontWeight: 600,
        },
      },
    })

    expect(svg).toContain('font-family="Courier New"')
    expect(svg).toContain('font-weight="600"')
  })

  it("reports actual horizontal width when a single item exceeds maxWidth", () => {
    const metrics = measureStaticLegend({
      ...baseConfig,
      position: "top",
      categories: ["A very long category name"],
      legendLayout: { maxWidth: 24 },
    })

    expect(metrics.width).toBeGreaterThan(24)
  })

  it("renders horizontal layout for top/bottom positions", () => {
    const svg = renderLegendString({ ...baseConfig, position: "top" })
    // Horizontal layout: items have translate with increasing x offsets
    const matches = svg.match(/translate\(\d+/g)
    expect(matches).toBeTruthy()
    // Multiple different x translations for horizontal items
    if (matches) {
      const xValues = matches.map(m => parseInt(m.replace("translate(", "")))
      const unique = new Set(xValues)
      expect(unique.size).toBeGreaterThan(1)
    }
  })
})

describe("renderStaticLegendGroups", () => {
  const baseConfig = {
    theme: LIGHT_THEME,
    totalWidth: 600,
    totalHeight: 400,
    margin: { top: 20, right: 20, bottom: 30, left: 80 },
    legendGroups: [{
      label: "Group A",
      type: "line" as const,
      styleFn: () => ({ stroke: "#e41a1c" }),
      items: [
        { label: "Alpha" },
        { label: "Beta" },
      ],
    }],
  }

  it("does not render groups without any items, including sparse arrays", () => {
    for (const items of [[], new Array(3)]) {
      expect(renderStaticLegendGroups({
        ...baseConfig,
        legendGroups: [{ ...baseConfig.legendGroups[0], items }]
      })).toBeNull()
    }
  })

  it("measures a large vertical group without an argument-limit overflow", () => {
    const measured = measureStaticLegendGroups({
      ...baseConfig,
      legendGroups: [{
        ...baseConfig.legendGroups[0],
        label: "",
        items: Array.from({ length: 150000 }, () => ({ label: "A" }))
      }]
    })
    expect(measured.width).toBe(29)
    // Shared vertical geometry includes the 37px header and 8px trailing gap.
    expect(measured.height).toBe(45 + 150000 * 22)
  })

  it.each(["right", "left", "top", "bottom"] as const)(
    "preserves group headers, swatches and separators in a %s legend",
    (position) => {
      const node = renderStaticLegendGroups({
        ...baseConfig,
        position,
        legendGroups: [baseConfig.legendGroups[0], {
          label: "Group B",
          type: "fill",
          styleFn: () => ({ fill: "#125678" }),
          items: [{ label: "Gamma" }]
        }]
      })
      const svg = ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      const legend = document.querySelector(".semiotic-legend")!
      const horizontal = position === "top" || position === "bottom"
      expect(legend.getAttribute("data-orientation")).toBe(horizontal ? "horizontal" : "vertical")
      expect(Array.from(legend.querySelectorAll("text"), label => label.textContent)).toEqual([
        "Group A", "Alpha", "Beta", "Group B", "Gamma"
      ])
      const headers = Array.from(legend.querySelectorAll("text")).filter(label => label.textContent?.startsWith("Group"))
      expect(headers.filter(label => label.getAttribute("transform")?.includes("rotate(90)"))).toHaveLength(horizontal ? 2 : 0)
      expect(legend.querySelectorAll("rect")).toHaveLength(1)
      expect(legend.querySelector("rect")?.getAttribute("style")).toContain("fill:#125678")
      // Two diagonal line swatches plus one horizontal separator or two neatlines.
      expect(legend.querySelectorAll("line")).toHaveLength(horizontal ? 3 : 4)
    }
  )

  it("includes group labels in measurement and output", () => {
    const grouped = measureStaticLegendGroups(baseConfig)
    const flat = measureStaticLegend({
      ...baseConfig,
      categories: ["Alpha", "Beta"],
    })
    const svg = ReactDOMServer.renderToStaticMarkup(<svg>{renderStaticLegendGroups(baseConfig)}</svg>)

    expect(grouped.height).toBeGreaterThan(flat.height)
    expect(svg).toContain(">Group A<")
  })

  it("accounts for rotated group label length in horizontal measurement", () => {
    const grouped = measureStaticLegendGroups({
      ...baseConfig,
      position: "top",
      legendGroups: [{
        ...baseConfig.legendGroups[0],
        label: "Long Rotated Group Label",
      }],
    })

    expect(grouped.height).toBeGreaterThan(60)
  })

  it("matches the client diagonal line glyph", () => {
    const node = renderStaticLegendGroups(baseConfig)
    const svg = ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
    expect(svg).toContain('x1="0" y1="0" x2="16" y2="16"')
  })

  it("matches client neatlines and offsets for multiple vertical groups", () => {
    const node = renderStaticLegendGroups({
      ...baseConfig,
      theme: DARK_THEME,
      legendGroups: [
        baseConfig.legendGroups[0],
        { ...baseConfig.legendGroups[0], label: "Group B" },
      ],
    })
    const svg = ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
    expect(svg).toContain('y1="29" x2="100" y2="29" stroke="gray"')
    expect(svg).toContain('transform="translate(0,61)"')
    expect(svg).toContain('y1="118" x2="100" y2="118" stroke="gray"')
    expect(svg).toContain(DARK_THEME.colors.text)
  })
})

describe("renderStaticGradientLegend", () => {
  it("namespaces generated gradient ids", () => {
    const node = renderStaticGradientLegend({
      theme: LIGHT_THEME,
      position: "right",
      totalWidth: 600,
      totalHeight: 400,
      margin: { top: 20, right: 100, bottom: 30, left: 40 },
      idPrefix: "chart-2",
      gradient: {
        domain: [0, 1],
        colorFn: (value) => value > 0.5 ? "#08519c" : "#deebf7",
      },
    })
    const svg = ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
    expect(svg).toContain('id="chart-2-semiotic-static-gradient-legend"')
    expect(svg).toContain('fill="url(#chart-2-semiotic-static-gradient-legend)"')
  })

  it.each(["right", "left", "top", "bottom"] as const)(
    "keeps labeled %s legend geometry non-negative within its layout group",
    (position) => {
      const node = renderStaticGradientLegend({
        theme: LIGHT_THEME,
        position,
        totalWidth: 600,
        totalHeight: 400,
        margin: { top: 70, right: 130, bottom: 80, left: 130 },
        gradient: {
          domain: [0, 1],
          colorFn: () => "#08519c",
          label: "Probability",
        },
      })
      const svg = ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)

      expect(svg).not.toMatch(/<text[^>]* y="-/)
      expect(svg).not.toMatch(/<rect[^>]* y="-/)
    }
  )
})

describe("extractCategories", () => {
  it("returns empty array for empty data", () => {
    expect(extractCategories([], "category")).toEqual([])
  })

  it("returns empty array for undefined accessor", () => {
    expect(extractCategories([{ a: 1 }], undefined)).toEqual([])
  })

  it("extracts unique categories with string accessor", () => {
    const data = [
      { category: "A", value: 1 },
      { category: "B", value: 2 },
      { category: "A", value: 3 },
    ]
    expect(extractCategories(data, "category")).toEqual(["A", "B"])
  })

  it("extracts unique categories with function accessor", () => {
    const data = [{ x: 1, group: "X" }, { x: 2, group: "Y" }, { x: 3, group: "X" }]
    expect(extractCategories(data, (d) => d.group)).toEqual(["X", "Y"])
  })

  it("skips null/undefined values", () => {
    const data = [{ c: "A" }, { c: null }, { c: "B" }, { c: undefined }]
    expect(extractCategories(data, "c")).toEqual(["A", "B"])
  })
})
