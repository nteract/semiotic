import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  xySceneNodeToSVG,
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG,
  ordinalSceneNodeToSVG
} from "./SceneToSVG"

/** Helper: render a React element to static markup string for assertions */
function markup(el: React.ReactNode): string {
  if (!el) return ""
  return renderToStaticMarkup(<svg>{el}</svg>)
}

// ── xySceneNodeToSVG ──────────────────────────────────────────────────

describe("xySceneNodeToSVG — line", () => {
  it("renders a path with correct d attribute", () => {
    const node: any = {
      type: "line",
      path: [[0, 0], [50, 25], [100, 50]],
      style: { stroke: "#f00", strokeWidth: 3 }
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain('d="M0,0L50,25L100,50"')
    expect(html).toContain('stroke="#f00"')
    expect(html).toContain('stroke-width="3"')
    expect(html).toContain('fill="none"')
  })

  it("returns null for empty path", () => {
    const node: any = { type: "line", path: [], style: {} }
    expect(xySceneNodeToSVG(node, 0)).toBeNull()
  })

  it("uses default stroke when not specified", () => {
    const node: any = { type: "line", path: [[0, 0], [10, 10]], style: {} }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('stroke="#4e79a7"')
  })

  it("includes strokeDasharray when set", () => {
    const node: any = { type: "line", path: [[0, 0], [10, 10]], style: { strokeDasharray: "5,3" } }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('stroke-dasharray="5,3"')
  })
})

describe("xySceneNodeToSVG — point", () => {
  it("renders a circle with correct attributes", () => {
    const node: any = {
      type: "point",
      x: 42,
      y: 84,
      r: 5,
      style: { fill: "#0f0", opacity: 0.5, stroke: "#000", strokeWidth: 1 }
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<circle")
    expect(html).toContain('cx="42"')
    expect(html).toContain('cy="84"')
    expect(html).toContain('r="5"')
    expect(html).toContain('fill="#0f0"')
    expect(html).toContain('opacity="0.5"')
  })

})

describe("xySceneNodeToSVG — symbol", () => {
  it("renders a translated glyph path (the cross-pipeline symbol mark)", () => {
    const node: any = {
      type: "symbol",
      x: 42,
      y: 84,
      size: 120,
      symbolType: "star",
      style: { fill: "#7b52c9", opacity: 0.9 },
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain("translate(42,84)")
    expect(html).toContain('fill="#7b52c9"')
    expect(html).toContain('d="M')
  })

  it("renders stroke-only glyphs unfilled (matches canvas)", () => {
    const node: any = {
      type: "symbol",
      x: 1,
      y: 2,
      size: 80,
      symbolType: "triangle",
      style: { stroke: "#fff", strokeWidth: 1 },
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('fill="none"')
  })
})

describe("ordinalSceneNodeToSVG — symbol", () => {
  it("renders a glyph path for ordinal symbolBy marks", () => {
    const node: any = {
      type: "symbol",
      x: 10,
      y: 20,
      size: 100,
      symbolType: "diamond",
      style: { fill: "#abc" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain("translate(10,20)")
    expect(html).toContain('fill="#abc"')
  })
})

describe("xySceneNodeToSVG — rect", () => {
  it("renders a rect with correct attributes", () => {
    const node: any = {
      type: "rect",
      x: 10,
      y: 20,
      w: 30,
      h: 40,
      style: { fill: "blue", stroke: "black", strokeWidth: 2, opacity: 0.9 }
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<rect")
    expect(html).toContain('x="10"')
    expect(html).toContain('y="20"')
    expect(html).toContain('width="30"')
    expect(html).toContain('height="40"')
    expect(html).toContain('fill="blue"')
    expect(html).toContain('opacity="0.9"')
  })

})

describe("ordinalSceneNodeToSVG — rect gradientFill", () => {
  it("emits a <linearGradient> and fill=\"url(#id)\" when fillGradient.colorStops is set", () => {
    const node: any = {
      type: "rect",
      x: 10, y: 20, w: 30, h: 40,
      roundedEdge: "top",
      style: { fill: "blue" },
      fillGradient: {
        colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ],
      },
      datum: { category: "A" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<linearGradient")
    expect(html).toContain('gradientUnits="userSpaceOnUse"')
    expect(html).toContain('x1="10"')
    expect(html).toContain('y1="20"')
    expect(html).toContain('x2="10"')
    expect(html).toContain('y2="60"')  // y + h = 20 + 40
    expect(html).toContain('stop-color="#ff0000"')
    expect(html).toContain('stop-color="#0000ff"')
    expect(html).toContain('fill="url(#')
  })

  it("emits stop-opacity stops for the { topOpacity, bottomOpacity } form", () => {
    const node: any = {
      type: "rect",
      x: 0, y: 0, w: 20, h: 50,
      roundedEdge: "top",
      style: { fill: "#3366cc" },
      fillGradient: { topOpacity: 0.8, bottomOpacity: 0.05 },
      datum: { category: "B" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain('stop-color="#3366cc"')
    expect(html).toContain('stop-opacity="0.8"')
    expect(html).toContain('stop-opacity="0.05"')
  })

  it("falls back to solid fill when fillGradient has < 2 colorStops", () => {
    const node: any = {
      type: "rect",
      x: 0, y: 0, w: 20, h: 50,
      style: { fill: "#abcdef" },
      fillGradient: { colorStops: [{ offset: 0, color: "#ff0000" }] },
      datum: { category: "C" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).not.toContain("<linearGradient")
    expect(html).toContain('fill="#abcdef"')
  })

  it("falls back to solid fill when NaN offsets leave < 2 valid stops", () => {
    const node: any = {
      type: "rect",
      x: 0, y: 0, w: 20, h: 50,
      style: { fill: "#abcdef" },
      fillGradient: { colorStops: [
        { offset: NaN, color: "#ff0000" },
        { offset: 1, color: "#0000ff" },
      ]},
      datum: { category: "E" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).not.toContain("<linearGradient")
    expect(html).toContain('fill="#abcdef"')
  })

  it("sanitizes category names with spaces/punctuation in the gradient id", () => {
    const node: any = {
      type: "rect",
      x: 10, y: 20, w: 30, h: 40,
      roundedEdge: "top",
      style: { fill: "blue" },
      fillGradient: { colorStops: [
        { offset: 0, color: "#ff0000" },
        { offset: 1, color: "#0000ff" },
      ]},
      datum: { category: "Q1 2026 (revenue)" },
      category: "Q1 2026 (revenue)",
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    // The raw category never appears inside the id/url — only the sanitized form.
    expect(html).not.toMatch(/id="[^"]* [^"]*"/)  // no spaces in id
    expect(html).not.toMatch(/url\(#[^)]* [^)]*\)/)  // no spaces in url(#...)
    // Both the linearGradient id and the fill reference land on the same
    // sanitized string — otherwise the gradient would fail to resolve.
    const idMatch = html.match(/id="([^"]+-grad)"/)
    expect(idMatch).toBeTruthy()
    expect(html).toContain(`url(#${idMatch![1]})`)
  })

  it("flips gradient direction for horizontal (roundedEdge=right) bars", () => {
    const node: any = {
      type: "rect",
      x: 10, y: 20, w: 80, h: 20,
      roundedEdge: "right",
      style: { fill: "blue" },
      fillGradient: { colorStops: [
        { offset: 0, color: "#ff0000" },
        { offset: 1, color: "#0000ff" },
      ]},
      datum: { category: "D" },
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    // Tip (right) at x+w=90 → base at x=10, y stays at 20.
    expect(html).toContain('x1="90"')
    expect(html).toContain('y1="20"')
    expect(html).toContain('x2="10"')
    expect(html).toContain('y2="20"')
  })
})

describe("ordinalSceneNodeToSVG — wedge _gradientBand", () => {
  it("emits a clipPath of the rounded outline + N unrounded slice paths", () => {
    // Gauge gradient mode renders the band as ONE rounded wedge whose
    // outline drives a clipPath, and paints N slices inside as plain
    // unrounded sectors. The clip mask handles the rounded ends so no
    // individual slice needs to fit its corner radius into its own
    // (thin) angular extent.
    const node: any = {
      type: "wedge",
      cx: 100,
      cy: 100,
      innerRadius: 40,
      outerRadius: 80,
      startAngle: Math.PI * 0.75,
      endAngle: Math.PI * 1.5,
      cornerRadius: 14,
      roundedEnds: { start: true, end: true },
      _gradientBand: { colors: ["#ef4444", "#f59e0b", "#fbbf24", "#3b82f6"] },
      style: {},
      datum: null,
      category: "band",
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<clipPath")
    expect(html).toContain('transform="translate(100,100)"')
    // One <path> per gradient color, each filled with that color.
    expect(html).toContain('fill="#ef4444"')
    expect(html).toContain('fill="#f59e0b"')
    expect(html).toContain('fill="#fbbf24"')
    expect(html).toContain('fill="#3b82f6"')
    // The clipPath group references the clipPath id.
    expect(html).toMatch(/clip-path="url\(#gauge-grad-[^"]+\)"/)
  })

  it("strokes the rounded outline when style.stroke is set", () => {
    const node: any = {
      type: "wedge",
      cx: 0, cy: 0,
      innerRadius: 30, outerRadius: 60,
      startAngle: 0, endAngle: Math.PI,
      cornerRadius: 10,
      roundedEnds: { start: true, end: true },
      _gradientBand: { colors: ["#ef4444", "#3b82f6"] },
      style: { stroke: "#222", strokeWidth: 2 },
      datum: null,
      category: "stroked",
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain('stroke="#222"')
    expect(html).toContain('stroke-width="2"')
    expect(html).toContain('fill="none"')  // the stroke-only outline path
  })

  it("omits the outline stroke when style.stroke is unset or 'none'", () => {
    const node: any = {
      type: "wedge",
      cx: 0, cy: 0,
      innerRadius: 30, outerRadius: 60,
      startAngle: 0, endAngle: Math.PI,
      roundedEnds: { start: true, end: true },
      _gradientBand: { colors: ["#ef4444"] },
      style: { stroke: "none" },
      datum: null,
      category: "nostroke",
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).not.toContain('fill="none"')
  })

  it("renders the band even when cornerRadius is unset (clip becomes a square sector)", () => {
    const node: any = {
      type: "wedge",
      cx: 0,
      cy: 0,
      innerRadius: 30,
      outerRadius: 60,
      startAngle: 0,
      endAngle: Math.PI,
      roundedEnds: { start: true, end: true },
      _gradientBand: { colors: ["#000", "#fff"] },
      style: {},
      datum: null,
      category: "noround",
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    // Still emits clipPath + slice paths — the rounding just degrades.
    expect(html).toContain("<clipPath")
    expect(html).toContain('fill="#000"')
    expect(html).toContain('fill="#fff"')
  })
})

describe("xySceneNodeToSVG — area", () => {
  it("renders a closed path from topPath and bottomPath", () => {
    const node: any = {
      type: "area",
      topPath: [[0, 10], [50, 5], [100, 15]],
      bottomPath: [[0, 50], [50, 50], [100, 50]],
      style: { fill: "#abc", fillOpacity: 0.6 }
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    // top path forward, bottom path reversed, closed with Z
    expect(html).toContain("M0,10L50,5L100,15")
    expect(html).toContain("100,50L50,50L0,50Z")
    expect(html).toContain('fill="#abc"')
    expect(html).toContain('fill-opacity="0.6"')
  })

  it("returns null for empty topPath", () => {
    const node: any = { type: "area", topPath: [], bottomPath: [], style: {} }
    expect(xySceneNodeToSVG(node, 0)).toBeNull()
  })

  it("defaults fillOpacity from style.opacity when fillOpacity absent", () => {
    const node: any = {
      type: "area",
      topPath: [[0, 0], [10, 10]],
      bottomPath: [[0, 20], [10, 20]],
      style: { opacity: 0.3 }
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('fill-opacity="0.3"')
  })

  it("defaults fillOpacity to 0.7 when neither fillOpacity nor opacity set", () => {
    const node: any = {
      type: "area",
      topPath: [[0, 0], [10, 10]],
      bottomPath: [[0, 20], [10, 20]],
      style: {}
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('fill-opacity="0.7"')
  })
})

describe("xySceneNodeToSVG — heatcell", () => {
  it("renders a rect with fill color", () => {
    const node: any = {
      type: "heatcell",
      x: 5,
      y: 10,
      w: 15,
      h: 20,
      fill: "rgb(255,0,0)"
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain("<rect")
    expect(html).toContain('x="5"')
    expect(html).toContain('y="10"')
    expect(html).toContain('width="15"')
    expect(html).toContain('height="20"')
    expect(html).toContain('fill="rgb(255,0,0)"')
  })
})

describe("xySceneNodeToSVG — candlestick", () => {
  it("renders wick line and body rect", () => {
    const node: any = {
      type: "candlestick",
      x: 50,
      openY: 30,
      closeY: 20,
      highY: 10,
      lowY: 40,
      bodyWidth: 8,
      upColor: "green",
      downColor: "red",
      wickColor: "#333",
      wickWidth: 1,
      isUp: true
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    // Wick line
    expect(html).toContain("<line")
    expect(html).toContain('y1="10"')
    expect(html).toContain('y2="40"')
    // Body rect colored green (isUp)
    expect(html).toContain('fill="green"')
  })

  it("uses downColor when isUp is false", () => {
    const node: any = {
      type: "candlestick",
      x: 50,
      openY: 20,
      closeY: 30,
      highY: 10,
      lowY: 40,
      bodyWidth: 8,
      upColor: "green",
      downColor: "red",
      wickColor: "#333",
      wickWidth: 1,
      isUp: false
    }
    const html = markup(xySceneNodeToSVG(node, 0))
    expect(html).toContain('fill="red"')
  })
})

describe("xySceneNodeToSVG — unknown type", () => {
  it("returns null for unknown node types", () => {
    const node: any = { type: "sparkline", style: {} }
    expect(xySceneNodeToSVG(node, 0)).toBeNull()
  })
})

// ── networkSceneNodeToSVG ───────────────────────────────────────────────

describe("networkSceneNodeToSVG", () => {
  it("renders circle node", () => {
    const node: any = {
      type: "circle",
      cx: 100,
      cy: 200,
      r: 12,
      style: { fill: "orange", stroke: "#000", strokeWidth: 2, opacity: 0.9 }
    }
    const html = markup(networkSceneNodeToSVG(node, 0))
    expect(html).toContain("<circle")
    expect(html).toContain('cx="100"')
    expect(html).toContain('cy="200"')
    expect(html).toContain('r="12"')
    expect(html).toContain('fill="orange"')
  })

  it("renders rect node", () => {
    const node: any = {
      type: "rect",
      x: 10,
      y: 20,
      w: 30,
      h: 60,
      style: { fill: "steelblue" }
    }
    const html = markup(networkSceneNodeToSVG(node, 0))
    expect(html).toContain("<rect")
    expect(html).toContain('width="30"')
    expect(html).toContain('height="60"')
  })

  it("renders arc node with d3-arc path and transform", () => {
    const node: any = {
      type: "arc",
      cx: 150,
      cy: 150,
      innerR: 80,
      outerR: 100,
      startAngle: 0,
      endAngle: Math.PI / 2,
      style: { fill: "purple" }
    }
    const html = markup(networkSceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain('transform="translate(150,150)"')
    expect(html).toContain('fill="purple"')
    // d3-arc produces an actual path string
    expect(html).toContain('d="M')
  })

})

// ── networkSceneEdgeToSVG ───────────────────────────────────────────────

describe("networkSceneEdgeToSVG", () => {
  it("renders line edge", () => {
    const edge: any = {
      type: "line",
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
      style: { stroke: "#ccc", strokeWidth: 2 }
    }
    const html = markup(networkSceneEdgeToSVG(edge, 0))
    expect(html).toContain("<line")
    expect(html).toContain('x1="0"')
    expect(html).toContain('x2="100"')
    expect(html).toContain('stroke="#ccc"')
  })

  it("renders bezier edge path", () => {
    const edge: any = {
      type: "bezier",
      pathD: "M0,0 C10,10 20,20 30,30",
      style: { fill: "#aaa", fillOpacity: 0.5 }
    }
    const html = markup(networkSceneEdgeToSVG(edge, 0))
    expect(html).toContain("<path")
    expect(html).toContain('d="M0,0 C10,10 20,20 30,30"')
    expect(html).toContain('fill="#aaa"')
  })

  it("renders ribbon edge path", () => {
    const edge: any = {
      type: "ribbon",
      pathD: "M10,10 Q50,50 90,10",
      style: { fill: "#bbb" }
    }
    const html = markup(networkSceneEdgeToSVG(edge, 0))
    expect(html).toContain("<path")
    expect(html).toContain('fill="#bbb"')
  })

  it("renders curved edge path", () => {
    const edge: any = {
      type: "curved",
      pathD: "M0,0 C25,50 75,50 100,0",
      style: { stroke: "teal", strokeWidth: 1.5 }
    }
    const html = markup(networkSceneEdgeToSVG(edge, 0))
    expect(html).toContain("<path")
    expect(html).toContain('stroke="teal"')
  })

  it("returns null for unknown edge type", () => {
    const edge: any = { type: "dashed", style: {} }
    expect(networkSceneEdgeToSVG(edge, 0)).toBeNull()
  })
})

// ── networkLabelToSVG ───────────────────────────────────────────────────

describe("networkLabelToSVG", () => {
  it("renders text element with all attributes", () => {
    const label: any = {
      x: 100,
      y: 200,
      text: "Node A",
      anchor: "start",
      baseline: "hanging",
      fontSize: 14,
      fontWeight: "bold",
      fill: "#222"
    }
    const html = markup(networkLabelToSVG(label, 0))
    expect(html).toContain("<text")
    expect(html).toContain('x="100"')
    expect(html).toContain('y="200"')
    expect(html).toContain("Node A")
    expect(html).toContain('text-anchor="start"')
    expect(html).toContain('font-size="14"')
  })

  it("uses defaults when optional props missing", () => {
    const label: any = { x: 10, y: 20, text: "Hi" }
    const html = markup(networkLabelToSVG(label, 0))
    expect(html).toContain('text-anchor="middle"')
    expect(html).toContain('font-size="11"')
    // Labels default to the themeable CSS var (falls back to #333) so cascade
    // theming (e.g. --semiotic-text on the container) reaches them.
    expect(html).toContain('fill="var(--semiotic-text, #333)"')
  })
})

// ── ordinalSceneNodeToSVG ───────────────────────────────────────────────

describe("ordinalSceneNodeToSVG", () => {
  it("renders rect (bar)", () => {
    const node: any = {
      type: "rect",
      x: 5,
      y: 10,
      w: 25,
      h: 80,
      style: { fill: "coral", opacity: 0.8 }
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<rect")
    expect(html).toContain('fill="coral"')
    expect(html).toContain('opacity="0.8"')
  })

  it("renders point (swarm)", () => {
    const node: any = {
      type: "point",
      x: 50,
      y: 60,
      r: 4,
      style: { fill: "pink" }
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<circle")
    expect(html).toContain('cx="50"')
    expect(html).toContain('r="4"')
  })

  it("renders wedge (pie/donut) with d3-arc", () => {
    const node: any = {
      type: "wedge",
      cx: 100,
      cy: 100,
      innerRadius: 0,
      outerRadius: 80,
      startAngle: 0,
      endAngle: Math.PI,
      style: { fill: "gold" }
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain('transform="translate(100,100)"')
    expect(html).toContain('fill="gold"')
  })

  it("renders vertical boxplot with whiskers and median line", () => {
    const node: any = {
      type: "boxplot",
      x: 50,
      y: 0,
      projection: "vertical",
      columnWidth: 20,
      minPos: 90,
      q1Pos: 70,
      medianPos: 50,
      q3Pos: 30,
      maxPos: 10,
      stats: { min: 1, q1: 3, median: 5, q3: 7, max: 9 },
      style: { fill: "#4e79a7" },
      datum: {}
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    // Should have the group with lines and rect
    expect(html).toContain("<g")
    expect(html).toContain("<line")
    expect(html).toContain("<rect")
    // Median line stroke-width=2
    expect(html).toContain('stroke-width="2"')
  })

  it("renders horizontal boxplot", () => {
    const node: any = {
      type: "boxplot",
      x: 0,
      y: 50,
      projection: "horizontal",
      columnWidth: 20,
      minPos: 10,
      q1Pos: 30,
      medianPos: 50,
      q3Pos: 70,
      maxPos: 90,
      stats: {},
      style: { fill: "teal" },
      datum: {}
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<g")
    expect(html).toContain('fill="teal"')
  })

  it("renders violin with path", () => {
    const node: any = {
      type: "violin",
      pathString: "M0,0 C10,10 20,20 0,30 Z",
      translateX: 50,
      translateY: 10,
      style: { fill: "orchid" },
      datum: {}
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<path")
    expect(html).toContain('d="M0,0 C10,10 20,20 0,30 Z"')
    expect(html).toContain('transform="translate(50,10)"')
    expect(html).toContain('fill="orchid"')
  })

  it("renders violin with IQR overlay (vertical)", () => {
    const node: any = {
      type: "violin",
      pathString: "M0,0 Z",
      translateX: 0,
      translateY: 0,
      iqrLine: { q1Pos: 70, medianPos: 50, q3Pos: 30, centerPos: 50, isVertical: true },
      bounds: { x: 40, y: 10, width: 20, height: 80 },
      style: {},
      datum: {}
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    // IQR line + median circle
    expect(html).toContain("<line")
    expect(html).toContain("<circle")
    expect(html).toContain('r="3"')
    expect(html).toContain('fill="white"')
  })

  it("renders connector line", () => {
    const node: any = {
      type: "connector",
      x1: 10,
      y1: 20,
      x2: 30,
      y2: 40,
      style: { stroke: "#999", strokeWidth: 1 }
    }
    const html = markup(ordinalSceneNodeToSVG(node, 0))
    expect(html).toContain("<line")
    expect(html).toContain('x1="10"')
    expect(html).toContain('y1="20"')
    expect(html).toContain('x2="30"')
    expect(html).toContain('y2="40"')
  })

})
