import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  compileMotionEncoding,
  deriveMotionVector,
  opacityFromAge,
  resolveMotionAge,
} from "semiotic"
import { StreamPhysicsFrame, compilePhysicsEncoding } from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import "./MotionEncodingsPage.css"

const MOTION_RECORDS = [
  {
    id: "a",
    label: "Permit event",
    lane: "Product",
    event: 0.6,
    ingest: 1.1,
    x: 58,
    y: 54,
    vx: 16,
    vy: 2,
    stage: "arrived",
    value: 18,
  },
  {
    id: "b",
    label: "Sensor batch",
    lane: "Data",
    event: 1.3,
    ingest: 2.7,
    x: 126,
    y: 108,
    vx: 25,
    vy: 1,
    stage: "queued",
    value: 36,
  },
  {
    id: "c",
    label: "Schema update",
    lane: "Data",
    event: 2.8,
    ingest: 3.1,
    x: 208,
    y: 108,
    vx: 20,
    vy: -2,
    stage: "working",
    value: 54,
  },
  {
    id: "d",
    label: "UI patch",
    lane: "Frontend",
    event: 4.1,
    ingest: 4.5,
    x: 292,
    y: 162,
    vx: 30,
    vy: 2,
    stage: "working",
    value: 72,
  },
  {
    id: "e",
    label: "Quality check",
    lane: "Quality",
    event: 5.2,
    ingest: 6.8,
    x: 372,
    y: 216,
    vx: 18,
    vy: -1,
    stage: "observed",
    value: 42,
  },
  {
    id: "f",
    label: "Release signal",
    lane: "Launch",
    event: 7.4,
    ingest: 7.9,
    x: 456,
    y: 270,
    vx: 24,
    vy: 0,
    stage: "settled",
    value: 88,
  },
]

const LANE_COLORS = {
  Product: "#b65b46",
  Data: "#4d817d",
  Frontend: "#c49338",
  Quality: "#61754f",
  Launch: "#7a654d",
}

const BASIS_META = {
  event: {
    label: "Event time",
    field: "event",
    unit: "seconds",
    note: "When the represented event occurred.",
  },
  ingest: {
    label: "Ingest time",
    field: "ingest",
    unit: "seconds",
    note: "When the runtime received the record.",
  },
  simulation: {
    label: "Simulation time",
    field: "event",
    unit: "seconds",
    note: "When a body enters a modeled world.",
  },
  presentation: {
    label: "Presentation time",
    field: "ingest",
    unit: "seconds",
    note: "When a transition or pulse is shown.",
  },
  "buffer-index": {
    label: "Buffer rank",
    field: "bufferIndex",
    unit: "index",
    note: "Ordinal recency, not elapsed duration.",
  },
}

const sharedCode = `const motionEncoding = {
  id: "id",
  time: {
    arrival: "arrivedAt",
    basis: "event",
    unit: "seconds",
  },
  placement: {
    x: "x",
    y: "y",
    lane: "lane",
    space: "data",
  },
  kinematics: {
    velocityX: "vx",
    velocityY: "vy",
    space: "world",
  },
  process: {
    stage: "stage",
    target: "target",
    work: "remaining",
  },
  evidence: {
    value: "value",
    observedAt: "observedAt",
  },
}

`

const clockCode = `resolveMotionAge({
  now,
  arrival,
  ttl,
})

// now, arrival, and ttl must share one basis and unit.
// Buffer rank is useful, but it is not wall-clock age.
opacityFromAge({
  age,
  extent: ttl,
  type: "exponential",
  halfLife: ttl / 2,
})`

function getThemeColor(name, fallback) {
  if (typeof window === "undefined") return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export default function MotionEncodingsPage() {
  return (
    <PageLayout
      title="Motion Encodings"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Motion Encodings", path: "/features/motion-encodings" },
      ]}
      prevPage={{ title: "Realtime Encoding", path: "/features/realtime-encoding" }}
      nextPage={{ title: "Physics Encoding", path: "/features/physics-encoding" }}
    >
      <p>
        Realtime and physics charts both move marks, but motion means different things in each.
        Semiotic factors out a <strong>shared motion core</strong> -- identity, a clock, placement,
        velocity, process, and evidence -- that both runtimes read from the same records. Each
        runtime then layers its own policies on top:
      </p>
      <ul>
        <li>
          <strong>Realtime</strong> -- pulse, decay, transition, staleness, and buffer policy (see{" "}
          <Link to="/features/realtime-encoding">Realtime Encoding</Link>)
        </li>
        <li>
          <strong>Physics</strong> -- mass, force, collision, constraints, and controllers (see{" "}
          <Link to="/features/physics-encoding">Physics Encoding</Link>)
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Workbench */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="workbench">Two runtimes, one dataset</h2>

      <p>
        The same records drive both panels below. The left panel treats motion as streaming recency
        and presentation; the right treats the same arrivals and vectors as initial conditions in a
        physical world. Pick a clock before reading age -- "now" is part of the encoding.
      </p>

      <MotionWorkbench />

      {/* ----------------------------------------------------------------- */}
      {/* Shared channels */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="channels">The shared channels</h2>

      <p>
        Every channel in the core resolves once, from the same datum, into a value both runtimes can
        use. What differs is the interpretation, not the data:
      </p>
      <ul>
        <li>
          <strong>Arrival</strong> -- one value read through a named clock. Realtime may use event
          or ingest time; physics maps a simulation-basis arrival to <code>spawnAt</code>.
        </li>
        <li>
          <strong>Placement</strong> -- <code>x</code>, <code>y</code>, and <code>lane</code> only
          align when the author states a coordinate <code>space</code> (data, world, or screen).
        </li>
        <li>
          <strong>Velocity</strong> -- a derived cue in realtime (direction from successive points),
          but causal state in physics (it changes the next position).
        </li>
        <li>
          <strong>Age</strong> -- decay can measure age by buffer rank or by elapsed time, but the
          two can't share thresholds without an explicit adapter.
        </li>
        <li>
          <strong>Lifecycle</strong> -- <code>fresh → stale</code> is temporal classification;{" "}
          <code>queued → armed</code> is domain process state. Both survive, never conflated.
        </li>
        <li>
          <strong>Evidence</strong> -- named analytical values (arrival, stage, wait, settled
          position) stay readable when motion is paused or removed.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Clocks */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="clocks">Choosing a clock</h2>

      <p>
        Age is meaningless without a clock, so the encoding names one. <code>now</code>,{" "}
        <code>arrival</code>, and any TTL must share a single basis and unit -- buffer rank is
        useful, but it is not wall-clock age. Four clocks plus an ordinal rank are available:
      </p>
      <ul>
        {Object.entries(BASIS_META).map(([id, meta]) => (
          <li key={id}>
            <strong>{meta.label}</strong> (
            <code>
              {id} / {meta.unit}
            </code>
            ) -- {meta.note}
          </li>
        ))}
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Cause / cue / evidence */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="layers">Cause, cue, and evidence</h2>

      <p>
        Keeping these three apart is what stops motion from becoming an attractive but unreadable
        model:
      </p>
      <ul>
        <li>
          <strong>Cause</strong> -- changes what happens: velocity, force, mass, collisions,
          constraints, and explicit state transitions.
        </li>
        <li>
          <strong>Cue</strong> -- changes what is shown: pulse, trail, interpolation, highlight, and
          age-to-opacity.
        </li>
        <li>
          <strong>Evidence</strong> -- records what happened: arrival, delivery, occupancy, wait,
          throughput, completion, and settled outcome.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* API */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="api">Composing the encoding</h2>

      <p>
        The shared compiler (<code>compileMotionEncoding</code>) resolves records once into the
        neutral core. Runtime adapters extend that core with their own policies instead of
        re-reading the data.
      </p>
      <CodeBlock language="js" code={sharedCode} />

      <p>
        Age helpers normalize a named clock without deciding whether the source is a ring buffer or
        a simulation. Keep the inputs commensurate:
      </p>
      <div style={{ marginTop: 8 }}>
        <CodeBlock language="js" code={clockCode} />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Reduced motion */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="reduced-motion">Reduced motion</h2>

      <p>
        A reduced-motion view settles physics to a valid state and removes realtime pulses and
        trails, while still exposing arrival, lifecycle, process stage, target, and outcome through
        semantic items and tables. A frozen mid-animation frame is not a reduced-motion alternative.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> -- presentation policies
          for arriving and aging data
        </li>
        <li>
          <Link to="/features/physics-encoding">Physics Encoding</Link> -- causal dynamics,
          constraints, process, and settled evidence
        </li>
        <li>
          <Link to="/examples/merge-pressure">Merge Pressure</Link> -- dependency delivery, staged
          review, and process claims in a full example
        </li>
      </ul>
    </PageLayout>
  )
}

function MotionWorkbench() {
  const frameRef = useRef(null)
  const [basis, setBasis] = useState("event")
  const [clock, setClock] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [revision, setRevision] = useState(0)
  const basisMeta = BASIS_META[basis]
  const records = useMemo(
    () =>
      MOTION_RECORDS.map((record, index) => ({
        ...record,
        bufferIndex: index,
        arrival: basis === "buffer-index" ? index : record[basisMeta.field],
      })),
    [basis, basisMeta.field],
  )
  const motion = useMemo(
    () =>
      compileMotionEncoding({
        data: records,
        encoding: {
          id: "id",
          time: { arrival: "arrival", basis, unit: basisMeta.unit },
          placement: { x: "x", y: "y", lane: "lane", space: "screen" },
          kinematics: { velocityX: "vx", velocityY: "vy", space: "world" },
          process: { group: "lane", stage: "stage", work: "value" },
          evidence: { value: "value", eventTime: "event", ingestTime: "ingest" },
          accessible: { label: "label", group: "lane" },
        },
      }),
    [basis, basisMeta.unit, records],
  )
  const physics = useMemo(
    () =>
      compilePhysicsEncoding({
        data: records,
        encoding: {
          id: "id",
          appearance: {
            color: (record) => LANE_COLORS[record.lane],
            shape: (record) => ({ type: "circle", radius: 5 + record.value / 18 }),
            stroke: { constant: "#20352c" },
            strokeWidth: { constant: 1.2 },
          },
          placement: { x: "x", y: (record) => 24 + record.y * 0.18, lane: "lane", space: "screen" },
          time: { arrival: "arrival", basis: "simulation", unit: basisMeta.unit },
          kinematics: { velocityX: "vx", velocityY: "vy", space: "world" },
          dynamics: { mass: (record) => 0.8 + record.value / 90, restitution: { constant: 0.2 } },
          process: { group: "lane", stage: "stage", work: "value" },
          evidence: { value: "value", eventTime: "event", ingestTime: "ingest" },
          accessible: {
            label: "label",
            description: (record) => `${record.label}. ${record.stage}. Value ${record.value}.`,
            group: "lane",
          },
        },
      }),
    [basisMeta.unit, records],
  )

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setClock((value) => {
        if (value >= 10) {
          setPlaying(false)
          return 10
        }
        return Math.min(10, value + 0.5)
      })
    }, 420)
    return () => window.clearInterval(timer)
  }, [playing])

  const setClockBasis = (nextBasis) => {
    setBasis(nextBasis)
    setClock(0)
    setPlaying(false)
    setRevision((value) => value + 1)
  }
  const replay = () => {
    setClock(0)
    setRevision((value) => value + 1)
    setPlaying(true)
  }
  const step = () => {
    setPlaying(false)
    setClock((value) => Math.min(10, value + 0.5))
    frameRef.current?.step?.(0.5)
  }
  const resolvedRows = motion.rows.map((row) => {
    const arrival = row.time.arrival ?? 0
    const age = resolveMotionAge({ now: clock, arrival, ttl: 5 })
    const vector = deriveMotionVector(
      { x: row.placement.x ?? 0, y: row.placement.y ?? 0 },
      {
        x: (row.placement.x ?? 0) + (row.kinematics.velocityX ?? 0),
        y: (row.placement.y ?? 0) + (row.kinematics.velocityY ?? 0),
      },
      1,
    )
    return { ...row, age, vector, visible: arrival <= clock }
  })

  return (
    <div className="motion-workbench">
      <div className="motion-workbench__controls">
        <label>
          Clock basis
          <select value={basis} onChange={(event) => setClockBasis(event.target.value)}>
            {Object.entries(BASIS_META).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPlaying((value) => !value)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={step}>
          Step
        </button>
        <button type="button" onClick={replay}>
          Replay
        </button>
        <div>
          <span>{basisMeta.label}</span>
          <strong>
            {clock.toFixed(1)} {basisMeta.unit === "index" ? "rank" : "s"}
          </strong>
        </div>
      </div>
      <div className="motion-workbench__panels">
        <article>
          <header>
            <span>Realtime interpretation</span>
            <strong>pulse + age + trail</strong>
          </header>
          <RealtimeMotionPanel rows={resolvedRows} clock={clock} />
        </article>
        <article>
          <header>
            <span>Physics interpretation</span>
            <strong>spawn + velocity + settle</strong>
          </header>
          <StreamPhysicsFrame
            key={`${basis}-${revision}`}
            ref={frameRef}
            chartId="motion-encoding-physics"
            title="Shared motion records in a physics world"
            description={`Arrival uses ${basisMeta.label.toLowerCase()} values interpreted as simulation ${basisMeta.unit}. Velocity is causal in this panel.`}
            size={[520, 310]}
            config={{
              kernel: {
                seed: 3800,
                gravity: { x: 0, y: 180 },
                restitution: 0.2,
                friction: 0.45,
                velocityDamping: 0.992,
                collisionIterations: 4,
                sleepSpeed: 3,
                sleepAfter: 0.45,
              },
              colliders: [
                { id: "floor", shape: { type: "aabb", x: 260, y: 303, width: 520, height: 14 } },
                { id: "left", shape: { type: "aabb", x: -6, y: 155, width: 12, height: 310 } },
                { id: "right", shape: { type: "aabb", x: 526, y: 155, width: 12, height: 310 } },
              ],
              observation: { chartId: "motion-encoding-physics", chartType: "StreamPhysicsFrame" },
            }}
            initialSpawns={physics.spawns}
            initialSpawnPacing={{ pacing: "arrival", timeAccessor: "spawnAt", timeScale: 1 }}
            semanticItems={physics.semanticItems}
            bodyStyle={physics.bodyStyle}
            paused={!playing}
            accessibleTable
            background="var(--surface-1)"
          />
        </article>
      </div>
      <div className="motion-workbench__inspector" aria-live="polite">
        <div>
          <span>Resolved rows</span>
          <strong>
            {resolvedRows.filter((row) => row.visible).length} visible / {resolvedRows.length}
          </strong>
        </div>
        <div className="motion-workbench__table">
          <table>
            <thead>
              <tr>
                <th>Record</th>
                <th>Arrival</th>
                <th>Age</th>
                <th>Lifecycle</th>
                <th>Speed</th>
                <th>Process</th>
              </tr>
            </thead>
            <tbody>
              {resolvedRows.map((row) => (
                <tr key={row.id} className={row.visible ? "" : "is-future"}>
                  <th scope="row">{row.accessible.label}</th>
                  <td>{row.time.arrival}</td>
                  <td>{row.visible ? Math.max(0, row.age.age).toFixed(1) : "future"}</td>
                  <td>{row.visible ? row.age.lifecycle : "not arrived"}</td>
                  <td>{row.vector.speed.toFixed(1)}</td>
                  <td>{row.process.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RealtimeMotionPanel({ rows, clock }) {
  const theme = {
    background: getThemeColor("--surface-1", "#f8f8f5"),
    grid: getThemeColor("--surface-3", "#cfd4d7"),
    muted: getThemeColor("--text-secondary", "#70767a"),
    ink: getThemeColor("--text-primary", "#26382f"),
    stroke: getThemeColor("--text-secondary", "#5b6764"),
  }

  return (
    <svg
      className="motion-workbench__realtime"
      viewBox="0 0 520 310"
      role="img"
      aria-label="Realtime motion interpretation using pulse, trails, and age opacity"
    >
      <rect width="520" height="310" fill={theme.background} />
      {[62, 116, 170, 224, 278].map((y) => (
        <line key={y} x1="18" x2="502" y1={y} y2={y} stroke={theme.grid} opacity="0.18" />
      ))}
      {rows
        .filter((row) => row.visible)
        .map((row) => {
          const datum = row.datum
          const age = Math.max(0, clock - (row.time.arrival ?? 0))
          const opacity = opacityFromAge({
            age,
            extent: 5,
            type: "exponential",
            halfLife: 2.5,
            minOpacity: 0.16,
          })
          const x = Math.min(485, 30 + datum.x + age * datum.vx * 0.7)
          const y = Math.min(282, 24 + datum.y)
          const newest = age < 0.75
          return (
            <g key={row.id} opacity={opacity}>
              <line
                x1={Math.max(18, x - datum.vx * Math.min(age, 2))}
                x2={x}
                y1={y - datum.vy * Math.min(age, 2)}
                y2={y}
                stroke={LANE_COLORS[datum.lane]}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.45"
              />
              {newest ? (
                <circle
                  cx={x}
                  cy={y}
                  r="15"
                  fill="none"
                  stroke={LANE_COLORS[datum.lane]}
                  strokeWidth="2"
                  opacity="0.45"
                />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={5 + datum.value / 18}
                fill={LANE_COLORS[datum.lane]}
                stroke={theme.stroke}
                strokeWidth="1.2"
              />
              <text x={x + 11} y={y - 9} fill={theme.ink} fontSize="9" fontWeight="700">
                {datum.label}
              </text>
            </g>
          )
        })}
      <text x="18" y="298" fill={theme.muted} fontSize="9">
        Opacity is an age cue; it does not change the record.
      </text>
    </svg>
  )
}
