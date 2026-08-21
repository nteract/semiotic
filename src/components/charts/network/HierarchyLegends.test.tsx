import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamNetworkFrameHandle } from "../../stream/networkTypes"
import { act, render } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../../store/TooltipStore"
import { isLegendConfig } from "../../types/legendTypes"
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

  it.each(legendCases)("$name applies legend highlight state to its marks", (testCase) => {
    renderLegendCase(testCase)

    act(() => {
      lastNetworkFrameProps.legendHoverBehavior({ label: "Core" })
    })

    const selected = lastNetworkFrameProps.nodeStyle({
      id: "Alpha",
      data: { id: "Alpha", name: "Alpha", group: "Core" },
    })
    const dimmed = lastNetworkFrameProps.nodeStyle({
      id: "Beta",
      data: { id: "Beta", name: "Beta", group: "Growth" },
    })

    expect(selected.opacity ?? 1).toBeGreaterThan(dimmed.opacity)
    expect(dimmed.opacity).toBeLessThan(1)
    expect(dimmed.fillOpacity).toBe(dimmed.opacity)
  })

  it("TreeDiagram applies the active legend category to connected edges", () => {
    renderLegendCase(legendCases[0])

    act(() => {
      lastNetworkFrameProps.legendHoverBehavior({ label: "Core" })
    })

    const selected = lastNetworkFrameProps.edgeStyle({
      source: { data: { group: "All" } },
      target: { data: { group: "Core" } },
    })
    const dimmed = lastNetworkFrameProps.edgeStyle({
      source: { data: { group: "All" } },
      target: { data: { group: "Growth" } },
    })

    expect(selected.opacity ?? 1).toBeGreaterThan(dimmed.opacity)
    expect(dimmed.opacity).toBeLessThan(1)
  })

  it("ChordDiagram builds its legend from categories discovered after push-mode mount", () => {
    render(
      <TooltipProvider>
        <ChordDiagram colorBy="id" legendInteraction="highlight" />
      </TooltipProvider>,
    )

    expect(lastNetworkFrameProps.legend).toBeUndefined()
    expect(lastNetworkFrameProps.legendCategoryAccessor).toBe("id")

    act(() => {
      lastNetworkFrameProps.onCategoriesChange(["Alpha", "Beta"])
    })

    expect(lastNetworkFrameProps.legend).toBeDefined()
    if (!isLegendConfig(lastNetworkFrameProps.legend))
      throw new Error("Expected a categorical push-mode legend")
    expect(
      lastNetworkFrameProps.legend.legendGroups[0].items.map((item) => item.label),
    ).toEqual(["Alpha", "Beta"])

    act(() => {
      lastNetworkFrameProps.legendHoverBehavior({ label: "Alpha" })
    })
    expect(lastNetworkFrameProps.nodeStyle({ id: "Beta" }).opacity).toBeLessThan(1)
  })
})
