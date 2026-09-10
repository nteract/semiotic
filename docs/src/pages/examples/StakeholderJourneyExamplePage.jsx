import React, { useCallback, useMemo, useState } from "react"
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
import {
  STAGES,
  STAGE_INDEX,
  MEMBRANES,
  SYSTEMS,
  SYSTEM_ORDER,
} from "./stakeholderJourneyScenarios"
import { usePhysicsStoryClock, PhysicsStoryClock } from "./PhysicsStoryClock"
import "./StakeholderJourneyExamplePage.css"
import "./physicsStories.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 240
const MODEL_WIDTH = 900
const BOWTIE_HEIGHT = 400
const COHORT_SIZE = 36
const COHORT_SEED = 208

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
  return Array.from({ length: COHORT_SIZE }, (_, index) => cohortBodyId(systemId, runId, index))
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

function buildBowtieLayout(width, system) {
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
    pinchHeightOffset: 0,
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

function buildRegionEffects(layout, system) {
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
    metadata: region.metadata ?? systemMetadata("membrane", { membraneId: region.id }),
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
        pinchHeight: layout.pinchHeight,
      }),
      bodyStyle: { fill: "#43d6f1", stroke: "#087895" },
    }),
    forceFieldRegion({
      id: `${system.id}-invitation-field`,
      label: "Habit to Commitment",
      description: "An illustrative invitation field at the user-to-contributor crossing.",
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
      description: "A visible stewardship path beyond first contribution.",
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
  const random = mulberry32(COHORT_SEED)
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

function buildBowtieModel(width, system, runId) {
  const layout = buildBowtieLayout(width, system)
  return {
    layout,
    colliders: layout.colliders,
    regionEffects: buildRegionEffects(layout, system),
    spawns: buildCohortSpawns(layout, system, runId),
  }
}

function rowFor(rows, stageId) {
  return (
    rows.find((row) => row.id === stageId) ?? {
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
  )
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
  const [observedSeconds, setObservedSeconds] = useState({ relay: 0, passive: 0 })
  const [ledgerRun, setLedgerRun] = useState(runId)
  // Reset before the new child mounts. A parent effect runs after the child's
  // reduced-motion settle and would erase the crossings it just observed.
  if (ledgerRun !== runId) {
    setLedgerRun(runId)
    setObservedSeconds({ relay: 0, passive: 0 })
    setJourneys(emptyJourneys(runId))
    setRegionCounts(emptyRegionCounts())
  }
  const [selectedStageId, setSelectedStageId] = useState("commitment")
  const system = SYSTEMS[systemId]
  const rowsBySystem = useMemo(
    () => Object.fromEntries(SYSTEM_ORDER.map((id) => [id, processJourneyRows(journeys[id])])),
    [journeys],
  )
  const rows = rowsBySystem[systemId]
  const model = useMemo(() => buildBowtieModel(MODEL_WIDTH, system, runId), [runId, system])

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
      setObservedSeconds((current) => ({ ...current, [nextSystemId]: 0 }))
      setJourneys((current) => ({
        ...current,
        [nextSystemId]: emptyJourney(nextSystemId, runId),
      }))
      setRegionCounts((current) => ({ ...current, [nextSystemId]: {} }))
    },
    [runId, systemId],
  )

  const handleProgress = useCallback(
    (elapsed) => {
      setObservedSeconds((current) => ({ ...current, [systemId]: elapsed }))
    },
    [systemId],
  )

  const replay = useCallback(() => {
    setRunId((current) => current + 1)
    setSelectedStageId("commitment")
  }, [])

  return (
    <ExamplePageLayout title="The Stakeholder Journey">
      <div className="stakeholder-journey" ref={hostRef}>
        <section className="stakeholder-journey__hero">
          <div>
            <span className="stakeholder-journey__kicker">From first use to real contribution</span>
            <p className="stakeholder-journey__lede">
              People can use a tool every day without joining its community. Follow the same 36
              participants and change the support available at the crossing into contribution.
            </p>
          </div>
          <aside className="stakeholder-journey__model-note">
            <strong>Illustrative model, not observed product data</strong>
            <span>
              Each ball is a participant; the narrow passage is First Impact. Counts come from a
              20-second model experiment, not observed community conversion rates.
            </span>
          </aside>
        </section>

        <section className="stakeholder-journey__comparison" aria-labelledby="journey-heading">
          <div className="stakeholder-journey__section-header">
            <div>
              <span className="stakeholder-journey__kicker">Same cohort, one changed force</span>
              <h2 id="journey-heading">What helps a regular user become a contributor?</h2>
              <p>
                Only support at Habit changes. Watch for crossings into Commitment and drifts back
                toward private use. The ledger remembers first crossings, including people who later
                return. Replay keeps the same cohort; resizing keeps the same model.
              </p>
            </div>
            <button type="button" className="stakeholder-journey__replay" onClick={replay}>
              Replay cohort
            </button>
          </div>

          <div
            className="stakeholder-journey__scenario-control"
            role="group"
            aria-label="Community condition"
          >
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
            onProgress={handleProgress}
            displayWidth={chartWidth}
          />

          <JourneyComparison
            rowsBySystem={rowsBySystem}
            activeSystemId={systemId}
            observedSeconds={observedSeconds}
          />
        </section>

        <section className="stakeholder-journey__force-map" aria-labelledby="force-map-heading">
          <div className="stakeholder-journey__section-header">
            <div>
              <span className="stakeholder-journey__kicker">Ecosystem canvas as model map</span>
              <h2 id="force-map-heading">Hypotheses become named mechanisms</h2>
              <p>
                Canvas cells are prompts, not particle quantities. Each row names the journey
                mechanism a project would need to measure or design.
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

        <div className="stakeholder-journey__sources" aria-label="Source essays">
          <a
            href="https://blog.stdlib.io/the-stakeholder-journey/"
            target="_blank"
            rel="noreferrer"
          >
            Stakeholder Journey
          </a>
          <a
            href="https://blog.stdlib.io/open-source-ecosystem-canvas/"
            target="_blank"
            rel="noreferrer"
          >
            Open-Source Ecosystem Canvas
          </a>
          <a
            href="https://blog.stdlib.io/mapping-your-ecosystem-and-its-saboteurs/"
            target="_blank"
            rel="noreferrer"
          >
            Ecosystem Map
          </a>
        </div>

        <section className="stakeholder-journey__method" aria-labelledby="journey-method-heading">
          <div>
            <span className="stakeholder-journey__kicker">Reusable process evidence</span>
            <h2 id="journey-method-heading">What would you measure in a real community?</h2>
          </div>
          <p>
            Track whether people obtain a useful result, return to the tool, receive a personal
            invitation, and make a first contribution. Compare like cohorts over a declared period.
            Here, the counterforce is an explicit assumption about participation effort, and
            invitation adds support at that barrier. Physics makes that hypothesis inspectable. It
            does not supply evidence that an intervention works in the world. Geometry stays fixed
            during this comparison; feedback from new stewards is a separate experiment.
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
  onProgress,
  displayWidth,
}) {
  const clock = usePhysicsStoryClock(`${system.id}:${runId}`, onProgress)
  const scale = Math.min(1, displayWidth / MODEL_WIDTH)
  const config = useMemo(
    () => ({
      kernel: {
        seed: COHORT_SEED,
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
      settleStepLimit: 1200,
      observation: {
        chartId: `stakeholder-journey-${system.id}`,
        chartType: "StreamPhysicsFrame",
      },
    }),
    [model.colliders, system.id],
  )
  const rowMap = useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row])), [rows])
  const impact = rowFor(rows, "impact")
  const habit = rowFor(rows, "habit")
  const commitment = rowFor(rows, "commitment")
  const leadership = rowFor(rows, "leadership")
  const retention = impact.reached > 0 ? commitment.reached / impact.reached : 0
  const selectedStage = STAGES.find((stage) => stage.id === selectedStageId) ?? STAGES[0]

  return (
    <article
      className={`stakeholder-journey__system is-${system.id}`}
      style={{ "--journey-system": system.accent }}
    >
      <header className="stakeholder-journey__system-header">
        <div>
          <span>{system.verdict}</span>
          <h3>{system.title}</h3>
        </div>
        <p>{system.description}</p>
      </header>

      <PhysicsStoryClock elapsed={clock.elapsed} />
      <div
        className="stakeholder-journey__chart-stage"
        style={{ width: MODEL_WIDTH * scale, height: BOWTIE_HEIGHT * scale, minHeight: 0 }}
      >
        <div
          className="physics-story__model"
          style={{ width: MODEL_WIDTH, height: BOWTIE_HEIGHT, transform: `scale(${scale})` }}
        >
          <StreamPhysicsFrame
            key={`${system.id}-${runId}`}
            title={`${system.short}: stakeholder journey`}
            summary={`${system.short}. ${impact.reached} of ${COHORT_SIZE} participants have reached First Impact; ${commitment.reached} have crossed into Commitment and ${leadership.reached} have reached Ecosystem Leadership. Counts cover the first 20 model seconds.`}
            description="Each ball is one participant. The narrow First Impact passage represents achieving a useful result. An opposing force at Habit represents participation effort; the relay condition adds invitation. All other geometry and forces stay fixed."
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
            onTick={clock.onTick}
            continuous
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
                fill: leader ? "#f6c945" : committed ? "#ffe08a" : charged ? "#43d6f1" : "#dbe4ea",
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
      </div>

      <div className="stakeholder-journey__metrics" aria-label={`${system.short} journey metrics`}>
        <Metric
          label="First Impact"
          value={impact.reached}
          detail={`${percent(impact.conversion)} of the same cohort`}
        />
        <Metric label="Habit" value={habit.reached} detail="unique people who reached it" />
        <Metric
          label="Commitment"
          value={commitment.reached}
          detail={`${percent(retention)} of impact`}
          emphasize
        />
        <Metric
          label="Leadership"
          value={leadership.reached}
          detail="first crossings, counted once"
        />
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
        <span>
          {selectedStage.voice} {rowFor(rows, selectedStageId).reached} of {COHORT_SIZE}{" "}
          participants reached this stage. Repeat visits do not increase this count.
        </span>
      </div>

      <details className="physics-story__technical">
        <summary>Inspect the initial barriers</summary>
        <div className="stakeholder-journey__membrane-ledger">
          {MEMBRANES.map((membrane) => (
            <div key={membrane.id}>
              <span style={{ "--membrane-color": membrane.color }}>{membrane.compact}</span>
              <strong>{membrane.label}</strong>
              <b>{regionCounts[membrane.id]?.count ?? 0} crossing events</b>
              <small>cost {Math.round(membrane.cost * 100)}</small>
            </div>
          ))}
        </div>
      </details>
    </article>
  )
}

function JourneyComparison({ rowsBySystem, activeSystemId, observedSeconds }) {
  const comparisonStages = ["activation", "impact", "habit", "commitment", "leadership"]
  return (
    <div className="stakeholder-journey__ledger" aria-label="Scenario comparison ledger">
      <div className="stakeholder-journey__ledger-heading">
        <div>
          <span className="stakeholder-journey__kicker">Saved scenario evidence</span>
          <h3>Unique participants reaching each stage</h3>
        </div>
        <span>Run both for the same 20 model seconds. Unrun conditions have no result yet.</span>
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
            <b className={activeSystemId === "relay" ? "is-live" : ""}>
              {observedSeconds.relay > 0 ? `${relay.reached} / ${relay.total}` : "Not run"}
            </b>
            <b className={activeSystemId === "passive" ? "is-live" : ""}>
              {observedSeconds.passive > 0 ? `${passive.reached} / ${passive.total}` : "Not run"}
            </b>
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
    <svg
      className="stakeholder-journey__overlay"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
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
            <path
              d={membranePath(layout, membrane)}
              fill={membrane.color}
              opacity={0.13 + membrane.cost * 0.22}
            />
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
          <g
            key={stage.id}
            className={`stakeholder-journey__stage-label ${highlighted ? "is-highlighted" : ""}`}
          >
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
        <path
          d={`M ${habit.x} ${layout.midY - 54} C ${commitment.x} ${layout.midY - 108}, ${leadership.x} ${layout.midY - 84}, ${layout.right - 14} ${layout.midY - 38}`}
        />
        <path
          d={`M ${habit.x} ${layout.midY + 54} C ${commitment.x} ${layout.midY + 108}, ${leadership.x} ${layout.midY + 84}, ${layout.right - 14} ${layout.midY + 38}`}
        />
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
