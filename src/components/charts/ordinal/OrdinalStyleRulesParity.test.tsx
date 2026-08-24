import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Datum } from "../shared/datumTypes"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { TooltipProvider } from "../../store/TooltipStore"
import { BoxPlot } from "./BoxPlot"
import { DonutChart } from "./DonutChart"
import { DotPlot } from "./DotPlot"
import { FunnelChart } from "./FunnelChart"
import { GaugeChart } from "./GaugeChart"
import { Histogram } from "./Histogram"
import { LikertChart } from "./LikertChart"
import { PieChart } from "./PieChart"
import { RadarChart } from "./RadarChart"
import { RidgelinePlot } from "./RidgelinePlot"
import { SwarmPlot } from "./SwarmPlot"
import { SwimlaneChart } from "./SwimlaneChart"
import { ViolinPlot } from "./ViolinPlot"

const capturedFrames: StreamOrdinalFrameProps[] = []

vi.mock("../../stream/StreamOrdinalFrame", () => ({
  default: React.forwardRef((props: StreamOrdinalFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-ordinal-frame" />
  })
}))

const distribution = [
  { category: "A", value: 4, group: "one" },
  { category: "A", value: 20, group: "two" },
  { category: "B", value: 8, group: "one" }
]

describe("ordinal styleRules parity", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("wires declarative rules through every remaining ordinal HOC", () => {
    const styleRules = [{ style: { fill: "#112233", stroke: "#334455" } }]

    render(
      <TooltipProvider>
        <SwarmPlot data={distribution} styleRules={styleRules} />
        <BoxPlot data={distribution} styleRules={styleRules} />
        <Histogram data={distribution} styleRules={styleRules} />
        <ViolinPlot data={distribution} styleRules={styleRules} />
        <RidgelinePlot data={distribution} styleRules={styleRules} />
        <DotPlot data={distribution} styleRules={styleRules} />
        <PieChart data={distribution} styleRules={styleRules} />
        <DonutChart data={distribution} styleRules={styleRules} />
        <FunnelChart
          data={distribution.map((d, index) => ({ ...d, step: `S${index}` }))}
          styleRules={styleRules}
        />
        <RadarChart
          data={distribution.map((d) => ({ ...d, attribute: d.category, series: d.group }))}
          seriesAccessor="series"
          styleRules={styleRules}
        />
        <SwimlaneChart data={distribution} subcategoryAccessor="group" styleRules={styleRules} />
        <LikertChart
          data={[{ question: "Q1", level: "Agree", count: 4 }]}
          levelAccessor="level"
          countAccessor="count"
          levels={["Disagree", "Agree"]}
          styleRules={styleRules}
        />
        <GaugeChart value={60} styleRules={styleRules} />
      </TooltipProvider>
    )

    expect(capturedFrames).toHaveLength(13)
    for (const [index, frame] of capturedFrames.entries()) {
      const styleFn = frame.pieceStyle ?? frame.summaryStyle
      expect(typeof styleFn, `frame ${index}`).toBe("function")
      const datum = index === 12
        ? (frame.data as Datum[]).find((d) => d._isFill)!
        : distribution[1]
      expect((styleFn as (d: Datum, category?: string) => Datum)(datum, "A"), `frame ${index}`)
        .toMatchObject({ fill: "#112233", stroke: "#334455" })
    }
  })

  it("uses rendered summary, wedge, Likert, and gauge contexts", () => {
    render(
      <TooltipProvider>
        <BoxPlot data={distribution} styleRules={[{ when: { gt: 10 }, style: { fill: "#median" } }]} />
        <Histogram data={distribution} styleRules={[{ when: { gt: 3 }, style: { fill: "#count" } }]} />
        <PieChart data={[{ category: "debt", value: -20 }]} styleRules={[{ when: { gt: 10 }, style: { fill: "#absolute" } }]} />
        <LikertChart
          data={[{ question: "Q1", level: "Agree", count: 4 }]}
          levelAccessor="level"
          countAccessor="count"
          levels={["Disagree", "Agree"]}
          styleRules={[{ when: { gt: 0.5 }, style: { fill: "#proportion" } }]}
        />
        <GaugeChart
          value={60}
          stroke="#explicit"
          styleRules={[{
            when: (d) => d._isFill === true,
            style: { fill: "#gauge", stroke: "#rule" }
          }]}
        />
      </TooltipProvider>
    )

    expect(resolveSummary(capturedFrames[0], { median: 20 }, "A").fill).toBe("#median")
    expect(resolveSummary(capturedFrames[1], { count: 4 }, "A").fill).toBe("#count")
    expect(resolvePiece(capturedFrames[2], { category: "debt", value: -20 }, "debt").fill).toBe("#absolute")
    expect(resolvePiece(capturedFrames[3], {
      __likertLevel: "Agree",
      __likertLevelLabel: "Agree",
      __likertPct: 0.75
    }, "Agree").fill).toBe("#proportion")
    const gaugeDatum = (capturedFrames[4].data as Datum[]).find((d) => d._isFill)!
    expect(resolvePiece(capturedFrames[4], gaugeDatum, String(gaugeDatum.category))).toMatchObject({
      fill: "#gauge",
      stroke: "#explicit"
    })
  })
})

function resolvePiece(frame: StreamOrdinalFrameProps, datum: Datum, category?: string): Datum {
  return typeof frame.pieceStyle === "function" ? frame.pieceStyle(datum, category) : {}
}

function resolveSummary(frame: StreamOrdinalFrameProps, datum: Datum, category?: string): Datum {
  return typeof frame.summaryStyle === "function" ? frame.summaryStyle(datum, category) : {}
}
