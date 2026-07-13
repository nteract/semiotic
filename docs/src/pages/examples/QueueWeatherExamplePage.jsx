import React, { useCallback, useMemo, useRef, useState } from "react"
import {
  StreamPhysicsFrame,
  absorbRegion,
  capacitatedRegion,
  createCapacityQueueController,
  createDependencyGateController,
  createServiceLevelController,
  createServiceResourcePoolController,
  physicsReferenceEnvelope,
  comparePhysicsTrace,
  processChrome,
  processStageLayout,
  routeSurfaceRegion,
} from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./QueueWeatherExamplePage.css"

const CHART_HEIGHT = 374
const HORIZON = 26
const SAMPLE_STEP = 0.5
const AGENT_RATE = 1
const CASE_VALUE = 38
const CREDIT_COST = 7
const RESERVE_AGENT_COST_PER_MINUTE = 1.25
const SERVICE_REGION_ID = "player-support:service"
const RECOVERY_REGION_ID = "player-support:recovery"
const RESOLVED_REGION_ID = "player-support:resolved"
const CASE_FILTER = (body) => body.datum?.kind === "case"
const ARRIVAL_PACING = { pacing: "arrival", timeAccessor: "arrival", timeScale: 1 }

const STAGES = [
  { id: "incoming", label: "Player calls", share: 0.2 },
  { id: "service", label: "Support team", share: 0.31 },
  { id: "recovery", label: "Recovery", share: 0.25 },
  { id: "resolved", label: "Helped", share: 0.24 },
]

const SCENARIOS = [
  {
    id: "quiet",
    label: "Quiet patch day",
    fixture: "quiet",
    summary: "Predictable account and purchase questions arrive in small daily rhythms.",
    recoveryAt: null,
  },
  {
    id: "launch",
    label: "Season launch",
    fixture: "launch",
    summary: "A known release window creates a broad, serviceable wave of player questions.",
    recoveryAt: null,
  },
  {
    id: "outage",
    label: "Platform outage",
    fixture: "outage",
    summary: "Retry storms and status updates create sharp bursts; outage cases wait for platform recovery.",
    recoveryAt: 16,
  },
]

const PLANS = [
  {
    id: "standard",
    label: "Standard roster",
    agents: 3,
    credits: 0,
    description: "Normal staffing. No pre-approved player-care budget.",
  },
  {
    id: "launch-roster",
    label: "Reserve roster",
    agents: 5,
    credits: 0,
    description: "Two trained reserve agents are staffed before the window opens.",
  },
  {
    id: "player-care",
    label: "Player-care fund",
    agents: 3,
    credits: 10,
    description: "Normal staffing plus ten pre-approved goodwill credits for near-deadline cases.",
  },
  {
    id: "full-plan",
    label: "Full response plan",
    agents: 5,
    credits: 10,
    description: "Reserve staffing and a bounded player-care fund are committed before the window.",
  },
]

const implementationCode = `const agents = createServiceResourcePoolController({
  resources: plannedRoster.map((agent) => ({ id: agent.id, home: agent.home })),
})

const serviceLevel = createServiceLevelController({
  bodyFilter: (body) => body.datum?.kind === "case",
  deadlineAccessor: "promiseMinutes",
  completionRegionId: "player-helped",
})

const recoveryGate = createDependencyGateController({
  regionId: "platform-recovery",
  opensAt: outageRecoveryMinute,
  bodyFilter: (body) => body.datum?.requiresRecovery === true,
})

const desk = createCapacityQueueController({
  regionId: "support-team",
  unitsPerSecond: plannedRoster.length * 0.78,
  unitAccessor: "resolutionMinutes",
  onQueued: (body) => agents.assign(body.id),
  onProcessed: (body) => agents.release(body.id),
})
`

function mulberry32(seed) {
  let value = seed
  return function random() {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function callType(index, fixture) {
  if (fixture === "outage") return ["connection", "purchase", "login"][index % 3]
  return ["purchase", "quest", "account"][index % 3]
}

function arrivalAt(fixture, index, random) {
  if (fixture === "launch") {
    if (index < 9) return 1.2 + index * 0.46 + random() * 0.16
    if (index < 30) return 5.5 + (index - 9) * 0.3 + random() * 0.2
    return 12.6 + (index - 30) * 0.58 + random() * 0.16
  }
  if (fixture === "outage") {
    const burstStarts = [2.2, 5.4, 8.6, 11.5]
    const burst = Math.floor(index / 9)
    return burstStarts[Math.min(burst, burstStarts.length - 1)] + (index % 9) * 0.12 + random() * 0.1
  }
  const rhythm = [0.55, 0.76, 1.25, 0.7, 1.45]
  return 0.8 + rhythm.slice(0, index % rhythm.length).reduce((sum, value) => sum + value, 0) + Math.floor(index / rhythm.length) * 4.55 + random() * 0.2
}

function buildCalls(fixture, seed = 41) {
  const random = mulberry32(seed)
  const count = fixture === "quiet" ? 24 : fixture === "launch" ? 39 : 27
  return Array.from({ length: count }, (_, index) => {
    const type = callType(index, fixture)
    const baseMinutes = fixture === "quiet" ? 1.5 : fixture === "outage" ? 1.7 : 2.1
    const resolutionMinutes = Number((baseMinutes + random() * 2.2 + (type === "connection" ? 0.6 : 0)).toFixed(1))
    return {
      id: `${fixture}-${seed}-case-${index + 1}`,
      label: `${type === "connection" ? "Connection" : type === "purchase" ? "Purchase" : type === "quest" ? "Quest" : type === "login" ? "Login" : "Account"} call ${String(index + 1).padStart(2, "0")}`,
      kind: "case",
      type,
      arrival: Number(arrivalAt(fixture, index, random).toFixed(2)),
      resolutionMinutes,
      promiseMinutes: type === "connection" ? 4.8 : 6.2,
      requiresRecovery: fixture === "outage" && type === "connection",
    }
  })
}

function simulateWaitingTrace(calls, agentCount) {
  const waiting = []
  const samples = []
  const ordered = [...calls].sort((a, b) => a.arrival - b.arrival)
  let next = 0
  for (let time = 0; time <= HORIZON; time += SAMPLE_STEP) {
    while (next < ordered.length && ordered[next].arrival <= time) {
      waiting.push(ordered[next].resolutionMinutes)
      next += 1
    }
    let budget = time === 0 ? 0 : agentCount * AGENT_RATE * SAMPLE_STEP
    while (budget > 0 && waiting.length) {
      const take = Math.min(waiting[0], budget)
      waiting[0] -= take
      budget -= take
      if (waiting[0] <= 1e-6) waiting.shift()
    }
    samples.push({ time, value: waiting.reduce((sum, value) => sum + value, 0) })
  }
  return samples
}

const REFERENCE_ENVELOPE = physicsReferenceEnvelope({
  runs: Array.from({ length: 15 }, (_, index) => ({
    id: `quiet-${index}`,
    samples: simulateWaitingTrace(buildCalls("quiet", 100 + index * 17), 3),
  })),
  sampleAt: { start: 0, end: HORIZON, step: SAMPLE_STEP },
  quantiles: [0.1, 0.5, 0.9],
  interpolation: "step",
  outsideDomain: "clamp",
})

function emptyQueueSnapshot(agents) {
  return {
    queueDepth: 0, blockedDepth: 0, waitingWork: 0, processedCount: 0,
    completedWork: 0, peakRemainingWork: 0, simulatedAt: 0,
    queueAge: { oldestSeconds: 0 }, window: { utilization: 0, pressure: 0 },
    unitsPerSecond: agents * AGENT_RATE,
  }
}

function buildPhysicsModel(width, calls, scenario, plan) {
  const layout = processStageLayout({
    width, height: CHART_HEIGHT, stages: STAGES, shape: "lane",
    padX: width < 560 ? 18 : 34, padY: 74, idPrefix: "player-support",
    includeMembraneRegions: false, wallThickness: 8,
  })
  const [incoming, service, recovery, resolved] = layout.stages
  const serviceHeight = layout.bottomY - layout.topY - 20
  const callsSpawns = calls.map((call, index) => ({
    id: call.id,
    x: incoming.x0 + 16 + (index % 3) * 4,
    y: layout.midY + ((index % 9) - 4) * Math.min(12, serviceHeight / 22),
    vx: 30 + (index % 4) * 4,
    vy: ((index % 3) - 1) * 3,
    mass: 1,
    shape: { type: "circle", radius: 6 + Math.min(3, call.resolutionMinutes * 0.5) },
    spawnAt: call.arrival,
    datum: call,
  }))
  const resources = Array.from({ length: plan.agents }, (_, index) => ({
    id: `agent-${index + 1}`,
    bodyId: `agent-${index + 1}`,
    home: {
      x: service.x0 + service.width * 0.2 + (index % 2) * 22,
      y: layout.midY + (Math.floor(index / 2) - 1) * 28,
    },
  }))
  const agentSpawns = resources.map((resource, index) => ({
    id: resource.bodyId,
    x: resource.home.x,
    y: resource.home.y,
    vx: 0,
    vy: 0,
    mass: 2.8,
    shape: { type: "polygon", sides: 4, radius: 7 },
    spawnAt: 0,
    datum: { kind: "agent", label: `Support agent ${index + 1}` },
  }))
  const regionEffects = [
    routeSurfaceRegion({
      id: "player-support:route", x: (layout.left + layout.right) / 2, y: layout.midY,
      width: layout.right - layout.left, height: serviceHeight, force: 18, damping: 0.02, semanticItem: false,
    }),
    capacitatedRegion({
      id: SERVICE_REGION_ID, label: "Player-support team", x: service.x, y: layout.midY,
      width: service.width * 0.94, height: serviceHeight, capacity: plan.agents * AGENT_RATE,
      unitsPerSecond: plan.agents * AGENT_RATE, force: 9, damping: 0.08,
      bodyFilter: CASE_FILTER, attributes: { stageId: "service" },
    }),
    capacitatedRegion({
      id: RECOVERY_REGION_ID, label: "Platform recovery", x: recovery.x, y: layout.midY,
      width: recovery.width * 0.92, height: serviceHeight, capacity: 1, unitsPerSecond: 1,
      force: 12, damping: 0.1, bodyFilter: (body) => body.datum?.requiresRecovery === true,
      attributes: { stageId: "recovery" },
    }),
    absorbRegion({
      id: RESOLVED_REGION_ID, label: "Player helped", x: resolved.x, y: layout.midY,
      width: resolved.width * 0.9, height: serviceHeight, force: 24, damping: 0.14,
      bodyFilter: CASE_FILTER, semanticItem: false,
    }),
  ]
  return { layout, callsSpawns, agentSpawns, resources, regionEffects }
}

function QueueReferenceChart({ width, trace }) {
  const chartWidth = Math.max(300, width)
  const height = 218
  const margin = { left: 48, right: 18, top: 26, bottom: 34 }
  const plotW = chartWidth - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const observed = trace.length ? trace : [{ time: 0, value: 0 }]
  const comparison = comparePhysicsTrace(observed, REFERENCE_ENVELOPE, { lower: 0.1, upper: 0.9, interpolation: "step", outsideDomain: "omit" })
  const maxValue = Math.max(8, ...observed.map((point) => point.value), ...REFERENCE_ENVELOPE.points.map((point) => point.quantiles[0.9] ?? 0)) * 1.08
  const x = (time) => margin.left + (Math.max(0, Math.min(HORIZON, time)) / HORIZON) * plotW
  const y = (value) => margin.top + plotH - (Math.max(0, value) / maxValue) * plotH
  const upper = REFERENCE_ENVELOPE.points.map((point) => `${x(point.time)},${y(point.quantiles[0.9] ?? 0)}`)
  const lower = [...REFERENCE_ENVELOPE.points].reverse().map((point) => `${x(point.time)},${y(point.quantiles[0.1] ?? 0)}`)
  const median = REFERENCE_ENVELOPE.points.map((point) => `${x(point.time)},${y(point.median ?? 0)}`).join(" ")
  const actual = observed.map((point) => `${x(point.time)},${y(point.value)}`).join(" ")
  const latest = [...comparison.points].reverse().find((point) => point.status !== "unobserved")
  return (
    <div className="queue-weather__reference">
      <header>
        <div><span>Operational reference</span><h3>Unresolved handling time against quiet patch days</h3></div>
        <strong className={`is-${latest?.status ?? "unobserved"}`}>{statusLabel(latest?.status)}</strong>
      </header>
      <svg role="img" aria-label="Live unresolved handling time compared with the tenth to ninetieth percentile quiet-day range." viewBox={`0 0 ${chartWidth} ${height}`}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}><line x1={margin.left} x2={chartWidth - margin.right} y1={margin.top + plotH * fraction} y2={margin.top + plotH * fraction} className="queue-weather__gridline" /><text x={margin.left - 8} y={margin.top + plotH * fraction + 4} textAnchor="end">{Math.round(maxValue * (1 - fraction))}</text></g>)}
        <polygon points={[...upper, ...lower].join(" ")} className="queue-weather__envelope" />
        <polyline points={median} className="queue-weather__median" />
        <polyline points={actual} className="queue-weather__actual" />
        {[0, 6, 12, 18, 24].map((time) => <text key={time} x={x(time)} y={height - 12} textAnchor="middle">{time}m</text>)}
        <text x={margin.left} y={15} className="queue-weather__axis-title">unresolved minutes of work</text>
      </svg>
      <div className="queue-weather__legend" aria-hidden="true"><span className="is-actual">Live operation</span><span className="is-range">Quiet-day range</span><span className="is-median">Median</span></div>
    </div>
  )
}

function statusLabel(status) {
  if (status === "above") return "Above normal"
  if (status === "below") return "Below normal"
  if (status === "inside") return "Within normal"
  return "Awaiting calls"
}

function formatNumber(value) {
  return Number.isFinite(value) ? Number(value).toFixed(Math.abs(value) >= 10 ? 0 : 1) : "0"
}

function initialSelection(key, fallback) {
  if (typeof window === "undefined") return fallback
  const candidate = new URLSearchParams(window.location.search).get(key)
  return candidate ?? fallback
}

export default function QueueWeatherExamplePage() {
  const [hostWidth, hostRef] = useResponsiveWidth(300, 1120)
  const chartWidth = hostWidth >= 860 ? hostWidth - 250 : hostWidth
  const [scenarioId, setScenarioId] = useState(() => initialSelection("scenario", "quiet"))
  const [planId, setPlanId] = useState(() => initialSelection("plan", "standard"))
  const [runId, setRunId] = useState(1)
  const [paused, setPaused] = useState(false)
  const [queueSnapshot, setQueueSnapshot] = useState(() => emptyQueueSnapshot(3))
  const [operation, setOperation] = useState({ available: 3, assigned: 0, unhappy: 0, resolvedUnhappy: 0, resolved: 0, protected: 0, blocked: 0, creditsUsed: 0, simulatedAt: 0 })
  const [trace, setTrace] = useState([{ time: 0, value: 0 }])
  const frameRef = useRef(null)
  const creditsUsedRef = useRef(0)
  const revisionRef = useRef(-1)
  const pendingCasesRef = useRef([])
  const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId) ?? SCENARIOS[0]
  const plan = PLANS.find((candidate) => candidate.id === planId) ?? PLANS[0]
  const calls = useMemo(() => buildCalls(scenario.fixture), [scenario.fixture])
  const model = useMemo(() => buildPhysicsModel(chartWidth, calls, scenario, plan), [chartWidth, calls, plan, scenario])

  const agents = useMemo(() => createServiceResourcePoolController({
    id: `player-support:agents:${runId}`,
    resources: model.resources,
    assignmentForce: 0.8,
    assignmentOffset: { x: 30, y: 0 },
    returnForce: 0.48,
    caseAttraction: 0.18,
  }), [model.resources, runId])
  const serviceLevel = useMemo(() => createServiceLevelController({
    id: `player-support:service-level:${runId}`,
    bodyFilter: CASE_FILTER,
    deadlineAccessor: "promiseMinutes",
    completionRegionId: RESOLVED_REGION_ID,
  }), [runId])
  const recoveryGate = useMemo(() => createDependencyGateController({
    id: `player-support:recovery:${runId}`,
    regionId: RECOVERY_REGION_ID,
    opensAt: scenario.recoveryAt ?? 0,
    bodyFilter: (body) => body.datum?.requiresRecovery === true,
    holdForce: 0.55,
    releaseImpulse: { x: 116, y: 0 },
  }), [runId, scenario.recoveryAt])
  const assignAvailable = useCallback(() => {
    pendingCasesRef.current = pendingCasesRef.current.filter((caseId) => {
      if (agents.getAssignment(caseId)) return false
      return !agents.assign(caseId)
    })
  }, [agents])
  const desk = useMemo(() => createCapacityQueueController({
    id: `player-support:desk:${runId}`,
    regionId: SERVICE_REGION_ID,
    unitsPerSecond: plan.agents * AGENT_RATE,
    unitAccessor: "resolutionMinutes",
    jobKey: "id",
    bodyFilter: CASE_FILTER,
    maxQueue: 14,
    queueLayout: "lane",
    queueSlotSpacing: 17,
    queueStiffness: 0.48,
    releaseImpulse: { x: 104, y: 0 },
    metricWindowSeconds: 8,
    snapshotIntervalSeconds: 0.25,
    onQueued: (body) => {
      pendingCasesRef.current.push(body.id)
      assignAvailable()
    },
    onProcessed: (body) => {
      agents.release(body.id)
      assignAvailable()
    },
    onAbandoned: (body) => {
      agents.release(body.id)
      pendingCasesRef.current = pendingCasesRef.current.filter((caseId) => caseId !== body.id)
    },
  }), [agents, assignAvailable, plan.agents, runId])
  const controllers = useMemo(() => [desk, agents, recoveryGate, serviceLevel], [agents, desk, recoveryGate, serviceLevel])

  const resetRun = useCallback((nextScenarioId = scenarioId, nextPlanId = planId) => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams({ scenario: nextScenarioId, plan: nextPlanId })
      window.location.assign(`${window.location.pathname}?${query.toString()}`)
      return
    }
    const nextPlan = PLANS.find((candidate) => candidate.id === nextPlanId) ?? PLANS[0]
    setScenarioId(nextScenarioId)
    setPlanId(nextPlanId)
    setRunId((value) => value + 1)
    setPaused(false)
    creditsUsedRef.current = 0
    pendingCasesRef.current = []
    revisionRef.current = -1
    setQueueSnapshot(emptyQueueSnapshot(nextPlan.agents))
    setOperation({ available: nextPlan.agents, assigned: 0, unhappy: 0, resolvedUnhappy: 0, resolved: 0, protected: 0, blocked: 0, creditsUsed: 0, simulatedAt: 0 })
    setTrace([{ time: 0, value: 0 }])
  }, [planId, scenarioId])

  const handleTick = useCallback(() => {
    const nextQueue = desk.getSnapshot()
    const resources = agents.getSnapshot()
    const level = serviceLevel.getSnapshot()
    const gate = recoveryGate.getSnapshot()
    const liveBodies = frameRef.current?.getData?.() ?? []
    if (plan.credits > creditsUsedRef.current) {
      for (const body of liveBodies) {
        if (creditsUsedRef.current >= plan.credits) break
        const caseInfo = serviceLevel.getCase(body.id)
        if (!caseInfo || caseInfo.state !== "waiting" || caseInfo.deadlineAt - nextQueue.simulatedAt > 1.25) continue
        if (serviceLevel.protect(body.id)) creditsUsedRef.current += 1
      }
    }
    if (nextQueue.metricRevision === revisionRef.current) return
    revisionRef.current = nextQueue.metricRevision
    setQueueSnapshot(nextQueue)
    setOperation({
      available: resources.available,
      assigned: resources.assigned,
      unhappy: level.unhappy,
      resolvedUnhappy: level.resolvedUnhappy,
      resolved: level.resolved,
      protected: level.protected,
      blocked: gate.blocked,
      creditsUsed: creditsUsedRef.current,
      simulatedAt: nextQueue.simulatedAt,
    })
    setTrace((current) => {
      const point = { time: nextQueue.simulatedAt, value: nextQueue.waitingWork }
      const last = current[current.length - 1]
      return last && point.time - last.time < 0.24 ? [...current.slice(0, -1), point] : [...current, point]
    })
  }, [agents, desk, plan.credits, recoveryGate, serviceLevel])

  const frameConfig = useMemo(() => ({
    kernel: { seed: 72, gravity: { x: 13, y: 0 }, restitution: 0.1, friction: 0.57, velocityDamping: 0.986, maxVelocity: 260, collisionIterations: 4, sleepSpeed: 4, sleepAfter: 1.2 },
    colliders: model.layout.colliders,
    fixedDt: 1 / 60, maxSubsteps: 8, timeScale: 2.2,
  }), [model.layout.colliders])
  const chrome = useMemo(() => processChrome({
    width: model.layout.width, height: model.layout.height, left: model.layout.left, right: model.layout.right,
    topY: model.layout.topY, bottomY: model.layout.bottomY, midY: model.layout.midY,
    stages: model.layout.stages.map((stage) => ({
      id: stage.id, label: stage.label ?? stage.id, x0: stage.x0, x1: stage.x1, x: stage.x, width: stage.width,
      capacity: stage.id === "service" ? plan.agents * AGENT_RATE : undefined,
      capacityLabel: stage.id === "service" ? `${plan.agents} agents` : undefined,
      showBadge: stage.id === "service",
      absorb: stage.id === "resolved",
    })),
  }, { stageLabelMode: chartWidth < 560 ? "compact" : "auto", showGroupSockets: false, showStageCounts: false, testId: "player-support-process-chrome" }), [chartWidth, model.layout, plan.agents])

  const staffingCost = Math.max(0, plan.agents - 3) * RESERVE_AGENT_COST_PER_MINUTE * HORIZON
  const creditSpend = operation.creditsUsed * CREDIT_COST
  const unhappyCases = operation.unhappy + operation.resolvedUnhappy
  const retainedValue = Math.max(0, calls.length - unhappyCases) * CASE_VALUE
  const netOutcome = retainedValue - staffingCost - creditSpend
  const summary = `${scenario.label} with the ${plan.label.toLowerCase()}. ${operation.assigned} agents are handling cases and ${operation.available} are available. ${operation.blocked} cases wait for platform recovery. ${unhappyCases} cases are unhappy.`

  return (
    <ExamplePageLayout title="Player Support Capacity">
      <div className="queue-weather" ref={hostRef}>
        <header className="queue-weather__intro">
          <div><span>Planned operations · finite service resources</span><h2>Player support when demand and recovery do not align</h2></div>
          <p>Choose the known operating condition and commit a response plan before calls begin. Agents can resolve serviceable work; platform-dependent cases remain physically held until recovery. Credits protect a player from the unhappy outcome, but do not resolve the underlying request.</p>
        </header>

        <section className="queue-weather__lab" aria-label="Player support operations simulation">
          <div className="queue-weather__controls">
            <div className="queue-weather__segments" aria-label="Known operating condition">
              {SCENARIOS.map((candidate) => <button key={candidate.id} type="button" className={candidate.id === scenario.id ? "is-active" : ""} aria-pressed={candidate.id === scenario.id} onClick={() => resetRun(candidate.id, plan.id)}>{candidate.label}</button>)}
            </div>
            <div className="queue-weather__run-controls"><button type="button" onClick={() => resetRun()}>Replay plan</button><button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</button></div>
          </div>

          <div className="queue-weather__plan-picker" aria-labelledby="player-support-plan-heading">
            <div><span>Pre-committed response plan</span><h3 id="player-support-plan-heading">Staffing and player-care commitments</h3></div>
            <div className="queue-weather__plan-options">
              {PLANS.map((candidate) => <button key={candidate.id} type="button" className={candidate.id === plan.id ? "is-active" : ""} aria-pressed={candidate.id === plan.id} onClick={() => resetRun(scenario.id, candidate.id)}><strong>{candidate.label}</strong><span>{candidate.agents} agents · {candidate.credits ? `${candidate.credits} credits` : "no credits"}</span></button>)}
            </div>
          </div>

          <div className="queue-weather__condition"><strong>{scenario.label}</strong><span>{scenario.summary} {plan.description}</span><b>{plan.agents} staffed agents</b></div>

          <div className="queue-weather__process-grid">
            <div className="queue-weather__frame-shell">
              <StreamPhysicsFrame
                key={`${scenario.id}-${plan.id}-${runId}-${chartWidth}`}
                ref={frameRef}
                title={`Player Support Capacity: ${scenario.label}`}
                description="Player calls enter from the left. Diamond-shaped support agents attach to one call at a time and return to their staffed positions after handling it. Connection calls during an outage wait at a closed platform-recovery gate until the upstream service recovers."
                summary={summary}
                size={[chartWidth, CHART_HEIGHT]}
                initialSpawns={[...model.callsSpawns, ...model.agentSpawns]}
                initialSpawnPacing={ARRIVAL_PACING}
                controllers={controllers}
                regionEffects={model.regionEffects}
                backgroundGraphics={() => chrome}
                onTick={handleTick}
                paused={paused}
                suspendWhenHidden={false}
                accessibleTable
                bodySemanticItemLimit={60}
                bodySemanticUpdateMs={400}
                bodySemanticItems={(body) => body.datum?.kind === "agent" ? { label: body.datum.label, description: "Finite staffed support resource", group: "Support agents", datum: body.datum } : { label: body.datum?.label ?? body.id, description: `${body.datum?.resolutionMinutes ?? 0} simulated minutes to resolve; ${body.datum?.requiresRecovery ? "awaits platform recovery" : "serviceable by support"}`, group: "Player calls", datum: body.datum }}
                enableHover
                hoverRadius={18}
                tooltipContent={(hover) => <div className="semiotic-tooltip queue-weather__tooltip"><strong>{hover.data?.label ?? hover.id}</strong><div>{hover.data?.kind === "agent" ? "Finite support resource" : `${formatNumber(hover.data?.resolutionMinutes)} simulated minutes to resolve`}</div></div>}
                bodyStyle={(body) => {
                  if (body.datum?.kind === "agent") return { fill: "#e6edf4", stroke: "#31526c", strokeWidth: 2, mark: "square" }
                  const state = serviceLevel.getCase(body.id)?.state
                  const palette = { purchase: ["#f2c14e", "#7a5b08"], quest: ["#4f9da6", "#155e67"], account: ["#8c7bd1", "#483776"], connection: ["#ef8354", "#8b3824"], login: ["#75a36e", "#355f30"] }
                  const colors = palette[body.datum?.type] ?? ["#d7dee5", "#56616c"]
                  if (state === "unhappy" || state === "resolved-unhappy") return { fill: "#d6534c", stroke: "#7d1d1a", strokeWidth: 2, mark: "circle" }
                  if (state === "protected") return { fill: "#7cc8b4", stroke: "#1d6b5d", strokeWidth: 2.5, mark: "circle" }
                  return { fill: colors[0], stroke: colors[1], strokeWidth: 1.5, mark: body.datum?.type === "quest" ? "diamond" : "circle" }
                }}
                config={frameConfig}
              />
            </div>
            <aside className="queue-weather__metrics" aria-label="Live support operations evidence">
              <div className="queue-weather__metric-heading"><span>Live operations</span><strong>{formatNumber(operation.simulatedAt)}m</strong></div>
              <dl>
                <div><dt>Agents</dt><dd>{operation.assigned}/{plan.agents}</dd><small>handling / staffed</small></div>
                <div><dt>Platform hold</dt><dd>{operation.blocked}</dd><small>awaiting recovery</small></div>
                <div><dt>Unhappy</dt><dd>{unhappyCases}</dd><small>active + resolved late</small></div>
                <div><dt>Credits used</dt><dd>{operation.creditsUsed}/{plan.credits}</dd><small>protected near deadline</small></div>
                <div><dt>Queue work</dt><dd>{formatNumber(queueSnapshot.waitingWork)}m</dd><small>unresolved handling</small></div>
                <div><dt>Utilization</dt><dd>{Math.round((queueSnapshot.window.utilization ?? 0) * 100)}%</dd><small>rolling 8 minutes</small></div>
              </dl>
            </aside>
          </div>
          <QueueReferenceChart width={hostWidth} trace={trace} />
        </section>

        <section className="queue-weather__ledger" aria-labelledby="player-support-economics-heading">
          <div><span>Hypothetical operating economics</span><h2 id="player-support-economics-heading">Capacity helps only where work is serviceable</h2><p>Reserve staffing is committed for the full window. Credits are spent only when they prevent a near-deadline case from becoming unhappy. The outage gate makes idle agents, dependency-blocked work, and unnecessary staffing visible as separate conditions.</p></div>
          <dl className="queue-weather__economics">
            <div><dt>Player value retained</dt><dd>${formatNumber(retainedValue)}</dd><small>$38 per case not unhappy</small></div>
            <div><dt>Reserve staffing</dt><dd>-${formatNumber(staffingCost)}</dd><small>pre-committed labor</small></div>
            <div><dt>Player-care credits</dt><dd>-${formatNumber(creditSpend)}</dd><small>$7 per protected case</small></div>
            <div className="is-total"><dt>Net outcome</dt><dd>${formatNumber(netOutcome)}</dd><small>retained value less committed cost</small></div>
          </dl>
        </section>

        <section className="queue-weather__method" aria-labelledby="player-support-method-heading"><div><span>Reusable operations controllers</span><h2 id="player-support-method-heading">Resources, service levels, and dependencies remain composable</h2></div><p><code>createServiceResourcePoolController</code> makes finite staff visible and assignable. <code>createServiceLevelController</code> keeps deadline, protection, and late-resolution states deterministic. <code>createDependencyGateController</code> holds externally blocked work until a known or live condition opens. Each controller adds one operational rule to the existing FIFO queue and reference envelope.</p></section>
        <CodeBlock language="jsx" code={implementationCode} />
      </div>
    </ExamplePageLayout>
  )
}
