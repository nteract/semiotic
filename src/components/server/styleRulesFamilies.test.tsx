import { describe, it, expect } from "vitest"
import { renderChart } from "./renderToStaticSVG"

describe("styleRules across families (server / renderChart)", () => {
  it("XY Scatterplot — recolors points by an axis threshold", () => {
    const svg = renderChart("Scatterplot", {
      data: [
        { x: 2, y: 4 },
        { x: 6, y: 9 },
        { x: 9, y: 18 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: { axis: "y", gte: 15 }, style: { fill: "#d7263d" } }]
    })
    expect(svg).toContain("#d7263d")
  })

  it("XY Scatterplot — preserves declarative cursor metadata in static output", () => {
    const svg = renderChart("Scatterplot", {
      data: [{ x: 2, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: true, style: { cursor: "pointer" } }]
    })

    expect(svg).toContain('data-semiotic-mark-cursor="pointer"')
    expect(svg).toContain('style="cursor:pointer"')
  })

  it("XY AreaChart — preserves authored cursor hit radius and its default", () => {
    const config = {
      data: [{ x: 0, y: 10 }, { x: 1, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: true, style: { cursor: "pointer" } }]
    }
    const target = (svg: string) =>
      svg.match(/<path[^>]*data-semiotic-cursor-hit-target="area-top-path"[^>]*>/)?.[0]

    expect(target(renderChart("AreaChart", { ...config, hoverRadius: 7 }))).toContain(
      'stroke-width="14"'
    )
    expect(target(renderChart("AreaChart", config))).toContain('stroke-width="60"')
  })

  it("Ordinal FunnelChart — renders grouped connector fills in static SVG", () => {
    const svg = renderChart("FunnelChart", {
      data: [
        { step: "Visit", value: 100, flow: "all" },
        { step: "Trial", value: 60, flow: "all" },
        { step: "Paid", value: 25, flow: "all" }
      ],
      stepAccessor: "step",
      valueAccessor: "value",
      connectorAccessor: "flow",
      connectorStyle: { fill: "#c44", cursor: "pointer" }
    })

    expect(svg).toContain('data-semiotic-connector-fill="all"')
    expect(svg).toContain('fill="#c44"')
    expect(svg).toContain('data-semiotic-mark-cursor="pointer"')
  })

  it("XY Scatterplot — top-level primitives override declarative rules", () => {
    const svg = renderChart("Scatterplot", {
      data: [{ x: 2, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
      stroke: "#010203",
      strokeWidth: 2,
      styleRules: [
        {
          when: true,
          style: { stroke: "#d7263d", strokeWidth: 9 }
        }
      ]
    })
    const point = svg.match(/<circle[^>]*>/)?.[0]
    expect(point).toContain('stroke="#010203"')
    expect(point).toContain('stroke-width="2"')
    expect(point).not.toContain("#d7263d")
  })

  it("XY Scatterplot — hatches points over a threshold (SSR <pattern>)", () => {
    const svg = renderChart("Scatterplot", {
      data: [
        { x: 2, y: 4 },
        { x: 9, y: 18 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [
        {
          when: { axis: "y", gt: 10 },
          style: {
            fill: { type: "hatch", background: "#ffd166", stroke: "#e0a92a" }
          }
        }
      ]
    })
    expect(svg).toContain("<pattern")
    expect(svg).toContain("#e0a92a")
  })

  it("XY BubbleChart — applies declarative rules after its size/color defaults", () => {
    const svg = renderChart("BubbleChart", {
      data: [
        { x: 2, y: 4, size: 5 },
        { x: 9, y: 18, size: 10 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      sizeBy: "size",
      styleRules: [{ when: { axis: "y", gt: 10 }, style: { fill: "#d7263d" } }]
    })
    expect(svg).toContain("#d7263d")
  })

  it("XY ConnectedScatterplot — applies declarative per-point rules", () => {
    const svg = renderChart("ConnectedScatterplot", {
      data: [
        { x: 2, y: 4 },
        { x: 9, y: 18 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [{ when: { axis: "y", gt: 10 }, style: { fill: "#d7263d" } }]
    })
    expect(svg).toContain("#d7263d")
  })

  it("XY LineChart — recolors a series by a threshold (per-series)", () => {
    const svg = renderChart("LineChart", {
      data: [
        { x: 1, y: 40 },
        { x: 2, y: 55 },
        { x: 3, y: 70 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: [
        { when: { axis: "y", gte: 40 }, style: { stroke: "#d7263d" } }
      ]
    })
    expect(svg).toContain("#d7263d")
  })

  it("Network ForceDirectedGraph — styles a group of nodes", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [
        { id: "a", kind: "db" },
        { id: "b", kind: "svc" },
        { id: "c", kind: "db" }
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" }
      ],
      styleRules: [
        { when: { field: "kind", eq: "db" }, style: { fill: "#8b5cf6" } }
      ]
    })
    expect(svg).toContain("#8b5cf6")
  })

  it("Network ForceDirectedGraph — hatches a node group in SSR (<pattern>)", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes: [
        { id: "a", kind: "db" },
        { id: "b", kind: "svc" }
      ],
      edges: [{ source: "a", target: "b" }],
      styleRules: [
        {
          when: { field: "kind", eq: "db" },
          style: {
            fill: { type: "hatch", background: "#8b5cf6", stroke: "#fff" }
          }
        }
      ]
    })
    expect(svg).toContain("<pattern")
  })

  it("Network ChordDiagram — rules override its generated palette in SSR", () => {
    const svg = renderChart("ChordDiagram", {
      nodes: [
        { id: "a", kind: "db" },
        { id: "b", kind: "svc" }
      ],
      edges: [{ source: "a", target: "b", value: 1 }],
      colorBy: "kind",
      styleRules: [
        { when: { field: "kind", eq: "db" }, style: { fill: "#010203" } }
      ]
    })
    expect(svg).toContain("#010203")
  })

  it("Physics GaltonBoardChart — hatches balls over a threshold in SSR (<pattern>)", () => {
    const svg = renderChart("GaltonBoardChart", {
      data: [{ value: 2 }, { value: 14 }],
      valueAccessor: "value",
      styleRules: [
        {
          when: { gte: 10 },
          style: {
            fill: { type: "hatch", background: "#d7263d", stroke: "#fff" }
          }
        }
      ]
    })
    expect(svg).toContain("<pattern")
  })

  it("Geo ChoroplethMap — hatches a flagged feature (SSR <pattern>)", () => {
    const areas = [
      {
        type: "Feature",
        properties: { id: "A", v: 5, status: "ok" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { id: "B", v: 9, status: "review" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 0],
              [2, 0],
              [2, 1],
              [1, 1],
              [1, 0]
            ]
          ]
        }
      }
    ]
    const svg = renderChart("ChoroplethMap", {
      areas,
      valueAccessor: "v",
      styleRules: [
        {
          when: { field: "status", eq: "review" },
          style: {
            fill: { type: "hatch", background: "#eee", stroke: "#d7263d" }
          }
        }
      ]
    })
    expect(svg).toContain("<pattern")
    expect(svg).toContain("#d7263d")
  })

  it("Geo ChoroplethMap — SSR fills features by value (CSR parity, no styleRules)", () => {
    const areas = [
      {
        type: "Feature",
        properties: { id: "A", v: 2 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { id: "B", v: 9 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 0],
              [2, 0],
              [2, 1],
              [1, 1],
              [1, 0]
            ]
          ]
        }
      }
    ]
    const svg = renderChart("ChoroplethMap", { areas, valueAccessor: "v" })
    // The two features must resolve to DIFFERENT sequential-scale fills, not both gray.
    const fills = [...svg.matchAll(/<path[^>]*fill="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((f) => f !== "#ccc" && f !== "none")
    const distinct = new Set(fills)
    expect(distinct.size).toBeGreaterThan(1)
  })

  it("Geo ChoroplethMap — SSR emits its inferred sequential legend", () => {
    const areas = [
      {
        type: "Feature",
        properties: { id: "A", v: 2 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { id: "B", v: 9 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 0],
              [2, 0],
              [2, 1],
              [1, 1],
              [1, 0]
            ]
          ]
        }
      }
    ]
    const svg = renderChart("ChoroplethMap", {
      areas,
      valueAccessor: "v",
      showLegend: true
    })
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain(">v<")
    expect(svg).toContain(">2<")
    expect(svg).toContain(">9<")
  })

  it("Geo ProportionalSymbolMap — SSR colors points by colorBy (CSR parity)", () => {
    const svg = renderChart("ProportionalSymbolMap", {
      points: [
        { lon: 0, lat: 0, cat: "x", n: 5 },
        { lon: 10, lat: 10, cat: "y", n: 9 }
      ],
      sizeBy: "n",
      colorBy: "cat"
    })
    const circleFills = new Set(
      [...svg.matchAll(/<circle[^>]*fill="([^"]+)"/g)].map((m) => m[1])
    )
    // Two categories → two distinct point colors, not one default.
    expect(circleFills.size).toBeGreaterThan(1)
  })

  it("Stacked bar — hatches within-limit yellow and over-max red (docs flagship)", () => {
    // Split each burst at the Max line (15) so the overage is its own segment.
    const rows = []
    for (const [i, b] of [2, 6, 8].entries()) {
      const t = `t${i}`
      rows.push({ t, tier: "Fast scaling", value: 10 })
      rows.push({ t, tier: "Fixed-rate", value: Math.min(b, 5) })
      const over = Math.max(0, 10 + b - 15)
      if (over > 0) rows.push({ t, tier: "Over max", value: over })
    }
    const svg = renderChart("StackedBarChart", {
      data: rows,
      categoryAccessor: "t",
      stackBy: "tier",
      valueAccessor: "value",
      colorScheme: {
        "Fast scaling": "#3fa34d",
        "Fixed-rate": "#f0b429",
        "Over max": "#d7263d"
      },
      valueExtent: [0, 20],
      styleRules: [
        {
          when: { field: "tier", eq: "Fixed-rate" },
          style: {
            fill: { type: "hatch", background: "#f7d774", stroke: "#e0a92a" }
          }
        },
        {
          when: { field: "tier", eq: "Over max" },
          style: {
            fill: { type: "hatch", background: "#f8b4b4", stroke: "#d7263d" }
          }
        }
      ]
    })
    // Both hatch patterns present: yellow (within-limit) and red (over-max).
    expect(svg).toContain("#e0a92a")
    expect(svg).toContain("#d7263d")
    expect((svg.match(/<pattern/g) || []).length).toBeGreaterThanOrEqual(2)
  })

  it("Physics GaltonBoardChart — recolors balls over a threshold", () => {
    const svg = renderChart("GaltonBoardChart", {
      data: [{ value: 2 }, { value: 8 }, { value: 14 }],
      valueAccessor: "value",
      styleRules: [{ when: { gte: 10 }, style: { fill: "#d7263d" } }]
    })
    expect(svg).toContain("#d7263d")
  })

  it("Network hierarchy charts — style authored nodes through renderChart", () => {
    const data = {
      name: "Portfolio",
      value: 1,
      status: "normal",
      children: [
        { name: "Alpha", value: 20, status: "alert" },
        { name: "Beta", value: 5, status: "normal" }
      ]
    }
    for (const component of [
      "TreeDiagram",
      "Treemap",
      "CirclePack",
      "OrbitDiagram"
    ] as const) {
      const svg = renderChart(component, {
        data,
        valueAccessor: "value",
        styleRules: [{
          when: { field: "status", eq: "alert" },
          style: { fill: "#ff00aa" }
        }]
      })
      expect(svg, component).toContain("#ff00aa")
    }
  })

  it("Heatmap and TemporalHistogram — style displayed aggregate cells and bins", () => {
    const heatmap = renderChart("Heatmap", {
      data: [
        { x: 1, y: 1, value: 10 },
        { x: 1.1, y: 1.1, value: 20 },
        { x: 1.2, y: 1.2, value: 30 }
      ],
      heatmapAggregation: "mean",
      heatmapXBins: 1,
      heatmapYBins: 1,
      styleRules: [{
        when: { field: "count", gte: 3 },
        style: { fill: "#aabbcc" }
      }]
    })
    const histogram = renderChart("TemporalHistogram", {
      data: [
        { time: 1, value: 8 },
        { time: 2, value: 7 }
      ],
      binSize: 10,
      styleRules: [{
        when: { gt: 10 },
        style: { fill: "#bbccdd" }
      }]
    })

    expect(heatmap).toContain("#aabbcc")
    expect(histogram).toContain("#bbccdd")
  })
})
