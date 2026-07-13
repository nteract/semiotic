import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  StreamPhysicsFrame,
  aggregateRegionCounts,
  chargeGateRegion,
  createProcessJourneyLedger,
  forceFieldRegion,
  processJourneyRows,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
  updateProcessJourney,
} from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./StakeholderJourneyExamplePage.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 300
const BOWTIE_HEIGHT = 400
const COHORT_SIZE = 36
const COHORT_SEED = 208
const IMPACT_HEIGHT_PER_LEADER = 2

const STAGES = [
  {
    id: "discovery",
    label: "Discovery",
    short: "DISC",
    voice: "I find it and it looks relevant.",
  },
  {
    id: "acquisition",
    label: "Acquisition",
    short: "ACQ",
    voice: "I reach the project and try it.",
  },
  {
    id: "activation",
    label: "Activation",
    short: "ACT",
    voice: "The first wall clears.",
  },
  {
    id: "impact",
    label: "First Impact",
    short: "IMPACT",
    voice: "It did the thing I came for.",
  },
  {
    id: "habit",
    label: "Habit",
    short: "HABIT",
    voice: "It becomes a default.",
  },
  {
    id: "commitment",
    label: "Commitment",
    short: "COM",
    voice: "I help tend the project.",
  },
  {
    id: "leadership",
    label: "Ecosystem Leadership",
    short: "LEAD",
    voice: "I help steward the ecosystem.",
  },
]

const STAGE_INDEX = Object.fromEntries(
  STAGES.map((stage, index) => [stage.id, index]),
)

const MEMBRANES = [
  {
    id: "findability",
    label: "Findability",
    compact: "M1",
    offset: 0.2,
    cost: 0.26,
    wobble: -9,
    color: "#c2413b",
  },
  {
    id: "value-fit",
    label: "Value fit",
    compact: "M2",
    offset: 0.4,
    cost: 0.34,
    wobble: 8,
    color: "#2563a6",
  },
  {
    id: "activation-work",
    label: "Activation work",
    compact: "M3",
    offset: 0.6,
    cost: 0.4,
    wobble: -4,
    color: "#c2413b",
  },
]

const SYSTEMS = {
  relay: {
    id: "relay",
    short: "Designed relay",
    title: "Invitation makes the next role visible",
    verdict: "Intentional community path",
    description:
      "After First Impact, a near-peer field pulls charged participants from Habit toward Commitment and gives committed people a visible path toward stewardship.",
    invitationForce: 80,
    invitationDamping: 0.045,
    leadershipForce: 90,
    leadershipDamping: 0.04,
    accent: "#0c7894",
    fieldLabel: "near-peer invitation",
  },
  passive: {
    id: "passive",
    short: "Passive path",
    title: "Utility alone does not create commitment",
    verdict: "Product usage without invitation",
    description:
      "The same participants can reach First Impact and Habit, but the path to a community role is weak and friction pulls people back toward private use.",
    invitationForce: -240,
    invitationDamping: 0.3,
    leadershipForce: -280,
    leadershipDamping: 0.34,
    accent: "#b63832",
    fieldLabel: "no intentional invitation",
  },
}

const SYSTEM_ORDER = ["relay", "passive"]

const FORCE_MAP = [
  {
    cell: "Channels",
    group: "Feasibility",
    stageId: "discovery",
    mechanism: "Findability membrane",
    assumption: "Can the people the project needs encounter it?",
  },
  {
    cell: "Value propositions",
    group: "Desirability",
    stageId: "impact",
    mechanism: "First Impact charge gate",
    assumption: "Did the project help with a goal the participant actually had?",
  },
  {
    cell: "Community members",
    group: "Desirability",
    stageId: "commitment",
    mechanism: "Near-peer invitation field",
    assumption: "Is the next role visible, personal, and reachable?",
  },
  {
    cell: "Operations + in-kind support",
    group: "Viability / feasibility",
    stageId: "commitment",
    mechanism: "Mentoring capacity",
    assumption: "Can the project sustain the human work of invitation?",
  },
  {
    cell: "Governance",
    group: "Feasibility",
    stageId: "leadership",
    mechanism: "Stewardship path",
    assumption: "Can committed people see how decisions and responsibility move?",
  },
]

const implementationCode = `import {
  chargeGateRegion,
  createProcessJourneyLedger,
  processJourneyRows,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
  updateProcessJourney,
} from "semiotic/physics"

const rows = processJourneyRows(journey)
const leaders = rows.find((row) => row.id === "leadership")
const layout = processStageLayout({
  shape: "bowtie",
  stages,
  membranes,
  width,
  height: 400,
  pinchHeightOffset: (leaders?.reached ?? 0) * 2,
})

const stageRegions = processStageRegions(layout, {
  metadata: { systemId: scenario.id },
})
const impactRegion = chargeGateRegion({
  id: "first-impact",
  ...layout.stages[impactIndex],
  height: layout.pinchHeight,
  charge: "first-impact",
})
const overlayPolygons = processVolumePolygons(layout)

<StreamPhysicsFrame
  initialSpawns={sharedCohort}
  config={{ colliders: layout.colliders }}
  regionEffects={[...layout.regionEffects, ...stageRegions, impactRegion]}
  onRegionEvent={(event) =>
    setJourney((current) => updateProcessJourney(current, event))
  }
/>

// Render overlayPolygons in SVG or Canvas; every edge matches the barriers.
`

function mulberry32(seed) {
  let value = seed
  return function nextRandom() {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomBetween(random, min, max) {
  return min + random() * Math.max(0, max - min)
}

function cohortBodyId(systemId, runId, index) {
  return `${systemId}-${runId}-participant-${index}`
}

function cohortBodyIds(systemId, runId) {
  return Array.from({ length: COHORT_SIZE }, (_, index) =>
    cohortBodyId(systemId, runId, index),
  )
}

function emptyJourney(systemId, runId) {
  return createProcessJourneyLedger({
    stages: STAGES,
    bodyIds: cohortBodyIds(systemId, runId),
  })
}

function emptyJourneys(runId) {
  return Object.fromEntries(
    SYSTEM_ORDER.map((systemId) => [systemId, emptyJourney(systemId, runId)]),
  )
}

function emptyRegionCounts() {
  return Object.fromEntries(SYSTEM_ORDER.map((systemId) => [systemId, {}]))
}

function buildBowtieLayout(width, system, leadershipReached) {
  const compact = width < 520
  const layout = processStageLayout({
    width,
    height: BOWTIE_HEIGHT,
    shape: "bowtie",
    padX: compact ? 18 : 42,
    padY: compact ? 68 : 72,
    stages: STAGES.map(({ id, label }) => ({ id, label })),
    membranes: MEMBRANES.map((membrane) => ({
      ...membrane,
      metadata: {
        role: "membrane",
        systemId: system.id,
        membraneId: membrane.id,
      },
      bodyStyle: { strokeWidth: 1.5 },
    })),
    idPrefix: system.id,
    membraneDampingScale: 0.42,
    centerStageIndex: STAGE_INDEX.impact,
    pinchRatio: compact ? 0.22 : 0.176,
    pinchHeightOffset: leadershipReached * IMPACT_HEIGHT_PER_LEADER,
  })

  return {
    ...layout,
    compact,
    stages: layout.stages.map((stage) => ({
      ...stage,
      voice: STAGES.find((candidate) => candidate.id === stage.id)?.voice,
    })),
  }
}

function buildRegionEffects(layout, system, leadershipReached) {
  const systemMetadata = (role, extra = {}) => ({
    role,
    systemId: system.id,
    ...extra,
  })
  const habit = layout.stages[STAGE_INDEX.habit]
  const commitment = layout.stages[STAGE_INDEX.commitment]
  const impact = layout.stages[STAGE_INDEX.impact]
  const distanceScale = 1080 / layout.width
  const stageRegions = processStageRegions(layout, {
    idPrefix: `${system.id}-stage`,
    insetX: 1,
    metadata: (stage) => systemMetadata("stage", { stageId: stage.id }),
  })
  const membranes = layout.regionEffects.map((region) => ({
    ...region,
    metadata:
      region.metadata ??
      systemMetadata("membrane", { membraneId: region.id }),
  }))

  return [
    ...stageRegions,
    ...membranes,
    chargeGateRegion({
      id: `${system.id}-first-impact`,
      label: "First Impact",
      description:
        "Utility gate: the participant achieved a goal, not merely a successful install.",
      x: impact.x,
      y: layout.midY,
      width: impact.width + 12,
      height: layout.pinchHeight + 42,
      charge: "first-impact",
      energyDelta: 1,
      impulseOnEnter: { x: 7, y: 0 },
      metadata: systemMetadata("impact", {
        leadershipReached,
        pinchHeight: layout.pinchHeight,
      }),
      bodyStyle: { fill: "#43d6f1", stroke: "#087895" },
    }),
    forceFieldRegion({
      id: `${system.id}-invitation-field`,
      label: "Habit to Commitment",
      description:
        "An illustrative invitation field at the user-to-contributor crossing.",
      x: habit.x + habit.width * 0.34,
      y: layout.midY,
      width: habit.width * 0.9,
      height: 244,
      force: { x: system.invitationForce * distanceScale, y: 0 },
      damping: system.invitationDamping,
      metadata: systemMetadata("invitation"),
      bodyStyle: {
        fill: system.id === "relay" ? "#ffe08a" : "#cbd5e1",
      },
    }),
    forceFieldRegion({
      id: `${system.id}-leadership-field`,
      label: "Commitment to Leadership",
      description:
        "A visible stewardship path beyond first contribution.",
      x: commitment.x,
      y: layout.midY,
      width: commitment.width,
      height: 252,
      force: { x: system.leadershipForce * distanceScale, y: 0 },
      damping: system.leadershipDamping,
      metadata: systemMetadata("leadership"),
      bodyStyle: {
        fill: system.id === "relay" ? "#ffe08a" : "#cbd5e1",
      },
    }),
  ]
}

function buildCohortSpawns(layout, system, runId) {
  const random = mulberry32(COHORT_SEED + runId * 997)
  const startX = layout.left + (layout.compact ? 9 : 18)
  const startTop = layout.boundaryY(startX, "top") + 16
  const startBottom = layout.boundaryY(startX, "bottom") - 16
  const radius = layout.compact ? 4.6 : 6.2

  return Array.from({ length: COHORT_SIZE }, (_, index) => {
    const id = cohortBodyId(system.id, runId, index)
    return {
      id,
      x: startX + randomBetween(random, 0, layout.compact ? 8 : 18),
      y: randomBetween(random, startTop, startBottom),
      vx: randomBetween(random, 120, 170),
      vy: randomBetween(random, -24, 24),
      mass: 1,
      restitution: 0.18,
      friction: 0.52,
      bodyCollisions: false,
      shape: { type: "circle", radius },
      datum: {
        id,
        participantId: `participant-${index}`,
        label: `Participant ${String(index + 1).padStart(2, "0")}`,
        systemId: system.id,
      },
      spawnAt: index * 0.045,
    }
  })
}

function buildBowtieModel(width, system, runId, leadershipReached) {
  const layout = buildBowtieLayout(width, system, leadershipReached)
  return {
    layout,
    colliders: layout.colliders,
    regionEffects: buildRegionEffects(layout, system, leadershipReached),
    spawns: buildCohortSpawns(layout, system, runId),
  }
}

function rowFor(rows, stageId) {
  return rows.find((row) => row.id === stageId) ?? {
    id: stageId,
    label: stageId,
    reached: 0,
    total: COHORT_SIZE,
    conversion: 0,
    fromPrevious: 0,
    dropoff: 0,
    visits: 0,
    repeatVisits: 0,
  }
}

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

export default function StakeholderJourneyExamplePage() {
  const [hostWidth, hostRef] = useResponsiveWidth(MIN_WIDTH, MAX_WIDTH)
  const chartWidth = Math.max(
    MIN_WIDTH,
    Math.min(1080, Math.round(hostWidth - (hostWidth < 560 ? 28 : 8))),
  )
  const [systemId, setSystemId] = useState("relay")
  const [runId, setRunId] = useState(0)
  const [journeys, setJourneys] = useState(() => emptyJourneys(0))
  const [regionCounts, setRegionCounts] = useState(emptyRegionCounts)
  const [selectedStageId, setSelectedStageId] = useState("commitment")
  const system = SYSTEMS[systemId]
  const rowsBySystem = useMemo(
    () =>
      Object.fromEntries(
        SYSTEM_ORDER.map((id) => [id, processJourneyRows(journeys[id])]),
      ),
    [journeys],
  )
  const rows = rowsBySystem[systemId]
  const leadershipReached = rowFor(rows, "leadership").reached
  const model = useMemo(
    () => buildBowtieModel(chartWidth, system, runId, leadershipReached),
    [chartWidth, leadershipReached, runId, system],
  )

  useEffect(() => {
    setJourneys(emptyJourneys(runId))
    setRegionCounts(emptyRegionCounts())
  }, [chartWidth, runId])

  const handleRegionEvent = useCallback((event) => {
    const eventSystemId = event.region.metadata?.systemId
    if (!SYSTEMS[eventSystemId]) return
    setJourneys((current) => {
      const nextLedger = updateProcessJourney(current[eventSystemId], event)
      return nextLedger === current[eventSystemId]
        ? current
        : { ...current, [eventSystemId]: nextLedger }
    })
    setRegionCounts((current) => {
      const nextCounts = aggregateRegionCounts(current[eventSystemId], event)
      return nextCounts === current[eventSystemId]
        ? current
        : { ...current, [eventSystemId]: nextCounts }
    })
  }, [])

  const selectSystem = useCallback(
    (nextSystemId) => {
      if (nextSystemId === systemId) return
      setSystemId(nextSystemId)
      setJourneys((current) => ({
        ...current,
        [nextSystemId]: emptyJourney(nextSystemId, runId),
      }))
      setRegionCounts((current) => ({ ...current, [nextSystemId]: {} }))
    },
    [runId, systemId],
  )

  const replay = useCallback(() => {
    setRunId((current) => current + 1)
    setSelectedStageId("commitment")
  }, [])

  return (
    <ExamplePageLayout
      title="The Stakeholder Journey"
      code={implementationCode}
    >
      <div className="stakeholder-journey" ref={hostRef}>
        <section className="stakeholder-journey__hero">
          <div>
            <span className="stakeholder-journey__kicker">
              Controlled process-physics counterfactual
            </span>
            <p className="stakeholder-journey__lede">
              First Impact proves utility. It does not create a contributor. The same
              deterministic cohort starts with the same left-side membranes; after Habit,
              an intentional invitation relay either makes Commitment reachable or leaves
              usage private. Leadership can then feed capacity back into the whole passage.
            </p>
          </div>
          <aside className="stakeholder-journey__model-note">
            <strong>Illustrative model, not observed stdlib data</strong>
            <span>
              Counts are unique stage crossings from the simulation. No participant is
              assigned a final role or destination at spawn. In both conditions, each
              Leadership crossing widens the complete Impact passage by two pixels.
            </span>
          </aside>
          <div className="stakeholder-journey__sources" aria-label="Source essays">
            <a href="https://blog.stdlib.io/the-stakeholder-journey/" target="_blank" rel="noreferrer">Stakeholder Journey</a>
            <a href="https://blog.stdlib.io/open-source-ecosystem-canvas/" target="_blank" rel="noreferrer">Open-Source Ecosystem Canvas</a>
            <a href="https://blog.stdlib.io/mapping-your-ecosystem-and-its-saboteurs/" target="_blank" rel="noreferrer">Ecosystem Map</a>
          </div>
        </section>

        <section className="stakeholder-journey__comparison" aria-labelledby="journey-heading">
          <div className="stakeholder-journey__section-header">
            <div>
              <span className="stakeholder-journey__kicker">One initial force, shared feedback</span>
              <h2 id="journey-heading">The Habit-to-Commitment crossing</h2>
              <p>
                Both views begin with identical geometry and forces through Habit. Switch
                the right-side community condition while keeping all 36 participants,
                spawn positions, velocities, timing, and left-side friction fixed. Once
                Leadership appears, the same feedback rule widens the complete Impact
                passage for later participants.
              </p>
            </div>
            <button type="button" className="stakeholder-journey__replay" onClick={replay}>
              Replay cohort
            </button>
          </div>

          <div className="stakeholder-journey__scenario-control" role="group" aria-label="Community condition">
            {SYSTEM_ORDER.map((id) => {
              const candidate = SYSTEMS[id]
              const active = id === systemId
              return (
                <button
                  key={id}
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-pressed={active}
                  onClick={() => selectSystem(id)}
                >
                  <strong>{candidate.short}</strong>
                  <span>{candidate.verdict}</span>
                </button>
              )
            })}
          </div>

          <JourneyBowtie
            system={system}
            model={model}
            runId={runId}
            journey={journeys[systemId]}
            rows={rows}
            regionCounts={regionCounts[systemId]}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            onRegionEvent={handleRegionEvent}
          />

          <JourneyComparison rowsBySystem={rowsBySystem} activeSystemId={systemId} />
        </section>

        <section className="stakeholder-journey__force-map" aria-labelledby="force-map-heading">
          <div className="stakeholder-journey__section-header">
            <div>
              <span className="stakeholder-journey__kicker">Ecosystem canvas as model map</span>
              <h2 id="force-map-heading">Hypotheses become named mechanisms</h2>
              <p>
                Canvas cells are prompts, not particle quantities. Each row names the
                journey mechanism a project would need to measure or design.
              </p>
            </div>
          </div>
          <div className="stakeholder-journey__force-table">
            {FORCE_MAP.map((item) => (
              <button
                key={`${item.cell}-${item.stageId}`}
                type="button"
                className={selectedStageId === item.stageId ? "is-active" : ""}
                onClick={() => setSelectedStageId(item.stageId)}
              >
                <span>{item.group}</span>
                <strong>{item.cell}</strong>
                <b>{item.mechanism}</b>
                <small>{item.assumption}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="stakeholder-journey__method" aria-labelledby="journey-method-heading">
          <div>
            <span className="stakeholder-journey__kicker">Reusable process evidence</span>
            <h2 id="journey-method-heading">Geometry, observation, ledger.</h2>
          </div>
          <p>
            <code>processStageLayout</code> owns the bowtie, membranes, and live
            <code> pinchHeightOffset</code>. Its colliders, the stage sensors from
            <code> processStageRegions</code>, and the panels from
            <code> processVolumePolygons</code> now share one geometry. Meanwhile,
            <code> updateProcessJourney</code> records first entry, repeat visits,
            regressions, and furthest progress per entity. <code>processJourneyRows</code>
            computes the Leadership count from that evidence. Each participant expands the
            corridor by two pixels.
          </p>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function JourneyBowtie({
  system,
  model,
  runId,
  journey,
  rows,
  regionCounts,
  selectedStageId,
  setSelectedStageId,
  onRegionEvent,
}) {
  const config = useMemo(
    () => ({
      kernel: {
        seed: COHORT_SEED + runId,
        gravity: { x: 60, y: 0 },
        restitution: 0.18,
        friction: 0.56,
        velocityDamping: 0.996,
        collisionIterations: 3,
        maxVelocity: 320,
        sleepSpeed: 5,
        sleepAfter: 0.9,
      },
      colliders: model.colliders,
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      settleStepLimit: 3600,
      observation: {
        chartId: `stakeholder-journey-${system.id}`,
        chartType: "StreamPhysicsFrame",
      },
    }),
    [model.colliders, runId, system.id],
  )
  const rowMap = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.id, row])),
    [rows],
  )
  const impact = rowFor(rows, "impact")
  const habit = rowFor(rows, "habit")
  const commitment = rowFor(rows, "commitment")
  const leadership = rowFor(rows, "leadership")
  const retention = impact.reached > 0 ? commitment.reached / impact.reached : 0
  const selectedStage = STAGES.find((stage) => stage.id === selectedStageId) ?? STAGES[0]

  return (
    <article className={`stakeholder-journey__system is-${system.id}`} style={{ "--journey-system": system.accent }}>
      <header className="stakeholder-journey__system-header">
        <div>
          <span>{system.verdict}</span>
          <h3>{system.title}</h3>
        </div>
        <p>{system.description}</p>
      </header>

      <div className="stakeholder-journey__chart-stage" style={{ width: model.layout.width }}>
        <StreamPhysicsFrame
          key={`${system.id}-${runId}-${model.layout.width}`}
          title={`${system.short}: stakeholder journey`}
          summary={`${system.short}. ${impact.reached} of ${COHORT_SIZE} participants have reached First Impact; ${commitment.reached} have crossed into Commitment and ${leadership.reached} have reached Ecosystem Leadership. The Impact passage is ${Math.round(model.layout.pinchHeight)} pixels high.`}
          description="A controlled cohort crosses seven observed process stages. First Impact changes participant state; every unique Leadership crossing expands that region and its connecting barriers by two pixels. The Habit-to-Commitment field differs between community conditions."
          size={[model.layout.width, BOWTIE_HEIGHT]}
          config={config}
          initialSpawns={model.spawns}
          initialSpawnPacing={{
            pacing: "arrival",
            timeAccessor: "spawnAt",
            timeScale: 5,
          }}
          regionEffects={model.regionEffects}
          onRegionEvent={onRegionEvent}
          suspendWhenHidden={false}
          accessibleTable
          bodySemanticItemLimit={COHORT_SIZE}
          bodySemanticUpdateMs={500}
          bodySemanticItems={(body) => {
            const datum = body.datum ?? {}
            const state = journey.entities[body.id]
            const furthest = state?.furthestStageId
              ? STAGES.find((stage) => stage.id === state.furthestStageId)?.label
              : "not yet observed"
            return {
              label: datum.label ?? body.id,
              description: `Furthest stage: ${furthest}. ${state?.regressionCount ?? 0} backward transitions observed.`,
              group: `${system.short} cohort`,
              datum,
            }
          }}
          enableHover
          hoverRadius={18}
          bodyStyle={(body) => {
            const state = journey.entities[body.id]
            const furthest = state?.furthestStageIndex ?? -1
            const charged = furthest >= STAGE_INDEX.impact
            const committed = furthest >= STAGE_INDEX.commitment
            const leader = furthest >= STAGE_INDEX.leadership
            return {
              fill: leader
                ? "#f6c945"
                : committed
                  ? "#ffe08a"
                  : charged
                    ? "#43d6f1"
                    : "#dbe4ea",
              stroke: committed ? "#8d6420" : charged ? "#087895" : "#637485",
              strokeWidth: committed ? 2 : 1.15,
              opacity: 0.94,
            }
          }}
          tooltipContent={(hover) => {
            const datum = hover.data ?? {}
            const state = journey.entities[hover.id]
            const currentStage = state?.currentStageId
              ? STAGES.find((stage) => stage.id === state.currentStageId)?.label
              : "Not yet observed"
            const furthestStage = state?.furthestStageId
              ? STAGES.find((stage) => stage.id === state.furthestStageId)?.label
              : "Not yet observed"
            return (
              <div className="semiotic-tooltip stakeholder-journey__tooltip">
                <strong>{datum.label ?? hover.id}</strong>
                <div>Current: {currentStage}</div>
                <div>Furthest: {furthestStage}</div>
              </div>
            )
          }}
        />
        <BowtieOverlay
          system={system}
          layout={model.layout}
          rows={rows}
          regionCounts={regionCounts}
          selectedStageId={selectedStageId}
        />
      </div>

      <div className="stakeholder-journey__metrics" aria-label={`${system.short} journey metrics`}>
        <Metric label="First Impact" value={impact.reached} detail={`${percent(impact.conversion)} / ${Math.round(model.layout.pinchHeight)}px high`} />
        <Metric label="Habit" value={habit.reached} detail={`${habit.dropoff} drop from prior`} />
        <Metric label="Commitment" value={commitment.reached} detail={`${percent(retention)} of impact`} emphasize />
        <Metric label="Leadership" value={leadership.reached} detail={`${leadership.repeatVisits} repeat visits`} />
      </div>

      <div className="stakeholder-journey__stage-rail" aria-label="Journey stages">
        {STAGES.map((stage) => {
          const row = rowMap[stage.id] ?? rowFor(rows, stage.id)
          return (
            <button
              key={stage.id}
              type="button"
              className={selectedStageId === stage.id ? "is-active" : ""}
              aria-pressed={selectedStageId === stage.id}
              aria-label={`${stage.label}: ${row.reached} of ${COHORT_SIZE} reached`}
              onClick={() => setSelectedStageId(stage.id)}
            >
              <span>{stage.short}</span>
              <strong>{row.reached}</strong>
            </button>
          )
        })}
      </div>
      <div className="stakeholder-journey__voice" aria-live="polite">
        <strong>{selectedStage.label}</strong>
        <span>{selectedStage.voice}</span>
      </div>

      <div className="stakeholder-journey__membrane-ledger">
        {MEMBRANES.map((membrane) => (
          <div key={membrane.id}>
            <span style={{ "--membrane-color": membrane.color }}>{membrane.compact}</span>
            <strong>{membrane.label}</strong>
            <b>{regionCounts[membrane.id]?.count ?? 0} crossed</b>
            <small>cost {Math.round(membrane.cost * 100)}</small>
          </div>
        ))}
      </div>
    </article>
  )
}

function JourneyComparison({ rowsBySystem, activeSystemId }) {
  const comparisonStages = ["activation", "impact", "habit", "commitment", "leadership"]
  return (
    <div className="stakeholder-journey__ledger" aria-label="Scenario comparison ledger">
      <div className="stakeholder-journey__ledger-heading">
        <div>
          <span className="stakeholder-journey__kicker">Saved scenario evidence</span>
          <h3>Unique participants reaching each stage</h3>
        </div>
        <span>Switch conditions to populate both columns.</span>
      </div>
      <div className="stakeholder-journey__ledger-row is-header" aria-hidden="true">
        <span>Stage</span>
        <b>Designed relay</b>
        <b>Passive path</b>
      </div>
      {comparisonStages.map((stageId) => {
        const stage = STAGES.find((candidate) => candidate.id === stageId)
        const relay = rowFor(rowsBySystem.relay, stageId)
        const passive = rowFor(rowsBySystem.passive, stageId)
        return (
          <div key={stageId} className="stakeholder-journey__ledger-row">
            <span>{stage?.label ?? stageId}</span>
            <b className={activeSystemId === "relay" ? "is-live" : ""}>{relay.reached} / {relay.total}</b>
            <b className={activeSystemId === "passive" ? "is-live" : ""}>{passive.reached} / {passive.total}</b>
          </div>
        )
      })}
    </div>
  )
}

function BowtieOverlay({ system, layout, rows, regionCounts, selectedStageId }) {
  const volumePolygons = processVolumePolygons(layout)
  const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]))
  const habit = layout.stages[STAGE_INDEX.habit]
  const commitment = layout.stages[STAGE_INDEX.commitment]
  const leadership = layout.stages[STAGE_INDEX.leadership]
  const leadershipReached = rowMap.leadership?.reached ?? 0

  return (
    <svg className="stakeholder-journey__overlay" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      {volumePolygons.map((polygon) => (
        <polygon
          key={polygon.id}
          className={`stakeholder-journey__funnel ${
            polygon.role === "center"
              ? "is-impact"
              : polygon.role === "outgoing"
                ? "is-community"
                : ""
          }`}
          data-process-polygon={polygon.role}
          points={points(polygon.points)}
        />
      ))}

      {layout.stages.slice(1).map((stage) => (
        <line
          key={stage.id}
          className="stakeholder-journey__stage-rule"
          x1={stage.x0}
          x2={stage.x0}
          y1={layout.boundaryY(stage.x0, "top") + 7}
          y2={layout.boundaryY(stage.x0, "bottom") - 7}
        />
      ))}

      {layout.membranes.map((membrane) => {
        const source = MEMBRANES.find((item) => item.id === membrane.id)
        return (
          <g key={membrane.id} className="stakeholder-journey__membrane-region">
            <path d={membranePath(layout, membrane)} fill={membrane.color} opacity={0.13 + membrane.cost * 0.22} />
            <path d={membraneCenterline(layout, membrane)} stroke={membrane.color} />
            <text x={membrane.x} y={layout.topY - 13} textAnchor="middle">
              {layout.compact ? source?.compact : membrane.label}
            </text>
            <text x={membrane.x} y={layout.bottomY + 20} textAnchor="middle">
              {regionCounts[membrane.id]?.count ?? 0}
            </text>
          </g>
        )
      })}

      {layout.stages.map((stage) => {
        const source = STAGES.find((candidate) => candidate.id === stage.id)
        const highlighted = stage.id === selectedStageId
        return (
          <g key={stage.id} className={`stakeholder-journey__stage-label ${highlighted ? "is-highlighted" : ""}`}>
            {highlighted ? (
              <rect
                x={stage.x - Math.min(28, stage.width * 0.42)}
                y={layout.midY - 21}
                width={Math.min(56, stage.width * 0.84)}
                height={42}
                rx="5"
              />
            ) : null}
            <text x={stage.x} y={layout.midY - 2} textAnchor="middle">
              {source?.short ?? stage.id}
            </text>
            <text className="is-count" x={stage.x} y={layout.midY + 13} textAnchor="middle">
              {rowMap[stage.id]?.reached ?? 0}
            </text>
          </g>
        )
      })}

      <g className="stakeholder-journey__impact-gate">
        <rect
          x={layout.centerLeft + 3}
          y={layout.pinchTop + 3}
          width={layout.centerRight - layout.centerLeft - 6}
          height={Math.max(1, layout.pinchHeight - 6)}
          data-leadership-reached={leadershipReached}
          rx="5"
        />
      </g>

      <g className={`stakeholder-journey__invitation-field is-${system.id}`}>
        <path d={`M ${habit.x} ${layout.midY - 54} C ${commitment.x} ${layout.midY - 108}, ${leadership.x} ${layout.midY - 84}, ${layout.right - 14} ${layout.midY - 38}`} />
        <path d={`M ${habit.x} ${layout.midY + 54} C ${commitment.x} ${layout.midY + 108}, ${leadership.x} ${layout.midY + 84}, ${layout.right - 14} ${layout.midY + 38}`} />
        <text x={layout.right - 2} y={layout.topY - 13} textAnchor="end">
          {system.fieldLabel}
        </text>
      </g>
    </svg>
  )
}

function membranePath(layout, membrane) {
  const top = layout.topY + 10
  const bottom = layout.bottomY - 10
  const half = membrane.width / 2
  const wobble = membrane.wobble
  return `M ${membrane.x - half} ${top} C ${membrane.x - half + wobble} ${top + 68}, ${membrane.x - half - wobble} ${bottom - 68}, ${membrane.x - half} ${bottom} L ${membrane.x + half} ${bottom} C ${membrane.x + half - wobble} ${bottom - 68}, ${membrane.x + half + wobble} ${top + 68}, ${membrane.x + half} ${top} Z`
}

function membraneCenterline(layout, membrane) {
  const top = layout.topY + 10
  const bottom = layout.bottomY - 10
  return `M ${membrane.x} ${top} C ${membrane.x + membrane.wobble} ${top + 68}, ${membrane.x - membrane.wobble} ${bottom - 68}, ${membrane.x} ${bottom}`
}

function Metric({ label, value, detail, emphasize = false }) {
  return (
    <div className={`stakeholder-journey__metric ${emphasize ? "is-emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function points(values) {
  return values.map(([x, y]) => `${x},${y}`).join(" ")
}
