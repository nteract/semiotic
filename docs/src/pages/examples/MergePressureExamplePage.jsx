import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  GauntletChart,
  bodyGroupSpec,
  groupCompletionRows,
  planGauntletPropertyWork,
  replaceGauntletNegative,
} from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./MergePressureExamplePage.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 300
const FRAME_HEIGHT = 540
const FEATURE_POINTS = 18

const TRAITS = {
  missing_tests: {
    id: "missing_tests",
    label: "Missing Tests",
    short: "MT",
    color: "#dc2626",
    work: 3,
    priority: 3,
    load: 1.35,
  },
  bad_tests: {
    id: "bad_tests",
    label: "Bad Tests",
    short: "BT",
    color: "#ea580c",
    work: 2,
    priority: 5,
    load: 1.15,
  },
  bugs: {
    id: "bugs",
    label: "Bugs",
    short: "BUG",
    color: "#e11d48",
    work: 2,
    priority: 1,
    load: 1.1,
  },
  docs: {
    id: "docs",
    label: "Docs Gap",
    short: "DOC",
    color: "#d97706",
    work: 1,
    priority: 0,
    load: 0.7,
  },
  scope: {
    id: "scope",
    label: "Scope Creep",
    short: "SCOPE",
    color: "#475569",
    work: 2,
    priority: 2,
    load: 0.95,
  },
  tech_debt: {
    id: "tech_debt",
    label: "Tech Debt",
    short: "DEBT",
    color: "#7c3aed",
    work: 3,
    priority: 4,
    load: 1.25,
  },
}

const TRAIT_ORDER = [
  "docs",
  "bugs",
  "scope",
  "missing_tests",
  "tech_debt",
  "bad_tests",
]

const NEGATIVE_PROPERTIES = Object.values(TRAITS).map((trait) => ({
  ...trait,
  mass: 0.72,
  radius: 7.5,
  pull: { x: -7, y: 18 + trait.load * 5 },
}))

const PR_TEMPLATES = [
  { points: 2, negatives: ["missing_tests", "docs"] },
  { points: 4, negatives: ["docs", "bugs", "missing_tests"] },
  { points: 3, negatives: ["scope", "docs"] },
  {
    points: 6,
    negatives: ["docs", "bugs", "scope", "missing_tests", "tech_debt"],
  },
  { points: 5, negatives: ["missing_tests", "tech_debt", "bugs"] },
  { points: 3, negatives: ["docs", "bad_tests"] },
  { points: 4, negatives: ["scope", "bugs", "missing_tests", "bugs"] },
  { points: 2, negatives: ["docs", "tech_debt"] },
]

const SCENARIOS = {
  humanPace: {
    id: "humanPace",
    short: "1. Human pace",
    label: "Coding throttles the system",
    source: "Human-authored PRs",
    count: 5,
    arrivalGap: 1.45,
    reviewRate: 5,
    humanBudget: 5,
    aiMode: "observe",
    seed: 31,
    description:
      "PR work arrives slowly enough that the shared human queue drains between arrivals.",
    lesson:
      "When coding is slower than review service, attached risk can be inspected without a persistent backlog.",
  },
  aiBurst: {
    id: "aiBurst",
    short: "2. AI burst",
    label: "The bottleneck moves to review",
    source: "AI-assisted PRs",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 5,
    aiMode: "observe",
    seed: 83,
    description:
      "The same review service now receives code points faster than it can process them.",
    lesson:
      "More generated code is visible immediately; merged Feature points remain governed by shared review throughput.",
  },
  ciReturns: {
    id: "ciReturns",
    short: "3. CI returns",
    label: "Recirculation consumes capacity twice",
    source: "AI-agent PRs, narrow review",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 3,
    aiMode: "observe",
    seed: 127,
    description:
      "A smaller remediation budget leaves Missing Tests attached, so CI sends the same PR back through human review.",
    lesson:
      "A CI return sends the same PR through review again, adding repeat demand to a finite service.",
  },
  aiTests: {
    id: "aiTests",
    short: "4. AI tests",
    label: "Automation can move risk, not remove it",
    source: "AI-reviewed PRs",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 5,
    aiMode: "bad_tests",
    seed: 173,
    description:
      "AI review replaces Missing Tests with Bad Tests. CI returns fall, but residual risk can merge into the Feature.",
    lesson:
      "A faster green check can leave residual risk when review replaces one negative trait with another.",
  },
  scaledReview: {
    id: "scaledReview",
    short: "5. Scale review",
    label: "Code velocity needs review velocity",
    source: "AI-assisted PRs, wider review",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 15,
    humanBudget: 7,
    aiMode: "observe",
    seed: 211,
    description:
      "Arrival velocity stays high, while review service and per-pass remediation both increase.",
    lesson:
      "The intervention is systemic: service rate, review depth, and CI feedback must scale with generated work.",
  },
}

const SCENARIO_ORDER = [
  "humanPace",
  "aiBurst",
  "ciReturns",
  "aiTests",
  "scaledReview",
]

function traitLabel(id) {
  return TRAITS[id]?.label ?? id
}

function countById(ids) {
  return ids.reduce((counts, id) => {
    counts[id] = (counts[id] ?? 0) + 1
    return counts
  }, {})
}

function prRadius(points) {
  return Math.round(15 + Math.sqrt(points) * 4.8)
}

function buildProjectRows(scenario, runId) {
  return PR_TEMPLATES.slice(0, scenario.count).map((template, index) => ({
    id: `${scenario.id}-${runId}-pr-${index}`,
    label: `PR-${184 + index}`,
    source: scenario.source,
    points: template.points,
    reviewWork: template.points,
    aiWork: 0.2,
    ciWork: 0.2,
    arrival: index * scenario.arrivalGap,
    negatives: [...template.negatives],
    metrics: {
      points: template.points,
      humanPasses: 0,
      humanReviewedWork: 0,
      ciReturns: 0,
    },
  }))
}

function humanReviewEffect(project, scenario, passLabel) {
  const plan = planGauntletPropertyWork({
    attachedIds: project.negativeIds,
    properties: NEGATIVE_PROPERTIES,
    budget: scenario.humanBudget,
  })
  const popped = plan.ids.map(traitLabel).join(", ") || "nothing"
  return {
    metricsDelta: {
      humanPasses: 1,
      humanReviewedWork: plan.used,
    },
    popNegative: { ids: plan.ids },
    stage: passLabel,
    summary: `${passLabel} used ${plan.used}/${scenario.humanBudget} remediation units and removed ${popped}.`,
  }
}

function aiReviewEffect(project, scenario) {
  if (scenario.aiMode === "bad_tests") {
    const replacement = replaceGauntletNegative(project, {
      from: "missing_tests",
      to: "bad_tests",
    })
    if (replacement.popNegative) {
      return {
        ...replacement,
        metricsDelta: { aiPasses: 1, aiReplacements: 1 },
        stage: "AI Review",
        summary: "AI review replaced Missing Tests with Bad Tests.",
      }
    }
  }
  return {
    metricsDelta: { aiPasses: 1 },
    stage: "AI Review",
    summary: "AI review left the attached negative traits unchanged.",
  }
}

function ciEffect(project, label) {
  if (project.negativeIds.includes("missing_tests")) {
    return {
      delayDelta: 1,
      metricsDelta: { ciReturns: 1 },
      outcome: "returned_to_review",
      stage: label,
      summary: "CI found Missing Tests and returned the same PR to human review.",
    }
  }
  return {
    metricsDelta: { ciPasses: 1 },
    stage: label,
    summary: "CI passed; any remaining non-blocking risk stays attached.",
  }
}

function gateById(layout, id) {
  return layout.gates.find((gate) => gate.id === id)
}

function buildReviewEvents(scenario, project, layout) {
  const ai = gateById(layout, "ai-review")
  const human = gateById(layout, "human-review")
  const ci = gateById(layout, "ci")
  const routeY = layout.routeY
  const events = [
    {
      id: "ai-review",
      label: "AI Review",
      gateId: "ai-review",
      routeX: ai?.x,
      routeY,
      time: 0.72,
      effects: [aiReviewEffect(project, scenario)],
    },
    {
      id: "human-review-1",
      label: "Human Review",
      gateId: "human-review",
      gateVisit: 1,
      routeX: human?.x,
      routeY,
      time: 1.55,
      effects: [humanReviewEffect(project, scenario, "Human Review")],
    },
    {
      id: "ci-check-1",
      label: "CI",
      gateId: "ci",
      gateVisit: 1,
      routeX: ci?.x,
      routeY,
      time: 2.5,
      effects: [ciEffect(project, "CI")],
    },
  ]

  if (!project.eventsApplied.includes("ci-check-1")) return events
  if (!project.negativeIds.includes("missing_tests")) {
    events.push({
      id: "merge-decision",
      label: "Merge Decision",
      routeX: (ci?.x ?? layout.socketX) + 18,
      routeY,
      time: 2.72,
      final: true,
      summary: "The PR contributes its points to the Feature once.",
    })
    return events
  }

  events.push(
    {
      id: "human-review-2",
      label: "Return Review",
      gateId: "human-review",
      gateVisit: 2,
      routeX: human?.x,
      routeY: routeY - 72,
      time: 3.55,
      effects: [humanReviewEffect(project, scenario, "Return Review")],
    },
    {
      id: "ci-final",
      label: "CI Final",
      gateId: "ci",
      gateVisit: 2,
      routeX: ci?.x,
      routeY,
      time: 4.65,
      effects: [ciEffect(project, "CI Final")],
    },
  )
  if (project.eventsApplied.includes("ci-final")) {
    events.push({
      id: "merge-decision",
      label: "Merge Decision",
      routeX: (ci?.x ?? layout.socketX) + 18,
      routeY,
      time: 4.88,
      final: true,
      summary: project.negativeIds.includes("missing_tests")
        ? "Missing Tests still block this PR from contributing Feature points."
        : "The returned PR now contributes its points to the Feature once.",
    })
  }
  return events
}

function outcomeForPR(project) {
  if (project.negativeIds.includes("missing_tests")) return "approved_not_built"
  if (project.negativeIds.length > 0) return "built_diminished"
  return "built"
}

function viabilityForPR(project, { negativeProperties }) {
  const points = Number(project.datum.points ?? 1)
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (negativeProperties.get(id)?.load ?? 1),
    0,
  )
  return Math.max(0, Math.min(100, 96 - points * 1.1 - load * 8 - project.delay * 6))
}

function buildGates(width, scenario) {
  const compact = width < 520
  const gateX = compact
    ? { ai: 0.27, human: 0.5, ci: 0.84 }
    : { ai: 0.3, human: 0.54, ci: 0.78 }
  return [
    {
      id: "ai-review",
      label: "AI Review",
      color: "#0284c7",
      width: 9,
      x: Math.round(width * gateX.ai),
      capacity: {
        unitsPerSecond: 60,
        unitAccessor: "aiWork",
        sensorWidth: compact ? 40 : 82,
        queueLayout: "none",
      },
      regionEffect: { damping: 0.035, force: { x: 8, y: 0 } },
    },
    {
      id: "human-review",
      label: "Human Review",
      color: "#ca8a04",
      width: 11,
      x: Math.round(width * gateX.human),
      capacity: {
        unitsPerSecond: scenario.reviewRate,
        unitAccessor: "reviewWork",
        sensorWidth: compact ? 48 : 112,
        queueSlotSpacing: compact ? 18 : 24,
        queueStiffness: 30,
      },
      regionEffect: { damping: 0.1, force: { x: 4, y: 0 } },
    },
    {
      id: "ci",
      label: "CI",
      color: "#16a34a",
      width: 9,
      x: Math.round(width * gateX.ci),
      capacity: {
        unitsPerSecond: 60,
        unitAccessor: "ciWork",
        sensorWidth: compact ? 40 : 82,
        queueLayout: "none",
      },
      regionEffect: { damping: 0.045, force: { x: 10, y: 0 } },
    },
  ]
}

function resolveCanvasColor(ctx, value, fallback) {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("var(") || typeof getComputedStyle !== "function") {
    return value || fallback
  }
  const token = value.match(/var\((--[^,\s)]+)/)?.[1]
  return token
    ? getComputedStyle(ctx.canvas).getPropertyValue(token).trim() || fallback
    : fallback
}

function drawReviewBody(ctx, body, style) {
  const datum = body.datum
  if (!datum?.__gauntlet) return
  const radius = body.shape.type === "circle" ? body.shape.radius : 8
  ctx.save()
  ctx.translate(body.x, body.y)

  if (datum.kind === "gauntlet-core") {
    const source = datum.sourceDatum ?? {}
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill, "#0f766e")
    ctx.strokeStyle = resolveCanvasColor(ctx, style.stroke, "#f8fafc")
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#f8fafc"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "900 8px system-ui, sans-serif"
    ctx.fillText(source.label ?? "PR", 0, -3)
    ctx.font = "800 8px system-ui, sans-serif"
    ctx.fillText(`${source.points ?? "?"} pt`, 0, 8)
  } else {
    const property = datum.property ?? {}
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill ?? property.color, "#dc2626")
    ctx.strokeStyle = "#020617"
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.rect(-radius, -radius, radius * 2, radius * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "900 7px system-ui, sans-serif"
    ctx.fillText(property.short ?? "?", 0, 0.5)
  }

  ctx.restore()
}

const implementationCode = `import {
  GauntletChart,
  bodyGroupSpec,
  groupCompletionRows,
  planGauntletPropertyWork,
  replaceGauntletNegative,
} from "semiotic/physics"

const feature = bodyGroupSpec({
  id: "feature",
  bodyIds: prs.map((pr) => pr.id),
  completion: {
    mode: "threshold",
    threshold: 18,
    valueByBodyId: Object.fromEntries(prs.map((pr) => [pr.id, pr.points])),
  },
})

<GauntletChart
  data={prs}
  startTimeAccessor="arrival"
  negativeAccessor="negatives"
  negativeProperties={reviewTraits}
  gates={[
    { id: "ai-review", capacity: { unitsPerSecond: 60 } },
    {
      id: "human-review",
      capacity: { unitsPerSecond: 5, unitAccessor: "reviewWork" },
    },
    { id: "ci", capacity: { unitsPerSecond: 60 } },
  ]}
  events={reviewEvents}
  onCapacityChange={setCapacity}
/>
`

export default function MergePressureExamplePage() {
  const [width, hostRef] = useResponsiveWidth(MIN_WIDTH, MAX_WIDTH)
  const [scenarioId, setScenarioId] = useState("humanPace")
  const [runId, setRunId] = useState(0)
  const [projectStates, setProjectStates] = useState([])
  const [capacityStats, setCapacityStats] = useState([])
  const scenario = SCENARIOS[scenarioId]
  const readoutReserve = width >= 1040 ? 380 : 0
  const workbenchInset = width < 1040 ? 34 : 0
  const chartWidth = Math.max(
    MIN_WIDTH,
    Math.min(MAX_WIDTH, Math.round(width - readoutReserve - workbenchInset)),
  )
  const gates = useMemo(() => buildGates(chartWidth, scenario), [chartWidth, scenario])
  const projectData = useMemo(
    () => buildProjectRows(scenario, runId),
    [runId, scenario],
  )
  const runKey = `${scenario.id}:${runId}:${chartWidth}`

  useEffect(() => {
    setProjectStates([])
    setCapacityStats([])
  }, [runKey])

  const events = useCallback(
    (project, layout) => buildReviewEvents(scenario, project, layout),
    [scenario],
  )

  const coreBody = useCallback(
    (project) => {
      const points = Number(project.datum.points ?? 1)
      const compact = chartWidth < 520
      return {
        bodyCollisions: !compact,
        mass: 4.5 + points * 0.5,
        shape: {
          type: "circle",
          radius: Math.round(prRadius(points) * (compact ? 0.8 : 1)),
        },
      }
    },
    [chartWidth],
  )

  const projectPlacement = useCallback((_project, index, layout) => {
    const lane = (index % 5) - 2
    return {
      startX: Math.max(60, layout.width * 0.1),
      startY: layout.routeY + lane * 27 + 0.5,
      routeY: layout.routeY,
    }
  }, [])

  const featureGroup = useMemo(
    () =>
      bodyGroupSpec({
        id: `feature-${runKey}`,
        label: "Feature",
        bodyIds: projectData.map((project) => project.id),
        completion: {
          mode: "threshold",
          threshold: FEATURE_POINTS,
          valueByBodyId: Object.fromEntries(
            projectData.map((project) => [project.id, project.points]),
          ),
        },
      }),
    [projectData, runKey],
  )

  const mergedIds = useMemo(
    () =>
      new Set(
        projectStates
          .filter((state) => state.outcome === "built" || state.outcome === "built_diminished")
          .map((state) => state.id),
      ),
    [projectStates],
  )
  const featureProgress = useMemo(
    () => groupCompletionRows([featureGroup], mergedIds)[0],
    [featureGroup, mergedIds],
  )

  const bodyGroups = useCallback(
    (states, layout) => {
      const merged = new Set(
        states
          .filter((state) => state.outcome === "built" || state.outcome === "built_diminished")
          .map((state) => state.id),
      )
      const progress = groupCompletionRows([featureGroup], merged)[0]
      return [
        {
          ...featureGroup,
          description: `${progress.absorbedValue} of ${FEATURE_POINTS} merged points. ${progress.complete ? "Feature complete." : "Feature incomplete."}`,
          group: "feature threshold",
          state: progress.complete ? "complete" : "accumulating",
          x: layout.socketX,
          y: layout.routeY,
        },
      ]
    },
    [featureGroup],
  )

  const humanCapacity = capacityStats.find((snapshot) =>
    snapshot.regionId.includes("human-review"),
  )
  const totalPoints = projectData.reduce((sum, project) => sum + project.points, 0)
  const arrivalWindow = Math.max(1, (projectData.length - 1) * scenario.arrivalGap)
  const incomingRate = totalPoints / arrivalWindow
  const reviewPressure = incomingRate / scenario.reviewRate
  const burstDebt = Math.max(0, totalPoints - scenario.reviewRate * arrivalWindow)
  const reviewVisits = projectStates.reduce(
    (sum, state) => sum + Number(state.metrics?.humanPasses ?? 0),
    0,
  )
  const ciReturns = projectStates.reduce(
    (sum, state) => sum + Number(state.metrics?.ciReturns ?? 0),
    0,
  )
  const mergedStates = projectStates.filter(
    (state) => state.outcome === "built" || state.outcome === "built_diminished",
  )
  const residualRisk = mergedStates.reduce(
    (sum, state) => sum + state.negativeIds.length,
    0,
  )
  const traitMetrics = useMemo(() => {
    const active = projectStates.flatMap((state) => state.negativeIds)
    const popped = projectStates.flatMap((state) => state.poppedNegativeIds ?? [])
    return { active: countById(active), popped: countById(popped) }
  }, [projectStates])
  const eventLog = useMemo(
    () =>
      projectStates
        .flatMap((state) =>
          (state.eventHistory ?? []).map((event) => ({
            ...event,
            projectLabel: state.datum.label,
            absoluteTime: (state.startedAt ?? 0) + (event.appliedAt ?? event.time ?? 0),
          })),
        )
        .sort((a, b) => b.absoluteTime - a.absoluteTime)
        .slice(0, 7),
    [projectStates],
  )

  const frameProps = useMemo(
    () => ({
      bodyStyle: (body) => {
        const datum = body.datum ?? {}
        if (datum.kind === "gauntlet-core") {
          const points = Number(datum.sourceDatum?.points ?? 1)
          return {
            fill: points >= 6 ? "#6d28d9" : points >= 4 ? "#0f766e" : "#0369a1",
            stroke: "#f8fafc",
            opacity: 0.97,
          }
        }
        return {
          fill: datum.property?.color ?? "#dc2626",
          stroke: "#020617",
          opacity: 0.98,
        }
      },
      config: {
        kernel: {
          seed: scenario.seed + runId,
          gravity: { x: 0, y: 0 },
          restitution: 0.12,
          friction: 0.48,
          velocityDamping: 0.985,
        },
      },
      foregroundGraphics: (
        <MergePressureOverlay
          ciReturns={ciReturns}
          featureProgress={featureProgress}
          gates={gates}
          height={FRAME_HEIGHT}
          queueDepth={humanCapacity?.queueDepth ?? 0}
          width={chartWidth}
        />
      ),
      renderBody: drawReviewBody,
    }),
    [chartWidth, ciReturns, featureProgress, gates, humanCapacity?.queueDepth, runId, scenario],
  )

  return (
    <ExamplePageLayout title="Merge Pressure" code={implementationCode}>
      <div className="merge-pressure" ref={hostRef}>
        <section className="merge-pressure__hero">
          <div>
            <span className="merge-pressure__kicker">
              GauntletChart · staggered compound stream
            </span>
            <p className="merge-pressure__lede">
              AI can increase code production without increasing review service. Each PR is one
              compound body: code points in the core, negative traits attached as satellites, and
              repeat visits when CI sends that same body back. Only merged PR points accumulate
              into the Feature.
            </p>
          </div>
          <div className="merge-pressure__source-card">
            <strong>Feature threshold</strong>
            <span>Unique merged PRs contribute their code points once.</span>
            <b>{FEATURE_POINTS} merged points</b>
            <button type="button" onClick={() => setRunId((current) => current + 1)}>
              Replay stream
            </button>
          </div>
        </section>

        <section className="merge-pressure__presets" aria-label="Delivery system scenarios">
          {SCENARIO_ORDER.map((id) => {
            const preset = SCENARIOS[id]
            const active = scenarioId === id
            return (
              <button
                key={id}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                onClick={() => {
                  setScenarioId(id)
                  setRunId((current) => current + 1)
                }}
              >
                <strong>{preset.short}</strong>
                <span>{preset.label}</span>
              </button>
            )
          })}
        </section>

        <section className="merge-pressure__legend" aria-label="Visual grammar">
          <LegendItem title="PR core" body="Circle area grows with code points; arrivals are staggered by the scenario." swatch="core" />
          <LegendItem title="Negative trait" body="Square satellites remain attached until AI or human review transforms or removes them." swatch="trait" />
          <LegendItem title="Shared service" body="Human Review is one FIFO work queue across every compound PR core." swatch="capacity" />
          <LegendItem title="Feature" body="The socket fills once from each merged PR's code points; review activity adds nothing." swatch="feature" />
        </section>

        <section className="merge-pressure__workbench">
          <div className="merge-pressure__chart-shell" style={{ width: chartWidth }}>
            <GauntletChart
              key={runKey}
              title={`Merge pressure: ${scenario.short}`}
              summary={`${scenario.label}: ${projectData.length} PRs carry ${totalPoints} code points. Incoming work is ${incomingRate.toFixed(1)} points per second against ${scenario.reviewRate} review points per second. ${featureProgress.absorbedValue} of ${FEATURE_POINTS} Feature points have merged.`}
              description="Staggered compound PR bodies cross AI review, a shared capacity-limited human review queue, and CI. Attached negative traits can be removed or replaced. CI returns the same body when Missing Tests remain."
              data={projectData}
              idAccessor="id"
              startTimeAccessor="arrival"
              negativeAccessor="negatives"
              metricsAccessor="metrics"
              negativeProperties={NEGATIVE_PROPERTIES}
              gates={gates}
              events={events}
              bodyGroups={bodyGroups}
              initialViability={100}
              viability={viabilityForPR}
              outcome={outcomeForPR}
              coreBody={coreBody}
              projectPlacement={projectPlacement}
              coreForceMode="route"
              crashDetection={false}
              size={[chartWidth, FRAME_HEIGHT]}
              terminalBehavior="outcome"
              showChrome={false}
              showProjection={false}
              showTethers
              accessibleTable
              onStateChange={setProjectStates}
              onCapacityChange={setCapacityStats}
              frameProps={frameProps}
            />
          </div>

          <aside className="merge-pressure__readout">
            <span className="merge-pressure__kicker">Current system</span>
            <h2>{scenario.label}</h2>
            <p>{scenario.description}</p>
            <div className="merge-pressure__regime-callout">
              <strong>{scenario.lesson}</strong>
              <span>
                Baseline pressure: {reviewPressure.toFixed(2)}. Human remediation budget: {scenario.humanBudget} units per visit.
              </span>
            </div>

            <div className="merge-pressure__metrics">
              <Metric label="incoming work" value={incomingRate.toFixed(1)} detail="code points / sec" warn={reviewPressure > 1} />
              <Metric label="review service" value={scenario.reviewRate} detail="work units / sec" />
              <Metric label="burst debt" value={burstDebt.toFixed(1)} detail={`${humanCapacity?.queueDepth ?? 0} bodies in service now`} warn={burstDebt > 0} />
              <Metric label="review visits" value={reviewVisits} detail="same PR can visit twice" warn={reviewVisits > projectData.length} />
              <Metric label="CI returns" value={ciReturns} detail="Missing Tests" warn={ciReturns > 0} />
              <Metric label="merged risk" value={residualRisk} detail={`${mergedStates.length} PRs merged`} warn={residualRisk > 0} />
            </div>

            <FeatureProgress progress={featureProgress} />
            <TraitLedger metrics={traitMetrics} />
          </aside>
        </section>

        <section className="merge-pressure__event-log" aria-label="Recent gate actions">
          <div>
            <span className="merge-pressure__kicker">Event tape</span>
            <h2>What actually changed</h2>
          </div>
          <div className="merge-pressure__event-list">
            {eventLog.length ? (
              eventLog.map((event) => (
                <article key={`${runKey}:${event.projectLabel}:${event.id}`}>
                  <strong>{event.projectLabel} · {event.label}</strong>
                  <span>{event.summary}</span>
                </article>
              ))
            ) : (
              <article>
                <strong>Stream starting</strong>
                <span>PR compounds will arrive on their own project-local clocks.</span>
              </article>
            )}
          </div>
        </section>

        <section className="merge-pressure__explanation">
          <div>
            <span className="merge-pressure__kicker">Reusable mechanics</span>
            <h2>Entity, service, transition, aggregate.</h2>
          </div>
          <div>
            <p>
              The page supplies domain data and policies. GauntletChart now owns staggered local
              timelines, core-only capacity service, occurrence-preserving property changes, and an
              ordered event tape. The process recipe owns weighted group completion, so a Feature
              can be any threshold of uniquely completed member value.
            </p>
            <div className="merge-pressure__needs-grid">
              <Need title="compound entity" body="One semantic PR is a core plus repeated negative-property occurrences." />
              <Need title="shared capacity" body="A gate processes root entities by work units and re-arms only after a real exit." />
              <Need title="weighted group" body="Merged PR values accumulate once toward a generic threshold outcome." />
            </div>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function MergePressureOverlay({ ciReturns, featureProgress, gates, height, queueDepth, width }) {
  const routeY = Math.round(height * 0.48)
  const human = gates.find((gate) => gate.id === "human-review")
  const ci = gates.find((gate) => gate.id === "ci")
  const startX = Math.max(Math.round(width * 0.14), 110)
  const socketX = Math.round(width * 0.92)
  const complete = featureProgress.complete

  return (
    <svg aria-hidden="true" className="merge-pressure__overlay" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker id="merge-pressure-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mp-red)" />
        </marker>
      </defs>
      <path className="merge-pressure__route" d={`M ${startX - 60} ${routeY} C ${width * 0.28} ${routeY - 36}, ${width * 0.48} ${routeY + 36}, ${width * 0.68} ${routeY} S ${width * 0.82} ${routeY - 24}, ${socketX} ${routeY}`} />
      {ciReturns > 0 && ci && human ? (
        <path className="merge-pressure__return-route" d={`M ${ci.x} ${routeY - 58} C ${ci.x - 52} ${routeY - 122}, ${human.x + 58} ${routeY - 122}, ${human.x + 8} ${routeY - 72}`} markerEnd="url(#merge-pressure-arrow)" />
      ) : null}
      {gates.map((gate) => (
        <g key={gate.id} className="merge-pressure__gate">
          <rect x={gate.x - gate.width / 2} y={88} width={gate.width} height={height - 168} rx={gate.width / 2} fill={gate.color} />
          <text x={gate.x} y={72} textAnchor="middle">{gate.label}</text>
          <text x={gate.x} y={height - 62} textAnchor="middle">
            {gate.id === "human-review" ? `${gate.capacity.unitsPerSecond} work/sec` : gate.id === "ai-review" ? "transform" : "return MT"}
          </text>
        </g>
      ))}
      <g className={`merge-pressure__feature-socket ${complete ? "is-complete" : ""}`} transform={`translate(${socketX} ${routeY})`}>
        <circle r="38" />
        <text y="-3" textAnchor="middle">FEATURE</text>
        <text y="13" textAnchor="middle">{featureProgress.absorbedValue}/{FEATURE_POINTS} pt</text>
      </g>
      <g className="merge-pressure__annotation">
        <text x={startX - 58} y={routeY - 72}>staggered PR arrivals</text>
        <text x={(human?.x ?? width * 0.5) - 48} y={routeY + 104}>shared queue: {queueDepth}</text>
      </g>
    </svg>
  )
}

function LegendItem({ body, swatch, title }) {
  return (
    <div className="merge-pressure__legend-item">
      <i className={`is-${swatch}`} />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}

function Metric({ label, value, detail, warn = false }) {
  return (
    <div className={`merge-pressure__metric ${warn ? "is-warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function FeatureProgress({ progress }) {
  const value = Math.min(FEATURE_POINTS, progress.absorbedValue)
  const percent = Math.round((value / FEATURE_POINTS) * 100)
  return (
    <div className={`merge-pressure__feature-progress ${progress.complete ? "is-complete" : ""}`}>
      <div>
        <strong>{progress.complete ? "Feature complete" : "Feature accumulating"}</strong>
        <span>{progress.absorbed} unique PRs merged</span>
      </div>
      <div className="merge-pressure__feature-track" role="progressbar" aria-label="Merged Feature points" aria-valuemin={0} aria-valuemax={FEATURE_POINTS} aria-valuenow={value}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <b>{progress.absorbedValue} / {FEATURE_POINTS} points</b>
    </div>
  )
}

function TraitLedger({ metrics }) {
  return (
    <div className="merge-pressure__ledger" aria-label="Negative trait ledger">
      <strong>Trait occurrences</strong>
      {TRAIT_ORDER.map((id) => {
        const trait = TRAITS[id]
        return (
          <div key={id}>
            <span style={{ "--mp-quality": trait.color }}>{trait.short}</span>
            <b>{metrics.active[id] ?? 0} attached</b>
            <small>{metrics.popped[id] ?? 0} removed</small>
          </div>
        )
      })}
    </div>
  )
}

function Need({ title, body }) {
  return (
    <div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}
