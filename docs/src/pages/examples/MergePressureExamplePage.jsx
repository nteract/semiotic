import React, { useCallback, useMemo, useState } from "react"
import { GauntletChart, bodyGroupSpec, groupCompletionRows } from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  TRAITS,
  TRAIT_ORDER,
  NEGATIVE_PROPERTIES,
  PR_TEMPLATES,
  SCENARIOS,
  SCENARIO_ORDER,
} from "./mergePressureScenarios"
import { buildReviewEvents, outcomeForPR, viabilityForPR } from "./mergePressureModel"
import { usePhysicsStoryClock, PhysicsStoryClock } from "./PhysicsStoryClock"
import "./MergePressureExamplePage.css"
import "./physicsStories.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 240
const MODEL_WIDTH = 760
const FRAME_HEIGHT = 540
const FEATURE_POINTS = 18

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

function buildGates(width, scenario) {
  const compact = width < 520
  const gateX = compact ? { ai: 0.27, human: 0.5, ci: 0.84 } : { ai: 0.3, human: 0.54, ci: 0.78 }
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
  return token ? getComputedStyle(ctx.canvas).getPropertyValue(token).trim() || fallback : fallback
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
  const gates = useMemo(() => buildGates(MODEL_WIDTH, scenario), [scenario])
  const projectData = useMemo(() => buildProjectRows(scenario, runId), [runId, scenario])
  const runKey = `${scenario.id}:${runId}`
  const clock = usePhysicsStoryClock(runKey)
  const chartScale = Math.min(1, chartWidth / MODEL_WIDTH)

  const [ledgerKey, setLedgerKey] = useState(runKey)
  if (ledgerKey !== runKey) {
    setLedgerKey(runKey)
    setProjectStates([])
    setCapacityStats([])
  }

  const events = useCallback(
    (project, layout) => buildReviewEvents(scenario, project, layout),
    [scenario],
  )

  const coreBody = useCallback((project) => {
    const points = Number(project.datum.points ?? 1)
    const compact = MODEL_WIDTH < 520
    return {
      bodyCollisions: !compact,
      mass: 4.5 + points * 0.5,
      shape: {
        type: "circle",
        radius: Math.round(prRadius(points) * (compact ? 0.8 : 1)),
      },
    }
  }, [])

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

  const humanCapacity = capacityStats.find((snapshot) => snapshot.regionId.includes("human-review"))
  const totalPoints = projectData.reduce((sum, project) => sum + project.points, 0)
  const arrivalWindow = Math.max(1, (projectData.length - 1) * scenario.arrivalGap)
  const incomingRate = totalPoints / arrivalWindow
  const reviewPressure = incomingRate / scenario.reviewRate
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
  const residualRisk = mergedStates.reduce((sum, state) => sum + state.negativeIds.length, 0)
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
      onTick: clock.onTick,
      suspendWhenHidden: false,
      config: {
        fixedDt: 1 / 60,
        settleStepLimit: 1200,
        kernel: {
          seed: scenario.seed,
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
          width={MODEL_WIDTH}
        />
      ),
      renderBody: drawReviewBody,
    }),
    [clock.onTick, ciReturns, featureProgress, gates, humanCapacity?.queueDepth, scenario],
  )

  return (
    <ExamplePageLayout title="Merge Pressure">
      <div className="merge-pressure" ref={hostRef}>
        <section className="merge-pressure__hero physics-story">
          <div>
            <span className="merge-pressure__kicker">Review queues under AI throughput</span>
            <h2>What happens when coding outruns review?</h2>
            <p className="merge-pressure__lede">
              Follow the same eight pull requests carrying 29 code points. Speed up their arrival,
              then give the reviewer more capacity. Watch work collect at the review gate and return
              from CI. Only a unique merge contributes to the feature.
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

        <p className="physics-story__reading" data-testid="merge-comparison-rule">
          <b>Same work, one intervention.</b> {scenario.comparison} PR sizes, initial risks, physics
          seed, model geometry, and the 20-second observation stay fixed.
        </p>

        <details className="physics-story__technical">
          <summary>Read the bodies: circles are PRs, attached squares are risks</summary>
          <section className="merge-pressure__legend" aria-label="Visual grammar">
            <LegendItem
              title="PR core"
              body="Circle area grows with code points; arrivals are staggered by the scenario."
              swatch="core"
            />
            <LegendItem
              title="Negative trait"
              body="Square satellites remain attached until AI or human review transforms or removes them."
              swatch="trait"
            />
            <LegendItem
              title="Shared service"
              body="Human review is one shared queue—PRs wait their turn."
              swatch="capacity"
            />
            <LegendItem
              title="Feature"
              body="Only merged PR work fills the feature. Reviewing alone does not."
              swatch="feature"
            />
          </section>
        </details>
        <PhysicsStoryClock elapsed={clock.elapsed} />
        <section className="merge-pressure__workbench">
          <div className="merge-pressure__chart-shell" style={{ width: MODEL_WIDTH * chartScale }}>
            <div className="physics-story__viewport" style={{ height: FRAME_HEIGHT * chartScale }}>
              <div
                className="physics-story__model"
                style={{ width: MODEL_WIDTH, transform: `scale(${chartScale})` }}
              >
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
                  size={[MODEL_WIDTH, FRAME_HEIGHT]}
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
            </div>
          </div>

          <aside className="merge-pressure__readout">
            <span className="merge-pressure__kicker">Current system</span>
            <h2>{scenario.label}</h2>
            <p>{scenario.description}</p>
            <div className="merge-pressure__regime-callout">
              <strong>{scenario.lesson}</strong>
              <span>
                Incoming work / service: {reviewPressure.toFixed(2)}, before repeat visits. Human
                remediation budget: {scenario.humanBudget} units per visit.
              </span>
            </div>

            <div className="merge-pressure__metrics">
              <Metric
                label="incoming work"
                value={incomingRate.toFixed(1)}
                detail="code points / model sec"
                warn={reviewPressure > 1}
              />
              <Metric
                label="review service"
                value={scenario.reviewRate}
                detail="work units / model sec"
              />
              <Metric
                label="peak queue"
                value={humanCapacity?.peakQueueDepth ?? 0}
                detail={`${humanCapacity?.queueDepth ?? 0} PRs in service now`}
                warn={reviewPressure > 1}
              />
              <Metric
                label="review visits"
                value={reviewVisits}
                detail="same PR can visit twice"
                warn={reviewVisits > projectData.length}
              />
              <Metric
                label="CI returns"
                value={ciReturns}
                detail="Missing Tests"
                warn={ciReturns > 0}
              />
              <Metric
                label="merged risk"
                value={residualRisk}
                detail={`${mergedStates.length} PRs merged`}
                warn={residualRisk > 0}
              />
            </div>

            <p className="physics-story__reading" data-testid="merge-observation">
              {clock.elapsed >= 20 ? "At 20 model seconds" : "So far"}: {mergedStates.length} of 8
              PRs merged, using {reviewVisits} review visits. The busiest queue held{" "}
              {humanCapacity?.peakQueueDepth ?? 0} PRs. {residualRisk} risk{" "}
              {residualRisk === 1 ? "trait remains" : "traits remain"} on merged work.
            </p>
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
                  <strong>
                    {event.projectLabel} · {event.label}
                  </strong>
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
            <h2>What the model assumes</h2>
          </div>
          <div>
            <p>
              This is a hypothetical workflow, not measured developer productivity. Every code point
              consumes one review-work unit; each review has a separate remediation budget. CI
              checks for missing tests, not their quality. Physics makes waiting, repeated visits,
              and attached risk visible. The event ledger decides what merged; a collision cannot
              approve a PR.
            </p>
            <div className="merge-pressure__needs-grid">
              <Need
                title="compound entity"
                body="One semantic PR is a core plus repeated negative-property occurrences."
              />
              <Need
                title="shared capacity"
                body="A gate processes root entities by work units and re-arms only after a real exit."
              />
              <Need
                title="weighted group"
                body="Merged PR values accumulate once toward a generic threshold outcome."
              />
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
        <marker
          id="merge-pressure-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mp-red)" />
        </marker>
      </defs>
      <path
        className="merge-pressure__route"
        d={`M ${startX - 60} ${routeY} C ${width * 0.28} ${routeY - 36}, ${width * 0.48} ${routeY + 36}, ${width * 0.68} ${routeY} S ${width * 0.82} ${routeY - 24}, ${socketX} ${routeY}`}
      />
      {ciReturns > 0 && ci && human ? (
        <path
          className="merge-pressure__return-route"
          d={`M ${ci.x} ${routeY - 58} C ${ci.x - 52} ${routeY - 122}, ${human.x + 58} ${routeY - 122}, ${human.x + 8} ${routeY - 72}`}
          markerEnd="url(#merge-pressure-arrow)"
        />
      ) : null}
      {gates.map((gate) => (
        <g key={gate.id} className="merge-pressure__gate">
          <rect
            x={gate.x - gate.width / 2}
            y={88}
            width={gate.width}
            height={height - 168}
            rx={gate.width / 2}
            fill={gate.color}
          />
          <text x={gate.x} y={72} textAnchor="middle">
            {gate.label}
          </text>
          <text x={gate.x} y={height - 62} textAnchor="middle">
            {gate.id === "human-review"
              ? `${gate.capacity.unitsPerSecond} work/sec`
              : gate.id === "ai-review"
                ? "transform"
                : "return MT"}
          </text>
        </g>
      ))}
      <g
        className={`merge-pressure__feature-socket ${complete ? "is-complete" : ""}`}
        transform={`translate(${socketX} ${routeY})`}
      >
        <circle r="38" />
        <text y="-3" textAnchor="middle">
          FEATURE
        </text>
        <text y="13" textAnchor="middle">
          {featureProgress.absorbedValue}/{FEATURE_POINTS} pt
        </text>
      </g>
      <g className="merge-pressure__annotation">
        <text x={startX - 58} y={routeY - 72}>
          staggered PR arrivals
        </text>
        <text x={(human?.x ?? width * 0.5) - 48} y={routeY + 104}>
          shared queue: {queueDepth}
        </text>
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
      <div
        className="merge-pressure__feature-track"
        role="progressbar"
        aria-label="Merged Feature points"
        aria-valuemin={0}
        aria-valuemax={FEATURE_POINTS}
        aria-valuenow={value}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <b>
        {progress.absorbedValue} / {FEATURE_POINTS} points
      </b>
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
