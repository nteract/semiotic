import React from "react"
import { EventDropChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import CodeBlock from "../../components/CodeBlock"

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
  { name: "arrivalAccessor", type: "string | function", required: false, default: '"arrivalTime"', description: "Arrival-time field used for admission order and ingestion pacing. Ties retain source order." },
  { name: "watermarkAtArrivalAccessor", type: "string | function", required: false, default: null, description: "Recorded watermark for each arrival, independent of current window closure." },
  { name: "windows", type: "object", required: false, default: "{ size: 10 }", description: "Window config such as { size, gapPolicy }." },
  { name: "watermark", type: "object | function", required: false, default: null, description: "{ delay } or a latest-event-time function replays a monotonic watermark; { value } tests one fixed admission policy." },
  { name: "timeScale", type: "number", required: false, default: "1", description: "Arrival replay playback speed; higher is faster (1 = real event-time)." },
  { name: "ballRadius", type: "number", required: false, default: "7", description: "Radius for each simulated event body." },
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
      nextPage={{ title: "UnitPileChart", path: "/charts/unit-pile-chart" }}
    >
      <ComponentMeta
        componentName="EventDropChart"
        importStatement='import { EventDropChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "GaltonBoardChart", path: "/charts/galton-board-chart" },
          { name: "UnitPileChart", path: "/charts/unit-pile-chart" },
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
      <p>
        Each circle is one event. Its event time selects a window; its arrival time
        determines when that window&apos;s admission policy is checked. This history
        accepts six events and rejects the old event arriving at 33. Advancing the
        watermark closes windows without relabeling events they already accepted.
      </p>
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

      <h2 id="admission-history">Replay and recorded admission</h2>
      <p>
        With <code>watermark={"{{ delay: 8 }}"}</code>, arrivals advance the watermark
        from the greatest event time seen so far. The comparison uses the end of
        the event&apos;s window, including equality. <code>timeScale</code> changes
        playback speed while preserving those decisions.
      </p>
      <p>
        Use <code>watermark.value</code> to test a fixed current policy. If your
        records include the watermark at each original arrival, pass that field
        through <code>watermarkAtArrivalAccessor</code>; current window closure can
        then change independently of historical acceptance. The{" "}
        <a href="/examples/watermarks">Watermarks example</a> demonstrates this with
        an inspectable decision for each event.
      </p>

      <h2 id="physical-reading">Read the containers and the clock</h2>
      <p>
        A closed lid is solid for every event. In a snapshot of the current board,
        previously accepted events start beneath their lids. Later arrivals fall
        onto the ramp and roll into the farthest-left bin. Window labels report
        accepted source totals; the far-left label reports the total sent there.
        These totals describe the snapshot, including events still being illustrated.
        If you rewind current closure while retaining recorded rejections, that
        rejected history starts inside the far-left bin; the reopened board cannot
        reenact its earlier rejection.
      </p>
      <p>
        To show the causal sequence, supply successive data and watermark states:
        let an event enter, close its lid, then supply the late arrival. Keep the
        chart mounted and use stable event IDs. The{" "}
        <a href="/examples/watermarks">three-step Watermarks lesson</a> pauses source
        time while each arrival travels and counts actual container occupancy.
        Changing <code>timeScale</code> alone does not animate historical lid changes.
      </p>
      <p>
        For live container counts, use the metadata from{" "}
        <code>buildEventDropPhysics</code> with the same layout options as the chart.
        The helper classifies each body&apos;s center by its physical container,
        independently of its source admission flag. A body inside a bin can still
        be moving; this is occupancy, not a claim that it has settled.
      </p>
      <CodeBlock language="tsx" code={`import { readEventDropOccupancy } from "semiotic/physics"

// In frameProps.onTick, using metadata from the matching layout:
const counts = readEventDropOccupancy(metadata, controls.readBodies())
// { accepted: [countPerWindow, ...], late, inFlight, total }
// sum(accepted) + late + inFlight === total
// total covers materialized bodies; queued arrivals are not included.`} />

      <h2 id="props">Props</h2>
      <PropTable componentName="EventDropChart" props={eventDropChartProps} />
    </PageLayout>
  )
}
