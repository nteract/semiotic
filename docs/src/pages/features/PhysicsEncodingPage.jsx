import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { StreamPhysicsFrame, compilePhysicsEncoding } from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import "./PhysicsEncodingPage.css"

const CHANNEL_GROUPS = [
  {
    id: "appearance",
    name: "Appearance",
    channels: "color, shape, size, opacity",
    question: "What can the eye compare before anything moves?",
    projection: "Legend plus visible marks",
    causal: false,
  },
  {
    id: "placement",
    name: "Placement",
    channels: "x, y, lane, target",
    question: "Where does a body begin or belong?",
    projection: "Axes, lanes, and target anchors",
    causal: false,
  },
  {
    id: "time",
    name: "Time",
    channels: "spawnAt, pacing, duration",
    question: "When does a datum enter the process?",
    projection: "Arrival table and timestamps",
    causal: true,
  },
  {
    id: "kinematics",
    name: "Kinematics",
    channels: "velocityX, velocityY, impulse",
    question: "How is motion initially directed?",
    projection: "Vectors and event log",
    causal: true,
  },
  {
    id: "dynamics",
    name: "Dynamics",
    channels: "mass, force, friction, restitution",
    question: "How does a body respond to causes?",
    projection: "Visible twin encoding plus evidence",
    causal: true,
  },
  {
    id: "constraints",
    name: "Constraints",
    channels: "collision, barrier, membrane, tether, region",
    question: "What relationships and boundaries govern motion?",
    projection: "Authored geometry and relationship list",
    causal: true,
  },
  {
    id: "process",
    name: "Process",
    channels: "stage, work, capacity, group, transition",
    question: "What domain state changes as the body moves?",
    projection: "Stage ledger and transition table",
    causal: true,
  },
  {
    id: "evidence",
    name: "Evidence",
    channels: "occupancy, throughput, wait, settled outcome",
    question: "What did the simulation actually observe?",
    projection: "Metrics, observations, settled rows",
    causal: false,
  },
]

const LAB_DATA = Array.from({ length: 12 }, (_, index) => ({
  id: `token-${index + 1}`,
  label: `Token ${index + 1}`,
  category: ["willow", "water", "rust"][index % 3],
  value: 2 + ((index * 7) % 10),
  lane: ["A", "B", "C"][index % 3],
  stage: ["arrive", "work", "settle"][index % 3],
  status: index % 4 === 0 ? "held" : "active",
  spawnAt: index * 0.12,
  speed: 22 + (index % 4) * 18,
  mass: 0.7 + (index % 4) * 0.65,
}))

const COLOR = { willow: "#718f4c", water: "#4e8f97", rust: "#a24e3e" }

const compilerCode = `import {
  PhysicsCustomChart,
  createPhysicsEncodingLayout,
} from "semiotic/physics"

const layout = createPhysicsEncodingLayout({
  encoding: {
    id: "id",
    appearance: {
      color: "category",
      size: "magnitude",
    },
    placement: {
      x: "score",
      y: "laneIndex",
      lane: "lane",
    },
    time: { spawnAt: "arrivedAt" },
    process: { stage: "stage", work: "remaining" },
    evidence: { value: "magnitude", status: "status" },
    accessible: { label: "name", description: "summary" },
  },
  extend: (context, compiled) => ({
    constraints: constraintsFromDomainTopology(compiled.rows),
    regionEffects: regionsFromProcessStages(context),
  }),
})

<PhysicsCustomChart
  data={rows}
  xExtent={[0, 100]}
  yExtent={[0, 4]}
  layout={layout}
/>`

const visibleTwinCode = `// Bad: quantity is encoded only as mass.
dynamics: { mass: "priority" }

// Better: the causal channel has readable twins.
{
  appearance: {
    size: (d) => priorityScale(d.priority),
  },
  dynamics: {
    mass: "priority",
  },
  evidence: {
    priority: "priority",
  },
  accessible: {
    description: (d) =>
      \`Priority \${d.priority}; mass changes collision response\`,
  },
}`

function getThemeColor(name, fallback) {
  if (typeof window === "undefined") return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export default function PhysicsEncodingPage() {
  return (
    <PageLayout
      title="Physics Encoding"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Physics Encoding", path: "/features/physics-encoding" },
      ]}
      prevPage={{ title: "Motion Encodings", path: "/features/motion-encodings" }}
      nextPage={{ title: "Streaming Aggregation", path: "/features/streaming-aggregation" }}
    >
      <p>
        Physics adds <strong>causal</strong> channels to the familiar visual grammar. Color and
        position say what a datum looks like; mass, force, collision, and constraints change what it{" "}
        <em>does</em>. Treating those as the same kind of encoding produces attractive but
        unreadable models, so one rule runs through this whole page:{" "}
        <strong>every causal channel needs a visible or evidentiary twin</strong> -- never make an
        important value discoverable only by watching a collision.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Channel lab */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="lab">One dataset, eight channel families</h2>

      <p>
        Select a family to change the compiled initial world. The readout names what is data, what
        changes execution, and what has to survive in a static projection.
      </p>

      <EncodingLab />

      {/* ----------------------------------------------------------------- */}
      {/* Channel families */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="channels">Channel families</h2>

      <p>
        Eight families run from ordinary Bertin marks to causal simulation inputs. Two support{" "}
        <strong>reading</strong> (they change what the eye compares); the rest are{" "}
        <strong>causal</strong> (they change execution). Every family names what survives when the
        chart is static:
      </p>
      <ul>
        {CHANNEL_GROUPS.map((group) => (
          <li key={group.id}>
            <strong>{group.name}</strong> ({group.causal ? "causal" : "reading"}) --{" "}
            <code>{group.channels}</code>. {group.question} Static projection: {group.projection}.
          </li>
        ))}
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Encode / execute / observe */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="model">Encode, execute, observe</h2>

      <p>A physics chart is authored in three layers, each with a clear owner:</p>
      <ul>
        <li>
          <strong>Encode data</strong> (<code>compilePhysicsEncoding</code>) -- resolve accessors
          into stable IDs, initial positions, collision shapes, appearance, process metadata, and
          accessible language.
        </li>
        <li>
          <strong>Execute a world</strong> (<code>StreamPhysicsFrame</code>) -- add curated
          constraints, colliders, regions, and controllers. Solver coefficients are implementation
          presets unless the domain explicitly defines them.
        </li>
        <li>
          <strong>Observe evidence</strong> (<code>onObservation</code> / controller snapshots) --
          read occupancy, transitions, wait, throughput, and settled outcome. Observations are
          results, not decoration.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Compiler API */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="api">Compile accessors before simulation</h2>

      <p>
        <code>createPhysicsEncodingLayout</code> gives <code>PhysicsCustomChart</code> the same
        accessor-first vocabulary as other Semiotic HOCs. Its <code>extend</code> callback owns
        domain topology while the compiler owns the repeatable data-to-body contract.
      </p>
      <CodeBlock language="jsx" code={compilerCode} />

      {/* ----------------------------------------------------------------- */}
      {/* Visible twin */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="visible-twin">Give dynamics a visible twin</h2>

      <p>
        Mass may legitimately change collision response, but it should not silently stand in for
        priority, population, cost, or confidence. When a causal channel carries meaning, pair it
        with a readable appearance channel and an evidence field:
      </p>
      <CodeBlock language="js" code={visibleTwinCode} />

      {/* ----------------------------------------------------------------- */}
      {/* Geometry owner */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="geometry">One owner for authored geometry</h2>

      <p>
        A barrier, membrane, or habitat region should compile from one definition into collider or
        sensor geometry, painted appearance, semantic bounds, and observation metadata. If those
        four shapes are authored separately, the visualization can look correct while interaction
        and accessibility disagree.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link> -- stage-level
          simulation, accessible outcomes, and settled process evidence
        </li>
        <li>
          <Link to="/features/motion-encodings">Motion Encodings</Link> -- the shared channels
          connecting realtime transitions to causal physics
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> -- how arrival, window,
          age, and freshness extend conventional streaming marks
        </li>
        <li>
          <Link to="/features/when-physics">When Physics</Link> -- choosing physics only when
          visible process behavior earns the complexity
        </li>
      </ul>
    </PageLayout>
  )
}

function EncodingLab() {
  const hostRef = useRef(null)
  const frameRef = useRef(null)
  const [width, setWidth] = useState(760)
  const [channel, setChannel] = useState("appearance")
  const [runId, setRunId] = useState(0)
  const reducedMotion = useReducedMotion()
  const active = CHANNEL_GROUPS.find((group) => group.id === channel) ?? CHANNEL_GROUPS[0]

  useEffect(() => {
    if (!hostRef.current || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(300, Math.floor(entry.contentRect.width))),
    )
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [])

  const chartWidth = Math.max(300, Math.min(820, width))
  const chartHeight = chartWidth < 520 ? 340 : 280
  const scene = useMemo(
    () => buildEncodingScene(channel, chartWidth, chartHeight),
    [channel, chartHeight, chartWidth],
  )

  useEffect(() => {
    if (!reducedMotion) return undefined
    const timer = window.setTimeout(() => frameRef.current?.settle?.(1800), 0)
    return () => window.clearTimeout(timer)
  }, [channel, chartWidth, reducedMotion, runId])

  return (
    <div className="physics-encoding__lab">
      <div
        className="physics-encoding__lab-controls"
        role="tablist"
        aria-label="Physics channel families"
      >
        {CHANNEL_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={channel === group.id}
            className={channel === group.id ? "is-active" : ""}
            onClick={() => {
              setChannel(group.id)
              setRunId((value) => value + 1)
            }}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div className="physics-encoding__lab-body">
        <div ref={hostRef} className="physics-encoding__lab-canvas">
          <StreamPhysicsFrame
            key={`${channel}-${runId}-${chartWidth}`}
            ref={frameRef}
            chartId="physics-encoding-lab"
            title={`${active.name} encoding lab`}
            description={`${active.channels}. ${active.question}. Static projection: ${active.projection}.`}
            size={[chartWidth, chartHeight]}
            config={scene.config}
            initialSpawns={scene.spawns}
            initialSpawnPacing={
              channel === "time"
                ? { pacing: "arrival", timeAccessor: "spawnAt", timeScale: 3 }
                : undefined
            }
            semanticItems={scene.semanticItems}
            bodyStyle={scene.bodyStyle}
            beforePaint={scene.beforePaint}
            background="var(--surface-1)"
            accessibleTable
            enableHover
            tooltipContent={(hover) => (
              <div className="semiotic-tooltip">
                <strong>{hover.data.label}</strong>
                <div>value {hover.data.value}</div>
                <div>{hover.data.stage}</div>
              </div>
            )}
          />
        </div>
        <aside className="physics-encoding__lab-readout" aria-live="polite">
          <span>{active.causal ? "Causal family" : "Reading family"}</span>
          <h3>{active.name}</h3>
          <code>{active.channels}</code>
          <p>{active.question}</p>
          <dl>
            <div>
              <dt>Changes execution</dt>
              <dd>{active.causal ? "yes" : "not necessarily"}</dd>
            </div>
            <div>
              <dt>Static survival</dt>
              <dd>{active.projection}</dd>
            </div>
          </dl>
          <button type="button" onClick={() => setRunId((value) => value + 1)}>
            Replay this encoding
          </button>
        </aside>
      </div>
    </div>
  )
}

function buildEncodingScene(channel, width, height) {
  const theme = {
    border: getThemeColor("--surface-3", "#cfd4d9"),
    textSecondary: getThemeColor("--text-secondary", "#61737f"),
    stroke: getThemeColor("--text-secondary", "#2d3d3f"),
  }
  const margin = 28
  const floorY = height - 24
  const isMotion = ["time", "kinematics", "dynamics"].includes(channel)
  const rows = LAB_DATA.map((datum, index) => {
    const column = index % 6
    const row = Math.floor(index / 6)
    const placementX = margin + (column / 5) * (width - margin * 2)
    const placementY = 70 + row * 74
    const processIndex = ["arrive", "work", "settle"].indexOf(datum.stage)
    return {
      ...datum,
      x:
        channel === "process"
          ? margin + processIndex * ((width - margin * 2) / 2)
          : channel === "kinematics"
            ? 40 + row * 18
            : placementX,
      y: isMotion ? 46 + row * 25 : placementY,
      displaySize: channel === "appearance" || channel === "dynamics" ? 5 + datum.value * 0.7 : 8,
      displayColor:
        channel === "appearance" || channel === "process" || channel === "evidence"
          ? COLOR[datum.category]
          : "#406b65",
      description: `${datum.label}. Value ${datum.value}. Lane ${datum.lane}. Stage ${datum.stage}.`,
    }
  })
  const compiled = compilePhysicsEncoding({
    data: rows,
    encoding: {
      id: "id",
      appearance: {
        color: "displayColor",
        size: "displaySize",
        shape: (datum) => ({ type: "circle", radius: datum.displaySize }),
        stroke: { constant: theme.stroke },
        strokeWidth: { constant: 1.25 },
      },
      placement: { x: "x", y: "y", lane: "lane" },
      time: channel === "time" ? { spawnAt: "spawnAt" } : undefined,
      kinematics:
        channel === "kinematics"
          ? { velocityX: "speed", velocityY: (datum) => (datum.id.endsWith("1") ? 14 : 0) }
          : undefined,
      dynamics: {
        bodyCollisions: { constant: true },
        mass: channel === "dynamics" ? "mass" : { constant: 1 },
        restitution:
          channel === "dynamics" ? (datum) => 0.12 + (datum.value % 3) * 0.22 : { constant: 0.12 },
      },
      process: { group: "category", stage: "stage", target: "lane", work: "value" },
      evidence: { value: "value", status: "status", mass: "mass" },
      accessible: { label: "label", description: "description", group: "category" },
    },
  })
  const spawns = compiled.spawns.map((spawn) => {
    const row = compiled.byId.get(spawn.id)
    const tethered = ["placement", "constraints", "process", "evidence", "appearance"].includes(
      channel,
    )
    return {
      ...spawn,
      springs: tethered
        ? [
            {
              id: `target-${spawn.id}`,
              target: { type: "point", x: row.placement.x, y: row.placement.y },
              restLength: 0,
              stiffness: channel === "constraints" ? 7 : 13,
              damping: 3.5,
            },
          ]
        : [],
    }
  })
  const colliders = isMotion
    ? [
        {
          id: "floor",
          shape: { type: "aabb", x: width / 2, y: floorY + 12, width, height: 24 },
          restitution: 0.18,
          friction: 0.5,
        },
        {
          id: "left-wall",
          shape: { type: "aabb", x: -8, y: height / 2, width: 16, height },
          restitution: 0.3,
        },
        {
          id: "right-wall",
          shape: { type: "aabb", x: width + 8, y: height / 2, width: 16, height },
          restitution: 0.3,
        },
      ]
    : []
  return {
    ...compiled,
    spawns,
    config: {
      kernel: {
        seed: 3800,
        gravity: { x: 0, y: isMotion ? 240 : 0 },
        velocityDamping: 0.989,
        collisionIterations: 4,
        sleepSpeed: 3,
        sleepAfter: 0.45,
        restitution: 0.16,
        friction: 0.48,
        maxVelocity: 500,
      },
      colliders,
      fixedDt: 1 / 60,
      settleStepLimit: 1800,
      observation: { chartId: "physics-encoding-lab", chartType: "StreamPhysicsFrame" },
    },
    beforePaint: (ctx) => {
      ctx.save()
      if (isMotion) {
        ctx.strokeStyle = theme.stroke
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, floorY)
        ctx.lineTo(width, floorY)
        ctx.stroke()
      }
      if (["placement", "constraints", "process"].includes(channel)) {
        ctx.fillStyle = theme.textSecondary
        ctx.strokeStyle = theme.border
        ctx.font = "700 10px ui-monospace, monospace"
        ctx.textAlign = "center"
        if (channel === "process") {
          ;["ARRIVE", "WORK", "SETTLE"].forEach((label, index) =>
            ctx.fillText(label, margin + index * ((width - margin * 2) / 2), 24),
          )
        } else {
          compiled.rows.forEach((row) => {
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.moveTo(row.placement.x - 4, row.placement.y)
            ctx.lineTo(row.placement.x + 4, row.placement.y)
            ctx.moveTo(row.placement.x, row.placement.y - 4)
            ctx.lineTo(row.placement.x, row.placement.y + 4)
            ctx.stroke()
          })
        }
      }
      ctx.restore()
    },
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])
  return reduced
}
