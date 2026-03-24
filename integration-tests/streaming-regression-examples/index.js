import * as Semiotic from "../../dist/semiotic.module.min.js"
import React, { useRef, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

const {
  StackedBarChart,
  PieChart,
  DonutChart,
  GroupedBarChart,
  BubbleChart,
  StackedAreaChart,
  LineChart,
  AreaChart,
  Scatterplot,
  ForceDirectedGraph,
  ChordDiagram,
} = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

// ── 1. Streaming Stacked Bar (grey fill + legend regression) ─────────────────

function StreamingStackedBar() {
  const ref = useRef(null)

  useEffect(() => {
    const categories = ["Q1", "Q2", "Q3", "Q4"]
    const stacks = ["North", "South", "East"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 12) {
        const cat = categories[count % 4]
        const stack = stacks[count % 3]
        ref.current.push({
          quarter: cat,
          region: stack,
          sales: 50 + count * 10,
        })
        count++
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(StackedBarChart, {
    ref,
    categoryAccessor: "quarter",
    stackBy: "region",
    valueAccessor: "sales",
    colorBy: "region",
    showLegend: true,
    width: 450,
    height: 300,
  })
}

// ── 2. Streaming Pie (grey fill + legend regression) ─────────────────────────

function StreamingPie() {
  const ref = useRef(null)

  useEffect(() => {
    const slices = ["Alpha", "Beta", "Gamma", "Delta"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 8) {
        ref.current.push({
          category: slices[count % 4],
          value: 20 + count * 5,
        })
        count++
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(PieChart, {
    ref,
    categoryAccessor: "category",
    valueAccessor: "value",
    colorBy: "category",
    showLegend: true,
    width: 350,
    height: 300,
  })
}

// ── 3. Streaming Bubble (grey fill regression) ───────────────────────────────

function StreamingBubble() {
  const ref = useRef(null)

  useEffect(() => {
    const groups = ["A", "B", "C"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 15) {
        ref.current.push({
          x: count * 10,
          y: 50 + Math.sin(count) * 30,
          size: 10 + count * 2,
          group: groups[count % 3],
        })
        count++
      }
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(BubbleChart, {
    ref,
    xAccessor: "x",
    yAccessor: "y",
    sizeBy: "size",
    colorBy: "group",
    width: 450,
    height: 300,
  })
}

// ── 4. Streaming Grouped Bar (grey fill + legend regression) ─────────────────

function StreamingGroupedBar() {
  const ref = useRef(null)

  useEffect(() => {
    const categories = ["Jan", "Feb", "Mar"]
    const groups = ["Desktop", "Mobile", "Tablet"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 9) {
        ref.current.push({
          month: categories[count % 3],
          device: groups[Math.floor(count / 3)],
          visits: 100 + count * 20,
        })
        count++
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(GroupedBarChart, {
    ref,
    categoryAccessor: "month",
    groupBy: "device",
    valueAccessor: "visits",
    colorBy: "device",
    showLegend: true,
    width: 450,
    height: 300,
  })
}

// ── 5. Streaming Stacked Area (grey fill regression) ─────────────────────────

function StreamingStackedArea() {
  const ref = useRef(null)

  useEffect(() => {
    const series = ["Revenue", "Costs", "Profit"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 30) {
        ref.current.push({
          month: Math.floor(count / 3),
          metric: series[count % 3],
          value: 20 + Math.random() * 40,
        })
        count++
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(StackedAreaChart, {
    ref,
    xAccessor: "month",
    yAccessor: "value",
    areaBy: "metric",
    colorBy: "metric",
    width: 450,
    height: 300,
  })
}

// ── 6. Area chart tooltip (shows "-" regression) ─────────────────────────────

function AreaChartTooltipTest() {
  const data = [
    { month: 1, sales: 100 },
    { month: 2, sales: 150 },
    { month: 3, sales: 130 },
    { month: 4, sales: 180 },
    { month: 5, sales: 200 },
  ]

  return React.createElement(AreaChart, {
    data,
    xAccessor: "month",
    yAccessor: "sales",
    tooltip: true,
    enableHover: true,
    width: 450,
    height: 300,
  })
}

// ── 7. LineChart streaming (infinite loop regression) ─────────────────────────

function StreamingLine() {
  const ref = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let count = 0
    const interval = setInterval(() => {
      try {
        if (ref.current && count < 50) {
          ref.current.push({ time: count, value: 50 + Math.sin(count * 0.2) * 30 })
          count++
        }
      } catch (e) {
        setError(e.message)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return React.createElement("div", { className: "error-indicator" }, "ERROR: " + error)
  }

  return React.createElement(LineChart, {
    ref,
    xAccessor: "time",
    yAccessor: "value",
    width: 450,
    height: 250,
  })
}

// ── 8. Force-Directed Graph centering ────────────────────────────────────────

function ForceGraphCentering() {
  const nodes = [
    { id: "A", group: "x" }, { id: "B", group: "x" },
    { id: "C", group: "y" }, { id: "D", group: "y" },
    { id: "E", group: "z" },
  ]
  const edges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "D", target: "E" },
  ]

  return React.createElement(ForceDirectedGraph, {
    nodes,
    edges,
    colorBy: "group",
    width: 400,
    height: 400,
    iterations: 300,
  })
}

// ── 9. Streaming Chord (blue-only regression) ────────────────────────────────

function StreamingChord() {
  const ref = useRef(null)

  useEffect(() => {
    const nodeNames = ["Web", "API", "DB", "Cache", "Queue"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 10) {
        const src = nodeNames[count % 5]
        const tgt = nodeNames[(count + 1) % 5]
        ref.current.push({ source: src, target: tgt, value: 10 + count * 3 })
        count++
      }
    }, 150)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(ChordDiagram, {
    ref,
    valueAccessor: "value",
    width: 400,
    height: 400,
  })
}

// ── 10. Streaming Donut (grey fill + legend regression) ──────────────────────

function StreamingDonut() {
  const ref = useRef(null)

  useEffect(() => {
    const slices = ["Red", "Green", "Blue"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 6) {
        ref.current.push({
          category: slices[count % 3],
          value: 30 + count * 10,
        })
        count++
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(DonutChart, {
    ref,
    categoryAccessor: "category",
    valueAccessor: "value",
    colorBy: "category",
    showLegend: true,
    width: 350,
    height: 300,
  })
}

// ── 11. Streaming Scatterplot (grey fill regression) ─────────────────────────

function StreamingScatter() {
  const ref = useRef(null)

  useEffect(() => {
    const groups = ["Type1", "Type2", "Type3"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 20) {
        ref.current.push({
          x: count * 5,
          y: 30 + Math.random() * 60,
          group: groups[count % 3],
        })
        count++
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(Scatterplot, {
    ref,
    xAccessor: "x",
    yAccessor: "y",
    colorBy: "group",
    width: 450,
    height: 300,
  })
}

const examples = [
  { key: "stacked-bar", title: "Streaming Stacked Bar", testId: "regression-stacked-bar", component: StreamingStackedBar },
  { key: "pie", title: "Streaming Pie", testId: "regression-pie", component: StreamingPie },
  { key: "bubble", title: "Streaming Bubble", testId: "regression-bubble", component: StreamingBubble },
  { key: "grouped-bar", title: "Streaming Grouped Bar", testId: "regression-grouped-bar", component: StreamingGroupedBar },
  { key: "stacked-area", title: "Streaming Stacked Area", testId: "regression-stacked-area", component: StreamingStackedArea },
  { key: "area-tooltip", title: "Area Chart Tooltip", testId: "regression-area-tooltip", component: AreaChartTooltipTest },
  { key: "line", title: "Streaming Line (no infinite loop)", testId: "regression-line-streaming", component: StreamingLine },
  { key: "force", title: "Force Graph Centering", testId: "regression-force-centering", component: ForceGraphCentering },
  { key: "chord", title: "Streaming Chord (multi-color)", testId: "regression-chord-streaming", component: StreamingChord },
  { key: "donut", title: "Streaming Donut", testId: "regression-donut", component: StreamingDonut },
  { key: "scatter", title: "Streaming Scatterplot", testId: "regression-scatter", component: StreamingScatter },
]

const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement(
    "div",
    { className: "test-grid" },
    examples.map(({ key, title, testId, component }) =>
      React.createElement(TestCase, { key, title, testId, children: React.createElement(component) })
    )
  )
)
