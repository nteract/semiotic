import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { StreamPhysicsFrame } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

const frameSize = [620, 360]

const plotBounds = {
  x: 36,
  y: 28,
  width: 548,
  height: 304,
}

function boundsColliders(bounds, idPrefix = "bounds") {
  const wall = 18
  return [
    {
      id: `${idPrefix}-floor`,
      shape: {
        type: "aabb",
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height + wall / 2,
        width: bounds.width + wall * 2,
        height: wall,
      },
      restitution: 0.35,
      friction: 0.8,
    },
    {
      id: `${idPrefix}-left-wall`,
      shape: {
        type: "aabb",
        x: bounds.x - wall / 2,
        y: bounds.y + bounds.height / 2,
        width: wall,
        height: bounds.height,
      },
    },
    {
      id: `${idPrefix}-right-wall`,
      shape: {
        type: "aabb",
        x: bounds.x + bounds.width + wall / 2,
        y: bounds.y + bounds.height / 2,
        width: wall,
        height: bounds.height,
      },
    },
  ]
}

const rampColliders = [
  {
    id: "left-ramp",
    shape: {
      type: "segment",
      x1: plotBounds.x + 70,
      y1: plotBounds.y + 100,
      x2: plotBounds.x + 250,
      y2: plotBounds.y + 155,
      thickness: 8,
    },
    restitution: 0.2,
    friction: 0.45,
  },
  {
    id: "right-ramp",
    shape: {
      type: "segment",
      x1: plotBounds.x + plotBounds.width - 70,
      y1: plotBounds.y + 155,
      x2: plotBounds.x + plotBounds.width - 250,
      y2: plotBounds.y + 210,
      thickness: 8,
    },
    restitution: 0.2,
    friction: 0.45,
  },
]

const quickConfig = {
  kernel: {
    seed: 7,
    gravity: { x: 0, y: 680 },
    restitution: 0.42,
    friction: 0.55,
    velocityDamping: 0.996,
    sleepAfter: 0.5,
  },
  colliders: [...boundsColliders(plotBounds, "quick"), ...rampColliders],
  bodyLimit: 120,
  observation: {
    chartId: "stream-physics-frame-docs",
    chartType: "StreamPhysicsFrame",
  },
}

const quickSpawns = [
  { id: "sample-1", x: 112, y: 52, vx: 70, shape: { type: "circle", radius: 11 }, datum: { label: "A", mass: 1, color: "#4e79a7" } },
  { id: "sample-2", x: 146, y: 48, vx: 26, shape: { type: "circle", radius: 13 }, datum: { label: "B", mass: 2, color: "#f28e2b" } },
  { id: "sample-3", x: 180, y: 50, vx: -10, shape: { type: "circle", radius: 10 }, datum: { label: "C", mass: 1, color: "#59a14f" } },
  { id: "sample-4", x: 214, y: 44, vx: -42, shape: { type: "circle", radius: 12 }, datum: { label: "D", mass: 2, color: "#e15759" } },
  { id: "sample-5", x: 248, y: 50, vx: -76, shape: { type: "circle", radius: 11 }, datum: { label: "E", mass: 1, color: "#b07aa1" } },
  { id: "sample-6", x: 282, y: 46, vx: -110, shape: { type: "circle", radius: 12 }, datum: { label: "F", mass: 2, color: "#76b7b2" } },
]

const quickSemanticItems = [
  {
    id: "feed",
    label: "Input feed",
    description: "Six queued bodies enter the physics scene from the upper left.",
    x: 190,
    y: 56,
    shape: "rect",
    width: 220,
    height: 48,
    group: "scene",
    datum: { role: "spawn region", count: quickSpawns.length },
  },
  {
    id: "ramps",
    label: "Ramp system",
    description: "Two segment colliders redirect moving bodies before they settle.",
    x: 310,
    y: 178,
    shape: "rect",
    width: 430,
    height: 150,
    group: "scene",
    datum: { role: "collider", count: rampColliders.length },
  },
  {
    id: "settle-bin",
    label: "Settling region",
    description: "The bounded floor and walls keep live bodies in the frame.",
    x: 310,
    y: 306,
    shape: "rect",
    width: 548,
    height: 44,
    group: "scene",
    datum: { role: "bounds" },
  },
]

const sensorSpawns = [
  { id: "packet-1", x: 120, y: 46, vx: 90, shape: { type: "circle", radius: 10 }, datum: { route: "alpha", state: "queued" } },
  { id: "packet-2", x: 180, y: 40, vx: 60, shape: { type: "circle", radius: 11 }, datum: { route: "alpha", state: "queued" } },
  { id: "packet-3", x: 240, y: 44, vx: 24, shape: { type: "circle", radius: 10 }, datum: { route: "beta", state: "queued" } },
  { id: "packet-4", x: 300, y: 42, vx: -24, shape: { type: "circle", radius: 12 }, datum: { route: "beta", state: "queued" } },
  { id: "packet-5", x: 360, y: 46, vx: -58, shape: { type: "circle", radius: 10 }, datum: { route: "gamma", state: "queued" } },
  { id: "packet-6", x: 420, y: 40, vx: -90, shape: { type: "circle", radius: 11 }, datum: { route: "gamma", state: "queued" } },
]

const sensorSemanticItems = [
  {
    id: "inspection-sensor-item",
    label: "Inspection sensor",
    description: "A non-blocking sensor region records proximity enter events.",
    x: 310,
    y: 204,
    shape: "rect",
    width: 430,
    height: 54,
    group: "sensor",
    datum: { sensorId: "inspection-sensor", event: "physics-proximity-enter" },
  },
  {
    id: "sensor-floor-item",
    label: "Settled packets",
    description: "Detected packets keep their changed state after passing the sensor.",
    x: 310,
    y: 306,
    shape: "rect",
    width: 548,
    height: 44,
    group: "result",
    datum: { role: "detected state" },
  },
]

function physicsStructureOverlay({ sensor = false } = {}) {
  return ({ size }) => {
    const width = Number(size[0]) || frameSize[0]
    const height = Number(size[1]) || frameSize[1]
    const xScale = width / frameSize[0]
    const yScale = height / frameSize[1]
    const scalePoint = (x, y) => [x * xScale, y * yScale]
    const [floorX1, floorY] = scalePoint(plotBounds.x, plotBounds.y + plotBounds.height)
    const [floorX2] = scalePoint(
      plotBounds.x + plotBounds.width,
      plotBounds.y + plotBounds.height
    )
    const [leftRampX1, leftRampY1] = scalePoint(rampColliders[0].shape.x1, rampColliders[0].shape.y1)
    const [leftRampX2, leftRampY2] = scalePoint(rampColliders[0].shape.x2, rampColliders[0].shape.y2)
    const [rightRampX1, rightRampY1] = scalePoint(rampColliders[1].shape.x1, rampColliders[1].shape.y1)
    const [rightRampX2, rightRampY2] = scalePoint(rampColliders[1].shape.x2, rampColliders[1].shape.y2)
    const sensorX = (plotBounds.x + 58) * xScale
    const sensorY = (plotBounds.y + 150) * yScale
    const sensorWidth = 430 * xScale
    const sensorHeight = 54 * yScale

    return (
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <rect
          x={plotBounds.x * xScale}
          y={plotBounds.y * yScale}
          width={plotBounds.width * xScale}
          height={plotBounds.height * yScale}
          fill="none"
          stroke="var(--surface-3, #d1d5db)"
          strokeWidth={1}
        />
        <line
          x1={floorX1}
          x2={floorX2}
          y1={floorY}
          y2={floorY}
          stroke="var(--text-secondary, #555)"
          strokeWidth={2}
        />
        <line
          x1={leftRampX1}
          y1={leftRampY1}
          x2={leftRampX2}
          y2={leftRampY2}
          stroke="var(--accent, #4e79a7)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeOpacity={0.45}
        />
        <line
          x1={rightRampX1}
          y1={rightRampY1}
          x2={rightRampX2}
          y2={rightRampY2}
          stroke="var(--accent, #4e79a7)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeOpacity={0.45}
        />
        {sensor ? (
          <rect
            x={sensorX}
            y={sensorY}
            width={sensorWidth}
            height={sensorHeight}
            fill="#10b981"
            fillOpacity={0.12}
            stroke="#10b981"
            strokeDasharray="6 5"
            strokeWidth={2}
          />
        ) : null}
      </svg>
    )
  }
}

const quickOverlay = physicsStructureOverlay()
const sensorOverlay = physicsStructureOverlay({ sensor: true })

function bodyStyle(body) {
  const datum = body.datum || {}
  return {
    fill: datum.color || "#4e79a7",
    stroke: "#111827",
    strokeWidth: 1,
    opacity: 0.92,
  }
}

const physicsFrameProps = [
  { name: "config", type: "object", required: false, default: null, description: "Physics pipeline configuration: kernel options, colliders, body budget, observation hooks, sediment, timing, and engine adapter." },
  { name: "initialSpawns", type: "array", required: false, default: "[]", description: "Initial queued bodies. Each spawn has id, x, y, optional velocity, shape, datum, spawnAt, and optional springs." },
  { name: "initialSpawnPacing", type: "object", required: false, default: null, description: 'Controls spawn timing: immediate, arrival time, or { ratePerSec } pacing.' },
  { name: "bodyStyle", type: "function", required: false, default: null, description: "Canvas style object or function for each live body. Receives the body and selected/simulation context." },
  { name: "selectedBodyStyle", type: "function", required: false, default: null, description: "Style patch applied when selection marks a body active." },
  { name: "selection", type: "object", required: false, default: null, description: "Selection predicate for styling matching bodies." },
  { name: "backgroundGraphics", type: "function", required: false, default: null, description: "SVG/React graphics rendered behind the canvas." },
  { name: "foregroundGraphics", type: "function", required: false, default: null, description: "SVG/React graphics rendered above the canvas, useful for pegs, bins, sensors, lanes, and guides." },
  { name: "semanticItems", type: "array", required: false, default: "[]", description: "Keyboard-navigable semantic structures such as bins, routes, sensor regions, or bounded areas." },
  { name: "accessibleTable", type: "boolean", required: false, default: "true", description: "Expose semanticItems as the accessible data table." },
  { name: "description", type: "string", required: false, default: null, description: "Longer accessible description for the frame." },
  { name: "summary", type: "string", required: false, default: null, description: "Short screen-reader summary of the physics scene." },
  { name: "title", type: "string", required: false, default: null, description: "Accessible chart title." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable body hit testing and tooltips." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pointer hit-test radius in pixels." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip renderer for PhysicsHoverData." },
  { name: "onBodyHover", type: "function", required: false, default: null, description: "Called with the hovered body and hover payload, or null when hover clears." },
  { name: "onBodyPointerDown", type: "function", required: false, default: null, description: "Pointer-down callback with the nearest body, if any." },
  { name: "onSemanticItemFocus", type: "function", required: false, default: null, description: "Called when keyboard navigation focuses a semantic item." },
  { name: "onSemanticItemActivate", type: "function", required: false, default: null, description: "Called when Enter or Space activates the focused semantic item." },
  { name: "onTick", type: "function", required: false, default: null, description: "Frame tick callback with physics result and imperative controls." },
  { name: "onSimulationExecutionChange", type: "function", required: false, default: null, description: "Reports whether the frame is running sync or worker execution and why." },
  { name: "simulationExecution", type: "string", required: false, default: '"auto"', description: '"auto", "sync", or "worker". Auto uses the worker when the config is cloneable and body counts justify it.' },
  { name: "workerBodyThreshold", type: "number", required: false, default: null, description: "Minimum body count for automatic worker execution." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation loop." },
  { name: "suspendWhenHidden", type: "boolean", required: false, default: "true", description: "Pause work while the document is hidden." },
  { name: "size", type: "[number, number]", required: false, default: "[640, 360]", description: "Frame dimensions." },
  { name: "responsiveWidth", type: "boolean", required: false, default: "false", description: "Resize to container width." },
  { name: "responsiveHeight", type: "boolean", required: false, default: "false", description: "Resize to container height." },
]

export default function PhysicsFramePage() {
  return (
    <PageLayout
      title="StreamPhysicsFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "StreamPhysicsFrame", path: "/frames/physics-frame" },
      ]}
      prevPage={{ title: "StreamGeoFrame", path: "/frames/geo-frame" }}
      nextPage={null}
    >
      <ComponentMeta
        componentName="StreamPhysicsFrame"
        importStatement='import { StreamPhysicsFrame } from "semiotic/physics"'
        tier="frames"
        related={[
          { name: "GaltonBoardChart", path: "/charts/galton-board-chart" },
          { name: "EventDropChart", path: "/charts/event-drop-chart" },
          { name: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
        ]}
      />

      <p>
        StreamPhysicsFrame is the low-level frame behind Semiotic physics
        process-driven physics charts. Use it when the chart wrappers are too
        specific and you need to declare bodies, colliders, sensors, observation
        events, semantic regions, and custom foreground or background graphics
        directly.
      </p>

      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide a physics <code>config</code>, a list of{" "}
        <code>initialSpawns</code>, and optional graphics that explain the
        physical structure. Hover the bodies for tooltips or tab into the frame
        to move through the semantic regions.
      </p>

      <LiveExample
        frameProps={{
          title: "Bounded physics scene",
          summary: "Six bodies fall through two ramps into a bounded settling region.",
          description: "A low-level StreamPhysicsFrame scene with circular body spawns, segment colliders, bounds, hover tooltips, semantic regions, and a data table.",
          size: frameSize,
          config: quickConfig,
          initialSpawns: quickSpawns,
          foregroundGraphics: quickOverlay,
          bodyStyle,
          semanticItems: quickSemanticItems,
          accessibleTable: true,
          enableHover: true,
          hoverRadius: 18,
        }}
        type={StreamPhysicsFrame}
        importStatement='import { StreamPhysicsFrame } from "semiotic/physics"'
        startHidden={false}
        overrideProps={{
          config: `{
  kernel: { gravity: { x: 0, y: 680 }, restitution: 0.42 },
  colliders: [...boundsColliders, ...rampColliders],
  observation: { chartId: "stream-physics-frame-docs", chartType: "StreamPhysicsFrame" }
}`,
          initialSpawns: `[
  { id: "sample-1", x: 112, y: 52, vx: 70, shape: { type: "circle", radius: 11 }, datum: { label: "A" } },
  // ...more queued bodies
]`,
          foregroundGraphics: "({ size }) => <svg>{/* visual bounds and ramps */}</svg>",
          bodyStyle: `(body) => ({
  fill: body.datum?.color || "#4e79a7",
  stroke: "#111827",
  strokeWidth: 1
})`,
          semanticItems: `[
  { id: "feed", label: "Input feed", x: 190, y: 56, shape: "rect", width: 220, height: 48 },
  { id: "ramps", label: "Ramp system", x: 310, y: 178, shape: "rect", width: 430, height: 150 },
  // ...more semantic regions
]`,
        }}
        hiddenProps={{}}
      />

      <h2 id="sensors">Sensors and Observation</h2>

      <p>
        Sensors are colliders with <code>sensor: true</code>. They do not block
        bodies, but they emit proximity observations. This example changes each
        each packet state after it passes through the green sensor region.
      </p>

      <SensorStateExample />

      <CodeBlock
        language="jsx"
        code={`import { useMemo, useState } from "react"
import { StreamPhysicsFrame } from "semiotic/physics"

function SensorScene() {
  const [detected, setDetected] = useState(new Set())

  const config = useMemo(() => ({
    kernel: { gravity: { x: 0, y: 620 } },
    colliders: [
      ...boundsColliders,
      { id: "inspection-sensor", sensor: true, shape: { type: "aabb", x: 310, y: 204, width: 430, height: 54 } },
    ],
    observation: {
      chartId: "sensor-docs",
      chartType: "StreamPhysicsFrame",
      sensors: {
        "inspection-sensor": {
          binId: "inspection",
          enterType: "physics-proximity-enter",
          exitType: "physics-proximity-exit",
        },
      },
      onObservation: (event) => {
        if (event.type !== "physics-proximity-enter" || !event.bodyId) return
        setDetected((previous) => {
          const next = new Set(previous)
          next.add(event.bodyId)
          return next
        })
      },
    },
  }), [])

  return (
    <StreamPhysicsFrame
      config={config}
      initialSpawns={packets}
      foregroundGraphics={sensorOverlay}
      semanticItems={sensorSemanticItems}
      bodyStyle={(body) => ({
        fill: detected.has(body.id) ? "#10b981" : "#4e79a7",
        stroke: detected.has(body.id) ? "#065f46" : "#1f2937",
      })}
      enableHover
    />
  )
}`}
      />

      <h2 id="imperative-control">Imperative Control</h2>

      <p>
        The frame ref exposes the physics control surface directly. Use this for
        application-level controls, custom stream ingestion, snapshot/restore,
        one-off impulses, or deterministic settle probes.
      </p>

      <p>
        Time-based controllers and continuous forces use simulated fixed-step
        time, not the requested browser-frame delta. A controller receives{" "}
        <code>ctx.dt = result.steps * fixedDt</code>. A zero-step call can
        synchronize the frame, but it applies no continuous force and consumes
        no capacity work.
      </p>

      <CodeBlock
        language="jsx"
        code={`const frameRef = useRef(null)

frameRef.current?.push({
  id: "next-particle",
  x: 120,
  y: 40,
  vx: 80,
  shape: { type: "circle", radius: 10 },
  datum: { label: "next" },
})

frameRef.current?.applyImpulse("next-particle", 120, -40)
const result = frameRef.current?.step(1 / 30)
const fixedDt = frameRef.current?.snapshot().config.fixedDt
const simulatedDt = (result?.steps ?? 0) * fixedDt

frameRef.current?.step(0) // synchronization only: simulated dt is zero
const settledSteps = frameRef.current?.settle(240)
const bodies = frameRef.current?.getData()
const snapshot = frameRef.current?.snapshot()`}
      />

      <h2 id="props">Props</h2>

      <PropTable componentName="StreamPhysicsFrame" props={physicsFrameProps} />

      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/galton-board-chart">GaltonBoardChart</Link> -
          chart wrapper for binned falling samples.
        </li>
        <li>
          <Link to="/charts/event-drop-chart">EventDropChart</Link> - chart
          wrapper for arrival windows, watermarks, and late events.
        </li>
        <li>
          <Link to="/charts/physical-flow-chart">PhysicalFlowChart</Link> -
          chart wrapper for route-level packet flow, sensors, and fluid shapes.
        </li>
        <li>
          <Link to="/charts/physics-custom-chart">PhysicsCustomChart</Link> -
          layout callback API when you want custom physics without hand-wiring
          the full frame.
        </li>
        <li>
          <Link to="/dev/physics-frame">Physics frame sandbox</Link> - deeper
          mechanics playground for engine and pipeline behavior.
        </li>
      </ul>
    </PageLayout>
  )
}

function SensorStateExample() {
  const [detected, setDetected] = useState(new Set())
  const [runId, setRunId] = useState(0)
  const [focusedItem, setFocusedItem] = useState(null)

  const config = useMemo(
    () => ({
      kernel: {
        seed: 11,
        gravity: { x: 0, y: 620 },
        restitution: 0.34,
        friction: 0.55,
        velocityDamping: 0.996,
      },
      colliders: [
        ...boundsColliders(plotBounds, "sensor"),
        {
          id: "inspection-sensor",
          sensor: true,
          shape: {
            type: "aabb",
            x: plotBounds.x + plotBounds.width / 2,
            y: plotBounds.y + 177,
            width: 430,
            height: 54,
          },
        },
      ],
      observation: {
        chartId: "stream-physics-sensor-docs",
        chartType: "StreamPhysicsFrame",
        sensors: {
          "inspection-sensor": {
            binId: "inspection",
            enterType: "physics-proximity-enter",
            exitType: "physics-proximity-exit",
          },
        },
        onObservation: (event) => {
          if (event.type !== "physics-proximity-enter" || !event.bodyId) return
          setDetected((previous) => {
            if (previous.has(event.bodyId)) return previous
            const next = new Set(previous)
            next.add(event.bodyId)
            return next
          })
        },
      },
    }),
    []
  )

  const detectedCount = detected.size

  return (
    <div className="live-example">
      <div className="live-example-viz">
        <StreamPhysicsFrame
          key={runId}
          title="Sensor observation scene"
          summary={`${detectedCount} packet${detectedCount === 1 ? "" : "s"} detected by the proximity sensor.`}
          description="Packets fall through a non-blocking sensor region. Proximity enter observations update packet state and the accessible semantic data table exposes the sensor as the navigable item."
          size={frameSize}
          config={config}
          initialSpawns={sensorSpawns}
          foregroundGraphics={sensorOverlay}
          semanticItems={sensorSemanticItems}
          accessibleTable
          enableHover
          hoverRadius={18}
          onSemanticItemFocus={setFocusedItem}
          bodyStyle={(body) => {
            const isDetected = detected.has(body.id)
            return {
              fill: isDetected ? "#10b981" : "#4e79a7",
              stroke: isDetected ? "#065f46" : "#1f2937",
              strokeWidth: isDetected ? 2 : 1,
              opacity: 0.94,
            }
          }}
          tooltipContent={(hover) => (
            <div className="semiotic-tooltip">
              <strong>{hover.id}</strong>
              <div>{detected.has(hover.id) ? "detected" : "not detected"}</div>
              <div>x: {Math.round(hover.x)}</div>
              <div>y: {Math.round(hover.y)}</div>
            </div>
          )}
        />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => {
            setDetected(new Set())
            setFocusedItem(null)
            setRunId((id) => id + 1)
          }}
        >
          Restart
        </button>
        <span>
          Detected: <strong>{detectedCount}</strong> / {sensorSpawns.length}
        </span>
        {focusedItem ? <span>Focused: {focusedItem.label}</span> : null}
      </div>
    </div>
  )
}
