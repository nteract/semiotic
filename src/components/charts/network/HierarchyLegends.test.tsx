import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamNetworkFrameHandle } from "../../stream/networkTypes"
import { render } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../../store/TooltipStore"
import { ChordDiagram } from "./ChordDiagram"
import { CirclePack } from "./CirclePack"
import { OrbitDiagram } from "./OrbitDiagram"
import { TreeDiagram } from "./TreeDiagram"
import { Treemap } from "./Treemap"

let lastNetworkFrameProps = {} as CapturedNetworkFrameProps
vi.mock("../../stream/StreamNetworkFrame", () => ({
  __esModule: true,
  default: React.forwardRef<Partial<StreamNetworkFrameHandle>, CapturedNetworkFrameProps>(
    (props, _ref) => {
      lastNetworkFrameProps = props
      return <div data-testid="stream-network-frame" />
    },
  ),
}))

const hierarchy = {
  name: "Portfolio",
  group: "All",
  children: [
    { name: "Alpha", group: "Core", value: 8 },
    { name: "Beta", group: "Growth", value: 5 },
  ],
}

const chordNodes = [
  { id: "Alpha", group: "Core" },
  { id: "Beta", group: "Growth" },
]
const chordEdges = [{ source: "Alpha", target: "Beta", value: 4 }]

type LegendCase = {
  name: string
  renderChart: (showLegend: boolean | undefined) => React.ReactElement
}

const legendCases: LegendCase[] = [
  {
    name: "TreeDiagram",
    renderChart: (showLegend) => (
      <TreeDiagram
        data={hierarchy}
        colorBy="group"
        showLegend={showLegend}
        legendPosition="bottom"
        legendInteraction="highlight"
      />
    ),
  },
  {
    name: "Treemap",
    renderChart: (showLegend) => (
      <Treemap
        data={hierarchy}
        colorBy="group"
        showLegend={showLegend}
        legendPosition="bottom"
        legendInteraction="highlight"
      />
    ),
  },
  {
    name: "CirclePack",
    renderChart: (showLegend) => (
      <CirclePack
        data={hierarchy}
        colorBy="group"
        showLegend={showLegend}
        legendPosition="bottom"
        legendInteraction="highlight"
      />
    ),
  },
  {
    name: "OrbitDiagram",
    renderChart: (showLegend) => (
      <OrbitDiagram
        data={hierarchy}
        colorBy="group"
        animated={false}
        showLegend={showLegend}
        legendPosition="bottom"
        legendInteraction="highlight"
      />
    ),
  },
  {
    name: "ChordDiagram",
    renderChart: (showLegend) => (
      <ChordDiagram
        nodes={chordNodes}
        edges={chordEdges}
        colorBy="group"
        showLegend={showLegend}
        legendPosition="bottom"
        legendInteraction="highlight"
      />
    ),
  },
]

function renderLegendCase(testCase: LegendCase, showLegend?: boolean) {
  return render(
    <TooltipProvider>
      {testCase.renderChart(showLegend)}
    </TooltipProvider>,
  )
}

describe("hierarchy and chord legends", () => {
  beforeEach(() => {
    lastNetworkFrameProps = {} as CapturedNetworkFrameProps
  })

  it.each(legendCases)("$name auto-renders and reserves its colorBy legend", (testCase) => {
    renderLegendCase(testCase)

    expect(lastNetworkFrameProps.legend).toBeDefined()
    expect(lastNetworkFrameProps.legendPosition).toBe("bottom")
    expect((lastNetworkFrameProps as Record<string, unknown>).__legendMarginReservedFor)
      .toBe(lastNetworkFrameProps.legend)
    expect(lastNetworkFrameProps.legendHoverBehavior).toEqual(expect.any(Function))
    expect(lastNetworkFrameProps.legendClickBehavior).toEqual(expect.any(Function))
  })

  it.each(legendCases)("$name respects showLegend=false", (testCase) => {
    renderLegendCase(testCase, false)

    expect(lastNetworkFrameProps.legend).toBeUndefined()
  })
})
