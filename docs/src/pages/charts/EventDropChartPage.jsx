import React from "react"
import { EventDropChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const eventDropData = [
  { id: "e0", time: 2, arrivalTime: 3, source: "api" },
  { id: "e1", time: 8, arrivalTime: 11, source: "api" },
  { id: "e2", time: 15, arrivalTime: 16, source: "batch" },
  { id: "e3", time: 18, arrivalTime: 29, source: "sensor" },
  { id: "e4", time: 25, arrivalTime: 26, source: "batch" },
  { id: "e5", time: 4, arrivalTime: 33, source: "late" },
  { id: "e6", time: 31, arrivalTime: 35, source: "sensor" },
]

const eventDropChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Event rows with event and arrival times." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Event-time field used for windows." },
  { name: "arrivalAccessor", type: "string | function", required: false, default: '"arrivalTime"', description: "Arrival-time field used for ingestion pacing." },
  { name: "windows", type: "object", required: false, default: "{ size: 10 }", description: "Window config such as { size, gapPolicy }." },
  { name: "watermark", type: "object | function", required: false, default: null, description: "Watermark delay object or resolver function." },
  { name: "timeScale", type: "number", required: false, default: "1", description: "Arrival replay playback speed; higher is faster (1 = real event-time)." },
  { name: "ballRadius", type: "number", required: false, default: "5", description: "Radius for each simulated event body." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Categorical field used to color bodies." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic simulation seed." },
  { name: "showProjection", type: "boolean", required: false, default: "true", description: "Draw the window bins, watermark, closed windows, and late-event scaffold over the moving bodies." },
  { name: "size", type: "array", required: false, default: "[760, 360]", description: "[width, height] in pixels." },
  { name: "width", type: "number", required: false, default: "760", description: "Width alias used when size is omitted." },
  { name: "height", type: "number", required: false, default: "360", description: "Height alias used when size is omitted." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pixel hit radius for event-body hover tooltips." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default event-body tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

export default function EventDropChartPage() {
  return (
    <PageLayout
      title="EventDropChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/event-drop-chart" },
        { label: "EventDropChart", path: "/charts/event-drop-chart" },
      ]}
      prevPage={{ title: "GaltonBoardChart", path: "/charts/galton-board-chart" }}
      nextPage={{ title: "PhysicsPileChart", path: "/charts/physics-pile-chart" }}
    >
      <ComponentMeta
        componentName="EventDropChart"
        importStatement='import { EventDropChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "GaltonBoardChart", path: "/charts/galton-board-chart" },
          { name: "PhysicsPileChart", path: "/charts/physics-pile-chart" },
          { name: "RealtimeHistogram", path: "/charts/realtime-histogram" },
        ]}
      />

      <ChartGrounding
        component="EventDropChart"
        props={{
          data: eventDropData,
          timeAccessor: "time",
          arrivalAccessor: "arrivalTime",
          windows: { size: 10 },
          watermark: { delay: 8 },
          title: "Event arrivals",
        }}
      />

      <h2 id="example">Example</h2>
      <div style={{ overflowX: "auto", border: "1px solid var(--surface-3)", borderRadius: 8, padding: 12 }}>
        <EventDropChart
          data={eventDropData}
          timeAccessor="time"
          arrivalAccessor="arrivalTime"
          colorBy="source"
          windows={{ size: 10 }}
          watermark={{ delay: 8 }}
          timeScale={20}
          size={[640, 320]}
          title="Event arrivals"
        />
      </div>

      <h2 id="props">Props</h2>
      <PropTable componentName="EventDropChart" props={eventDropChartProps} />
    </PageLayout>
  )
}
