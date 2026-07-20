import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  GauntletChart,
  ProcessFlowChart,
  StreamPhysicsFrame,
  comparePhysicsTrace,
  physicsReferenceEnvelope,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
} from "semiotic/physics"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import "./PhysicsProcessGuidePage.css"

const processCode = `import { ProcessFlowChart } from "semiotic/physics"

// Many work items · capacitated stages · feature all-members completion
<ProcessFlowChart
  data={prs}
  stageAccessor="stage"
  groupBy="featureId"
  workAccessor="reviewWork"
  bodyMark="halo"           // or datum.__physicsMark
  liveCapacity              // FIFO queue at unitsPerSecond
  bodyLimit={400}           // soft stream budget (evict oldest)
  onCapacityChange={setStats}
  stages={[
    { id: "coding", label: "Coding", force: 14 },
    { id: "review", label: "Review",
      capacity: { unitsPerSecond: 4, unitAccessor: "reviewWork" } },
    { id: "revision", portal: { targetStageId: "coding" } },
    { id: "merged", absorb: true },
  ]}
/>`

const gauntletCode = `import { GauntletChart } from "semiotic/physics"

// One compound plan · tethered properties · timed gate effects
<GauntletChart
  data={projects}
  positiveProperties={lift}
  negativeProperties={drag}
  gates={gates}
  events={events}
  showProjection   // viability / outcome strip
  showChrome
/>`

const customCode = `import {
  PhysicsCustomChart,
  processStageLayout,
  capacitatedRegion,
  createCapacityQueueController,
  processChrome,
} from "semiotic/physics"

layout={(ctx) => {
  const volume = processStageLayout({
    width: ctx.dimensions.width,
    height: ctx.dimensions.height,
    stages: STAGE_DEFS,
    shape: "lane",
  })
  return {
    bodies: spawnsFromData(ctx.data, volume),
    regionEffects: [
      capacitatedRegion({ id: "review", ...volume.stages[1], capacity: 4 }),
    ],
    controllers: [
      createCapacityQueueController({
        regionId: "review",
        unitsPerSecond: 4,
      }),
    ],
    // layoutConfig changes rerun layout without re-enqueueing bodies
    overlays: processChrome({ ...volume, stages: chromeStages }),
  }
}}
layoutConfig={{ highlightId }}`

const serviceOperationsCode = `import {
  createCapacityQueueController,
  createServiceResourcePoolController,
  createServiceLevelController,
  createDependencyGateController,
} from "semiotic/physics"

const agents = createServiceResourcePoolController({
  resources: staffedAgents,
  assignmentOffset: { x: 30, y: 0 },
})

const serviceLevel = createServiceLevelController({
  bodyFilter: (body) => body.datum?.kind === "case",
  deadlineAccessor: "promiseMinutes",
  completionRegionId: "resolved",
})

const dependency = createDependencyGateController({
  regionId: "upstream-recovery",
  opensAt: recoveryMinute,
  bodyFilter: (body) => body.datum?.requiresRecovery === true,
})

// The capacity queue owns work accounting; the resource pool is assigned
// explicitly by domain callbacks, keeping service semantics deterministic.
const desk = createCapacityQueueController({
  regionId: "support",
  unitsPerSecond: staffedAgents.length,
  onQueued: (body) => agents.assign(body.id),
  onProcessed: (body) => agents.release(body.id),
})`

const metricGeometryCode = `import {
  StreamPhysicsFrame,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
} from "semiotic/physics"

const layout = processStageLayout({
  width,
  height: 300,
  shape: "bowtie",
  stages,
  centerStageIndex: 2,
  pinchRatio: 0.16,
  // One metric changes the complete process volume, not just its paint.
  pinchHeightOffset: leadershipReached * 2,
})

const polygons = processVolumePolygons(layout)
const regionEffects = processStageRegions(layout)

<StreamPhysicsFrame
  config={{ colliders: layout.colliders, fixedDt: 1 / 60 }}
  regionEffects={regionEffects}
  foregroundGraphics={() => (
    <svg viewBox={\`0 0 \${layout.width} \${layout.height}\`}>
      {polygons.map((polygon) => (
        <polygon key={polygon.id} points={polygon.points.join(" ")} />
      ))}
    </svg>
  )}
/>`

const processEvidenceCode = `import {
  aggregateRegionCounts,
  createProcessJourneyLedger,
  groupCompletionRows,
  processJourneyRows,
  processStageRegions,
  regionCountsToProjectionRows,
  updateProcessJourney,
} from "semiotic/physics"

const regions = processStageRegions(layout)
const initialJourney = createProcessJourneyLedger({
  stages,
  bodyIds: cohort.map((row) => row.id),
})

function onRegionEvent(event) {
  setJourney((current) => updateProcessJourney(current, event))
  setCounts((current) => aggregateRegionCounts(current, event))
}

const journeyRows = processJourneyRows(journey)
const settledRegionRows = regionCountsToProjectionRows(counts)
const groupRows = groupCompletionRows(groups, absorbedBodyIds)

<StreamPhysicsFrame
  regionEffects={regions}
  onRegionEvent={onRegionEvent}
  accessibleTable
/>`

const referenceEnvelopeCode = `import {
  comparePhysicsTrace,
  physicsReferenceEnvelope,
} from "semiotic/physics"

const envelope = physicsReferenceEnvelope({
  runs: historicalOrReplayTraces,
  sampleAt: { start: 0, end: 30, step: 0.5 },
  quantiles: [0.1, 0.5, 0.9],
  interpolation: "step",
})

const evidence = comparePhysicsTrace(liveTrace, envelope, {
  lower: 0.1,
  upper: 0.9,
})
// evidence.aboveDuration, insideDuration, peakExcess, ...`

const metricStages = [
  { id: "discovery", label: "Discovery" },
  { id: "activation", label: "Activation" },
  { id: "impact", label: "First Impact" },
  { id: "commitment", label: "Commitment" },
  { id: "leadership", label: "Leadership" },
]

const METRIC_DEMO_HEIGHT = 300
const METRIC_DEMO_MAX = 36
const METRIC_GROWTH_PER_UNIT = 2

function polygonPoints(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ")
}

function metricDemoSpawns(layout) {
  const x = layout.left + 12
  const top = layout.boundaryY(x, "top") + 12
  const bottom = layout.boundaryY(x, "bottom") - 12
  const span = Math.max(1, bottom - top)
  return Array.from({ length: 18 }, (_, index) => ({
    id: `metric-particle-${index}`,
    x: x + (index % 3) * 5,
    y: top + ((index * 37) % Math.max(1, Math.floor(span))),
    vx: 82 + (index % 5) * 7,
    vy: ((index % 4) - 1.5) * 5,
    bodyCollisions: false,
    shape: { type: "circle", radius: layout.width < 480 ? 4.2 : 5.4 },
    datum: { label: `Cohort member ${index + 1}` },
    spawnAt: index * 0.04,
  }))
}

function MetricDrivenVolumeDemo() {
  const [leadershipReached, setLeadershipReached] = useState(12)
  const [hostWidth, hostRef] = useResponsiveWidth(300, 760)
  const width = Math.max(300, Math.floor(hostWidth))
  const compact = width < 480
  const layout = useMemo(
    () =>
      processStageLayout({
        width,
        height: METRIC_DEMO_HEIGHT,
        shape: "bowtie",
        padX: compact ? 20 : 34,
        padY: compact ? 58 : 54,
        stages: metricStages,
        centerStageIndex: 2,
        pinchRatio: 0.16,
        pinchHeightOffset: leadershipReached * METRIC_GROWTH_PER_UNIT,
        idPrefix: "metric-guide",
      }),
    [compact, leadershipReached, width],
  )
  const polygons = useMemo(() => processVolumePolygons(layout), [layout])
  const regions = useMemo(
    () => processStageRegions(layout, { idPrefix: "metric-guide-stage" }),
    [layout],
  )
  const spawns = useMemo(() => metricDemoSpawns(layout), [layout])
  const config = useMemo(
    () => ({
      kernel: {
        seed: 31,
        gravity: { x: 72, y: 0 },
        restitution: 0.2,
        friction: 0.56,
        velocityDamping: 0.996,
        maxVelocity: 250,
      },
      colliders: layout.colliders,
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      observation: {
        chartId: "metric-driven-process-volume-guide",
        chartType: "StreamPhysicsFrame",
      },
    }),
    [layout.colliders],
  )
  const growth = leadershipReached * METRIC_GROWTH_PER_UNIT

  return (
    <div className="physics-process-metric" ref={hostRef}>
      <div className="physics-process-metric__controls">
        <label htmlFor="physics-process-leadership-count">
          Leadership reached
        </label>
        <input
          id="physics-process-leadership-count"
          type="range"
          min="0"
          max={METRIC_DEMO_MAX}
          step="1"
          value={leadershipReached}
          onChange={(event) => setLeadershipReached(Number(event.target.value))}
        />
        <output htmlFor="physics-process-leadership-count">
          {leadershipReached} participants
        </output>
      </div>

      <div className="physics-process-metric__readouts" aria-live="polite">
        <span>
          <strong>{growth}px</strong> metric offset
        </span>
        <span>
          <strong>{Math.round(layout.pinchHeight)}px</strong> resolved impact height
        </span>
        <span>
          <strong>{polygons.length}</strong> synchronized polygons
        </span>
      </div>

      <div className="physics-process-metric__stage" style={{ width }}>
        <StreamPhysicsFrame
          key={width}
          title="Metric-driven process volume"
          summary={`${leadershipReached} participants reached Leadership. The First Impact passage is ${Math.round(layout.pinchHeight)} pixels high.`}
          description="A bowtie process volume whose incoming barriers, center boundary, outgoing barriers, stage regions, and overlay polygons are all derived from one metric-aware layout."
          size={[width, METRIC_DEMO_HEIGHT]}
          config={config}
          initialSpawns={spawns}
          initialSpawnPacing={{
            pacing: "arrival",
            timeAccessor: "spawnAt",
            timeScale: 4,
          }}
          regionEffects={regions}
          suspendWhenHidden={false}
          accessibleTable
          bodySemanticItems={(body) => ({
            label: body.datum?.label ?? body.id,
            group: "Metric demo cohort",
            datum: body.datum,
          })}
          bodyStyle={{
            fill: "#22b8cf",
            stroke: "#075985",
            strokeWidth: 1.2,
            opacity: 0.92,
          }}
        />
        <svg
          className="physics-process-metric__overlay"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {polygons.map((polygon) => (
            <polygon
              key={polygon.id}
              className={`is-${polygon.role}`}
              points={polygonPoints(polygon.points)}
            />
          ))}
          {layout.stages.map((stage) => (
            <text key={stage.id} x={stage.x} y={layout.midY + 4} textAnchor="middle">
              {compact ? stage.label.slice(0, 3).toUpperCase() : stage.label}
            </text>
          ))}
        </svg>
      </div>

      <p className="physics-process-metric__caption">
        The cyan border is not an independent illustration. It is rendered from
        <code> processVolumePolygons(layout)</code>; the canvas barriers use
        <code> layout.colliders</code>, and the observation envelope uses
        <code> processStageRegions(layout)</code>.
      </p>
    </div>
  )
}

const REFERENCE_DOC_RUNS = Array.from({ length: 9 }, (_, runIndex) => ({
  id: `reference-${runIndex}`,
  samples: Array.from({ length: 13 }, (_, index) => ({
    time: index,
    value: Math.max(
      0,
      2.4 + Math.sin(index * 0.72 + runIndex * 0.31) * 1.4 + (runIndex - 4) * 0.16,
    ),
  })),
}))

const REFERENCE_DOC_ENVELOPE = physicsReferenceEnvelope({
  runs: REFERENCE_DOC_RUNS,
  sampleAt: { start: 0, end: 12, step: 1 },
  quantiles: [0.1, 0.5, 0.9],
  interpolation: "linear",
})

function ReferenceEnvelopeDemo() {
  const [load, setLoad] = useState(1)
  const width = 720
  const height = 220
  const plot = { x: 38, y: 20, width: 664, height: 158 }
  const trace = REFERENCE_DOC_ENVELOPE.points.map((point, index) => ({
    time: point.time,
    value: Math.max(0, (point.median ?? 0) * load + Math.sin(index * 0.9) * 0.45),
  }))
  const comparison = comparePhysicsTrace(trace, REFERENCE_DOC_ENVELOPE, {
    lower: 0.1,
    upper: 0.9,
    interpolation: "linear",
  })
  const maxValue = Math.max(
    7,
    ...REFERENCE_DOC_ENVELOPE.points.map((point) => point.quantiles[0.9] ?? 0),
    ...trace.map((point) => point.value),
  )
  const x = (time) => plot.x + (time / 12) * plot.width
  const y = (value) => plot.y + plot.height - (value / maxValue) * plot.height
  const upper = REFERENCE_DOC_ENVELOPE.points.map(
    (point) => `${x(point.time)},${y(point.quantiles[0.9] ?? 0)}`,
  )
  const lower = [...REFERENCE_DOC_ENVELOPE.points]
    .reverse()
    .map((point) => `${x(point.time)},${y(point.quantiles[0.1] ?? 0)}`)
  const actual = trace.map((point) => `${x(point.time)},${y(point.value)}`).join(" ")

  return (
    <div className="physics-reference-demo">
      <div className="physics-reference-demo__controls">
        <label htmlFor="physics-reference-load">Live trace load</label>
        <input
          id="physics-reference-load"
          type="range"
          min="0.65"
          max="1.8"
          step="0.05"
          value={load}
          onChange={(event) => setLoad(Number(event.target.value))}
        />
        <output htmlFor="physics-reference-load">{load.toFixed(2)}x</output>
      </div>
      <div className="physics-reference-demo__readouts" aria-live="polite">
        <span><strong>{comparison.insideDuration.toFixed(1)}s</strong> inside</span>
        <span><strong>{comparison.aboveDuration.toFixed(1)}s</strong> above</span>
        <span><strong>{comparison.peakExcess.toFixed(1)}</strong> peak excess</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Adjustable live trace compared with a tenth to ninetieth percentile reference envelope.">
        {[0, 0.5, 1].map((fraction) => (
          <line key={fraction} x1={plot.x} x2={plot.x + plot.width} y1={plot.y + plot.height * fraction} y2={plot.y + plot.height * fraction} />
        ))}
        <polygon points={[...upper, ...lower].join(" ")} />
        <polyline points={actual} />
        <text x={plot.x} y={height - 12}>0s</text>
        <text x={plot.x + plot.width} y={height - 12} textAnchor="end">12s</text>
      </svg>
    </div>
  )
}

const decisionRows = [
  {
    choose: "ProcessFlowChart",
    when: "Many independent work items move through ordered stages with capacity, rework, and optional feature groups that complete only when every member is absorbed.",
    examples: "Hospital triage, moderation queues, ETL backlog",
  },
  {
    choose: "GauntletChart",
    when: "One compound plan (a project core) carries tethered positive/negative properties through timed gate effects that pop lift or add drag.",
    examples: "Merge Pressure, Not in MY Backyard, legislation, product roadmap risk",
  },
  {
    choose: "EventDropChart",
    when: "Event time vs arrival time, watermarks, lateness gutters — streaming time semantics.",
    examples: "Watermarks, Made Physical",
  },
  {
    choose: "GaltonBoardChart",
    when: "Uncertainty as sampling process; settled quantile / histogram.",
    examples: "Plinko Quantile Dotplot",
  },
  {
    choose: "PhysicsCustomChart + kit",
    when: "Bowtie volumes, bespoke regions, or essay layouts that still need Semiotic a11y and push.",
    examples: "Stakeholder Journey (processStageLayout)",
  },
]

const checklist = [
  "Use a named HOC or recipe — don't re-derive colliders in the example",
  "Decoration encodes the claim (stages, capacity, late gutter, sockets)",
  "Settled projection still tells the story when motion is paused",
  "Domain setup for the chart itself stays under ~150 lines",
  "Tooltips own decoration (inline background) or rely on FlippingTooltip auto-decoration",
  "Corridor integrity: bodies spawn and settle inside walls",
  "If capacity matters, show work, wait, utilization, pressure, and overflow from controller evidence",
]

export default function PhysicsProcessGuidePage() {
  const [capacitySnapshot, setCapacitySnapshot] = useState(null)
  const prs = useMemo(
    () => [
      { id: "a1", stage: "coding", featureId: "auth", featureLabel: "Auth", reviewWork: 1.2, authorType: "human", mark: "circle" },
      { id: "a2", stage: "review", featureId: "auth", featureLabel: "Auth", reviewWork: 1.5, authorType: "human_ai_assisted", __physicsMark: "halo" },
      { id: "b1", stage: "review", featureId: "billing", featureLabel: "Billing", reviewWork: 2, authorType: "ai_agent", __physicsMark: "faceted" },
      { id: "b2", stage: "merged", featureId: "billing", featureLabel: "Billing", reviewWork: 1, authorType: "human", mark: "pill" },
      { id: "c1", stage: "revision", featureId: "search", featureLabel: "Search", reviewWork: 1.8, authorType: "ai_agent", __physicsMark: "diamond" },
    ],
    [],
  )
  const stages = useMemo(
    () => [
      { id: "coding", label: "Coding", force: 14, share: 1.1 },
      {
        id: "review",
        label: "Review",
        capacity: { unitsPerSecond: 3, unitAccessor: "reviewWork" },
        force: 12,
        share: 1.3,
      },
      { id: "revision", label: "Revision", portal: { targetStageId: "coding" }, share: 0.9 },
      { id: "merged", label: "Merged", absorb: true, force: 22, share: 1 },
    ],
    [],
  )

  return (
    <PageLayout
      title="Physics process guide"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "When Physics?", path: "/features/when-physics" },
        { label: "Process guide", path: "/features/physics-process-guide" },
      ]}
      prevPage={{ title: "When Physics?", path: "/features/when-physics" }}
      nextPage={{ title: "ProcessFlowChart", path: "/charts/process-flow-chart" }}
    >
      <p style={{ fontSize: "1.1rem", lineHeight: 1.55, maxWidth: 720 }}>
        How to pick a physics HOC, keep process decoration readable, measure capacity,
        and ship examples that stay honest when the balls stop moving.
      </p>

      <h2>Decision table</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={th}>Choose</th>
              <th style={th}>When</th>
              <th style={th}>Examples</th>
            </tr>
          </thead>
          <tbody>
            {decisionRows.map((row) => (
              <tr key={row.choose}>
                <td style={td}>
                  <strong>{row.choose}</strong>
                </td>
                <td style={td}>{row.when}</td>
                <td style={td}>{row.examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Gauntlet vs ProcessFlow</h2>
      <div className="physics-process-guide__chart-comparison">
        <div className="physics-process-guide__chart-card" style={card}>
          <h3 style={{ marginTop: 0 }}>GauntletChart</h3>
          <p>One core + tethered properties + timed gates.</p>
          <CodeBlock language="jsx" code={gauntletCode} />
          <GauntletChart
            data={[
              {
                id: "plan",
                positives: ["homes", "trees"],
                negatives: ["cost"],
                viability: 80,
              },
            ]}
            positiveProperties={[
              { id: "homes", label: "Homes", color: "#22c55e", buoyancy: 2, radius: 9 },
              { id: "trees", label: "Trees", color: "#06b6d4", buoyancy: 1.4, radius: 8 },
            ]}
            negativeProperties={[{ id: "cost", label: "Cost", color: "#ef4444", load: 1, radius: 7 }]}
            gates={[{ id: "review", label: "Review" }]}
            size={[420, 220]}
            showProjection
          />
        </div>
        <div className="physics-process-guide__chart-card" style={card}>
          <h3 style={{ marginTop: 0 }}>ProcessFlowChart</h3>
          <p>
            Many PRs · live capacity · feature sockets. Review:{" "}
            <strong>
              q={capacitySnapshot?.queueDepth ?? 0},{" "}
              oldest={(capacitySnapshot?.queueAge.oldestSeconds ?? 0).toFixed(1)}s,{" "}
              util={Math.round((capacitySnapshot?.window.utilization ?? 0) * 100)}%,{" "}
              pressure={(capacitySnapshot?.window.pressure ?? 0).toFixed(1)}x
            </strong>
          </p>
          <ProcessFlowChart
            data={prs}
            stages={stages}
            idAccessor="id"
            stageAccessor="stage"
            groupBy="featureId"
            groupLabelAccessor="featureLabel"
            workAccessor="reviewWork"
            colorBy="authorType"
            liveCapacity
            size={[420, 260]}
            settle={false}
            onCapacityChange={(stats) => {
              const review = stats.find((s) => s.regionId.includes("review"))
              if (review) setCapacitySnapshot(review)
            }}
          />
        </div>
      </div>

      <h2>Authoring kit</h2>
      <p>
        Custom process essays should import the kit rather than inventing colliders:{" "}
        <code>processStageLayout</code>, <code>processVolumePolygons</code>, region factories,{" "}
        <code>createCapacityQueueController</code>, <code>physicsReferenceEnvelope</code>,{" "}
        <code>comparePhysicsTrace</code>, and <code>processChrome</code>.{" "}
        <code>layoutConfig</code> is the interaction hot path — regenerate geometry or
        styling without re-enqueueing bodies.
      </p>
      <CodeBlock language="jsx" code={customCode} />

      <h2>Metric-driven volume geometry</h2>
      <p>
        A process metric can change available physical space, but the sensor, collision
        barriers, and explanatory border must remain one geometry. This example adds two
        pixels to the bowtie pinch for each participant reaching Leadership. Move the slider:
        every surface below is regenerated from the same <code>ProcessVolumeLayout</code>.
      </p>
      <MetricDrivenVolumeDemo />
      <CodeBlock language="jsx" code={metricGeometryCode} />

      <h2>Capacity evidence and reference envelopes</h2>
      <p>
        <code>CapacityQueueSnapshot</code> distinguishes arrivals, admission, blocked work,
        completion, and abandonment by semantic job visit. Queue ages, peaks, utilization,
        throughput, and pressure advance in simulated fixed-step time. A separate reference
        recipe aligns supplied or replayed traces; it does not claim that a quantile band is a
        causal counterfactual. Move the load slider to compare one live trace with the same band.
      </p>
      <ReferenceEnvelopeDemo />
      <CodeBlock language="jsx" code={referenceEnvelopeCode} />
      <p>
        See both contracts used together in <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link>.
      </p>

      <h2>Finite service resources and external dependencies</h2>
      <p>
        Use <code>createServiceResourcePoolController</code> when staff, machines, or other
        finite resources should be visible participants in the process rather than an abstract
        rate. Assignment is explicit and deterministic; the controller supplies readable tethers,
        home positions, and availability evidence. Pair it with <code>createServiceLevelController</code>
        to model deadline breaches, protected cases, and late-but-completed outcomes.
      </p>
      <p>
        <code>createDependencyGateController</code> holds only the work selected by its body filter
        until a scheduled or live external condition opens. This distinguishes upstream-blocked
        work from a capacity queue, and makes idle resources measurable instead of implying that
        more service capacity can solve every delay.
      </p>
      <CodeBlock language="jsx" code={serviceOperationsCode} />
      <p>
        <code>processChrome</code> stages can also use a reader-facing <code>capacityLabel</code>
        and per-stage <code>showBadge</code> flag, so a process can say “5 agents” instead of
        exposing an unexplained implementation rate. See the complete interaction in{" "}
        <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link>.
      </p>

      <h2>Journey and settled evidence</h2>
      <p>
        Region events should reduce into durable analytical state instead of making readers
        infer outcomes from a moving body. The process kit separates three useful views of
        that evidence:
      </p>
      <ul>
        <li>
          <code>processJourneyRows</code> reports monotonic <strong>reached</strong>, actual
          unique <strong>entered</strong>, visits, repeat visits, conversion, and drop-off.
        </li>
        <li>
          <code>aggregateRegionCounts</code> counts each body once per region;
          <code>regionCountsToProjectionRows</code> makes those counts chart-ready.
        </li>
        <li>
          <code>groupCompletionRows</code> projects all-member, any-member, or weighted
          threshold completion from absorbed body ids.
        </li>
      </ul>
      <CodeBlock language="jsx" code={processEvidenceCode} />
      <p>
        The reducers are serializable and independent of the live frame, so the same event
        tape can be replayed, persisted, compared across scenarios, or rendered as an
        accessible settled table. See the controlled comparison in{" "}
        <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link>.
      </p>

      <h2>ProcessFlow props that matter</h2>
      <CodeBlock language="jsx" code={processCode} />
      <ul>
        <li>
          <strong>liveCapacity</strong> — FIFO queue at <code>unitsPerSecond</code>, not just drag
        </li>
        <li>
          <strong>onCapacityChange</strong> — work, age, overflow, throughput, utilization, and pressure
        </li>
        <li>
          <strong>bodyMark / __physicsMark</strong> — circle, halo, faceted, pill, diamond, square
        </li>
        <li>
          <strong>bodyLimit</strong> — soft stream budget (evict oldest) for long runs
        </li>
        <li>
          <strong>selection</strong> — restyle without relayout
        </li>
      </ul>

      <h2>Example quality checklist</h2>
      <ol>
        {checklist.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ol>
      <p>
        Flagship demos:{" "}
        <Link to="/examples/watermarks">Watermarks</Link>,{" "}
        <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link>,{" "}
        <Link to="/examples/merge-pressure">Merge Pressure</Link>,{" "}
        <Link to="/examples/not-in-my-backyard">NIMBY</Link>,{" "}
        <Link to="/examples/port-congestion-replay">Long Way Around</Link>.
      </p>

      <h2>Contracts we test</h2>
      <p>
        Corridor integrity, tooltip decoration (never class-only transparent), settled projection
        overlays by default, capacity metrics, and seeded builder determinism live in{" "}
        <code>PhysicsContracts.test.ts</code>.
      </p>
    </PageLayout>
  )
}

const th = {
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  padding: "8px 10px",
  color: "var(--text-secondary)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}
const td = {
  borderBottom: "1px solid var(--surface-3)",
  padding: "10px",
  verticalAlign: "top",
  lineHeight: 1.45,
}
const card = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 14,
  background: "var(--surface-1)",
}
