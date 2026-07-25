import React, { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChainReactionChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import CodeBlock from "../../components/CodeBlock"

const sampleTasks = [
  { id: "brief", title: "Approve product brief", lane: "Product", startDay: 0, endDay: 1, progress: 1, status: "done", dependsOn: [], completedDay: 1 },
  { id: "spec", title: "Finalize interaction spec", lane: "Product", startDay: 1, endDay: 3, progress: 1, status: "done", dependsOn: ["brief"], completedDay: 3 },
  { id: "retention", title: "Approve retention policy", lane: "Product", startDay: 2, endDay: 5, progress: 0.9, status: "blocked", dependsOn: ["brief"], blockerReason: "Legal decision on 30-day event retention" },
  { id: "fixture", title: "Build event fixture", lane: "Data", startDay: 1, endDay: 2, progress: 1, status: "done", dependsOn: ["brief"], completedDay: 2 },
  { id: "schema", title: "Finalize event schema", lane: "Data", startDay: 3, endDay: 6, progress: 0.25, status: "waiting", dependsOn: ["retention", "fixture"] },
  { id: "ingest", title: "Implement streaming ingest", lane: "Data", startDay: 6, endDay: 9, progress: 0, status: "waiting", dependsOn: ["schema"] },
  { id: "charts", title: "Build dashboard charts", lane: "Frontend", startDay: 4, endDay: 8, progress: 0.4, status: "active", dependsOn: ["spec", "schema"] },
  { id: "audit", title: "Accessibility audit", lane: "Quality", startDay: 8, endDay: 10, progress: 0, status: "waiting", dependsOn: ["charts"] },
  { id: "launch", title: "Ship release", lane: "Launch", startDay: 10, endDay: 11, progress: 0, status: "waiting", dependsOn: ["ingest", "audit"], milestone: true },
]

const commonProps = {
  data: sampleTasks,
  taskIDAccessor: "id",
  labelAccessor: "title",
  laneAccessor: "lane",
  dependencyAccessor: "dependsOn",
  startAccessor: "startDay",
  endAccessor: "endDay",
  progressAccessor: "progress",
  statusAccessor: "status",
  completionTimeAccessor: "completedDay",
  blockerAccessor: "blockerReason",
  milestoneAccessor: "milestone",
}

const chainReactionChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Task rows. Each row becomes one placed task in the dependency machine." },
  { name: "taskIDAccessor", type: "string | function", required: true, default: null, description: "Stable task id. Dependency arrays reference these resolved ids." },
  { name: "labelAccessor", type: "string | function", required: true, default: null, description: "Human-readable task name used in labels and the data table." },
  { name: "laneAccessor", type: "string | function", required: true, default: null, description: "Workstream the task belongs to. Lanes become the chart's columns." },
  { name: "dependencyAccessor", type: "string | function", required: true, default: null, description: "Array of prerequisite task ids. Edges are never inferred — a task with the wrong prerequisites reads as a different claim." },
  { name: "startAccessor", type: "string | function", required: false, default: null, description: "Planned start time (number or Date)." },
  { name: "endAccessor", type: "string | function", required: false, default: null, description: "Planned end time (number or Date)." },
  { name: "progressAccessor", type: "string | function", required: false, default: "0", description: "Fractional completion 0–1, shown on the task body." },
  { name: "statusAccessor", type: "string | function", required: false, default: null, description: "Authored status (done / blocked / waiting / active). Completion is an explicit data event, never discovered by the simulation." },
  { name: "completionTimeAccessor", type: "string | function", required: false, default: null, description: "When the task actually completed. Drives replay ordering against currentTime." },
  { name: "blockerAccessor", type: "string | function", required: false, default: null, description: "Reason this task is blocked. A blocked task never arms its dependents." },
  { name: "milestoneAccessor", type: "string | function", required: false, default: "false", description: "Marks a task as a milestone for emphasis." },
  { name: "mode", type: '"snapshot" | "replay" | "mechanical"', required: false, default: '"snapshot"', description: "snapshot derives the settled state at currentTime without animating; replay animates deliveries forward from the earliest recorded completion; mechanical demonstrates the apparatus." },
  { name: "insight", type: '"none" | "blocker-amplification"', required: false, default: '"blocker-amplification"', description: "Which derived reading to surface. blocker-amplification reports how many unfinished tasks and lanes each blocker reaches." },
  { name: "currentTime", type: "number | Date", required: false, default: "Infinity", description: "Clock position used to derive the settled state." },
  { name: "controls", type: "boolean | array", required: false, default: "false", description: "Replay control buttons: true for all, or a subset of play / pause / step / reset / settle." },
  { name: "selectedTaskIDs", type: "array", required: false, default: null, description: "Controlled selection. Pair with onSelectionChange." },
  { name: "onSelectionChange", type: "function", required: false, default: null, description: "Receives the selected task ids when a task is activated." },
  { name: "onObservation", type: "function", required: false, default: null, description: "Machine events: task-completed, dependency-delivered, task-armed, machine-stalled, blocker-previewed, machine-settled." },
  { name: "reducedMotion", type: '"settle"', required: false, default: null, description: "Force the settled reading instead of a replay. The frame also honors prefers-reduced-motion automatically." },
  { name: "mechanism", type: '"domino-ball"', required: false, default: '"domino-ball"', description: "Delivery mechanism representing a satisfied prerequisite." },
  { name: "orientation", type: '"vertical"', required: false, default: '"vertical"', description: "Lane orientation. Lanes run as vertical columns." },
  { name: "seed", type: "number", required: false, default: "31", description: "Deterministic seed for delivery-ball motion." },
  { name: "width", type: "number", required: false, default: "920", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "620", description: "Chart height in pixels." },
  { name: "accessibleTable", type: "boolean", required: false, default: "true", description: "Render the screen-reader task table (task, lane, progress, state, waiting on, downstream reach)." },
]

const handleCode = `const machineRef = useRef(null)

// Preview the effect of resolving a blocker. This changes mechanical
// state only — it never edits the supplied data.
machineRef.current.previewResolve("retention")
machineRef.current.clearPreview()

// Read the derived reach of any task.
const { downstreamTaskCount, affectedLaneCount } =
  machineRef.current.getAmplification("retention")

// Replay transport.
machineRef.current.play()
machineRef.current.settle()`

const ledgerCode = `const chainReactionLedger = {
  source: "task rows plus an explicit dependency array per task",
  body: "one delivery ball per satisfied prerequisite edge",
  displacement: "a completed task releases one ball down each outgoing edge",
  barrier: "a blocked task releases nothing, so its dependents never arm",
  projection: "task state (completed / blocked / armed / waiting) + blocker reach",
  accessibleReadout: "settled task table + machine observations",
}`

const panelStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "flex-end",
  marginBottom: 14,
  padding: 12,
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
}

const labelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
}

const inputStyle = {
  minHeight: 34,
  minWidth: 148,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 8px",
}

export default function ChainReactionChartPage() {
  const [mode, setMode] = useState("snapshot")
  const [day, setDay] = useState(10)
  const machineRef = useRef(null)
  const chartKey = useMemo(() => `${mode}-${day}`, [mode, day])

  return (
    <PageLayout
      title="ChainReactionChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/chain-reaction-chart" },
        { label: "ChainReactionChart", path: "/charts/chain-reaction-chart" },
      ]}
      prevPage={{ title: "CrucibleChart", path: "/charts/crucible-chart" }}
      nextPage={{ title: "PhysicsCustomChart", path: "/charts/physics-custom-chart" }}
    >
      <ComponentMeta
        componentName="ChainReactionChart"
        importStatement='import { ChainReactionChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/frames/physics-frame"
        related={[
          { name: "StreamPhysicsFrame", path: "/frames/physics-frame" },
          { name: "ProcessFlowChart", path: "/charts/process-flow-chart" },
          { name: "CrucibleChart", path: "/charts/crucible-chart" },
          { name: "When Physics?", path: "/features/when-physics" },
          { name: "Data Viz for Dummies VI", path: "/examples/data-viz-for-dummies-6" },
        ]}
      />

      <ChartGrounding
        component="ChainReactionChart"
        props={{ ...commonProps, currentTime: 10, title: "Release dependency machine" }}
      />

      <section>
        <p>
          <code>ChainReactionChart</code> compiles a dependency graph into lanes,
          sockets, and delivery routes. A completed task releases one ball per
          outgoing dependency; a downstream task arms only once every prerequisite
          ball has arrived. A blocked task releases nothing, so the chart shows
          <em> reach</em> — how far one unmade decision propagates.
        </p>
        <p>
          Completion is always an explicit data event. The simulation delivers
          prerequisites; it never decides that a task is done. See{" "}
          <Link to="/examples/data-viz-for-dummies-6">Data Viz for Dummies VI</Link>{" "}
          for a worked example and{" "}
          <Link to="/features/when-physics">When Physics?</Link> for when motion
          earns its place.
        </p>
      </section>

      <h2 id="example">Example</h2>
      <div style={panelStyle} aria-label="Chain reaction chart controls">
        <label style={labelStyle}>
          Mode
          <select
            style={inputStyle}
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="snapshot">snapshot (derived, no animation)</option>
            <option value="replay">replay (animate deliveries)</option>
            <option value="mechanical">mechanical (demonstrate)</option>
          </select>
        </label>
        <label style={labelStyle}>
          Current day: {day}
          <input
            style={inputStyle}
            type="range"
            min={0}
            max={12}
            step={1}
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
          />
        </label>
      </div>

      <ChainReactionChart
        key={chartKey}
        ref={machineRef}
        {...commonProps}
        currentTime={day}
        mode={mode}
        insight="blocker-amplification"
        controls={mode === "replay"}
        seed={609}
        width={880}
        height={560}
        title="Release dependency machine"
        description="Nine tasks across five lanes show how one blocked retention decision prevents downstream work from becoming possible."
        accessibleTable
      />

      <h2 id="displacement-ledger">Displacement ledger</h2>
      <p>
        Every physics chart owes a ledger naming what moves, why, and what state
        change the movement represents. Here it is for this chart:
      </p>
      <CodeBlock language="js" code={ledgerCode} />

      <h2 id="settled-reading">The settled reading</h2>
      <p>
        <code>mode="snapshot"</code> derives task state directly from the data at{" "}
        <code>currentTime</code> — no simulation runs. That makes the settled state
        the authoritative reading, and it is what a reader with{" "}
        <code>prefers-reduced-motion</code>, a server render, or an exported
        snapshot receives. <code>mode="replay"</code> adds the animated delivery
        pass on top of the same derived state; it never changes the answer.
      </p>
      <p>
        The accessible table carries the whole reading: each task's lane, progress,
        state, what it is waiting on, and its downstream reach in tasks and lanes.
      </p>

      <h2 id="imperative-handle">Imperative handle</h2>
      <p>
        The ref exposes replay transport plus a preview mode for asking &ldquo;what
        would resolving this blocker unlock?&rdquo; without editing the data.
      </p>
      <CodeBlock language="jsx" code={handleCode} />

      <h2 id="props">Props</h2>
      <PropTable props={chainReactionChartProps} />
    </PageLayout>
  )
}
