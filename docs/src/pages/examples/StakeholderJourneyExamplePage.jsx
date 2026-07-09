import React, { useCallback, useMemo, useState } from "react"
import {
  StreamPhysicsFrame,
  chargeGateRegion,
  forceFieldRegion,
  processStageLayout,
  stageTargetInVolume,
} from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./StakeholderJourneyExamplePage.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 720
const BOWTIE_HEIGHT = 430
const CANVAS_HEIGHT = 560
const TOKEN_RADIUS = 6.5

const STAGES = [
  { id: "discovery", label: "DISCOVERY", voice: "I find it and it looks relevant." },
  { id: "acquisition", label: "ACQUISITION", voice: "I reach the project and try it." },
  { id: "activation", label: "ACTIVATION", voice: "The first wall clears." },
  { id: "impact", label: "FIRST IMPACT", voice: "It did the thing I came for." },
  { id: "habit", label: "HABIT", voice: "It becomes a default." },
  { id: "commitment", label: "COMMITMENT", voice: "I help tend the project." },
  { id: "leadership", label: "ECOSYSTEM LEADERSHIP", voice: "I help steward the system." },
]

const DESTINATION_LABELS = {
  activation: "Activation",
  impact: "First Impact",
  habit: "Habit",
  commitment: "Commitment",
  leadership: "Ecosystem Leadership",
}

const DESTINATION_PALETTE = {
  activation: { fill: "#dfe7ee", stroke: "#647789" },
  impact: { fill: "#0c7894", stroke: "#044d61" },
  habit: { fill: "#94d7cd", stroke: "#286c6c" },
  commitment: { fill: "#f1c75b", stroke: "#8d6420" },
  leadership: { fill: "#263653", stroke: "#111827" },
}

const SYSTEMS = [
  {
    id: "works",
    title: "Why the ecosystem relay works",
    subtitle: "First Impact charges people, and the right side has enough trust and invitation to retain that charge.",
    verdict: "Works: designed community physics",
    seed: 208,
    pace: 2.5,
    pull: 0.025,
    fieldThreshold: 18,
    canvasCoherence: 0.86,
    membraneNote:
      "The left side still has resistance, but the membranes are legible: search/recommendation, value fit, and activation each has a named passage and a known cost.",
    rightNote:
      "The charged particles do not just drift. They enter a field of community members, governance, impact, and near-peer invitation, so Habit can become Commitment.",
    membranes: [
      { id: "findability", label: "findability", offset: 0.2, cost: 0.24, wobble: -10, color: "#b63832" },
      { id: "value-fit", label: "value fit", offset: 0.36, cost: 0.32, wobble: 9, color: "#1f63a8" },
      { id: "activation-work", label: "activation work", offset: 0.52, cost: 0.38, wobble: -4, color: "#b63832" },
    ],
    distribution: { activation: 3, impact: 7, habit: 14, commitment: 24, leadership: 8 },
    factors: [
      "Canvas discipline separates contributor value from user value instead of flattening everyone into one generic user.",
      "The ecosystem map names arrows, not just nodes: learning, trust, reputation, governance, funding, and belonging are visible flows.",
      "The right side contains near-peer pull, so a repeat user can see a reachable next role before charge dissipates.",
    ],
  },
  {
    id: "fails",
    title: "Why the passive funnel fails",
    subtitle: "People may reach First Impact, but charge dissipates because the ecosystem field was never designed.",
    verdict: "Fails: accidental product funnel",
    seed: 77,
    pace: 2.1,
    pull: 0.01,
    fieldThreshold: 18,
    canvasCoherence: 0.38,
    membraneNote:
      "The left membranes are treated like a single funnel problem. AI-mediated discovery, mixed value propositions, and activation work are not named as separate regions.",
    rightNote:
      "The right side is thin. Users can develop Habit, but without visible community roles, trust, and governance, the charge leaks before Commitment.",
    membranes: [
      { id: "ai-gate", label: "AI gate", offset: 0.2, cost: 0.64, wobble: 18, color: "#7b8491" },
      { id: "mixed-value", label: "mixed value", offset: 0.36, cost: 0.72, wobble: -16, color: "#7b8491" },
      { id: "activation-work", label: "activation work", offset: 0.52, cost: 0.8, wobble: 10, color: "#b63832" },
    ],
    distribution: { activation: 8, impact: 18, habit: 24, commitment: 5, leadership: 1 },
    factors: [
      "The canvas hides a mismatch: contributors and users may be different communities with different reasons to show up.",
      "Saboteurs and gatekeepers remain fuzzy, so substitutes, AI mediation, and trust leaks are not part of the map.",
      "Habit stays consumption. The project sees usage, but the community does not see the next generation forming.",
    ],
  },
]

const CANVAS_CELLS = [
  { id: "funding", label: "FUNDING SOURCES", group: "viability", col: 0, row: 0, tokens: 6 },
  { id: "revenue", label: "REVENUE STREAMS", group: "viability", col: 0, row: 1, tokens: 4 },
  { id: "inkind", label: "IN-KIND SUPPORT", group: "viability", col: 0, row: 2, tokens: 7 },
  { id: "operations", label: "OPERATIONS, ACTIVITIES", group: "feasibility", col: 1, row: 0, tokens: 8 },
  { id: "governance", label: "GOVERNANCE", group: "feasibility", col: 1, row: 1, tokens: 5 },
  { id: "costs", label: "COSTS", group: "feasibility", col: 1, row: 2, tokens: 5 },
  { id: "channels", label: "CHANNELS", group: "feasibility", col: 2, row: 0, spanRows: 2, tokens: 7 },
  { id: "gtm", label: "GO TO MARKET", group: "feasibility", col: 2, row: 2, tokens: 6 },
  { id: "value", label: "VALUE PROPOSITIONS", group: "desirability", col: 3, row: 0, spanRows: 2, tokens: 9 },
  { id: "members", label: "COMMUNITY MEMBERS", group: "desirability", col: 4, row: 0, spanRows: 2, tokens: 10 },
  { id: "impact", label: "IMPACT", group: "desirability", col: 3, row: 2, spanCols: 2, tokens: 8 },
]

const GROUP_COLORS = {
  viability: "#287a48",
  feasibility: "#b63832",
  desirability: "#1f63a8",
}

const RESEARCH_LINKS = [
  {
    name: "Unity Area Effector 2D",
    href: "https://docs.unity3d.com/Manual/class-AreaEffector2D.html",
    lesson: "regions can apply force, drag, and variation when bodies overlap a trigger collider",
  },
  {
    name: "Unity Buoyancy Effector 2D",
    href: "https://docs.unity3d.com/Manual/2d-physics/effectors/buoyancy-effector-2d-reference.html",
    lesson: "fluid zones combine surface level, density, damping, flow direction, and flow magnitude",
  },
  {
    name: "Godot Area2D",
    href: "https://docs.godotengine.org/en/stable/classes/class_area2d.html",
    lesson: "areas override gravity and damping and emit body-entered/body-exited signals",
  },
  {
    name: "Box2D sensors",
    href: "https://box2d.org/documentation/md_simulation.html#autotoc_md148",
    lesson: "sensors detect overlap without collision response, which is what an information membrane needs",
  },
]

function makeEmptyCrossings() {
  return Object.fromEntries(
    SYSTEMS.map((system) => [
      system.id,
      {
        membrane: Object.fromEntries(system.membranes.map((membrane) => [membrane.id, new Set()])),
        charged: new Set(),
        commitment: new Set(),
        leadership: new Set(),
      },
    ]),
  )
}

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

function shuffle(values, random) {
  const copy = values.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }
  return copy
}

function expandDestinations(distribution) {
  return Object.entries(distribution).flatMap(([destination, count]) =>
    Array.from({ length: count }, () => destination),
  )
}

const DESTINATION_ALONG = {
  activation: 0.62,
  impact: 0.5,
  habit: 0.52,
  commitment: 0.56,
  leadership: 0.56,
}

/**
 * Build the bowtie volume + process regionEffects from the shared process
 * recipe kit (`processStageLayout`, charge/force region factories).
 */
function buildBowtieLayout(width, system) {
  const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))
  const voiceById = Object.fromEntries(STAGES.map((stage) => [stage.id, stage.voice]))
  const layout = processStageLayout({
    width: w,
    height: BOWTIE_HEIGHT,
    shape: "bowtie",
    padX: 46,
    padY: 72,
    stages: STAGES.map(({ id, label }) => ({ id, label })),
    membranes: system.membranes.map((membrane) => ({
      ...membrane,
      metadata: { role: "membrane", systemId: system.id, membraneId: membrane.id },
      bodyStyle: { strokeWidth: system.id === "works" ? 1.4 : 1.8 },
    })),
    idPrefix: system.id,
    membraneDampingScale: system.id === "works" ? 0.36 : 0.72,
    centerStageIndex: 3,
    pinchRatio: 0.176,
  })

  // Preserve stage voice copy for overlay titles.
  layout.stages = layout.stages.map((stage) => ({
    ...stage,
    voice: voiceById[stage.id],
  }))
  // Alias used by overlay chrome (padX was the old field name).
  layout.padX = layout.left
  layout.leftWidth = layout.centerLeft - layout.left
  layout.rightWidth = layout.right - layout.centerRight

  return layout
}

function boundaryY(layout, x, side) {
  return layout.boundaryY(x, side)
}

function stageTarget(layout, destination, random) {
  return stageTargetInVolume(layout, destination === "activation" ? "activation" : destination, {
    random,
    along: DESTINATION_ALONG[destination] ?? 0.5,
    jitterX: destination === "impact" ? 8 : 24,
    padY: 20,
  })
}

function buildBowtieRegionEffects(layout, system) {
  const impactX = (layout.centerLeft + layout.centerRight) / 2
  const commitment = layout.stages[5]
  const leadership = layout.stages[6]
  const systemMetadata = (role, extra = {}) => ({ role, systemId: system.id, ...extra })
  const works = system.id === "works"

  // Membrane regionEffects come from processStageLayout; stamp metadata for
  // the example's region-enter bookkeeping.
  const membranes = layout.regionEffects.map((region) => ({
    ...region,
    metadata: region.metadata ?? systemMetadata("membrane", { membraneId: region.id }),
    attributes: {
      ...(region.attributes ?? {}),
      membrane: region.id,
    },
  }))

  return [
    ...membranes,
    chargeGateRegion({
      id: "first-impact",
      label: "First Impact charge gate",
      description:
        "First Impact marks a body as charged: it has achieved a goal, not merely completed installation.",
      x: impactX,
      y: layout.midY,
      width: layout.centerRight - layout.centerLeft + 36,
      height: layout.pinchBottom - layout.pinchTop + 56,
      charge: works ? 2 : 1,
      energyDelta: works ? 1.2 : 0.55,
      impulseOnEnter: { x: works ? 10 : 2, y: 0 },
      metadata: systemMetadata("impact"),
      bodyStyle: { fill: "#43d6f1", stroke: "#087895" },
    }),
    forceFieldRegion({
      id: "commitment-field",
      label: "Commitment field",
      description:
        "A right-side relationship field where trust, recognition, and near-peer invitation retain charge.",
      x: commitment.x,
      y: layout.midY,
      width: commitment.width,
      height: 250,
      force: { x: works ? 18 : -5, y: works ? -2 : 0 },
      damping: works ? 0.05 : 0.32,
      attributes: { field: "commitment" },
      metadata: systemMetadata("commitment"),
      bodyStyle: { fill: works ? "#ffe08a" : "#cfd7df" },
    }),
    forceFieldRegion({
      id: "leadership-field",
      label: "Ecosystem Leadership field",
      description:
        "A high-trust field where people can help steward the ecosystem rather than only consume the project.",
      x: leadership.x,
      y: layout.midY,
      width: leadership.width,
      height: 260,
      force: { x: works ? 22 : -8, y: works ? 2 : 0 },
      damping: works ? 0.04 : 0.36,
      attributes: { field: "leadership" },
      metadata: systemMetadata("leadership"),
      bodyStyle: { fill: works ? "#ffe08a" : "#cfd7df" },
    }),
  ]
}

function roleFor(destination, index) {
  if (destination === "leadership") return index % 2 === 0 ? "steward" : "core contributor"
  if (destination === "commitment") return index % 2 === 0 ? "new contributor" : "near-peer guide"
  if (destination === "habit") return "repeat user"
  if (destination === "impact") return "successful user"
  return "blocked newcomer"
}

function springStiffness(system, destination) {
  const base = {
    activation: 0.011,
    impact: 0.015,
    habit: 0.018,
    commitment: 0.022,
    leadership: 0.025,
  }[destination]
  return base + system.pull
}

function buildBowtieSpawns(layout, system, runId) {
  const random = mulberry32(system.seed + runId * 997)
  const destinations = shuffle(expandDestinations(system.distribution), random)
  const startTop = boundaryY(layout, layout.padX + 24, "top") + 22
  const startBottom = boundaryY(layout, layout.padX + 24, "bottom") - 22

  return destinations.map((destination, index) => {
    const target = stageTarget(layout, destination, random)
    const chargedDestination = destination === "commitment" || destination === "leadership"
    const id = `${system.id}-${runId}-${index}`
    return {
      id,
      x: layout.padX + randomBetween(random, 12, 30),
      y: randomBetween(random, startTop, startBottom),
      vx: randomBetween(random, 54, system.id === "works" ? 132 : 106),
      vy: randomBetween(random, -30, 30),
      mass: chargedDestination ? 1.18 : 1,
      restitution: 0.2,
      friction: 0.5,
      shape: {
        type: "circle",
        radius: destination === "leadership" ? TOKEN_RADIUS + 1.6 : chargedDestination ? TOKEN_RADIUS + 0.8 : TOKEN_RADIUS,
      },
      datum: {
        id,
        role: roleFor(destination, index),
        destination,
        destinationLabel: DESTINATION_LABELS[destination],
        target,
        systemId: system.id,
      },
      spawnAt: index * 0.1,
      springs: [
        {
          target: { type: "point", x: target.x, y: target.y },
          restLength: chargedDestination ? 3 : 13,
          stiffness: springStiffness(system, destination),
          damping: chargedDestination ? 0.74 : 0.87,
        },
      ],
    }
  })
}

function buildBowtieModel(width, system, runId) {
  const layout = buildBowtieLayout(width, system)
  return {
    layout,
    colliders: layout.colliders,
    regionEffects: buildBowtieRegionEffects(layout, system),
    spawns: buildBowtieSpawns(layout, system, runId),
  }
}

function updateCrossings(previous, event) {
  if (event.type !== "region-enter") return previous

  const systemId = event.region.metadata?.systemId
  const role = event.region.metadata?.role
  const system = SYSTEMS.find((candidate) => candidate.id === systemId)
  if (!system || !role) return previous
  const current = previous[system.id]
  if (!current) return previous

  if (role === "membrane") {
    const membraneId = event.region.metadata?.membraneId
    if (!membraneId || current.membrane[membraneId].has(event.bodyId)) return previous
    return {
      ...previous,
      [system.id]: {
        ...current,
        membrane: {
          ...current.membrane,
          [membraneId]: new Set(current.membrane[membraneId]).add(event.bodyId),
        },
      },
    }
  }

  const key = role === "impact" ? "charged" : role === "commitment" ? "commitment" : role === "leadership" ? "leadership" : null
  if (!key || current[key].has(event.bodyId)) return previous

  return {
    ...previous,
    [system.id]: {
      ...current,
      [key]: new Set(current[key]).add(event.bodyId),
    },
  }
}

function stewardshipCount(crossings) {
  return crossings.commitment.size + crossings.leadership.size
}

export default function StakeholderJourneyExamplePage() {
  const [width, hostRef] = useResponsiveWidth(MIN_WIDTH, MAX_WIDTH)
  const [runId, setRunId] = useState(0)
  const [selected, setSelected] = useState(null)
  const [crossings, setCrossings] = useState(makeEmptyCrossings)

  const models = useMemo(
    () => Object.fromEntries(SYSTEMS.map((system) => [system.id, buildBowtieModel(width, system, runId)])),
    [runId, width],
  )
  const canvasModel = useMemo(() => buildCanvasModel(width, runId), [runId, width])

  const handleRegionEvent = useCallback((event) => {
    setCrossings((previous) => updateCrossings(previous, event))
  }, [])

  const resetRun = useCallback(() => {
    setSelected(null)
    setCrossings(makeEmptyCrossings())
    setRunId((current) => current + 1)
  }, [])

  return (
    <ExamplePageLayout title="The Stakeholder Journey">
      <div className="stakeholder-journey" ref={hostRef}>
        <section className="stakeholder-journey__hero">
          <div>
            <span className="stakeholder-journey__kicker">StreamPhysicsFrame as an ecosystem argument</span>
            <p className="stakeholder-journey__lede">
              The original bowtie returns here: Discovery, Acquisition, Activation, First Impact,
              Habit, Commitment, and Ecosystem Leadership. The physics layer now separates two
              media. The left side is a set of permeable membranes that cost energy to cross. First
              Impact charges a particle. The right side either retains that charge through trust,
              governance, belonging, and invitation, or lets it dissipate into passive use.
            </p>
          </div>
          <div className="stakeholder-journey__source-card">
            <strong>Integrated source pieces</strong>
            <a href="https://blog.stdlib.io/the-stakeholder-journey/" target="_blank" rel="noreferrer">Stakeholder Journey</a>
            <a href="https://blog.stdlib.io/open-source-ecosystem-canvas/" target="_blank" rel="noreferrer">Open-Source Ecosystem Canvas</a>
            <a href="https://blog.stdlib.io/mapping-your-ecosystem-and-its-saboteurs/" target="_blank" rel="noreferrer">Ecosystem Map and Saboteurs</a>
          </div>
        </section>

        <section className="stakeholder-journey__comparison" aria-labelledby="journey-comparison-heading">
          <div className="stakeholder-journey__comparison-header">
            <div>
              <span className="stakeholder-journey__kicker">Stacked comparison</span>
              <h2 id="journey-comparison-heading">Same bowtie, different physics</h2>
            </div>
            <button type="button" onClick={resetRun}>Replay systems</button>
          </div>

          <div className="stakeholder-journey__bowtie-stack">
            {SYSTEMS.map((system) => (
              <JourneyBowtie
                key={system.id}
                system={system}
                model={models[system.id]}
                runId={runId}
                crossings={crossings[system.id]}
                selected={selected}
                setSelected={setSelected}
                onRegionEvent={handleRegionEvent}
              />
            ))}
          </div>
        </section>

        <section className="stakeholder-journey__canvas-section" aria-labelledby="ose-canvas-heading">
          <div className="stakeholder-journey__section-header">
            <span className="stakeholder-journey__kicker">Separate physics-ized OSE Canvas</span>
            <h2 id="ose-canvas-heading">The sustainability field beneath the journey</h2>
            <p>
              The canvas is not another static checklist. These cells are hypotheses with force:
              viability keeps the project supplied, feasibility keeps work governable, and desirability
              keeps value attached to real community members and impact.
            </p>
          </div>
          <OSECanvasPhysics model={canvasModel} runId={runId} />
        </section>

        <section className="stakeholder-journey__synthesis">
          <div>
            <span className="stakeholder-journey__kicker">Physics model reasoning</span>
            <h2>Membranes should be regions, not walls.</h2>
          </div>
          <p>
            Game engines generally do not model this as a line with a small hole. They model it as an
            area: a region can apply force, drag, gravity override, flow, damping, or simply emit an
            overlap event. That is the right metaphor for stakeholder journeys because discovery and
            activation do not block absolutely; they tax energy, change velocity, and alter state.
          </p>
          <p>
            This page builds the bowtie from the process recipe kit:{" "}
            <code>processStageLayout</code> supplies stage bands, walls, and membrane regions;
            <code> chargeGateRegion</code> and <code>forceFieldRegion</code> add First Impact and the
            right-side retention fields. The domain code is the journey stages, membrane costs, and
            destination mix — not hand-written collider algebra.
          </p>
        </section>

        <section className="stakeholder-journey__needs">
          <div className="stakeholder-journey__section-header">
            <span className="stakeholder-journey__kicker">Process authoring kit</span>
            <h2>Reusable primitives behind this example</h2>
          </div>
          <div className="stakeholder-journey__research-grid">
            {RESEARCH_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="stakeholder-journey__research-card">
                <strong>{link.name}</strong>
                <span>{link.lesson}</span>
              </a>
            ))}
          </div>
          <div className="stakeholder-journey__needs-grid">
            <FeatureNeed title="processStageLayout" body="Stage bands + lane/bowtie/funnel walls + membrane placement from declarative stage and membrane defs." />
            <FeatureNeed title="chargeGateRegion / forceFieldRegion" body="Typed region factories for First Impact charge and right-side retention fields." />
            <FeatureNeed title="regionEffects" body="Frame-level sensors, damping, charge, body-style patches, and onRegionEvent bookkeeping." />
            <FeatureNeed title="ProcessFlowChart (next)" body="Multi-body capacitated workflows (merge pressure) will use the same kit plus capacity/portal controllers." />
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function JourneyBowtie({ system, model, runId, crossings, selected, setSelected, onRegionEvent }) {
  const active = stewardshipCount(crossings) >= system.fieldThreshold * system.canvasCoherence
  const selectedActive = selected?.systemId === system.id

  const config = useMemo(
    () => ({
      kernel: {
        seed: system.seed + runId,
        gravity: { x: system.id === "works" ? 18 : 7, y: 0 },
        restitution: 0.2,
        friction: 0.58,
        velocityDamping: system.id === "works" ? 0.993 : 0.988,
        collisionIterations: 3,
        maxVelocity: 340,
        sleepSpeed: 7,
        sleepAfter: 0.95,
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
    [model.colliders, runId, system.id, system.seed],
  )

  const selection = useMemo(
    () =>
      selectedActive
        ? { isActive: true, predicate: (body) => body.id === selected.bodyId }
        : null,
    [selected, selectedActive],
  )

  const selectedDatum = useMemo(() => {
    if (!selectedActive) return null
    return model.spawns.find((spawn) => spawn.id === selected.bodyId)?.datum ?? null
  }, [model.spawns, selected, selectedActive])

  return (
    <article className={`stakeholder-journey__bowtie stakeholder-journey__bowtie--${system.id}`}>
      <header>
        <span>{system.verdict}</span>
        <h3>{system.title}</h3>
        <p>{system.subtitle}</p>
      </header>

      <div className="stakeholder-journey__chart-stage" style={{ width: model.layout.width }}>
        <StreamPhysicsFrame
          key={`${system.id}-${runId}-${model.layout.width}`}
          title={`${system.title} physics model`}
          summary={`${system.title}: ${model.spawns.length} bodies move through seven journey stages. First Impact charges particles; Commitment and Ecosystem Leadership measure retained charge.`}
          description="Stakeholder particles pass through permeable membranes on the left, become charged at First Impact, and either retain or lose charge across Habit, Commitment, and Ecosystem Leadership."
          size={[model.layout.width, BOWTIE_HEIGHT]}
          config={config}
          initialSpawns={model.spawns}
          initialSpawnPacing={{ pacing: "arrival", timeAccessor: "spawnAt", timeScale: system.pace }}
          regionEffects={model.regionEffects}
          onRegionEvent={onRegionEvent}
          accessibleTable
          enableHover
          hoverRadius={18}
          selection={selection}
          selectedBodyStyle={{ stroke: "#ffffff", strokeWidth: 3, opacity: 1 }}
          bodyStyle={(body, context) => {
            const datum = body.datum ?? {}
            const palette = DESTINATION_PALETTE[datum.destination] ?? DESTINATION_PALETTE.habit
            const charged = crossings.charged.has(body.id) || context.regionState?.charges["first-impact"]
            const retained = crossings.commitment.has(body.id) || crossings.leadership.has(body.id)
            const dim = selectedActive && selected.bodyId !== body.id
            return {
              fill: retained ? "#ffe08a" : charged ? "#43d6f1" : palette.fill,
              stroke: retained ? "#9b6a12" : charged ? "#087895" : palette.stroke,
              strokeWidth: retained ? 2.2 : 1.2,
              opacity: dim ? 0.28 : 0.93,
            }
          }}
          onBodyPointerDown={(body) => setSelected(body ? { systemId: system.id, bodyId: body.id } : null)}
          tooltipContent={(hover) => {
            const datum = hover.datum ?? {}
            return (
              <div className="semiotic-tooltip stakeholder-journey__tooltip">
                <strong>{datum.role ?? hover.id}</strong>
                <div>{datum.destinationLabel ?? "Stakeholder token"}</div>
                <div>{crossings.charged.has(hover.id) ? "charged by First Impact" : "not yet charged"}</div>
              </div>
            )
          }}
        />
        <BowtieOverlay system={system} layout={model.layout} crossings={crossings} active={active} />
      </div>

      <div className="stakeholder-journey__bowtie-bottom">
        <div className="stakeholder-journey__metrics">
          <Metric label="charged" value={crossings.charged.size} detail="entered First Impact" />
          <Metric label="retained" value={stewardshipCount(crossings)} detail="commitment + leadership" />
          <Metric label="field" value={active ? "on" : "off"} detail="right-side activation" />
        </div>
        <div className="stakeholder-journey__readout">
          {selectedDatum ? (
            <>
              <strong>{selectedDatum.role}</strong>
              <span>{selectedDatum.destinationLabel}</span>
            </>
          ) : (
            <>
              <strong>{active ? "Positive effects are compounding" : "Charge is dissipating"}</strong>
              <span>{active ? system.rightNote : system.membraneNote}</span>
            </>
          )}
        </div>
      </div>

      <div className="stakeholder-journey__factor-list">
        {system.factors.map((factor) => <div key={factor}>{factor}</div>)}
      </div>
    </article>
  )
}

function BowtieOverlay({ system, layout, crossings, active }) {
  const leftPoints = [[layout.padX, layout.topY], [layout.centerLeft, layout.pinchTop], [layout.centerLeft, layout.pinchBottom], [layout.padX, layout.bottomY]]
  const centerPoints = [[layout.centerLeft, layout.pinchTop], [layout.centerRight, layout.pinchTop], [layout.centerRight, layout.pinchBottom], [layout.centerLeft, layout.pinchBottom]]
  const rightPoints = [[layout.centerRight, layout.pinchTop], [layout.right, layout.topY], [layout.right, layout.bottomY], [layout.centerRight, layout.pinchBottom]]
  const glowId = `stakeholder-right-glow-${system.id}`
  const membraneId = `stakeholder-membrane-${system.id}`
  const commitmentStage = layout.stages[5]
  const leadershipStage = layout.stages[6]

  return (
    <svg className="stakeholder-journey__overlay" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      <defs>
        <linearGradient id={glowId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#e7f7fa" stopOpacity="0.14" />
          <stop offset="100%" stopColor={active ? "#ffe08a" : "#d8dee6"} stopOpacity={active ? "0.54" : "0.24"} />
        </linearGradient>
        <pattern id={membraneId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" strokeWidth="2" opacity="0.42" />
        </pattern>
      </defs>

      <polygon className="stakeholder-journey__funnel stakeholder-journey__funnel--left" points={points(leftPoints)} />
      <polygon className="stakeholder-journey__funnel stakeholder-journey__funnel--center" points={points(centerPoints)} />
      <polygon className="stakeholder-journey__funnel stakeholder-journey__funnel--right" points={points(rightPoints)} fill={`url(#${glowId})`} />

      {layout.stages.slice(1).map((stage) => {
        const x = stage.x0
        return <line key={stage.id} className="stakeholder-journey__stage-rule" x1={x} x2={x} y1={boundaryY(layout, x, "top") + 8} y2={boundaryY(layout, x, "bottom") - 8} />
      })}

      {layout.membranes.map((membrane) => (
        <g key={membrane.id} className="stakeholder-journey__membrane-region">
          <path d={membranePath(layout, membrane)} fill={membrane.color} opacity={0.14 + membrane.cost * 0.24} />
          <path d={membranePath(layout, membrane)} fill={`url(#${membraneId})`} opacity="0.82" />
          <path d={membraneCenterline(layout, membrane)} stroke={membrane.color} />
          <text x={membrane.x} y={layout.topY - 14} textAnchor="middle">{membrane.label}</text>
          <text x={membrane.x} y={layout.bottomY + 24} textAnchor="middle">
            {crossings.membrane[membrane.id].size} pass / cost {Math.round(membrane.cost * 100)}
          </text>
        </g>
      ))}

      {layout.stages.map((stage) => {
        const x = (stage.x0 + stage.x1) / 2
        const isCenter = stage.id === "impact"
        const lines = stage.label.split(" ")
        return (
          <g key={stage.id} className={`stakeholder-journey__stage-label ${isCenter ? "is-center" : ""}`}>
            {lines.map((line, index) => (
              <text key={`${stage.id}-${line}-${index}`} x={x} y={layout.midY - (lines.length - 1) * 8 + index * 17} textAnchor="middle">
                {line}
              </text>
            ))}
            <title>{stage.voice}</title>
          </g>
        )
      })}

      <g className="stakeholder-journey__impact-gate">
        <rect x={layout.centerLeft + 4} y={layout.pinchTop + 4} width={layout.centerRight - layout.centerLeft - 8} height={layout.pinchBottom - layout.pinchTop - 8} rx="7" />
        <text x={(layout.centerLeft + layout.centerRight) / 2} y={layout.pinchTop - 14} textAnchor="middle">
          CHARGE GATE: {crossings.charged.size}
        </text>
      </g>

      <g className={`stakeholder-journey__right-field ${active ? "is-active" : ""}`}>
        <path d={`M ${layout.centerRight + 24} ${layout.midY - 60} C ${commitmentStage.x0 + 10} ${layout.midY - 126}, ${commitmentStage.x1} ${layout.midY - 106}, ${leadershipStage.x1 - 22} ${layout.midY - 48}`} />
        <path d={`M ${layout.centerRight + 24} ${layout.midY + 60} C ${commitmentStage.x0 + 10} ${layout.midY + 126}, ${commitmentStage.x1} ${layout.midY + 112}, ${leadershipStage.x1 - 22} ${layout.midY + 50}`} />
        <circle cx={(commitmentStage.x0 + commitmentStage.x1) / 2} cy={layout.midY - 72} r={active ? 10 : 6} />
        <circle cx={(leadershipStage.x0 + leadershipStage.x1) / 2} cy={layout.midY + 72} r={active ? 11 : 6} />
        <text x={layout.right - 10} y={layout.topY - 14} textAnchor="end">
          retained charge: {stewardshipCount(crossings)}
        </text>
      </g>
    </svg>
  )
}

function membranePath(layout, membrane) {
  const top = layout.topY + 12
  const bottom = layout.bottomY - 12
  const half = membrane.width / 2
  const wobble = membrane.wobble
  return `M ${membrane.x - half} ${top} C ${membrane.x - half + wobble} ${top + 72}, ${membrane.x - half - wobble} ${bottom - 72}, ${membrane.x - half} ${bottom} L ${membrane.x + half} ${bottom} C ${membrane.x + half - wobble} ${bottom - 72}, ${membrane.x + half + wobble} ${top + 72}, ${membrane.x + half} ${top} Z`
}

function membraneCenterline(layout, membrane) {
  const top = layout.topY + 12
  const bottom = layout.bottomY - 12
  const wobble = membrane.wobble
  return `M ${membrane.x} ${top} C ${membrane.x + wobble} ${top + 72}, ${membrane.x - wobble} ${bottom - 72}, ${membrane.x} ${bottom}`
}

function buildCanvasModel(width, runId) {
  const layout = buildCanvasLayout(width)
  const random = mulberry32(520 + runId * 401)
  const spawns = []

  CANVAS_CELLS.forEach((cell) => {
    const rect = layout.cells[cell.id]
    for (let index = 0; index < cell.tokens; index += 1) {
      const target = {
        x: randomBetween(random, rect.x + 34, rect.x + rect.width - 34),
        y: randomBetween(random, rect.y + 48, rect.y + rect.height - 28),
      }
      spawns.push({
        id: `canvas-${cell.id}-${index}`,
        x: layout.width / 2 + randomBetween(random, -80, 80),
        y: 26 + randomBetween(random, -8, 14),
        vx: randomBetween(random, -20, 20),
        vy: randomBetween(random, 20, 80),
        mass: cell.group === "desirability" ? 1.15 : 1,
        shape: { type: "circle", radius: cell.group === "desirability" ? 6.5 : 5.6 },
        datum: {
          cell: cell.label,
          group: cell.group,
          target,
        },
        spawnAt: spawns.length * 0.045,
        springs: [{ target: { type: "point", ...target }, stiffness: 0.032, damping: 0.8, restLength: 3 }],
      })
    }
  })

  const colliders = [
    { id: "canvas-floor", shape: { type: "segment", x1: 20, y1: CANVAS_HEIGHT - 18, x2: layout.width - 20, y2: CANVAS_HEIGHT - 18, thickness: 10 } },
    { id: "canvas-left-wall", shape: { type: "segment", x1: 20, y1: 44, x2: 20, y2: CANVAS_HEIGHT - 18, thickness: 8 } },
    { id: "canvas-right-wall", shape: { type: "segment", x1: layout.width - 20, y1: 44, x2: layout.width - 20, y2: CANVAS_HEIGHT - 18, thickness: 8 } },
  ]

  return { layout, spawns, colliders }
}

function buildCanvasLayout(width) {
  const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))
  const margin = 20
  const top = 58
  const gap = 9
  const colWidth = (w - margin * 2 - gap * 4) / 5
  const rowHeight = 146
  const cells = {}

  CANVAS_CELLS.forEach((cell) => {
    const spanCols = cell.spanCols ?? 1
    const spanRows = cell.spanRows ?? 1
    cells[cell.id] = {
      x: margin + cell.col * (colWidth + gap),
      y: top + cell.row * (rowHeight + gap),
      width: colWidth * spanCols + gap * (spanCols - 1),
      height: rowHeight * spanRows + gap * (spanRows - 1),
    }
  })

  return { width: w, height: CANVAS_HEIGHT, cells, margin, top, gap, colWidth, rowHeight }
}

function OSECanvasPhysics({ model, runId }) {
  const config = useMemo(
    () => ({
      kernel: {
        seed: 500 + runId,
        gravity: { x: 0, y: 16 },
        restitution: 0.18,
        friction: 0.62,
        velocityDamping: 0.992,
        sleepSpeed: 5,
        sleepAfter: 0.8,
      },
      colliders: model.colliders,
      fixedDt: 1 / 60,
      maxSubsteps: 8,
    }),
    [model.colliders, runId],
  )

  return (
    <div className="stakeholder-journey__canvas-stage" style={{ width: model.layout.width }}>
      <StreamPhysicsFrame
        key={`ose-canvas-${runId}-${model.layout.width}`}
        title="Open-Source Ecosystem Canvas as a physics field"
        summary="Hypothesis particles settle into viability, feasibility, and desirability cells of the OSE Canvas."
        description="A physics-ized Open-Source Ecosystem Canvas. Particles are tethered to canvas cells to show viability, feasibility, and desirability as active sustainability regions rather than static boxes."
        size={[model.layout.width, CANVAS_HEIGHT]}
        config={config}
        initialSpawns={model.spawns}
        initialSpawnPacing={{ pacing: "arrival", timeAccessor: "spawnAt", timeScale: 3.4 }}
        accessibleTable
        enableHover
        hoverRadius={16}
        bodyStyle={(body) => {
          const group = body.datum?.group ?? "desirability"
          return {
            fill: GROUP_COLORS[group],
            stroke: "#ffffff",
            strokeWidth: 1.4,
            opacity: 0.86,
          }
        }}
        tooltipContent={(hover) => (
          <div className="semiotic-tooltip stakeholder-journey__tooltip">
            <strong>{hover.datum?.cell ?? hover.id}</strong>
            <div>{hover.datum?.group ?? "canvas"}</div>
          </div>
        )}
      />
      <OSECanvasOverlay layout={model.layout} />
    </div>
  )
}

function OSECanvasOverlay({ layout }) {
  return (
    <svg className="stakeholder-journey__canvas-overlay" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      <text className="stakeholder-journey__canvas-heading" x={layout.margin} y="30">VIABILITY</text>
      <text className="stakeholder-journey__canvas-heading" x={layout.margin + (layout.colWidth + layout.gap)} y="30">FEASIBILITY</text>
      <text className="stakeholder-journey__canvas-heading" x={layout.margin + (layout.colWidth + layout.gap) * 3} y="30">DESIRABILITY</text>
      {CANVAS_CELLS.map((cell) => {
        const rect = layout.cells[cell.id]
        const color = GROUP_COLORS[cell.group]
        return (
          <g key={cell.id} className="stakeholder-journey__canvas-cell">
            <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="4" stroke={color} />
            <text x={rect.x + 14} y={rect.y + 27} fill={color}>{cell.label}</text>
          </g>
        )
      })}
      <path className="stakeholder-journey__canvas-flow" d={`M ${layout.cells.value.x + layout.cells.value.width * 0.35} ${layout.cells.value.y + layout.cells.value.height} C ${layout.width * 0.48} ${layout.height - 108}, ${layout.width * 0.58} ${layout.height - 108}, ${layout.cells.impact.x + 40} ${layout.cells.impact.y + 32}`} />
      <path className="stakeholder-journey__canvas-flow" d={`M ${layout.cells.members.x + 36} ${layout.cells.members.y + layout.cells.members.height} C ${layout.width * 0.78} ${layout.height - 106}, ${layout.width * 0.72} ${layout.height - 96}, ${layout.cells.impact.x + layout.cells.impact.width - 48} ${layout.cells.impact.y + 36}`} />
      <text className="stakeholder-journey__canvas-caption" x={layout.width / 2} y={layout.height - 12} textAnchor="middle">
        The OSE Canvas as a sustainability field: every particle is a hypothesis that needs a cell, a force, and a flow.
      </text>
    </svg>
  )
}

function Metric({ label, value, detail }) {
  return (
    <div className="stakeholder-journey__metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function FeatureNeed({ title, body }) {
  return (
    <div className="stakeholder-journey__need-card">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}

function points(values) {
  return values.map(([x, y]) => `${x},${y}`).join(" ")
}
