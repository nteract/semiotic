/**
 * Phase 3 — hydration parity across the ordinal HOC catalog.
 *
 * The boundary lives in `StreamOrdinalFrame`, so every HOC that funnels
 * through it should hydrate for free. This file proves that end-to-end
 * across the shipped ordinal HOCs — including the radial-projection
 * ones (PieChart, DonutChart, GaugeChart) which exercise the wedge /
 * arc scene primitives in `SceneToSVG`.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"

import { BarChart } from "./BarChart"
import { StackedBarChart } from "./StackedBarChart"
import { GroupedBarChart } from "./GroupedBarChart"
import { SwarmPlot } from "./SwarmPlot"
import { BoxPlot } from "./BoxPlot"
import { Histogram } from "./Histogram"
import { ViolinPlot } from "./ViolinPlot"
import { RidgelinePlot } from "./RidgelinePlot"
import { DotPlot } from "./DotPlot"
import { PieChart } from "./PieChart"
import { DonutChart } from "./DonutChart"
import { GaugeChart } from "./GaugeChart"
import { FunnelChart } from "./FunnelChart"
import { SwimlaneChart } from "./SwimlaneChart"
import { LikertChart } from "./LikertChart"
import { OrdinalCustomChart } from "../custom/OrdinalCustomChart"

const categoryData = [
  { region: "AMER", value: 42, group: "X", date: 1 },
  { region: "EMEA", value: 33, group: "X", date: 2 },
  { region: "APAC", value: 51, group: "Y", date: 3 },
  { region: "LATAM", value: 28, group: "Y", date: 4 },
]

const stackedData = [
  { region: "AMER", value: 20, segment: "Pro" },
  { region: "AMER", value: 22, segment: "Free" },
  { region: "EMEA", value: 15, segment: "Pro" },
  { region: "EMEA", value: 18, segment: "Free" },
]

const distData = Array.from({ length: 30 }, (_, i) => ({
  group: i % 2 === 0 ? "A" : "B",
  value: Math.sin(i * 0.5) * 5 + 10,
}))

const swimlaneData = [
  { task: "Plan", phase: "Q1", duration: 4 },
  { task: "Build", phase: "Q1", duration: 6 },
  { task: "Test",  phase: "Q2", duration: 3 },
  { task: "Ship",  phase: "Q2", duration: 1 },
]

const likertData = [
  { question: "Q1", level: "Disagree", count: 5 },
  { question: "Q1", level: "Neutral", count: 10 },
  { question: "Q1", level: "Agree", count: 12 },
  { question: "Q2", level: "Disagree", count: 8 },
  { question: "Q2", level: "Neutral", count: 7 },
  { question: "Q2", level: "Agree", count: 14 },
]

interface HydrationCase {
  name: string
  render: () => React.ReactElement
}

const cases: HydrationCase[] = [
  { name: "BarChart", render: () => (
    <BarChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={400} height={200} />
  ) },
  { name: "StackedBarChart", render: () => (
    <StackedBarChart data={stackedData} categoryAccessor="region" valueAccessor="value" stackBy="segment" width={400} height={200} />
  ) },
  { name: "GroupedBarChart", render: () => (
    <GroupedBarChart data={stackedData} categoryAccessor="region" valueAccessor="value" groupBy="segment" width={400} height={200} />
  ) },
  { name: "SwarmPlot", render: () => (
    <SwarmPlot data={distData} categoryAccessor="group" valueAccessor="value" width={400} height={300} />
  ) },
  { name: "BoxPlot", render: () => (
    <BoxPlot data={distData} categoryAccessor="group" valueAccessor="value" width={400} height={300} />
  ) },
  { name: "Histogram", render: () => (
    <Histogram data={distData} categoryAccessor="group" valueAccessor="value" width={400} height={300} />
  ) },
  { name: "ViolinPlot", render: () => (
    <ViolinPlot data={distData} categoryAccessor="group" valueAccessor="value" width={400} height={300} />
  ) },
  { name: "RidgelinePlot", render: () => (
    <RidgelinePlot data={distData} categoryAccessor="group" valueAccessor="value" width={400} height={300} />
  ) },
  { name: "DotPlot", render: () => (
    <DotPlot data={categoryData} categoryAccessor="region" valueAccessor="value" width={400} height={200} />
  ) },
  // Radial projection — exercises the wedge SVG primitive.
  { name: "PieChart", render: () => (
    <PieChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={300} height={300} />
  ) },
  { name: "DonutChart", render: () => (
    <DonutChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={300} height={300} />
  ) },
  { name: "GaugeChart", render: () => (
    <GaugeChart value={72} min={0} max={100} thresholds={[
      { value: 33, color: "#ef4444", label: "Low" },
      { value: 66, color: "#f59e0b", label: "Mid" },
      { value: 100, color: "#22c55e", label: "High" },
    ]} width={300} height={200} />
  ) },
  { name: "FunnelChart", render: () => (
    <FunnelChart
      data={[
        { step: "Visited", value: 1000 },
        { step: "Signed up", value: 500 },
        { step: "Activated", value: 200 },
        { step: "Paid", value: 80 },
      ]}
      stepAccessor="step"
      valueAccessor="value"
      width={400}
      height={300}
    />
  ) },
  { name: "SwimlaneChart", render: () => (
    <SwimlaneChart
      data={swimlaneData}
      categoryAccessor="phase"
      subcategoryAccessor="task"
      valueAccessor="duration"
      width={400}
      height={300}
    />
  ) },
  { name: "LikertChart", render: () => (
    <LikertChart
      data={likertData}
      categoryAccessor="question"
      levelAccessor="level"
      countAccessor="count"
      levels={["Disagree", "Neutral", "Agree"]}
      width={500}
      height={200}
    />
  ) },
  { name: "OrdinalCustomChart", render: () => (
    <OrdinalCustomChart
      data={categoryData}
      categoryAccessor="region"
      valueAccessor="value"
      layout={(ctx) => ({
        nodes: [{
          type: "rect",
          x: 0,
          y: 0,
          w: ctx.dimensions.plot.width,
          h: ctx.dimensions.plot.height,
          style: { fill: ctx.resolveColor("__test__") },
          datum: null,
        }],
      })}
      width={400}
      height={200}
    />
  ) },
]

describe("Ordinal HOC catalog — hydration parity", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  for (const c of cases) {
    describe(c.name, () => {
      it("renderToString produces SVG markup, no <canvas>", () => {
        const html = renderToString(c.render())
        expect(html).not.toContain("<canvas")
        expect(html).toContain("<svg")
      })

      it("hydrates from server-rendered HTML without React mismatch warnings", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const html = renderToString(c.render())
        container.innerHTML = html

        let root: ReturnType<typeof hydrateRoot> | null = null
        act(() => {
          root = hydrateRoot(container, c.render())
        })

        const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
          const msg = String(call[0] ?? "")
          return /did not match|hydration failed|hydration error/i.test(msg)
        })
        expect(mismatchWarnings).toEqual([])

        root?.unmount()
        errorSpy.mockRestore()
      })

      it("upgrades to interactive canvas after hydration", () => {
        const html = renderToString(c.render())
        container.innerHTML = html

        let root: ReturnType<typeof hydrateRoot> | null = null
        act(() => {
          root = hydrateRoot(container, c.render())
        })

        const canvases = container.querySelectorAll("canvas")
        expect(canvases.length).toBeGreaterThanOrEqual(1)

        root?.unmount()
      })
    })
  }
})
