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
    expect(html).toContain('fill="#333"')
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
