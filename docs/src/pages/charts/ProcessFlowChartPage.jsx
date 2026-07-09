import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ProcessFlowChart } from "semiotic/physics"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const processFlowChartProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Work-item rows. Each row becomes one physics body." },
  { name: "stages", type: "array", required: true, default: null, description: "Ordered stages: { id, label?, force?, damping?, capacity?, pressure?, portal?, absorb?, share? }." },
  { name: "stageAccessor", type: "string | function", required: false, default: '"stage"', description: "Current stage id for each work item." },
  { name: "idAccessor", type: "string | function", required: false, default: "id field", description: "Stable work-item id." },
  { name: "groupBy", type: "string | function", required: false, default: null, description: "Optional feature/group key. Groups complete when all members reach an absorb stage." },
  { name: "groupLabelAccessor", type: "string | function", required: false, default: null, description: "Display label for group anchors." },
  { name: "workAccessor", type: "string | function", required: false, default: null, description: "Work-units field stamped for capacity metadata." },
  { name: "radiusAccessor", type: "string | function", required: false, default: null, description: "Optional per-body radius in pixels." },
  { name: "ballRadius", type: "number", required: false, default: "6", description: "Fallback body radius." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Categorical field used to color bodies." },
  { name: "groupCompletion", type: '"allAbsorbed" | "none"', required: false, default: "allAbsorbed when groupBy is set", description: "How feature groups report completion." },
  { name: "groupAnchorAlong", type: "number", required: false, default: "0.55", description: "0–1 position along the lane for group anchors." },
  { name: "showProjection", type: "boolean", required: false, default: "true", description: "Draw settled stage-count bars." },
  { name: "showChrome", type: "boolean", required: false, default: "true", description: "Draw stage labels, capacity notes, and group anchors." },
  { name: "chromeOptions", type: "object", required: false, default: null, description: "processChrome options: outlineStages (stroke-only bays), showFlowSpine, showStageCounts, showCapacityBadges, showGroupSockets." },
  { name: "liveCapacity", type: "boolean", required: false, default: "true", description: "Install live FIFO capacity-queue controllers for stages with capacity (drains work at unitsPerSecond)." },
  { name: "onCapacityChange", type: "function", required: false, default: null, description: "Receives CapacityQueueSnapshot[] (queueDepth, processedCount, remainingWork) each tick while capacity queues run." },
  { name: "bodyLimit", type: "number", required: false, default: null, description: "Soft live-body budget; evicts oldest when exceeded (stream / sediment pattern)." },
  { name: "bodyMark", type: "string", required: false, default: "circle", description: "Default mark: circle | halo | faceted | pill | diamond | square. Per-row via datum.__physicsMark." },
  { name: "selection", type: "object", required: false, default: null, description: "Shared selection for dim/highlight without relayout." },
  { name: "settle", type: "boolean", required: false, default: "false", description: "Start bodies at stage targets for a calmer first paint." },
  { name: "seed", type: "number", required: false, default: "1", description: "Deterministic placement seed." },
  { name: "size", type: "array", required: false, default: "[900, 420]", description: "[width, height] in pixels." },
  { name: "paused", type: "boolean", required: false, default: "false", description: "Pause the simulation." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: "true", description: "Enable the default body tooltip, pass a custom renderer/config, or set false to disable." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Advanced StreamPhysicsFrame props." },
]

const baseStages = [
  { id: "coding", label: "Coding", force: 14, share: 1.1 },
  { id: "ci", label: "CI", force: 16, share: 0.9 },
  {
    id: "review",
    label: "Review",
    capacity: { unitsPerSecond: 5, unitAccessor: "reviewWork" },
    pressure: { pressure: 1.1 },
    force: 12,
    share: 1.3,
  },
  {
    id: "revision",
    label: "Revision",
    portal: { targetStageId: "coding", force: { x: -40, y: 0 } },
    share: 0.85,
  },
  { id: "merged", label: "Merged", absorb: true, force: 24, share: 1 },
]

const features = [
  { id: "auth", label: "Auth" },
  { id: "billing", label: "Billing" },
  { id: "search", label: "Search" },
]

function makeData(pressure) {
  const stages = ["coding", "ci", "review", "revision", "merged"]
  const rows = []
  let index = 0
  for (const feature of features) {
    const count = feature.id === "search" ? 5 : 3
    for (let pr = 0; pr < count; pr += 1) {
      let stage
      if (pressure === "low") {
        stage = pr === count - 1 ? "review" : "merged"
      } else if (pressure === "coordination") {
        stage = pr === count - 1 ? "review" : "merged"
      } else {
        stage = stages[index % (pressure === "high" ? 4 : stages.length)]
      }
      rows.push({
        id: `${feature.id}-${pr}`,
        stage,
        featureId: feature.id,
        featureLabel: feature.label,
        authorType: index % 3 === 0 ? "human" : index % 3 === 1 ? "human_ai_assisted" : "ai_agent",
        reviewWork: 0.8 + (index % 4) * 0.35,
      })
      index += 1
    }
  }
  return rows
}

const controlPanelStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "end",
  margin: "0 0 12px",
  padding: 12,
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
}

const controlLabelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
}

const inputStyle = {
  minHeight: 34,
  minWidth: 160,
  border: "1px solid var(--surface-3)",
  borderRadius: 6,
  background: "var(--surface-0)",
  color: "var(--text-primary)",
  padding: "0 8px",
}

export default function ProcessFlowChartPage() {
  const [pressure, setPressure] = useState("high")
  const [showGroups, setShowGroups] = useState(true)
  const [settle, setSettle] = useState(false)
  const data = useMemo(() => makeData(pressure), [pressure])
  const stages = useMemo(() => {
    if (pressure === "low") {
      return baseStages.map((stage) =>
        stage.id === "review"
          ? {
              ...stage,
              capacity: { unitsPerSecond: 14, unitAccessor: "reviewWork" },
              pressure: { pressure: 0.55 },
            }
          : stage,
      )
    }
    if (pressure === "high") {
      return baseStages.map((stage) =>
        stage.id === "review"
          ? {
              ...stage,
              capacity: { unitsPerSecond: 3.5, unitAccessor: "reviewWork" },
              pressure: { pressure: 1.8 },
            }
          : stage,
      )
    }
    return baseStages
  }, [pressure])

  const chartKey = `${pressure}-${showGroups}-${settle}`

  return (
    <PageLayout
      title="ProcessFlowChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Physics", path: "/charts/process-flow-chart" },
        { label: "ProcessFlowChart", path: "/charts/process-flow-chart" },
      ]}
      prevPage={{ title: "PhysicalFlowChart", path: "/charts/physical-flow-chart" }}
      nextPage={{ title: "GauntletChart", path: "/charts/gauntlet-chart" }}
    >
      <ComponentMeta
        componentName="ProcessFlowChart"
        importStatement='import { ProcessFlowChart } from "semiotic/physics"'
        tier="charts"
        wraps="StreamPhysicsFrame"
        wrapsPath="/frames/physics-frame"
        related={[
          { name: "GauntletChart", path: "/charts/gauntlet-chart" },
          { name: "EventDropChart", path: "/charts/event-drop-chart" },
          { name: "PhysicalFlowChart", path: "/charts/physical-flow-chart" },
          { name: "PhysicsCustomChart", path: "/charts/physics-custom-chart" },
          { name: "Merge Pressure", path: "/examples/merge-pressure" },
        ]}
      />

      <ChartGrounding
        component="ProcessFlowChart"
        props={{
          data: data.slice(0, 8),
          stages,
          stageAccessor: "stage",
          groupBy: showGroups ? "featureId" : undefined,
          groupLabelAccessor: showGroups ? "featureLabel" : undefined,
          colorBy: "authorType",
          showProjection: true,
        }}
      />

      <p>
        ProcessFlowChart is the multi-body workflow HOC: ordered stages become region effects
        (route force, capacity, pressure, portals, absorb sinks). Stages with{" "}
        <code>capacity</code> install live FIFO queue controllers (<code>liveCapacity</code>, default
        true) that process work units per second and release bodies — not just drag theater.
        Optional feature groups complete only when every member is absorbed, and the settled
        projection is a stage-count bar strip.
        Use it for review queues, triage, merge pipelines, and other capacitated processes. For a
        single compound plan degraded by timed gates, prefer{" "}
        <Link to="/charts/gauntlet-chart">GauntletChart</Link>.
      </p>

      <div style={controlPanelStyle}>
        <label style={controlLabelStyle}>
          Review regime
          <select
            style={inputStyle}
            value={pressure}
            onChange={(event) => setPressure(event.target.value)}
          >
            <option value="low">Under capacity</option>
            <option value="high">Review bottleneck</option>
            <option value="coordination">Coordination debt</option>
          </select>
        </label>
        <label style={{ ...controlLabelStyle, gridTemplateColumns: "auto 1fr", textTransform: "none", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showGroups}
            onChange={(event) => setShowGroups(event.target.checked)}
          />
          Feature groups
        </label>
        <label style={{ ...controlLabelStyle, gridTemplateColumns: "auto 1fr", textTransform: "none", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={settle}
            onChange={(event) => setSettle(event.target.checked)}
          />
          Settle first paint
        </label>
      </div>

      <ProcessFlowChart
        key={chartKey}
        data={data}
        stages={stages}
        idAccessor="id"
        stageAccessor="stage"
        groupBy={showGroups ? "featureId" : undefined}
        groupLabelAccessor={showGroups ? "featureLabel" : undefined}
        workAccessor="reviewWork"
        colorBy="authorType"
        groupCompletion={showGroups ? "allAbsorbed" : "none"}
        settle={settle}
        size={[900, 420]}
        showChrome
        showProjection
      />

      <p style={{ marginTop: 16, color: "var(--text-secondary)" }}>
        Flagship narrative:{" "}
        <Link to="/examples/merge-pressure">Merge Pressure</Link> — AI multiplies PR emission and
        the bottleneck migrates to review, with all-members feature completion.
      </p>

      <PropTable componentName="ProcessFlowChart" props={processFlowChartProps} />
    </PageLayout>
  )
}
