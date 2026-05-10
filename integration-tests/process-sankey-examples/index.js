import * as Semiotic from "../../dist/semiotic.module.min.js"
import React, { useRef, useState } from "react"
import { createRoot } from "react-dom/client"

const { ProcessSankey } = Semiotic

const D = (y, m, d) => new Date(y, m - 1, d).getTime()
const DOMAIN = [D(2026, 1, 1), D(2026, 6, 30)]

// Static fixture: a small project-team flow with categorical coloring.
const STATIC_NODES = [
  { id: "Alice",   category: "Person",    xExtent: [D(2026, 1, 6), D(2026, 1, 6)] },
  { id: "Bob",     category: "Person",    xExtent: [D(2026, 2, 1), D(2026, 2, 1)] },
  { id: "Eng",     category: "Team" },
  { id: "Release", category: "Milestone", xExtent: [D(2026, 4, 15), D(2026, 6, 28)] },
]
const STATIC_EDGES = [
  { id: "alice-eng", source: "Alice", target: "Eng",     value: 8,  startTime: D(2026, 1, 20), endTime: D(2026, 2, 10) },
  { id: "bob-eng",   source: "Bob",   target: "Eng",     value: 5,  startTime: D(2026, 2, 15), endTime: D(2026, 3, 15) },
  { id: "eng-rel",   source: "Eng",   target: "Release", value: 13, startTime: D(2026, 4, 15), endTime: D(2026, 5, 15) },
]

// Streaming fixture: a smaller library + 3 commits.
const STREAM_NODES = [
  { id: "Library", category: "Library", xExtent: [D(2026, 1, 5), D(2026, 4, 1)] },
  { id: "PR1",     category: "PR" },
  { id: "c1",      category: "Commit", xExtent: [D(2026, 1, 3), D(2026, 1, 6)] },
  { id: "c2",      category: "Commit", xExtent: [D(2026, 1, 5), D(2026, 1, 10)] },
]
const STREAM_EDGES = [
  { id: "c1-PR1",      source: "c1",  target: "PR1",     value: 2, startTime: D(2026, 1, 6),  endTime: D(2026, 1, 8) },
  { id: "c2-PR1",      source: "c2",  target: "PR1",     value: 3, startTime: D(2026, 1, 10), endTime: D(2026, 1, 12) },
  { id: "PR1-Library", source: "PR1", target: "Library", value: 5, startTime: D(2026, 1, 14), endTime: D(2026, 1, 18) },
]

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function StaticBasic() {
  return React.createElement(ProcessSankey, {
    nodes: STATIC_NODES,
    edges: STATIC_EDGES,
    domain: DOMAIN,
    width: 600,
    height: 320,
    colorBy: "category",
    showLegend: true,
  })
}

function StaticParticles() {
  return React.createElement(ProcessSankey, {
    nodes: STATIC_NODES,
    edges: STATIC_EDGES,
    domain: DOMAIN,
    width: 600,
    height: 320,
    colorBy: "category",
    showLegend: true,
    showParticles: true,
  })
}

function PushDemo() {
  const ref = useRef(null)
  const [count, setCount] = useState(0)

  const seed = () => {
    if (!ref.current) return
    ref.current.clear()
    const queue = [...STREAM_NODES, ...STREAM_EDGES]
    for (const item of queue) ref.current.push(item)
    setCount(queue.length)
  }

  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { style: { marginBottom: 8, display: "flex", gap: 8 } },
      React.createElement(
        "button",
        { onClick: seed, "data-testid": "push-seed" },
        "Seed"
      ),
      React.createElement(
        "button",
        {
          onClick: () => { ref.current?.clear(); setCount(0) },
          "data-testid": "push-clear",
        },
        "Clear"
      ),
      React.createElement(
        "span",
        { "data-testid": "push-count", style: { alignSelf: "center", fontSize: 12 } },
        `pushed ${count}`
      )
    ),
    React.createElement(ProcessSankey, {
      ref,
      domain: DOMAIN,
      width: 600,
      height: 320,
      colorBy: "category",
      showLegend: true,
    })
  )
}

function ValidationFailure() {
  // endTime <= startTime — fails validation.
  return React.createElement(ProcessSankey, {
    nodes: [{ id: "A" }, { id: "B" }],
    edges: [
      { id: "bad", source: "A", target: "B", value: 1, startTime: D(2026, 3, 1), endTime: D(2026, 2, 1) },
    ],
    domain: DOMAIN,
    width: 600,
    height: 200,
  })
}

const App = () =>
  React.createElement(
    "div",
    { className: "test-grid" },
    React.createElement(TestCase, { title: "Static — categorical colors", testId: "static-basic" },
      React.createElement(StaticBasic)),
    React.createElement(TestCase, { title: "Static — particles on", testId: "static-particles" },
      React.createElement(StaticParticles)),
    React.createElement(TestCase, { title: "Push API", testId: "push-demo" },
      React.createElement(PushDemo)),
    React.createElement(TestCase, { title: "Validation failure", testId: "validation-failure" },
      React.createElement(ValidationFailure))
  )

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
