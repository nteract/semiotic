import {
  EventDropChart,
  GaltonBoardChart,
  PhysicsPileChart,
} from "../../dist/physics.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const galtonData = Array.from({ length: 16 }, (_, index) => {
  const wave = Math.sin(index * 0.58) * 14
  const drift = (index % 6) * 6
  return {
    id: `sample-${index}`,
    value: Math.round(42 + wave + drift),
    cohort: index % 3 === 0 ? "forecast" : index % 3 === 1 ? "actual" : "prior",
  }
})

const eventDropData = [
  { id: "event-00", time: 2, arrivalTime: 0, stream: "late" },
  { id: "event-01", time: 5, arrivalTime: 0, stream: "late" },
  { id: "event-02", time: 8, arrivalTime: 0, stream: "late" },
  { id: "event-03", time: 12, arrivalTime: 0, stream: "late" },
  { id: "event-04", time: 16, arrivalTime: 0, stream: "late" },
  { id: "event-05", time: 21, arrivalTime: 0, stream: "on-time" },
  { id: "event-06", time: 24, arrivalTime: 0, stream: "on-time" },
  { id: "event-07", time: 27, arrivalTime: 0, stream: "on-time" },
  { id: "event-08", time: 31, arrivalTime: 0, stream: "on-time" },
  { id: "event-09", time: 34, arrivalTime: 0, stream: "on-time" },
  { id: "event-10", time: 38, arrivalTime: 0, stream: "on-time" },
]

const pileData = [
  { id: "north", category: "North", value: 9, segment: "A" },
  { id: "south", category: "South", value: 6, segment: "B" },
  { id: "east", category: "East", value: 12, segment: "A" },
  { id: "west", category: "West", value: 7, segment: "C" },
]

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function App() {
  return React.createElement(
    "div",
    { className: "test-grid" },
    React.createElement(
      TestCase,
      { title: "GaltonBoardChart settled", testId: "physics-galton-settled" },
      React.createElement(GaltonBoardChart, {
        data: galtonData,
        valueAccessor: "value",
        colorBy: "cohort",
        bins: 6,
        ballRadius: 3.5,
        seed: 42,
        size: [360, 240],
      })
    ),
    React.createElement(
      TestCase,
      { title: "EventDropChart settled", testId: "physics-eventdrop-settled" },
      React.createElement(EventDropChart, {
        data: eventDropData,
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        colorBy: "stream",
        windows: { size: 10 },
        watermark: { delay: 12 },
        ballRadius: 5,
        seed: 7,
        timeScale: 0.2,
        size: [380, 240],
      })
    ),
    React.createElement(
      TestCase,
      { title: "PhysicsPileChart settled", testId: "physics-pile-settled" },
      React.createElement(PhysicsPileChart, {
        data: pileData,
        categoryAccessor: "category",
        valueAccessor: "value",
        colorBy: "segment",
        unitValue: 1,
        ballRadius: 5,
        seed: 19,
        size: [380, 240],
      })
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
