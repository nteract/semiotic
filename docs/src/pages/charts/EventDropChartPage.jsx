import React from "react"
import { Link } from "react-router-dom"
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
  { name: "live", type: "boolean | object", default: "false", description: 'React continuous mode: true or { follow: "watermark" | "now", horizon, retain }. Times use timeUnit, which defaults to seconds in live mode. Retires old bodies while preserving historical counts.' },
  { name: "emitters", type: "object", description: "Fixed-step producers in live push mode: { sources, seed?, rate?, active?, paused?, durationMs?, maxEvents? }. Omit data. Supports sync and worker execution and frame snapshots." },
  { name: "arrival", type: "string | object", default: '"drop"', description: 'Source choreography: "drop" or { mode: "travel", durationMs?: 800, speedPxPerSec?, path?: "straight" | "connector" | callback, history?: "present" | "travel" }. History defaults to present; travel animates every row. Choose duration or speed. Requires a visible source and the built-in engine.' },
  { name: "sources", type: "array", description: "Source identities with id, label, color, mark, glyph, active and visible. Historical counts remain when a tile is hidden." },
  { name: "sourceAccessor", type: "string | function", default: '"source"', description: "Field identifying an event's source." },
  { name: "sourceRail", type: "object", description: "{ side: left | top | none, tileSize? }. Use top for a narrow board." },
  { name: "onSourceClick", type: "function", description: "Called with the source on click, Enter or Space; the host updates active state." },
  { name: "timeUnit", type: '"ms" | "s"', description: "Explicit arrival-time units. Omitted infers ms above an absolute timestamp of 100000; use explicit units for stable streaming behavior." },
  { name: "onLedgerChange", type: "function", description: "Receives admission ledger rows, on lifecycle transitions or at most every 500ms during accumulation." },
  { name: "onWatermarkChange", type: "function", description: "Receives (value, previous) on watermark advances." },
  { name: "onClockTick", type: "function", description: "Simulation clock HUD callback, at most 10Hz, in sync and worker execution." },
  { name: "clockTickMs", type: "number", default: "100", description: "Minimum milliseconds between clock HUD callbacks; minimum 100." },
  { name: "windowChrome", type: "object", description: "{ show?, fill? }. Hide window paint without removing colliders, or supply a color / ledger-row fill callback." },
  { name: "data", type: "array", required: true, default: null, description: "Event rows with event and arrival times." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Event-time field used for windows." },
  { name: "arrivalAccessor", type: "string | function", required: false, default: '"arrivalTime"', description: "Arrival-time field used for admission order and ingestion pacing. Ties retain source order." },
  { name: "watermarkAtArrivalAccessor", type: "string | function", required: false, default: null, description: "Recorded watermark for each arrival, independent of current window closure." },
  { name: "windows", type: "object", required: false, default: "{ size: 10 }", description: "Window config such as { size, gapPolicy }." },
  { name: "watermark", type: "object | function", required: false, default: null, description: "{ delay } or a latest-event-time function replays a monotonic watermark; { value } tests one fixed admission policy." },
  { name: "timeScale", type: "number", required: false, default: "1", description: "Arrival replay playback speed; higher is faster (1 = real event-time)." },
  { name: "ballRadius", type: "number", required: false, default: "7", description: "Radius for each simulated event body." },
  { name: "colorBy", type: "string | function | object", required: false, default: null, description: "Categorical field, or { window: cycle | string[] } for a cyclic window palette." },
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

      <h2 id="arrival-travel">Travel from source to board</h2>
      <p>
        <Link to="/examples/emitter-playground">Try the single-emitter playground</Link>
        {" "}to pause a journey, turn the source on and off, and send an older event
        toward a closed window.
      </p>
      <p>
        Set <code>arrival={"{ mode: \"travel\", durationMs: 800, path: \"connector\" }"}</code>
        {" "}to move events from their source tiles before releasing them to gravity.
        Arrival times still mean board entry. Finite replay starts early enough to
        show the first journey; timeScale speeds up both travel and arrival pacing.
        Choose durationMs (milliseconds in either timeUnit) or speedPxPerSec,
        a speed ceiling that derives one shared duration from the longest path.
        A constant duration preserves arrival ties across sources.
      </p>
      <CodeBlock language="tsx" code={`<EventDropChart
  data={[
    { id: "newer", source: "p1", time: 35, arrivalTime: 0 },
    { id: "older", source: "p2", time: 5, arrivalTime: 0.25 }
  ]}
  sources={[{ id: "p1", label: "P1" }, { id: "p2", label: "P2" }]}
  sourceRail={{ side: "top" }}
  arrival={{ mode: "travel", durationMs: 2000, path: "straight" }}
  timeUnit="s"
  windows={{ size: 10 }}
  watermark={{ delay: 100 }}
  title="Out-of-order events"
  description="P2 emits later and travels toward an older event-time window."
/>`} />
      <p>
        React paths may be callbacks returning finite points, including the supplied
        source and destination endpoints. The compiled path runs in the built-in
        kernel on both sync and worker execution. Travelling bodies ignore contacts
        and sensors and count as inFlight. Their tooltip/style datum carries
        __phase: travel, board, late, or settled. Reduced motion and server rendering
        show the same settled board as drop mode. Replay projection totals still
        describe all supplied rows, regardless of animation progress.
      </p>
      <p>
        Historical admissions already beneath closed lids, or recorded rejections
        whose lids have reopened, appear directly in their containers. Rows without
        a visible source tile use ordinary drops. A resize preserves elapsed travel;
        admitted bodies stay on the board. Imperative pushes begin their journey
        immediately; scheduling an unbounded stream remains application-owned.
      </p>
      <h2 id="sources-and-accounting">Sources and admission accounting</h2>
      <p>
        Source tiles are keyboard accessible and can use circle, square, triangle,
        hexagon, or a GlyphDef pictogram. Their active state is controlled by your
        application; update it in onSourceClick and use it when scheduling arrivals.
        Hiding a tile removes its table column without deleting its historical totals.
      </p>
      <CodeBlock language="tsx" code={`import { EventDropChart, syntheticArrivals } from "semiotic/physics"

const stream = syntheticArrivals([
  { id: "p1", interval: 500 },
  { id: "p2", interval: 300, jitter: "watermarks" },
  { id: "p3", interval: 2000, jitter: "watermarks",
    burst: { min: 5, max: 15, gapMs: [1500, 2500], intraMs: 20 } }
], 42)
const events = Array.from({ length: 60 }, () => stream.next().value!)

<EventDropChart
  data={events}
  timeAccessor="eventTime"
  timeUnit="ms"
  windows={{ size: 2500 }}
  watermark={{ delay: 1000 }}
  sources={[
    { id: "p1", label: "P1", mark: "circle" },
    { id: "p2", label: "P2", mark: "square" },
    { id: "p3", label: "P3", mark: "triangle" }
  ]}
  colorBy={{ window: "cycle" }}
  title="Three producers"
  description="Arrival-ordered events grouped into 2.5-second windows."
/>`} />
      <p>
        The EventDropChartHandle ref exposes getLedger(), getSourceStats(id),
        getWatermark(), getClock(), setTimeScale(k), and getStore(). Ledger rows
        contain windowId, start, end, accepted, late, bySource, open, closedAt and
        watermarkAtClose. These are source snapshot totals, independent of moving
        body positions. A close observation captures counts at closure; later
        rejected arrivals can increase the ledger's late total.
      </p>
      <p>
        For application-owned clocks, createSyntheticEmitter(spec, seed).advance(deltaMs,
        options) accepts simulated milliseconds and optional paused, rate, and active
        source flags. Pausing advances neither its time nor its sequence. The pure
        EventDropLedger accumulator accepts arrivals in nondecreasing arrival order;
        advance(now) evaluates external watermarks and source idle timeouts. Its
        watermark policy also supports perSource, idleTimeout and allowedLateness.
        Replay charts evaluate those policies at arrival checkpoints.
      </p>
      <h2 id="continuous-streams">Continuous streams</h2>
      <p>
        Enable <code>live</code> for incremental admission and a moving board.
        Events enter the ledger when their source-to-board journey finishes.
        Old bodies and window colliders retire as the camera advances; historical
        counts stay in <code>getLedger()</code> and the accessible table.
        Omit <code>data</code> to accept ref pushes or built-in emitters.
      </p>
      <CodeBlock language="tsx" code={`import { useRef } from "react"
import { EventDropChart } from "semiotic/physics"
import type { EventDropChartHandle } from "semiotic/physics"

function LiveStream() {
  const chart = useRef<EventDropChartHandle>(null)
  return <EventDropChart
    ref={chart}
    live={{ follow: "now", horizon: 5, retain: 15 }}
    emitters={{ sources: [{ id: "p1", ratePerSec: 3 }], seed: 42 }}
    sources={[{ id: "p1", label: "Producer", color: "#2563eb" }]}
    arrival={{ mode: "travel", path: "connector", durationMs: 700 }}
    windows={{ size: 2.5 }}
    watermark={{ delay: 1 }}
    timeUnit="s"
    frameProps={{ simulationExecution: "worker", config: { bodyLimit: 160 } }}
    title="A continuous event stream"
    description="Events travel into time windows; old bodies retire and counts remain."
    accessibleTable
  />
}`} />
      <p>
        <code>live=true</code> follows the watermark with a one-window horizon
        and eight windows of retained history. Explicit <code>timeExtent[0]</code>
        supplies a timestamp origin. Live mode defaults to seconds; emitter
        intervals, jitter and duration limits always use milliseconds.
        <code>timeScale</code> scales the shared live clock. Pause freezes travel,
        sources, watermark polling and the camera together.
      </p>
      <p>
        Source <code>active</code> flags gate built-in emitters; an explicit
        <code>emitters.active</code> entry takes precedence. Rate, source activity,
        speed, watermark policy and size can update during a run. Source schedules,
        seed and limits belong to the run. Changing window size, units or timestamp
        origin requires a new React <code>key</code>; reflow is not implemented.
        Supplied data arrays remain authoritative, and imperative corrections to
        live admissions require clearing and replaying the run.
      </p>
      <p>
        <code>chart.current.snapshot()</code> captures bodies, pending travel,
        historical counts, clock and built-in emitter progress.
        <code>chart.current.restore(saved)</code> restores that state, including
        random generators and pause state. Structured-cloneable configurations
        work in workers; callback jitter, watermark or travel paths select sync.
        The <Link to="/examples/emitter-playground">playground</Link> includes
        snapshot controls, a three-source comparison and reduced-motion batches.
      </p>
      <p>
        Live mode bounds bodies and colliders, not the historical ledger, which
        keeps one row per observed window. Serialized server/MCP rendering requires
        finite replay data and rejects live programs. React SSR draws the initial
        live board without advancing its producers. Export a saved store through
        <code>unstable_renderPhysicsSettledSVG(store, {"{ maxSteps: 0 }"})</code>
        from <code>semiotic/experimental</code> to preserve the current camera
        and body positions.
      </p>
      <h2 id="clock-driven-emitters">Clock-driven emitters</h2>
      <p>
        <code>useEmitters(ref, specs, options)</code> connects a synthetic source to a
        push-mode chart. Spread its <code>frameProps</code> onto the chart and omit
        <code> data</code>. It uses simulated time, keeps an empty frame running, and
        stops emission while the chart is paused or hidden. See the{" "}
        <Link to="/examples/emitter-playground">interactive emitter playground</Link>{" "}
        for regular, jittered and bursty producers with live rate and speed controls.
      </p>
      <CodeBlock language="tsx" code={`import { useRef } from "react"
import { EventDropChart, useEmitters } from "semiotic/physics"
import type { EventDropChartHandle } from "semiotic/physics"

function Producer({ active = true, rate = 1, paused = false }) {
  const ref = useRef<EventDropChartHandle>(null)
  const emitters = useEmitters(ref, [{ id: "p1", ratePerSec: 2 }], {
    seed: 42,
    durationMs: 24000,
    maxEvents: 96,
    rate,
    active: { p1: active },
    mapArrival: (event) => ({ ...event, time: event.eventTime })
  })
  return <EventDropChart
    ref={ref}
    timeUnit="ms"
    timeExtent={[0, 24000]}
    windows={{ size: 5000 }}
    watermark={{ delay: 3000 }}
    sources={[{ id: "p1", label: "Producer", active }]}
    paused={paused}
    frameProps={emitters.frameProps}
    title="A bounded event stream"
  />
}`} />
      <p>
        Specs, seed, duration and maximum event count are captured on mount; remount
        the producer for a new run. Rate and active flags update without restarting
        ids or the remaining interval. A source switched off does not catch up when
        enabled again. Limits bound total generated events, not retained chart memory.
        The pure <code>createSyntheticEmitter</code> accepts the same limits as its
        third argument.
      </p>
      <p>
        The hook uses synchronous <code>onTick</code>. Pass an observer through its
        <code> options.onTick</code> to run after emission. For reduced-motion controls,
        set <code>manual: true</code> and call <code>advance(deltaMs)</code> explicitly.
        Use the chart handle&apos;s <code>setTimeScale</code> to change simulation speed;
        EventDrop&apos;s <code>timeScale</code> prop controls recorded replay pacing.
        This hook keeps its emitter outside the frame. Save and restore its
        <code>snapshot()</code> alongside the frame snapshot to rewind both;
        restoring only the frame rebases the hook clock and keeps its sequence.
        The pure emitter exposes the same snapshot/restore methods.
      </p>
      <p>
        With arrival choreography, <code>history: "present"</code> is the default:
        accepted history beneath closed lids and recorded rejections belonging to
        currently open windows appear directly in their containers. The playground
        uses <code>arrival={"{ mode: 'travel', history: 'travel', durationMs: 1200 }"}</code>{" "}
        so every emitted row makes the full journey. Its admission reservations
        assume equal travel durations and an unchanged watermark policy. Use
        <code>live</code> with built-in <code>emitters</code> for admission at the
        actual handoff, including worker execution.
      </p>
      <h2 id="physics-theme">Physics theme tokens</h2>
      <p>
        Every PhysicsCanvasTheme key accepts a dedicated CSS custom property
        named <code>--semiotic-physics-KEY</code>, with the exact camelCase key.
        The keys are annotationBackground, annotationStroke, annotationText,
        background, border, closedWindowFill, closedWindowStroke, danger, focus,
        grid, gutterFill, lateFill, openWindowFill, openWindowStroke, primary,
        selectedFill, selectedStroke, success, text, textSecondary, and warning.
        Dedicated tokens precede existing Semiotic and documentation-site tokens.
        React callers can use <code>{`frameProps={{ theme: { background: "#102030", openWindowFill: "#204060" } }}`}</code>.
        The same frameProps theme is retained by serialized server rendering.
      </p>
      <p>
        Body marks and glyphs affect paint only: their colliders stay circular.
        Both settled SVG and animated exports preserve the built-in marks.
        diagnoseConfig warns when a declarative glyph's aspect ratio exceeds 1.5.
      </p>
      <h2 id="props">Props</h2>
      <PropTable componentName="EventDropChart" props={eventDropChartProps} />
    </PageLayout>
  )
}
