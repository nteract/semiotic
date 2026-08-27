import { describe, expect, it } from "vitest"
import {
  renderChart,
  renderChartWithEvidence,
  renderDashboard
} from "./renderToStaticSVG"

const series = [
  { x: 0, y: 2, group: "Alpha" },
  { x: 1, y: 5, group: "Alpha" },
  { x: 2, y: 3, group: "Alpha" },
  { x: 3, y: 7, group: "Alpha" }
]

const matrix = [
  { speed: 8, power: 4, range: 6, kind: "A" },
  { speed: 5, power: 7, range: 4, kind: "B" },
  { speed: 9, power: 6, range: 8, kind: "A" },
  { speed: 3, power: 8, range: 2, kind: "B" }
]

const tasks = [
  {
    id: "brief",
    label: "Brief",
    lane: "Product",
    dependencies: [],
    status: "done",
    completed: 1,
    progress: 1
  },
  {
    id: "privacy",
    label: "Privacy review",
    lane: "Product",
    dependencies: ["brief"],
    status: "blocked",
    blocker: "Legal",
    progress: 0.8
  },
  {
    id: "schema",
    label: "Schema",
    lane: "Data",
    dependencies: ["privacy"],
    status: "waiting",
    progress: 0.25
  }
]

describe("renderChart composite server implementations", () => {
  it("renders MinimapChart as one evidence-backed overview/detail SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("MinimapChart", {
      data: series,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "group",
      brushExtent: [1, 3],
      title: "Selected interval",
      description: "A detail view plus its complete context.",
      width: 420,
      height: 240
    })

    expect((svg.match(/<svg\b/g) ?? []).length).toBe(3)
    expect(svg).toContain('data-semiotic-composite-part="detail"')
    expect(svg).toContain('data-semiotic-composite-part="overview"')
    expect(svg).toContain("Selected interval")
    expect(evidence.frameType).toBe("xy")
    expect(evidence.empty).toBe(false)
    expect(evidence.width).toBe(420)
    expect(evidence.height).toBe(320)
    expect(evidence.xDomain).toEqual([1, 3])
    expect(evidence.markCount).toBeGreaterThanOrEqual(2)
  })

  it("renders every SPLOM cell plus diagonal distributions", () => {
    const { svg, evidence } = renderChartWithEvidence("ScatterplotMatrix", {
      data: matrix,
      fields: ["speed", "power", "range"],
      colorBy: "kind",
      cellSize: 90,
      histogramBins: 5,
      title: "Vehicle traits"
    })

    expect((svg.match(/<svg\b/g) ?? []).length).toBe(10)
    expect(svg).toContain("speed versus power scatterplot")
    expect(svg).toContain('data-semiotic-composite-part="diagonal-speed"')
    expect(svg).toContain("Vehicle traits")
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.point).toBe(24)
    expect(evidence.markCountByType.histogram).toBeGreaterThan(0)
    expect(evidence.categories).toEqual(["A", "B"])
    expect(evidence.legendItems).toBe(2)
  })

  it("renders ChainReactionChart's current-time dependency reading", () => {
    const { svg, evidence } = renderChartWithEvidence("ChainReactionChart", {
      data: tasks,
      taskIDAccessor: "id",
      labelAccessor: "label",
      laneAccessor: "lane",
      dependencyAccessor: "dependencies",
      statusAccessor: "status",
      completionTimeAccessor: "completed",
      progressAccessor: "progress",
      blockerAccessor: "blocker",
      currentTime: 10,
      mode: "replay",
      title: "Release dependencies",
      width: 600,
      height: 400
    })

    expect((svg.match(/<svg\b/g) ?? []).length).toBe(2)
    expect(svg).toContain("Release dependencies")
    expect(svg).toContain("Product")
    expect(svg).toContain("Data")
    expect(svg).toContain("Privacy review")
    expect(svg).toContain("blocked")
    expect(svg).toContain("affects 1 unfinished tasks across 1 lanes")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.nodeCount).toBe(3)
    expect(evidence.edgeCount).toBe(2)
    expect(evidence.markCountByType).toEqual({ task: 3, dependency: 2 })
  })

  it("returns explicit empty evidence for an invalid dependency graph", () => {
    const cyclic = [
      { id: "a", label: "A", lane: "One", dependencies: ["b"] },
      { id: "b", label: "B", lane: "Two", dependencies: ["a"] }
    ]
    const { svg, evidence } = renderChartWithEvidence("ChainReactionChart", {
      data: cyclic,
      taskIDAccessor: "id",
      labelAccessor: "label",
      laneAccessor: "lane",
      dependencyAccessor: "dependencies"
    })

    expect(svg).toContain("Dependency graph contains a cycle")
    expect(evidence.empty).toBe(true)
    expect(evidence.warnings).toContain("INVALID_DEPENDENCY_GRAPH")
  })

  it("applies the shared precision postprocess to nested composite geometry", () => {
    const svg = renderChart(
      "ScatterplotMatrix",
      {
        data: matrix,
        fields: ["speed", "power"],
        cellSize: 91
      },
      { precision: 0 }
    )

    expect(svg).toContain("scatterplot-matrix")
    expect(svg).not.toMatch(/\b(?:x|y|cx|cy|width|height)="-?\d+\.\d+"/)
  })

  it("uses dashboard prefixes for composite accessible-name ids", () => {
    const svg = renderDashboard(
      [
        {
          component: "MinimapChart",
          props: {
            data: series,
            xAccessor: "x",
            yAccessor: "y",
            title: "Minimap"
          }
        },
        {
          component: "MinimapChart",
          props: {
            data: series,
            xAccessor: "x",
            yAccessor: "y",
            title: "Minimap"
          }
        },
        {
          component: "ScatterplotMatrix",
          props: { data: matrix, fields: ["speed", "power"], title: "Matrix" }
        },
        {
          component: "ScatterplotMatrix",
          props: { data: matrix, fields: ["speed", "power"], title: "Matrix" }
        },
        {
          component: "ChainReactionChart",
          props: {
            data: tasks,
            taskIDAccessor: "id",
            labelAccessor: "label",
            laneAccessor: "lane",
            dependencyAccessor: "dependencies",
            title: "Dependencies"
          }
        },
        {
          component: "ChainReactionChart",
          props: {
            data: tasks,
            taskIDAccessor: "id",
            labelAccessor: "label",
            laneAccessor: "lane",
            dependencyAccessor: "dependencies",
            title: "Dependencies"
          }
        }
      ],
      { width: 900, layout: { columns: 2 } }
    )

    for (let index = 0; index < 6; index++) {
      expect(svg).toContain(`id="chart-${index}-title"`)
      expect(svg).toContain(`id="chart-${index}-description"`)
      expect(svg).toContain(
        `aria-labelledby="chart-${index}-title chart-${index}-description"`
      )
    }
    expect(
      new Set(svg.match(/id="chart-\d+-(?:title|description)"/g)).size
    ).toBe(12)
  })
})
