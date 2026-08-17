// @vitest-environment node

import * as React from "react"
import { describe, expect, it } from "vitest"
import {
  renderChart,
  renderChartWithEvidence,
  renderToStaticSVG
} from "./renderToStaticSVG"

const movingFrame = {
  size: [200, 100] as [number, number],
  config: {
    fixedDt: 1 / 60,
    settleStepLimit: 240,
    kernel: {
      gravity: { x: 0, y: 0 },
      velocityDamping: 0.98,
      restitution: 0,
      sleepSpeed: 0.5,
      sleepAfter: 0.1
    }
  },
  initialSpawns: [
    {
      id: "moving",
      x: 20,
      y: 50,
      vx: 80,
      vy: 0,
      mass: 1,
      shape: { type: "circle" as const, radius: 5 }
    }
  ]
}

function settledBodyX(svg: string): number {
  const dataArea = svg.slice(svg.indexOf('id="physics-data-area"'))
  const match = dataArea.match(/<circle[^>]*cx="([^"]+)"/)
  return Number(match?.[1])
}

describe("static physics chrome", () => {
  it("renders shared chrome above foreground graphics and reports annotations", () => {
    const annotations = [
      { id: "pixel", type: "label", x: 40, y: 30, label: "Pixel note" }
    ]
    const { svg, evidence } = renderChartWithEvidence("CollisionSwarmChart", {
      data: [{ id: "a", x: 1, group: "A" }],
      xAccessor: "x",
      groupAccessor: "group",
      width: 240,
      height: 140,
      title: "Static physics",
      annotations,
      foregroundGraphics: <g data-testid="authored-foreground" />,
      legend: {
        legendGroups: [
          {
            label: "Kinds",
            type: "fill",
            styleFn: (item: { color?: string }) => ({ fill: item.color }),
            items: [{ label: "Kind A", color: "#f00" }]
          }
        ]
      }
    })

    expect(svg).toContain("semiotic-chart-title")
    expect(svg).toContain("Static physics")
    expect(svg).toContain("Kind A")
    expect(svg).toContain("Pixel note")
    expect(evidence.annotationCount).toBe(1)
    expect(svg.indexOf('data-testid="authored-foreground"')).toBeLessThan(
      svg.indexOf("stream-physics-frame__overlay")
    )
  })

  it("preserves live physics annotation scales, body aliases, and raw legend nodes", () => {
    const contexts: Array<{
      domain?: unknown
      inverted?: unknown
      xAccessor?: string
      yAccessor?: string
    }> = []
    const svg = renderToStaticSVG("physics", {
      ...movingFrame,
      annotations: [
        { id: "body-label", type: "text", bodyId: "moving", label: "Body alias" },
        { id: "custom", type: "custom" },
      ],
      svgAnnotationRules: (annotation, _index, context) => {
        const xScale = context.scales?.x
        contexts.push({
          domain: xScale?.domain?.(),
          inverted: typeof xScale?.invert,
          xAccessor: context.xAccessor,
          yAccessor: context.yAccessor,
        })
        return annotation.type === "custom"
          ? <text data-testid="physics-custom-annotation">Custom annotation</text>
          : null
      },
      legend: <g data-testid="raw-physics-legend"><text>Raw physics legend</text></g>,
    })

    expect(svg).toContain("Body alias")
    expect(svg).toContain("Custom annotation")
    expect(svg).toContain("Raw physics legend")
    expect(svg).toContain(
      '<g transform="translate(97, 0)"><g data-testid="raw-physics-legend"'
    )
    expect(contexts).toEqual([
      { domain: [0, 200], inverted: "function", xAccessor: "x", yAccessor: "y" },
      { domain: [0, 200], inverted: "function", xAccessor: "x", yAccessor: "y" },
    ])
  })

  it("installs barrier annotations before settling the static simulation", () => {
    const free = renderToStaticSVG("physics", movingFrame)
    const blocked = renderToStaticSVG("physics", {
      ...movingFrame,
      annotations: [
        {
          id: "wall",
          type: "x-threshold",
          x: 60,
          y1: 0,
          y2: 100,
          label: "Wall",
          physics: "barrier",
          axis: "x",
          thickness: 4,
          restitution: 0
        }
      ]
    })

    expect(settledBodyX(blocked)).toBeLessThan(60)
    expect(settledBodyX(free)).toBeGreaterThan(60)
    expect(blocked).toContain("Wall")
  })

  const structuralCases: Array<{
    component: Parameters<typeof renderChart>[0]
    props: Record<string, unknown>
    testId: string
  }> = [
    {
      component: "GaltonBoardChart",
      props: {
        data: [{ id: "a", value: 1 }],
        valueAccessor: "value",
        bins: 3,
        width: 260,
        height: 160
      },
      testId: "galton-board-structure-overlay"
    },
    {
      component: "EventDropChart",
      props: {
        data: [{ id: "a", time: 12, arrivalTime: 13 }],
        windows: { size: 10 },
        width: 260,
        height: 160
      },
      testId: "event-drop-window-overlay"
    },
    {
      component: "UnitPileChart",
      props: {
        data: [{ id: "a", category: "A", value: 2 }],
        valueAccessor: "value",
        width: 260,
        height: 160
      },
      testId: "physics-pile-projection-overlay"
    },
    {
      component: "CollisionSwarmChart",
      props: {
        data: [{ id: "a", x: 12, group: "A" }],
        xAccessor: "x",
        groupAccessor: "group",
        width: 260,
        height: 160
      },
      testId: "collision-swarm-projection-overlay"
    },
    {
      component: "ProcessFlowChart",
      props: {
        data: [{ id: "a", stage: "coding" }],
        stages: [
          { id: "coding", label: "Coding", force: 8 },
          { id: "done", label: "Done", absorb: true }
        ],
        width: 320,
        height: 180
      },
      testId: "process-flow-chrome"
    },
    {
      component: "GauntletChart",
      props: {
        data: [{ id: "p", positives: ["value"], negatives: ["risk"] }],
        idAccessor: "id",
        positiveAccessor: "positives",
        negativeAccessor: "negatives",
        positiveProperties: [{ id: "value", label: "Value", short: "V" }],
        negativeProperties: [{ id: "risk", label: "Risk", short: "R" }],
        width: 320,
        height: 180
      },
      testId: "gauntlet-projection-overlay"
    },
    {
      component: "PacketFlowChart",
      props: {
        nodes: [
          { id: "A", x: 0.1, y: 0.5 },
          { id: "B", x: 0.9, y: 0.5 }
        ],
        links: [{ id: "f", source: "A", target: "B", value: 5 }],
        width: 320,
        height: 180
      },
      testId: "physical-flow-static-flow-overlay"
    }
  ]

  it.each(structuralCases)(
    "preserves $component structural chrome in static output",
    ({ component, props, testId }) => {
      expect(renderChart(component, props)).toContain(testId)
    }
  )

  it("honors structural chrome opt-outs", () => {
    const galton = renderChart("GaltonBoardChart", {
      data: [{ id: "a", value: 1 }],
      valueAccessor: "value",
      bins: 3,
      showProjection: false
    })
    const process = renderChart("ProcessFlowChart", {
      data: [{ id: "a", stage: "coding" }],
      stages: [{ id: "coding", label: "Coding", absorb: true }],
      showChrome: false,
      showProjection: false
    })

    expect(galton).not.toContain("galton-board-structure-overlay")
    expect(process).not.toContain("process-flow-chrome")
    expect(process).not.toContain("process-flow-projection-overlay")
  })

  it("matches compact-mode projection defaults while preserving explicit opt-in", () => {
    const props = {
      data: [{ id: "a", x: 12, group: "A" }],
      xAccessor: "x",
      groupAccessor: "group",
      mode: "sparkline" as const
    }

    expect(renderChart("CollisionSwarmChart", props)).not.toContain(
      "collision-swarm-projection-overlay"
    )
    expect(
      renderChart("CollisionSwarmChart", { ...props, showProjection: true })
    ).toContain("collision-swarm-projection-overlay")
  })

  it("keeps PacketFlow node labels when flow paths and sensors are hidden", () => {
    const svg = renderChart("PacketFlowChart", {
      nodes: [
        { id: "A", label: "Source node", x: 0.1, y: 0.5 },
        { id: "B", label: "Target node", x: 0.9, y: 0.5 }
      ],
      links: [{ id: "f", source: "A", target: "B", value: 5 }],
      showNodeLabels: true,
      showSensors: false,
      showStaticFlow: false
    })

    expect(svg).toContain("physical-flow-static-flow-overlay")
    expect(svg).toContain("Source node")
    expect(svg).toContain("Target node")
  })
})
