import React, { useCallback, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChartContainer } from "semiotic"
import { PhysicsCustomChart, arrivalReplay, collidersFromScales } from "semiotic/physics"

import CodeBlock from "../../components/CodeBlock"
import ComponentMeta from "../../components/ComponentMeta"
import ChartGrounding from "../../components/ChartGrounding"
import PageLayout from "../../components/PageLayout"
import PropTable from "../../components/PropTable"
import "./PhysicsCustomChartPage.css"

const ROUTES = [
  { id: "triage", label: "Triage", color: "#4e79a7" },
  { id: "review", label: "Review", color: "#59a14f" },
  { id: "ship", label: "Ship", color: "#e15759" },
]

const ROUTE_LABELS = ROUTES.reduce((labels, route) => {
  labels[route.id] = route.label
  return labels
}, {})

const ROUTE_COLOR = ROUTES.reduce((colors, route) => {
  colors[route.id] = route.color
  return colors
}, {})

const INITIAL_PACKETS = [
  { id: "seed-001", route: "triage", priority: "standard", weight: 1.1 },
  { id: "seed-002", route: "review", priority: "rush", weight: 1.4 },
  { id: "seed-003", route: "ship", priority: "standard", weight: 1 },
  { id: "seed-004", route: "triage", priority: "audit", weight: 1.2 },
  { id: "seed-005", route: "ship", priority: "rush", weight: 1.5 },
  { id: "seed-006", route: "review", priority: "standard", weight: 1 },
  { id: "seed-007", route: "triage", priority: "rush", weight: 1.6 },
  { id: "seed-008", route: "ship", priority: "audit", weight: 1.3 },
]

const physicsCustomChartProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Initial rows to convert into physics bodies." },
  { name: "layout", type: "function", required: true, default: null, description: "Receives the physics custom layout context and returns bodies, colliders, sensors, semantic items, overlays, and config." },
  { name: "layoutConfig", type: "object", required: false, default: "{}", description: "Custom options passed through to the layout function." },
  { name: "config", type: "object", required: false, default: null, description: "Base PhysicsPipelineConfig merged with the layout result." },
  { name: "spawnDatum", type: "function", required: false, default: null, description: "Converts pushed rows into one or more PhysicsQueuedSpawn objects." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Categorical field used by the default body style." },
  { name: "colorScheme", type: "array | object | string", required: false, default: null, description: "Palette or keyed color map for resolveColor." },
  { name: "xExtent", type: "array", required: false, default: "[0, 1]", description: "Domain for the x scale exposed to the layout context." },
  { name: "yExtent", type: "array", required: false, default: "[0, 1]", description: "Domain for the y scale exposed to the layout context." },
  { name: "size", type: "array", required: false, default: "[700, 380]", description: "[width, height] in pixels." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "accessibleTable", type: "boolean", required: false, default: "true", description: "Expose layout semanticItems through the skip link and data-summary table." },
  { name: "description", type: "string", required: false, default: null, description: "Accessible label for the physics chart frame." },
  { name: "summary", type: "string", required: false, default: null, description: "Screen-reader-only summary text for the chart." },
  { name: "hoverRadius", type: "number", required: false, default: "16", description: "Pixel hit radius for body hover tooltips." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default body tooltip, pass a custom tooltip renderer/config, or set false to disable hover tooltips." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

const basePhysicsConfig = {
  fixedDt: 1 / 120,
  maxSubsteps: 8,
  bodyLimit: 260,
  eviction: "oldest",
  kernel: {
    seed: 42,
    gravity: { x: 0, y: 820 },
    cellSize: 42,
    collisionIterations: 3,
    velocityDamping: 0.997,
    restitution: 0.16,
    friction: 0.09,
    sleepSpeed: 7,
    sleepAfter: 0.55,
  },
}

function routeIndex(routeId) {
  return Math.max(
    0,
    ROUTES.findIndex((route) => route.id === routeId),
  )
}

function laneCenter(plot, routeId) {
  const index = routeIndex(routeId)
  const laneWidth = plot.width / ROUTES.length
  return plot.x + laneWidth * (index + 0.5)
}

function routeBiasOffset(bias) {
  if (bias === "triage") return -34
  if (bias === "ship") return 34
  return 0
}

function packetRadius(packet) {
  if (packet.priority === "rush") return 7.5
  if (packet.priority === "audit") return 6.5
  return 5.5
}

function packetToSpawn(packet, index, ctx) {
  const { plot } = ctx.dimensions
  const config = ctx.config ?? {}
  const route = packet.route ?? "review"
  const routeIndexValue = routeIndex(route)
  const jitter = ((index % 5) - 2) * 2.5
  const bias = routeBiasOffset(config.bias)
  const launchSpeed = Number(config.launchSpeed ?? 1)
  const x = laneCenter(plot, route) + jitter + bias * (route === "review" ? 0.25 : 0.08)
  const y = plot.y + 22 + (index % 4) * 5

  return {
    id: String(packet.id ?? `packet-${index}`),
    x,
    y,
    vx: (routeIndexValue - 1) * 18 + bias * 0.24,
    vy: 18 * launchSpeed,
    mass: Number(packet.weight ?? 1),
    shape: { type: "circle", radius: packetRadius(packet) },
    restitution: packet.priority === "rush" ? 0.28 : 0.16,
    friction: 0.08,
    datum: packet,
    spawnAt: index * 0.1,
  }
}

function routingLayout(ctx) {
  const { plot } = ctx.dimensions
  const config = ctx.config ?? {}
  const centerX = plot.x + plot.width / 2
  const bias = routeBiasOffset(config.bias)
  const splitterX = centerX + bias
  const laneWidth = plot.width / ROUTES.length
  const sensorY = plot.y + plot.height - 36
  const sensorHeight = 58
  const laneTop = plot.y + plot.height * 0.44
  const chuteTop = plot.y + 74

  const sensors = ROUTES.map((route) => ({
    id: `sensor-${route.id}`,
    shape: {
      type: "aabb",
      x: laneCenter(plot, route.id),
      y: sensorY,
      width: laneWidth * 0.78,
      height: sensorHeight,
    },
  }))

  const sensorConfig = ROUTES.reduce((configById, route) => {
    configById[`sensor-${route.id}`] = {
      binId: `${route.label} lane`,
      enterType: "physics-proximity-enter",
      exitType: "physics-proximity-exit",
    }
    return configById
  }, {})

  const laneDividers = [
    plot.x + laneWidth,
    plot.x + laneWidth * 2,
  ].map((x, index) => ({
    id: `routing-lane-divider-${index}`,
    shape: {
      type: "segment",
      x1: x,
      y1: laneTop,
      x2: x,
      y2: plot.y + plot.height,
      thickness: 8,
    },
    restitution: 0.18,
    friction: 0.12,
  }))

  const colliders = [
    {
      id: "routing-chute-left",
      shape: {
        type: "segment",
        x1: plot.x + plot.width * 0.18,
        y1: chuteTop,
        x2: splitterX - 42,
        y2: laneTop - 26,
        thickness: 8,
      },
      restitution: 0.16,
      friction: 0.1,
    },
    {
      id: "routing-chute-right",
      shape: {
        type: "segment",
        x1: plot.x + plot.width * 0.82,
        y1: chuteTop,
        x2: splitterX + 42,
        y2: laneTop - 26,
        thickness: 8,
      },
      restitution: 0.16,
      friction: 0.1,
    },
    {
      id: "routing-deflector",
      shape: {
        type: "segment",
        x1: splitterX - 54,
        y1: laneTop + 4,
        x2: splitterX + 54,
        y2: laneTop + (config.bias === "ship" ? 40 : config.bias === "triage" ? -40 : 0),
        thickness: 10,
      },
      restitution: 0.25,
      friction: 0.05,
    },
    ...collidersFromScales({
      plot,
      idPrefix: "routing",
      bounds: {
        includeCeiling: false,
        wallThickness: 18,
        floorThickness: 18,
      },
      xBands: {
        values: ROUTES.map((route) => route.id),
        scale: Object.assign(
          (routeId) => plot.x + laneWidth * routeIndex(routeId),
          { bandwidth: () => laneWidth },
        ),
        includeBoundaryWalls: false,
        wallThickness: 8,
      },
    }),
  ]
  const replay = arrivalReplay(
    ctx.data.map((packet, index) => packetToSpawn(packet, index, ctx)),
  )

  return {
    initialSpawns: replay.initialSpawns,
    initialSpawnPacing: replay.initialSpawnPacing,
    colliders,
    sensors,
    config: {
      observation: {
        sensors: sensorConfig,
      },
    },
    backgroundOverlays: (
      <svg
        className="physics-custom-chart-demo-overlay physics-custom-chart-demo-overlay--back"
        width={ctx.dimensions.width}
        height={ctx.dimensions.height}
        viewBox={`0 0 ${ctx.dimensions.width} ${ctx.dimensions.height}`}
        aria-hidden="true"
      >
        <rect
          x={plot.x}
          y={plot.y}
          width={plot.width}
          height={plot.height}
          rx="8"
          className="physics-custom-chart-demo-plot"
        />
        {ROUTES.map((route) => {
          const x = laneCenter(plot, route.id)
          return (
            <g key={route.id}>
              <rect
                x={x - laneWidth * 0.39}
                y={sensorY - sensorHeight / 2}
                width={laneWidth * 0.78}
                height={sensorHeight}
                rx="8"
                className={`physics-custom-chart-demo-sensor physics-custom-chart-demo-sensor--${route.id}`}
              />
              <text
                x={x}
                y={plot.y + plot.height - 8}
                textAnchor="middle"
                className="physics-custom-chart-demo-route-label"
              >
                {route.label}
              </text>
            </g>
          )
        })}
        <path
          d={`M ${plot.x + plot.width * 0.18} ${chuteTop} L ${splitterX - 42} ${laneTop - 26}`}
          className="physics-custom-chart-demo-barrier"
        />
        <path
          d={`M ${plot.x + plot.width * 0.82} ${chuteTop} L ${splitterX + 42} ${laneTop - 26}`}
          className="physics-custom-chart-demo-barrier"
        />
        <path
          d={`M ${splitterX - 54} ${laneTop + 4} L ${splitterX + 54} ${laneTop + (config.bias === "ship" ? 40 : config.bias === "triage" ? -40 : 0)}`}
          className="physics-custom-chart-demo-deflector"
        />
        {laneDividers.map((divider) => (
          <line
            key={divider.id}
            x1={divider.shape.x1}
            y1={divider.shape.y1}
            x2={divider.shape.x2}
            y2={divider.shape.y2}
            className="physics-custom-chart-demo-divider"
          />
        ))}
      </svg>
    ),
    semanticItems: ROUTES.map((route) => {
      const x = laneCenter(plot, route.id)
      const label = `${route.label} lane sensor`
      return {
        id: `semantic-${route.id}`,
        label,
        description: `${label}: packets change state when they pass through this proximity gate.`,
        datum: route,
        x,
        y: sensorY,
        shape: "rect",
        width: laneWidth * 0.78,
        height: sensorHeight,
        group: "lane",
      }
    }),
    bodyStyle: (body) => {
      const packet = body.datum ?? {}
      const route = packet.route ?? "review"
      const fill = ROUTE_COLOR[route] ?? ctx.resolveColor(route)
      return {
        fill,
        stroke: packet.priority === "rush" ? "#111827" : "#ffffff",
        strokeWidth: packet.priority === "rush" ? 2 : 1,
        opacity: 0.92,
      }
    },
    selectedBodyStyle: {
      stroke: "#111827",
      strokeWidth: 3,
      opacity: 1,
    },
  }
}

function nextPacketId(counter) {
  return `live-${String(counter).padStart(3, "0")}`
}

function routeFromSequence(index) {
  return ROUTES[index % ROUTES.length].id
}

function makePacket(route, counter, priorityOverride) {
  const priorities = ["standard", "rush", "audit"]
  return {
    id: nextPacketId(counter),
    route,
    priority: priorityOverride ?? priorities[counter % priorities.length],
    weight: route === "review" ? 1.35 : route === "ship" ? 1.15 : 1,
  }
}

function defaultLaneState() {
  return ROUTES.reduce((state, route) => {
    state[route.id] = {
      status: "idle",
      packetId: "none",
      timestamp: "0.00",
      hits: 0,
    }
    return state
  }, {})
}

const comparisonCards = [
  {
    title: "Fixed physics chart HOCs",
    path: "/charts/galton-board-chart",
    summary: "Use GaltonBoardChart, EventDropChart, PhysicsPileChart, CollisionSwarmChart, NetworkHOPsChart, or PhysicalFlowChart when their data model is already your chart.",
  },
  {
    title: "StreamPhysicsFrame",
    path: "/dev/physics-frame",
    summary: "Use the base frame when you already have low-level bodies, colliders, budgets, workers, and observations.",
  },
  {
    title: "PhysicsCustomChart",
    path: "/charts/physics-custom-chart",
    summary: "Use this page's pattern when you want a reusable chart API that owns a layout recipe and still supports push updates.",
  },
  {
    title: "Custom layout HOCs",
    path: "/custom-charts/custom-layouts",
    summary: "Use XYCustomChart, OrdinalCustomChart, NetworkCustomChart, or GeoCustomChart for static scene geometry without simulation.",
  },
]

const layoutSample = `import { PhysicsCustomChart, arrivalReplay, collidersFromScales } from "semiotic/physics"

function routingLayout(ctx) {
  const replay = arrivalReplay(
    ctx.data.map((packet, index) => packetToSpawn(packet, index, ctx))
  )

  return {
    initialSpawns: replay.initialSpawns,
    initialSpawnPacing: replay.initialSpawnPacing,
    colliders: [
      ...collidersFromScales({ plot: ctx.dimensions.plot, xBands }),
      ...barriers
    ],
    sensors: [
      { id: "sensor-review", shape: { type: "aabb", x, y, width, height } }
    ],
    config: {
      observation: {
        sensors: {
          "sensor-review": {
            binId: "Review lane",
            enterType: "physics-proximity-enter",
            exitType: "physics-proximity-exit"
          }
        }
      }
    },
    backgroundOverlays: <svg>{/* labels, guides, sensor zones */}</svg>,
    semanticItems: [
      { id: "review-lane", label: "Review lane", x, y, shape: "rect", width, height }
    ]
  }
}

<PhysicsCustomChart
  ref={chartRef}
  data={packets}
  layout={routingLayout}
  layoutConfig={{ bias, launchSpeed }}
  spawnDatum={packetToSpawn}
  onObservation={recordSensorEvent}
/>`

const recipeSample = `import {
  galtonPegs,
  sedimentBake,
  spawnFromTokens
} from "semiotic/physics"
import { generateTokens, layoutTokenGrid } from "semiotic/recipes"

const tokenSet = generateTokens(samples, {
  tokenType: "dot",
  tokenSemantics: "posterior-sample",
  countStrategy: "posterior-sample",
  tokenCount: 80
})

const spawns = spawnFromTokens(layoutTokenGrid(tokenSet, grid), {
  idPrefix: "posterior",
  radius: 4,
  jitter: { x: 6, y: 2 },
  seed: 12
})

const pegs = galtonPegs({ plot: ctx.dimensions.plot, rows: 8 })
const baked = sedimentBake(ctx.world.readSediment(), { baselineY })`

export default function PhysicsCustomChartPage() {
  const chartRef = useRef(null)
  const packetCounterRef = useRef(9)
  const tickGateRef = useRef(0)
  const [bias, setBias] = useState("balanced")
  const [launchSpeed, setLaunchSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [selectedPacket, setSelectedPacket] = useState(null)
  const [lastPacket, setLastPacket] = useState(INITIAL_PACKETS[INITIAL_PACKETS.length - 1])
  const [eventLog, setEventLog] = useState([])
  const [laneState, setLaneState] = useState(() => defaultLaneState())
  const [stats, setStats] = useState({
    live: INITIAL_PACKETS.length,
    queued: 0,
    sleeping: false,
    elapsed: "0.00",
  })
  const groundingProps = useMemo(
    () => ({
      data: INITIAL_PACKETS.slice(0, 5),
      layout: routingLayout,
      layoutConfig: { bias: "balanced", launchSpeed: 1 },
      config: basePhysicsConfig,
      spawnDatum: packetToSpawn,
      colorBy: "route",
      colorScheme: ROUTE_COLOR,
      size: [620, 340],
      title: "Physics custom routing sample",
    }),
    [],
  )

  const layoutConfig = useMemo(
    () => ({ bias, launchSpeed }),
    [bias, launchSpeed],
  )

  const handleObservation = useCallback((event) => {
    if (event.type !== "physics-proximity-enter" && event.type !== "physics-proximity-exit") {
      return
    }
    const routeId = String(event.sensorId ?? "").replace("sensor-", "")
    if (!ROUTE_LABELS[routeId]) return
    const entering = event.type === "physics-proximity-enter"
    const packetId = event.datum?.id ?? event.bodyId ?? "packet"
    const timestamp = Number(event.timestamp ?? 0).toFixed(2)
    setLaneState((previous) => ({
      ...previous,
      [routeId]: {
        status: entering ? "entered" : "exited",
        packetId,
        timestamp,
        hits: previous[routeId].hits + (entering ? 1 : 0),
      },
    }))
    setEventLog((previous) => [
      {
        id: `${event.type}-${routeId}-${packetId}-${timestamp}`,
        type: entering ? "entered" : "exited",
        lane: ROUTE_LABELS[routeId],
        packetId,
        timestamp,
      },
      ...previous,
    ].slice(0, 8))
  }, [])

  const handleTick = useCallback((result, controls) => {
    if (
      result.elapsedSeconds - tickGateRef.current < 0.2 &&
      result.spawned.length === 0 &&
      result.observations.length === 0
    ) {
      return
    }
    tickGateRef.current = result.elapsedSeconds
    const snapshot = controls.snapshot()
    setStats({
      live: snapshot.liveBodyOrder.length,
      queued: result.queueSize,
      sleeping: result.sleeping,
      elapsed: result.elapsedSeconds.toFixed(2),
    })
  }, [])

  const pushPacket = useCallback((route, priority) => {
    const counter = packetCounterRef.current
    packetCounterRef.current += 1
    const packet = makePacket(route, counter, priority)
    chartRef.current?.push(packet)
    setLastPacket(packet)
  }, [])

  const burstPackets = useCallback(() => {
    const rows = Array.from({ length: 12 }, (_, index) => {
      const counter = packetCounterRef.current + index
      return makePacket(routeFromSequence(counter), counter, index % 4 === 0 ? "rush" : undefined)
    })
    packetCounterRef.current += rows.length
    chartRef.current?.pushMany(rows)
    setLastPacket(rows[rows.length - 1])
  }, [])

  const clearPackets = useCallback(() => {
    chartRef.current?.clear()
    setEventLog([])
    setLaneState(defaultLaneState())
    setStats((previous) => ({ ...previous, live: 0, queued: 0, sleeping: true }))
    setSelectedPacket(null)
  }, [])

  return (
    <PageLayout
      title="PhysicsCustomChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/physics-custom-chart" },
        { label: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
      ]}
      prevPage={{ title: "PhysicalFlowChart", path: "/charts/physical-flow-chart" }}
      nextPage={{ title: "Custom Layouts", path: "/custom-charts/custom-layouts" }}
    >
      <ComponentMeta
        componentName="PhysicsCustomChart"
        importStatement='import { PhysicsCustomChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/dev/physics-frame"
        related={[
          { name: "StreamPhysicsFrame", path: "/dev/physics-frame" },
          { name: "PhysicsPileChart", path: "/charts/physics-pile-chart" },
          { name: "CollisionSwarmChart", path: "/charts/collision-swarm-chart" },
          { name: "NetworkHOPsChart", path: "/charts/network-hops-chart" },
          { name: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
          { name: "Custom Layouts", path: "/custom-charts/custom-layouts" },
        ]}
      />

      <ChartGrounding component="PhysicsCustomChart" props={groundingProps} />

      <section>
        <p>
          <code>PhysicsCustomChart</code> is the physics equivalent of the custom-chart escape
          hatch. You still describe a chart in data terms, but the layout returns a physics scene:
          initial bodies, barriers, proximity sensors, observation metadata, and SVG overlays. It
          is useful when <code>StreamPhysicsFrame</code> is too low-level and the fixed physics HOCs
          are too specific.
        </p>
      </section>

      <section>
        <h2 id="interactive-routing-demo">Interactive routing demo</h2>
        <p>
          This demo owns a custom routing layout. Barriers create a chute and lane dividers. The
          translucent lane zones are sensors, so packets change state as they pass through each
          proximity gate.
        </p>

        <div className="physics-custom-chart-demo-shell">
          <div className="physics-custom-chart-demo-controls" aria-label="Physics custom chart controls">
            <div className="physics-custom-chart-demo-control-group">
              <span className="physics-custom-chart-demo-control-label">Deflector</span>
              <div className="physics-custom-chart-demo-segmented" role="group" aria-label="Deflector bias">
                {[
                  { id: "triage", label: "Triage" },
                  { id: "balanced", label: "Balanced" },
                  { id: "ship", label: "Ship" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={bias === option.id ? "is-active" : ""}
                    aria-pressed={bias === option.id}
                    onClick={() => setBias(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="physics-custom-chart-demo-control-group">
              <label className="physics-custom-chart-demo-control-label" htmlFor="physics-custom-launch-speed">
                Launch speed
              </label>
              <input
                id="physics-custom-launch-speed"
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={launchSpeed}
                onChange={(event) => setLaunchSpeed(Number(event.target.value))}
              />
              <span className="physics-custom-chart-demo-readout">{launchSpeed.toFixed(1)}x</span>
            </div>

            <div className="physics-custom-chart-demo-button-row" aria-label="Push packets">
              {ROUTES.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`physics-custom-chart-demo-push physics-custom-chart-demo-push--${route.id}`}
                  onClick={() => pushPacket(route.id)}
                >
                  Push {route.label}
                </button>
              ))}
              <button type="button" onClick={burstPackets}>Burst 12</button>
              <button type="button" onClick={() => setPaused((value) => !value)}>
                {paused ? "Resume" : "Pause"}
              </button>
              <button type="button" onClick={clearPackets}>Clear</button>
            </div>
          </div>

          <div className="physics-custom-chart-demo-stage">
            <ChartContainer
              title="Physics custom routing demo"
              actions={{ dataSummary: true }}
              height={440}
            >
              <PhysicsCustomChart
                ref={chartRef}
                chartId="physics-custom-routing-demo"
                data={INITIAL_PACKETS}
                layout={routingLayout}
                layoutConfig={layoutConfig}
                config={basePhysicsConfig}
                spawnDatum={packetToSpawn}
                colorBy="route"
                colorScheme={ROUTE_COLOR}
                paused={paused}
                size={[760, 420]}
                title="Physics custom routing demo"
                onClick={(packet) => setSelectedPacket(packet)}
                onObservation={handleObservation}
                frameProps={{
                  onTick: handleTick,
                  selection: selectedPacket
                    ? {
                        isActive: true,
                        predicate: (body) => body.datum?.id === selectedPacket.id,
                      }
                    : null,
                }}
              />
            </ChartContainer>
          </div>

          <div className="physics-custom-chart-demo-readouts">
            <div className="physics-custom-chart-demo-status-card">
              <span className="physics-custom-chart-demo-kicker">Simulation</span>
              <strong>{stats.live}</strong>
              <span>live packets</span>
              <small>{stats.queued} queued, {stats.sleeping ? "sleeping" : "moving"}, {stats.elapsed}s</small>
            </div>
            <div className="physics-custom-chart-demo-status-card">
              <span className="physics-custom-chart-demo-kicker">Last push</span>
              <strong>{lastPacket?.id ?? "none"}</strong>
              <span>{ROUTE_LABELS[lastPacket?.route] ?? "No route"}</span>
              <small>{lastPacket?.priority ?? "standard"} priority</small>
            </div>
            <div className="physics-custom-chart-demo-status-card">
              <span className="physics-custom-chart-demo-kicker">Selected</span>
              <strong>{selectedPacket?.id ?? "none"}</strong>
              <span>{ROUTE_LABELS[selectedPacket?.route] ?? "Click a packet"}</span>
              <small>{selectedPacket?.priority ?? "No packet selected"}</small>
            </div>
          </div>

          <div className="physics-custom-chart-demo-lanes" aria-label="Lane sensor state">
            {ROUTES.map((route) => {
              const state = laneState[route.id]
              return (
                <div
                  key={route.id}
                  className={`physics-custom-chart-demo-lane physics-custom-chart-demo-lane--${route.id} is-${state.status}`}
                >
                  <span>{route.label} sensor</span>
                  <strong>{state.status}</strong>
                  <small>{state.packetId} at {state.timestamp}s - {state.hits} enters</small>
                </div>
              )
            })}
          </div>

          <div className="physics-custom-chart-demo-events" aria-label="Recent proximity events">
            <h3>Recent sensor events</h3>
            {eventLog.length === 0 ? (
              <p>No proximity events yet. Push a packet or run a burst.</p>
            ) : (
              <ol>
                {eventLog.map((event) => (
                  <li key={event.id}>
                    <strong>{event.packetId}</strong> {event.type} {event.lane} at {event.timestamp}s
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 id="why-not-the-base-frame">Why not the base frame?</h2>
        <p>
          <Link to="/dev/physics-frame">StreamPhysicsFrame</Link> is the right tool when your app
          already speaks physics primitives. <code>PhysicsCustomChart</code> is better when you want
          to publish a chart-shaped component: callers pass data, layout options, colors, click
          handlers, and realtime pushes while the layout function translates those rows into
          simulation bodies.
        </p>
        <div className="physics-custom-chart-demo-comparison">
          {comparisonCards.map((card) => (
            <article key={card.title}>
              <h3>
                <Link to={card.path}>{card.title}</Link>
              </h3>
              <p>{card.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 id="layout-contract">Layout contract</h2>
        <p>
          The layout receives scales, dimensions, resolved theme colors, the custom config, and a
          scratch <code>PhysicsPipelineStore</code>. It returns declarative physics pieces. The same
          conversion can be reused by <code>spawnDatum</code>, so pushed rows enter the live chart
          without rebuilding the page.
        </p>
        <CodeBlock language="jsx">{layoutSample}</CodeBlock>
      </section>

      <section>
        <h2 id="recipe-helpers">Recipe helpers</h2>
        <p>
          The M6 recipe kit keeps common physics layout chores out of chart code:
          scale-derived colliders, Galton pegs, token-to-body spawns, sediment baking, and
          arrival-paced replay.
        </p>
        <CodeBlock language="jsx">{recipeSample}</CodeBlock>
      </section>

      <section>
        <h2 id="when-to-use-it">When to use it</h2>
        <ul>
          <li>Use it when sensors and barriers are part of the chart semantics, not just decoration.</li>
          <li>Use it when a reusable chart should expose data-oriented props instead of raw body specs.</li>
          <li>Use it when the chart needs realtime <code>push</code>, <code>pushMany</code>, <code>remove</code>, or <code>clear</code> behavior.</li>
          <li>Use the non-physics custom HOCs when the layout is static SVG or canvas geometry.</li>
        </ul>
      </section>

      <section>
        <h2 id="props">Props</h2>
        <PropTable componentName="PhysicsCustomChart" props={physicsCustomChartProps} />
      </section>
    </PageLayout>
  )
}
