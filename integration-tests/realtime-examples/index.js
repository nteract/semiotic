import * as Semiotic from "../../dist/semiotic.module.min.js"
import React, { useRef, useEffect } from "react"
import { createRoot } from "react-dom/client"

const {
  RealtimeLineChart,
  RealtimeHistogram,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
} = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

// Simple seeded pseudo-random for deterministic streaming data
function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Component that pushes data to a realtime line chart
function StreamingLineChart() {
  const ref = useRef(null)

  useEffect(() => {
    const rng = seededRandom(42)
    let value = 50
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 100) {
        value += (rng() - 0.5) * 10
        ref.current.push({ time: Date.now(), value })
        count++
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(RealtimeLineChart, {
    ref,
    timeAccessor: "time",
    valueAccessor: "value",
    windowSize: 80,
    width: 500,
    height: 250,
    stroke: "#4682b4",
  })
}

// Component that pushes data to a realtime histogram
function StreamingHistogram() {
  const ref = useRef(null)

  useEffect(() => {
    const rng = seededRandom(123)
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 100) {
        const value = Math.abs(rng() * 200 - 100)
        ref.current.push({ time: Date.now(), value })
        count++
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(RealtimeHistogram, {
    ref,
    timeAccessor: "time",
    valueAccessor: "value",
    binSize: 20,
    width: 500,
    height: 250,
  })
}

// Component that pushes data to a realtime waterfall chart
function StreamingWaterfall() {
  const ref = useRef(null)

  useEffect(() => {
    const rng = seededRandom(456)
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 60) {
        const value = (rng() - 0.5) * 40
        ref.current.push({ time: Date.now(), value })
        count++
      }
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(RealtimeWaterfallChart, {
    ref,
    timeAccessor: "time",
    valueAccessor: "value",
    positiveColor: "#4caf50",
    negativeColor: "#f44336",
    width: 500,
    height: 250,
  })
}

// Component that pushes data to a realtime swarm chart
function StreamingSwarm() {
  const ref = useRef(null)

  useEffect(() => {
    const rng = seededRandom(789)
    const categories = ["A", "B", "C"]
    let count = 0
    const interval = setInterval(() => {
      if (ref.current && count < 80) {
        const value = rng() * 100
        const category = categories[Math.floor(rng() * 3)]
        ref.current.push({ time: Date.now(), value, category })
        count++
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return React.createElement(RealtimeSwarmChart, {
    ref,
    timeAccessor: "time",
    valueAccessor: "value",
    categoryAccessor: "category",
    width: 500,
    height: 250,
  })
}

const examples = [
  // 1. Realtime line chart
  TestCase({
    title: "Realtime Line Chart",
    testId: "realtime-line",
    children: React.createElement(StreamingLineChart),
  }),

  // 2. Realtime histogram
  TestCase({
    title: "Realtime Histogram",
    testId: "realtime-histogram",
    children: React.createElement(StreamingHistogram),
  }),

  // 3. Realtime waterfall chart
  TestCase({
    title: "Realtime Waterfall Chart",
    testId: "realtime-waterfall",
    children: React.createElement(StreamingWaterfall),
  }),

  // 4. Realtime swarm chart
  TestCase({
    title: "Realtime Swarm Chart",
    testId: "realtime-swarm",
    children: React.createElement(StreamingSwarm),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement("div", { className: "test-grid" }, examples))
