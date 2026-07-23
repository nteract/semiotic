import React, { useEffect, useMemo, useState } from "react"
import { ThemeProvider } from "semiotic"
import {
  ChainReactionChart,
  CollisionSwarmChart,
  CrucibleChart,
  EventDropChart,
  GaltonBoardChart,
  GauntletChart,
  PhysicalFlowChart,
  PhysicsCustomChart,
  PhysicsPileChart,
  ProcessFlowChart,
  buildCrucibleProductEvents,
} from "semiotic/physics"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./DataVizForDummiesExamplePage.css"
import "./DataVizForDummiesSixExamplePage.css"

const ACID = "#c8f135"
const MAGENTA = "#f05ca9"
const CYAN = "#55d6e8"
const ORANGE = "#ff9f43"
const VIOLET = "#8f7cf6"
const PALETTE = [ACID, CYAN, MAGENTA, ORANGE, VIOLET]

const SECTIONS = [
  { id: "lab-safety", short: "Safety", label: "Lab safety" },
  { id: "settling", short: "Settle", label: "Settling distributions" },
  { id: "arrival", short: "Arrive", label: "Arrival and accumulation" },
  { id: "throughput", short: "Flow", label: "Throughput and capacity" },
  { id: "ordeal", short: "Trial", label: "Compound ordeals" },
  { id: "transformation", short: "Transform", label: "Transformation" },
  { id: "dependency", short: "Depend", label: "Dependency enactment" },
  { id: "custom-lab", short: "Custom", label: "Custom physics" },
  { id: "lab-review", short: "Review", label: "Decision rules" },
]

const PHYSICS_ROSTER = [
  ["Galton board", "random branching → distribution", "frequency shape"],
  ["Collision swarm", "overlap resolution around x", "individual values"],
  ["Event drop", "arrival order → event-time windows", "lateness"],
  ["Physics pile", "units settle into categories", "inventory"],
  ["Physical flow", "packets follow authored routes", "throughput"],
  ["Process flow", "bodies queue at finite stages", "capacity"],
  ["Gauntlet", "compound entities cross gates", "retained properties"],
  ["Crucible", "authored phases transform a batch", "lineage"],
  ["Chain reaction", "prerequisites unlock dependents", "blocker reach"],
  ["Physics custom", "you build the apparatus", "bespoke mechanism"],
]

const GALTON_SAMPLES = Array.from({ length: 270 }, (_, index) => {
  const wave = Math.sin(index * 1.73) * 13 + Math.cos(index * 0.61) * 8
  return {
    id: `shot-${index}`,
    score: Math.max(38, Math.min(96, 69 + wave)),
    squad: index % 3 === 0 ? "Bench" : "Rotation",
  }
})

const PLAYER_LOAD = Array.from({ length: 34 }, (_, index) => ({
  id: `player-${index}`,
  load: 36 + ((index * 19) % 59),
  unit: ["Starters", "Bench", "Two-way"][index % 3],
  minutes: 8 + ((index * 7) % 31),
}))

const EVENT_DROPS = [
  { id: "e0", time: 2, arrivalTime: 3, source: "arena" },
  { id: "e1", time: 6, arrivalTime: 8, source: "arena" },
  { id: "e2", time: 11, arrivalTime: 12, source: "tracking" },
  { id: "e3", time: 17, arrivalTime: 27, source: "tracking" },
  { id: "e4", time: 22, arrivalTime: 23, source: "box score" },
  { id: "e5", time: 4, arrivalTime: 31, source: "late upload" },
  { id: "e6", time: 29, arrivalTime: 33, source: "box score" },
  { id: "e7", time: 34, arrivalTime: 35, source: "arena" },
]

const PILE_DATA = [
  { id: "ready", category: "Ready", value: 24, kind: "available" },
  { id: "limited", category: "Limited", value: 13, kind: "watch" },
  { id: "rehab", category: "Rehab", value: 8, kind: "watch" },
  { id: "out", category: "Out", value: 5, kind: "unavailable" },
]

const FLOW_NODES = [
  { id: "gate", label: "Arena gate", x: 0.07, y: 0.5 },
  { id: "scan", label: "Ticket scan", x: 0.3, y: 0.3 },
  { id: "concourse", label: "Concourse", x: 0.5, y: 0.53 },
  { id: "seats", label: "Seats", x: 0.82, y: 0.28 },
  { id: "shop", label: "Team shop", x: 0.78, y: 0.74 },
]

const FLOW_LINKS = [
  { id: "gate-scan", source: "gate", target: "scan", value: 82 },
  { id: "scan-concourse", source: "scan", target: "concourse", value: 74 },
  {
    id: "concourse-seats",
    source: "concourse",
    target: "seats",
    value: 58,
    path: [[0.5, 0.53], [0.65, 0.38], [0.82, 0.28]],
  },
  {
    id: "concourse-shop",
    source: "concourse",
    target: "shop",
    value: 27,
    path: [[0.5, 0.53], [0.62, 0.68], [0.78, 0.74]],
  },
]

const TICKETS = Array.from({ length: 24 }, (_, index) => ({
  id: `ticket-${index}`,
  stage: index < 9 ? "intake" : index < 20 ? "review" : "resolved",
  team: ["Facilities", "Guest services", "Security"][index % 3],
  work: 1 + (index % 3),
}))

const PROJECTS = [
  {
    id: "night-market",
    label: "Night market",
    positives: ["attendance", "local"],
    negatives: ["cost"],
    viability: 78,
  },
  {
    id: "roof-deck",
    label: "Roof deck",
    positives: ["revenue", "shade"],
    negatives: ["cost", "delay"],
    viability: 67,
  },
  {
    id: "free-shuttle",
    label: "Free shuttle",
    positives: ["attendance", "access"],
    negatives: ["logistics"],
    viability: 84,
  },
]

const POSITIVE_PROPERTIES = [
  { id: "attendance", label: "Attendance", short: "A", color: ACID, value: 3, buoyancy: 3, radius: 9 },
  { id: "local", label: "Local spend", short: "L", color: CYAN, value: 2, buoyancy: 2, radius: 8 },
  { id: "revenue", label: "Revenue", short: "R", color: ORANGE, value: 3, buoyancy: 2, radius: 9 },
  { id: "shade", label: "Shade", short: "S", color: VIOLET, value: 2, buoyancy: 2, radius: 8 },
  { id: "access", label: "Access", short: "X", color: MAGENTA, value: 3, buoyancy: 3, radius: 9 },
]

const NEGATIVE_PROPERTIES = [
  { id: "cost", label: "Cost", short: "$", color: "#ef5350", load: 1.25, radius: 8 },
  { id: "delay", label: "Delay", short: "D", color: "#9d6b53", load: 1.05, radius: 7 },
  { id: "logistics", label: "Logistics", short: "G", color: "#6b7280", load: 1.1, radius: 8 },
]

function buildArenaGauntletEvents(project, mode) {
  const strict = mode === "strict"
  return [
    {
      id: `${project.id}-design`,
      label: "Design review",
      time: 1.1,
      gateId: "design",
      effects: [{
        popPositive:
          project.id === "roof-deck"
            ? { candidates: ["shade"], count: 1 }
            : undefined,
        addNegative:
          strict && project.id === "night-market" ? ["logistics"] : [],
        stage: project.id === "roof-deck" ? "shade removed" : "design reviewed",
        summary:
          project.id === "roof-deck"
            ? "Roof-deck shade is removed during design review."
            : "Design review retains the proposal benefits.",
      }],
    },
    {
      id: `${project.id}-finance`,
      label: "Finance review",
      time: 2.2,
      gateId: "finance",
      effects: [{
        addNegative: project.negativeIds.includes("cost") ? ["delay"] : ["cost"],
        delayDelta: project.negativeIds.includes("cost") ? 0.5 : 0.25,
        metricsDelta: { reviewCost: strict ? 2 : 1 },
        stage: "finance reviewed",
        summary: project.negativeIds.includes("cost")
          ? "Existing cost pressure adds delay."
          : "Finance review adds a visible cost burden.",
      }],
    },
    {
      id: `${project.id}-permit`,
      label: "Permit outcome",
      time: 3.35,
      gateId: "permit",
      final: true,
      effects: [{ stage: "permit outcome" }],
    },
  ]
}

const CRUCIBLE_CHARGE = [
  { id: "scan", label: "Entry scans", kind: "behavior" },
  { id: "survey", label: "Exit survey", kind: "attitude" },
  { id: "sales", label: "Concession sales", kind: "transaction" },
  { id: "weather", label: "Weather record", kind: "context" },
]

const CRUCIBLE_PHASES = [
  { id: "charge", label: "Charge", duration: 0.8, motion: "charge", intensity: 0.3 },
  { id: "test", label: "Test", duration: 2.2, motion: "mix", intensity: 0.75 },
  { id: "publish", label: "Publish", duration: 1.3, motion: "pour", intensity: 0.35 },
]

const CRUCIBLE_PRODUCTS = [
  { id: "finding", label: "Weather reduced dwell time", category: "finding", outletId: "supported" },
]

const CRUCIBLE_EVENTS = [
  ...buildCrucibleProductEvents({
    productId: "finding",
    form: {
      at: { phaseId: "test", progress: 0.25 },
      sourceIds: ["scan", "weather"],
      label: "Timing and weather align",
    },
    contributions: [{
      at: { phaseId: "test", progress: 0.68 },
      sourceIds: ["survey", "sales"],
      label: "Survey and sales qualify the effect",
    }],
    complete: {
      at: { phaseId: "publish", progress: 0.55 },
      outletId: "supported",
      reason: "All four authored sources contribute",
      label: "Publish the finding",
    },
  }),
]

const CHAIN_TASKS = [
  { id: "brief", title: "Approve brief", lane: "Product", start: 0, end: 1, progress: 1, status: "done", dependsOn: [], completed: 1 },
  { id: "privacy", title: "Approve data policy", lane: "Product", start: 1, end: 4, progress: 0.9, status: "blocked", dependsOn: ["brief"], blocker: "Retention decision pending" },
  { id: "fixture", title: "Build fixture", lane: "Data", start: 1, end: 2, progress: 1, status: "done", dependsOn: ["brief"], completed: 2 },
  { id: "schema", title: "Finalize schema", lane: "Data", start: 3, end: 6, progress: 0.3, status: "waiting", dependsOn: ["privacy", "fixture"] },
  { id: "ingest", title: "Build ingest", lane: "Data", start: 6, end: 9, progress: 0, status: "waiting", dependsOn: ["schema"] },
  { id: "shell", title: "Build dashboard shell", lane: "Frontend", start: 2, end: 4, progress: 1, status: "done", dependsOn: ["brief"], completed: 4 },
  { id: "bind", title: "Bind live data", lane: "Frontend", start: 7, end: 10, progress: 0.1, status: "waiting", dependsOn: ["ingest", "shell"] },
  { id: "audit", title: "Run privacy audit", lane: "Quality", start: 6, end: 9, progress: 0, status: "waiting", dependsOn: ["privacy", "schema"] },
  { id: "test", title: "Load test", lane: "Quality", start: 10, end: 12, progress: 0, status: "waiting", dependsOn: ["bind"] },
  { id: "launch", title: "Launch", lane: "Launch", start: 13, end: 13, progress: 0, status: "waiting", dependsOn: ["test", "audit"], milestone: true },
]

const CUSTOM_DATA = Array.from({ length: 21 }, (_, index) => ({
  id: `request-${index}`,
  route: ["review", "triage", "ship"][index % 3],
  priority: index % 5 === 0 ? "rush" : "standard",
}))

function sortingFloorLayout(ctx) {
  const { plot } = ctx.dimensions
  const laneWidth = plot.width / 3
  const laneLabels = ["Review", "Triage", "Ship"]
  const laneIndex = { review: 0, triage: 1, ship: 2 }
  const floorY = plot.y + plot.height - 14
  return {
    bodies: ctx.data.map((datum, index) => ({
      id: datum.id,
      x: plot.x + laneWidth * ((index % 3) + 0.5) + ((index % 4) - 1.5) * 4,
      y: plot.y + 28 + Math.floor(index / 3) * 11,
      mass: datum.priority === "rush" ? 1.6 : 1,
      shape: { type: "circle", radius: datum.priority === "rush" ? 8 : 6 },
      datum,
    })),
    colliders: [
      { id: "left-wall", shape: { type: "segment", x1: plot.x, y1: plot.y, x2: plot.x, y2: floorY, thickness: 10 } },
      { id: "right-wall", shape: { type: "segment", x1: plot.x + plot.width, y1: plot.y, x2: plot.x + plot.width, y2: floorY, thickness: 10 } },
      { id: "floor", shape: { type: "segment", x1: plot.x, y1: floorY, x2: plot.x + plot.width, y2: floorY, thickness: 12 } },
      ...[1, 2].map((divider) => ({
        id: `divider-${divider}`,
        shape: {
          type: "segment",
          x1: plot.x + laneWidth * divider,
          y1: plot.y + plot.height * 0.48,
          x2: plot.x + laneWidth * divider,
          y2: floorY,
          thickness: 8,
        },
      })),
    ],
    config: {
      kernel: {
        seed: 61,
        gravity: { x: 0, y: 650 },
        collisionIterations: 4,
        velocityDamping: 0.995,
        restitution: 0.15,
        friction: 0.1,
      },
    },
    bodyForces: ({ body }) => {
      const route = body.datum?.route
      const index = laneIndex[route] ?? 0
      const targetX = plot.x + laneWidth * (index + 0.5)
      return {
        x: (targetX - body.x) * 16 - body.vx * 2.4,
        y: 0,
      }
    },
    backgroundOverlays: (
      <svg
        width={ctx.dimensions.width}
        height={ctx.dimensions.height}
        viewBox={`0 0 ${ctx.dimensions.width} ${ctx.dimensions.height}`}
        aria-hidden="true"
      >
        {laneLabels.map((label, index) => (
          <g key={label}>
            <rect
              x={plot.x + laneWidth * index + 4}
              y={plot.y + plot.height * 0.48}
              width={laneWidth - 8}
              height={plot.height * 0.49}
              fill={PALETTE[index + 1]}
              opacity=".08"
            />
            <text
              x={plot.x + laneWidth * (index + 0.5)}
              y={floorY - 12}
              textAnchor="middle"
              fill="var(--semiotic-text)"
              fontSize="11"
              fontWeight="800"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    ),
    semanticItems: laneLabels.map((label, index) => ({
      id: `lane-${index}`,
      label: `${label} routing lane`,
      x: plot.x + laneWidth * index,
      y: plot.y + plot.height * 0.48,
      shape: "rect",
      width: laneWidth,
      height: plot.height * 0.49,
    })),
  }
}

const CHAPTER_STATS = {
  "lab-safety": { claim: 100, exact: 70, motion: 95, verify: 100, weird: 99 },
  settling: { claim: 88, exact: 74, motion: 78, verify: 94, weird: 83 },
  arrival: { claim: 92, exact: 80, motion: 91, verify: 96, weird: 79 },
  throughput: { claim: 94, exact: 70, motion: 98, verify: 91, weird: 92 },
  ordeal: { claim: 77, exact: 60, motion: 100, verify: 88, weird: 100 },
  transformation: { claim: 90, exact: 69, motion: 96, verify: 100, weird: 98 },
  dependency: { claim: 96, exact: 83, motion: 89, verify: 100, weird: 91 },
  "custom-lab": { claim: 65, exact: 55, motion: 100, verify: 78, weird: 100 },
}

export default function DataVizForDummiesSixExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [galtonMode, setGaltonMode] = useState("sample")
  const [swarmGroups, setSwarmGroups] = useState(true)
  const [watermarkDelay, setWatermarkDelay] = useState(8)
  const [flowMotion, setFlowMotion] = useState(true)
  const [reviewCapacity, setReviewCapacity] = useState(4)
  const [gauntletMode, setGauntletMode] = useState("balanced")
  const [chainMode, setChainMode] = useState("snapshot")
  const [replays, setReplays] = useState({})
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)
  const compact = pageWidth < 780
  const replayChart = (chart) =>
    setReplays((current) => ({ ...current, [chart]: (current[chart] ?? 0) + 1 }))
  const chartKey = (chart, ...parts) =>
    [chart, chartWidth, replays[chart] ?? 0, ...parts].join("-")

  const processStages = useMemo(() => [
    { id: "intake", label: "Intake", force: 16, share: 0.9 },
    {
      id: "review",
      label: "Review",
      capacity: { unitsPerSecond: reviewCapacity, unitAccessor: "work" },
      pressure: { pressure: 1.1 },
      force: 12,
      share: 1.25,
    },
    { id: "resolved", label: "Resolved", absorb: true, force: 24, share: 0.9 },
  ], [reviewCapacity])

  const gauntletGates = useMemo(() => {
    const strict = gauntletMode === "strict"
    return [
      { id: "design", label: "Design", color: CYAN, regionEffect: { damping: strict ? 0.09 : 0.03, force: { x: strict ? 4 : 12, y: 0 } } },
      { id: "finance", label: "Finance", color: ORANGE, regionEffect: { damping: strict ? 0.13 : 0.05, force: { x: 8, y: strict ? 12 : 0 } } },
      { id: "permit", label: "Permit", color: ACID, regionEffect: { damping: 0.04, force: { x: strict ? 10 : 20, y: 0 } } },
    ]
  }, [gauntletMode])

  useEffect(() => {
    const elements = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean)
    if (!elements.length || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: "-22% 0px -58%", threshold: [0, 0.15, 0.4, 0.7] },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <ExamplePageLayout title="Data Viz for Dummies VI">
      <div className="dvd dvd--sixth" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">The basement laboratory · please secure loose scarves</p>
            <h2>Physics earns its CPU when the mechanism is part of the evidence.</h2>
            <p className="dvd-hero__lede">
              Part VI opens the cabinet marked “probably unnecessary, occasionally perfect.”
              Ten physics charts turn collision, arrival, capacity, dependency, and conservation
              into visible mechanisms. The balls may bounce; the analytical contract may not.
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>10 physical mechanisms</span>
              <span>8 truth checks</span>
              <span>1 gravity waiver</span>
            </div>
          </div>
          <div className="dvd-card dvd-card--hero" aria-label="Sixth chart selection scouting card">
            <div className="dvd-card__topline">
              <span>PHY 601</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">06</strong>
            <div className="dvd-card__name">THE LAB TECH</div>
            <div className="dvd-card__position">Collision · queue · consequence</div>
            <div className="dvd-card__stats">
              <MiniStat label="Truth" value="99" />
              <MiniStat label="Motion" value="100" />
              <MiniStat label="CPU" value="04" />
              <MiniStat label="Drama" value="97" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Sixth data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">THE LAB</span>
          <div className="dvd-nav__links">
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={activeSection === section.id ? "is-active" : ""}
                aria-current={activeSection === section.id ? "location" : undefined}
              >
                <i>{String(index).padStart(2, "0")}</i>
                <span className="dvd-nav__long">{section.label}</span>
                <span className="dvd-nav__short">{section.short}</span>
              </a>
            ))}
          </div>
        </nav>

        <ThemeProvider theme={chartTheme}>
          <div className="dvd-guide">
            <GuideChapter
              id="lab-safety"
              number="00"
              eyebrow="Lab safety · define the semantic contract first"
              title="The simulation may explain the process; it may not fabricate the result."
              lead="A physics chart has two layers. The semantic layer states the measured values, rules, and outcomes. The physical layer enacts those rules so accumulation, congestion, transfer, or dependency becomes perceptible over time."
              avoid="If changing gravity, friction, or the random seed changes the reported conclusion, you have built a small video game. Charming! Put the data back in charge."
              stats={CHAPTER_STATS["lab-safety"]}
            >
              <ChartPanel
                eyebrow="Ten instruments · five defensible physical verbs"
                title="Settle, arrive, queue, transform, unlock."
                note="Start with the verb the data actually contains. Motion without a semantic verb is merely a screensaver with tenure."
                feature="Keep a static projection beside the simulation"
                featureCopy="Physics HOCs expose semantic items, accessible tables, and projection overlays so readers can inspect the answer without tracking every body."
              >
                <div className="dvd6-roster" role="list">
                  {PHYSICS_ROSTER.map(([chart, mechanism, value], index) => (
                    <article key={chart} role="listitem">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{chart}</strong>
                      <p>{mechanism}</p>
                      <em>{value}</em>
                    </article>
                  ))}
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="settling"
              number="01"
              eyebrow="Galton + collision swarm · distributions with elbows"
              title="Let bodies settle when the individuals and their overlap are the story."
              lead="A Galton board makes repeated branching accumulate into a distribution. A collision swarm preserves each observation’s x-value while moving marks just enough to avoid overlap. Both reveal shape without pretending that the final resting place is an extra measurement."
              avoid="A mechanical Galton board demonstrates a probability process; it does not become evidence about your sample. A swarm’s vertical jitter is packing, not a second variable."
              stats={CHAPTER_STATS.settling}
            >
              <ChartPanel
                eyebrow="Shot quality · observed sample or branching model"
                title={galtonMode === "sample" ? "Two hundred seventy shots settle into their measured score bins" : "Two hundred seventy branching outcomes form a reference distribution"}
                note="Sample mode maps 270 real rows to bins. Mechanical mode generates 270 outcomes from peg rows and branch probability. They answer different questions despite wearing the same tiny hard hats."
                feature="Separate simulationMode from display mode"
                featureCopy="GaltonBoardChart distinguishes supplied observations from a seeded mechanical demonstration and overlays the exact bin counts in both."
              >
                <ChartToggle
                  label="Choose Galton evidence"
                  value={galtonMode}
                  onChange={setGaltonMode}
                  options={[["sample", "Observed shots"], ["mechanical", "Branching model"]]}
                />
                <ReplayButton onClick={() => replayChart("galton")} />
                <GaltonBoardChart
                  key={chartKey("galton", galtonMode)}
                  data={galtonMode === "sample" ? GALTON_SAMPLES : undefined}
                  valueAccessor={galtonMode === "sample" ? "score" : "value"}
                  valueExtent={galtonMode === "sample" ? [35, 100] : undefined}
                  bins={11}
                  simulationMode={galtonMode}
                  pegRows={10}
                  mechanicalCount={270}
                  ballRadius={2.7}
                  colorBy={galtonMode === "sample" ? "squad" : undefined}
                  referenceLines={galtonMode === "sample" ? { value: 70, label: "70" } : undefined}
                  showProjection
                  seed={601}
                  size={[chartWidth, 430]}
                  title="Shot quality Galton board"
                  description="Two hundred seventy observed shot-quality rows or seeded mechanical outcomes settle into eleven bins with an exact frequency projection."
                  tooltip
                />
                <div className="dvd6-subchart">
                  <div>
                    <strong>Collision swarm: one body remains one player</strong>
                    <span>Only horizontal load is measured; vertical position prevents overlap.</span>
                  </div>
                  <ChartToggle
                    label="Choose swarm grouping"
                    value={swarmGroups ? "groups" : "pooled"}
                    onChange={(value) => setSwarmGroups(value === "groups")}
                    options={[["pooled", "One lane"], ["groups", "Team units"]]}
                  />
                  <ReplayButton onClick={() => replayChart("swarm")} />
                  <CollisionSwarmChart
                    key={chartKey("swarm", swarmGroups ? "groups" : "pooled")}
                    data={PLAYER_LOAD}
                    xAccessor="load"
                    groupAccessor={swarmGroups ? "unit" : undefined}
                    colorBy={swarmGroups ? "unit" : undefined}
                    radiusAccessor="minutes"
                    xExtent={[30, 100]}
                    collisionIterations={7}
                    settle
                    showProjection
                    seed={602}
                    size={[Math.max(270, chartWidth - 24), 330]}
                    title="Player workload collision swarm"
                    description="Thirty-four players retain measured workload on the x-axis while collisions separate overlapping marks, optionally by team unit."
                    tooltip
                  />
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="arrival"
              number="02"
              eyebrow="Event drop + physics pile · time and inventory become tangible"
              title="Show bodies arriving when arrival order changes what the system knows."
              lead="EventDropChart separates event time from arrival time, exposing late data against windows and a watermark. PhysicsPileChart turns category totals into countable units, useful when accumulation, capacity, or composition matters more than a clean bar."
              avoid="Do not animate historical rows merely because they have timestamps. Arrival motion earns its place only when lateness, closure, or build-up affects interpretation."
              stats={CHAPTER_STATS.arrival}
            >
              <ChartPanel
                eyebrow="Arena telemetry · the fourth-minute event arrives at minute thirty-one"
                title={watermarkDelay === 8 ? "An eight-minute watermark tolerates modest reporting lag" : "A three-minute watermark closes windows aggressively"}
                note="Horizontal position is event time; release into the frame follows arrivalTime. The late-upload row lands in the late-data gutter instead of silently rewriting a closed window."
                feature="Model event time and arrival time separately"
                featureCopy="EventDropChart stages rows by arrivalAccessor while windows and watermark operate on timeAccessor—the distinction streaming systems actually care about."
              >
                <ChartToggle
                  label="Choose watermark delay"
                  value={String(watermarkDelay)}
                  onChange={(value) => setWatermarkDelay(Number(value))}
                  options={[["8", "8-minute grace"], ["3", "3-minute grace"]]}
                />
                <ReplayButton onClick={() => replayChart("event-drop")} />
                <EventDropChart
                  key={chartKey("event-drop", watermarkDelay)}
                  data={EVENT_DROPS}
                  timeAccessor="time"
                  arrivalAccessor="arrivalTime"
                  colorBy="source"
                  windows={{ size: 10 }}
                  watermark={{ delay: watermarkDelay }}
                  timeExtent={[0, 40]}
                  timeScale={8}
                  ballRadius={6}
                  showProjection
                  seed={603}
                  size={[chartWidth, 370]}
                  title="Arena event-time windows"
                  description="Eight arena events are placed by event time but released by arrival time against ten-minute windows and a configurable watermark."
                  tooltip
                />
                <div className="dvd6-subchart">
                  <div>
                    <strong>Physics pile: the units are the point</strong>
                    <span>The ghost bars remain the exact totals; the balls make roster capacity countable.</span>
                  </div>
                  <ReplayButton onClick={() => replayChart("pile")} />
                  <PhysicsPileChart
                    key={chartKey("pile")}
                    data={PILE_DATA}
                    categoryAccessor="category"
                    valueAccessor="value"
                    unitValue={1}
                    colorBy="kind"
                    ballRadius={5}
                    showProjection
                    seed={604}
                    size={[Math.max(270, chartWidth - 24), 340]}
                    title="Roster availability pile"
                    description="Fifty roster slots settle into four availability categories with exact projected totals."
                    tooltip
                  />
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="throughput"
              number="03"
              eyebrow="Physical flow + process flow · traffic is not the same as capacity"
              title="Packets explain routes; queues explain service constraints."
              lead="PhysicalFlowChart sends particles along authored links whose widths carry throughput. ProcessFlowChart goes further: stage controllers can enforce finite work-per-second capacity, so congestion is computed rather than decorated."
              avoid="Particles are samples of a rate, not individual people unless you explicitly make them so. And a bottleneck created only by a strong force is force theater; use a capacity controller for a capacity claim."
              stats={CHAPTER_STATS.throughput}
            >
              <ChartPanel
                eyebrow="Arena circulation · route volume first"
                title={flowMotion ? "Packets reveal direction along the concourse routes" : "Reduced motion leaves the throughput network readable"}
                note="Pipe width and labels preserve the route totals. Particles communicate active movement and can be paused without erasing the network."
                feature="Keep a static flow layer under moving packets"
                featureCopy="PhysicalFlowChart shares path geometry between throughput pipes and particles, allowing reduced motion without changing the data story."
              >
                <ChartToggle
                  label="Choose flow motion"
                  value={flowMotion ? "move" : "still"}
                  onChange={(value) => setFlowMotion(value === "move")}
                  options={[["still", "Reduced motion"], ["move", "Moving packets"]]}
                />
                <ReplayButton onClick={() => replayChart("physical-flow")} />
                <PhysicalFlowChart
                  key={chartKey("physical-flow", flowMotion ? "move" : "still")}
                  nodes={FLOW_NODES}
                  links={FLOW_LINKS}
                  colorBy="source"
                  particleRate={0.12}
                  maxParticles={70}
                  particleRadius={3.5}
                  flowSpeed={100}
                  reducedMotion={!flowMotion}
                  showStaticFlow
                  showSensors
                  seed={605}
                  size={[chartWidth, 390]}
                  title="Arena circulation network"
                  description="Moving packets follow four authored arena routes while static pipe width and labels encode throughput."
                  tooltip
                />
                <div className="dvd6-subchart">
                  <div>
                    <strong>Process flow: now the review desk can actually fall behind</strong>
                    <span>Each body carries work; the middle stage drains a finite number of work units per second.</span>
                  </div>
                  <ChartToggle
                    label="Choose review capacity"
                    value={String(reviewCapacity)}
                    onChange={(value) => setReviewCapacity(Number(value))}
                    options={[["2", "2 units / sec"], ["4", "4 units / sec"], ["8", "8 units / sec"]]}
                  />
                  <ReplayButton onClick={() => replayChart("process-flow")} />
                  <ProcessFlowChart
                    key={chartKey("process-flow", reviewCapacity)}
                    data={TICKETS}
                    stages={processStages}
                    idAccessor="id"
                    stageAccessor="stage"
                    workAccessor="work"
                    colorBy="team"
                    groupCompletion="none"
                    liveCapacity
                    showChrome
                    showProjection
                    ballRadius={6}
                    seed={606}
                    size={[Math.max(270, chartWidth - 24), 390]}
                    title="Guest-service ticket process"
                    description="Twenty-four tickets cross intake, capacity-limited review, and an absorbing resolved stage."
                    tooltip
                  />
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="ordeal"
              number="04"
              eyebrow="Gauntlet · an entity drags its properties through review"
              title="Use a compound body when the bundle must survive the process together."
              lead="GauntletChart represents each project as a core with attached benefits and burdens. Authored gates can add, remove, delay, or transform properties while a settled projection reports viability and outcome."
              avoid="Buoyancy is not benefit and mass is not cost until your model explicitly says so. Keep those mappings visible, disclose gate effects, and never ask the audience to infer the final score from wobble."
              stats={CHAPTER_STATS.ordeal}
            >
              <ChartPanel
                eyebrow="Arena proposals · design, finance, permit"
                title={gauntletMode === "balanced" ? "Benefits and burdens travel together through three reviews" : "Strict review adds drag without rewriting the input projects"}
                note="The spectacle explains retention and loss across gates. The projection strip carries the inspectable viability result; nobody needs to diagnose policy from orbital mechanics."
                feature="Use tethers and projection to preserve compound identity"
                featureCopy="GauntletChart keeps each property visibly attached to its project while the settled projection states the outcome independently of motion."
              >
                <ChartToggle
                  label="Choose review climate"
                  value={gauntletMode}
                  onChange={setGauntletMode}
                  options={[["balanced", "Balanced review"], ["strict", "Strict review"]]}
                />
                <ReplayButton onClick={() => replayChart("gauntlet")} />
                <GauntletChart
                  key={chartKey("gauntlet", gauntletMode)}
                  data={PROJECTS}
                  idAccessor="id"
                  labelAccessor="label"
                  positiveAccessor="positives"
                  negativeAccessor="negatives"
                  initialViability="viability"
                  positiveProperties={POSITIVE_PROPERTIES}
                  negativeProperties={NEGATIVE_PROPERTIES}
                  gates={gauntletGates}
                  events={(project) => buildArenaGauntletEvents(project, gauntletMode)}
                  showChrome
                  showTethers
                  showProjection
                  coreForceMode="route"
                  seed={607}
                  size={[chartWidth, compact ? 480 : 420]}
                  title="Arena proposal gauntlet"
                  description="Three arena proposals carry explicit benefits and burdens through design, finance, and permit gates with a static viability projection."
                  tooltip
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="transformation"
              number="05"
              eyebrow="Crucible · the least subtle possible provenance diagram"
              title="Mix sources only when the authored record says what became what."
              lead="CrucibleChart runs a bounded batch through declared phases and semantic events. It can show sources binding into a product, contributions joining later, rejection to outlets, and conservation of amount—without letting collisions decide the finding."
              avoid="The animation must not perform analysis by vibes. Products, source IDs, event times, outlets, and completion are authored facts; physics explains co-presence and transformation."
              stats={CHAPTER_STATS.transformation}
            >
              <ChartPanel
                eyebrow="Evidence assay · four sources become one supported finding"
                title="The cauldron is theatrical; the lineage is exact."
                note="Entry scans and weather form the finding; survey and sales contribute later. Every transition is declared in the event tape and survives as a static projection."
                feature="Author transformations as semantic events"
                featureCopy="buildCrucibleProductEvents writes explicit form, contribution, completion, and outlet steps while the chart manages replay, conservation, and provenance."
              >
                <ReplayButton onClick={() => replayChart("crucible")} />
                <CrucibleChart
                  key={chartKey("crucible")}
                  data={CRUCIBLE_CHARGE}
                  phases={CRUCIBLE_PHASES}
                  products={CRUCIBLE_PRODUCTS}
                  events={CRUCIBLE_EVENTS}
                  outlets={[{ id: "supported", label: "Supported finding", side: "bottom", order: 0 }]}
                  idAccessor="id"
                  labelAccessor="label"
                  categoryAccessor="kind"
                  projection={{ groupBy: "outlet", measure: "count" }}
                  colorBy="category"
                  playback="replay"
                  controls
                  showBonds
                  seed={608}
                  size={[chartWidth, 450]}
                  title="Arena evidence crucible"
                  description="Four authored evidence sources pass through three phases and combine into one supported finding with explicit provenance."
                  tooltip
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="dependency"
              number="06"
              eyebrow="Chain reaction · prerequisite delivery, not project-management pachinko"
              title="Make dependency logic move when reachability is the question."
              lead="ChainReactionChart compiles a dependency graph into lanes, sockets, blockers, and delivery tokens. A completed task releases one token per outgoing dependency; a downstream task arms only when every required token arrives."
              avoid="A delivered ball means one prerequisite is satisfied. It does not complete the target task, predict a date, or absolve the steering committee."
              stats={CHAPTER_STATS.dependency}
            >
              <ChartPanel
                eyebrow="Release machine · one policy decision reaches four teams"
                title={chainMode === "snapshot" ? "Snapshot mode shows the dependency state at day ten" : "Replay mode enacts recorded completions in time order"}
                note="The blocked privacy decision reaches the schema, ingest, binding, audit, test, and launch chain. Reach is graph structure, not an estimate of days saved."
                feature="Pair mechanical enactment with accessible graph semantics"
                featureCopy="ChainReactionChart exposes the task table and blocker-amplification structure even when reduced motion or snapshot mode suppresses the replay."
              >
                <ChartToggle
                  label="Choose dependency mode"
                  value={chainMode}
                  onChange={setChainMode}
                  options={[["snapshot", "Day 10 snapshot"], ["replay", "Recorded replay"]]}
                />
                <ReplayButton onClick={() => replayChart("chain-reaction")} />
                <div
                  className="dvd6-wide-chart"
                  role={compact ? "region" : undefined}
                  aria-label={compact ? "Horizontally scrollable dependency chart" : undefined}
                  tabIndex={compact ? 0 : undefined}
                >
                  <ChainReactionChart
                    key={chartKey("chain-reaction", chainMode)}
                    data={CHAIN_TASKS}
                    taskIDAccessor="id"
                    labelAccessor="title"
                    laneAccessor="lane"
                    dependencyAccessor="dependsOn"
                    startAccessor="start"
                    endAccessor="end"
                    progressAccessor="progress"
                    statusAccessor="status"
                    completionTimeAccessor="completed"
                    blockerAccessor="blocker"
                    milestoneAccessor="milestone"
                    currentTime={10}
                    mode={chainMode}
                    insight="blocker-amplification"
                    controls={chainMode === "replay"}
                    seed={609}
                    width={compact ? 620 : chartWidth}
                    height={compact ? 720 : 610}
                    title="Arena release dependency machine"
                    description="Ten tasks across five lanes show how one blocked privacy decision prevents downstream work from becoming possible."
                    accessibleTable
                    enableHover
                  />
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="custom-lab"
              number="07"
              eyebrow="Physics custom · you have declined all sensible presets"
              title="Build an apparatus only when the custom mechanism can be audited."
              lead="PhysicsCustomChart supplies dimensions, scales, theme, a deterministic world, rendering, interaction, and accessibility. A layout function returns bodies, colliders, sensors, forces, overlays, and semantic items."
              avoid="Custom physics is a power tool, not a chart recommendation. Draw the boundaries, label the forces, seed the randomness, expose semantic regions, and document what would make the mechanism produce a different result."
              stats={CHAPTER_STATS["custom-lab"]}
            >
              <ChartPanel
                eyebrow="Routing floor · bespoke gravity, ordinary accountability"
                title="Twenty-one requests settle behind three explicit dividers."
                note="This intentionally modest apparatus demonstrates the escape hatch: body geometry, gravity, walls, lane overlays, and accessible semantic regions live in one auditable layout."
                feature="Return semanticItems with custom geometry"
                featureCopy="PhysicsCustomChart can make bespoke bodies interactive while semantic regions give keyboard and assistive-technology users a stable description of the apparatus."
              >
                <ReplayButton onClick={() => replayChart("custom")} />
                <PhysicsCustomChart
                  key={chartKey("custom")}
                  data={CUSTOM_DATA}
                  layout={sortingFloorLayout}
                  colorBy="route"
                  colorScheme={{ review: CYAN, triage: MAGENTA, ship: ACID }}
                  seed={610}
                  size={[chartWidth, 390]}
                  title="Request routing floor"
                  description="Twenty-one requests settle in a custom three-lane physics layout with explicit boundaries and semantic lane regions."
                  summary="The custom layout defines Review, Triage, and Ship regions; request priority changes body mass and radius."
                  accessibleTable
                  tooltip
                />
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="lab-review" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Lab review · the apparatus must earn its electricity</p>
            <h2>Choose physics from the mechanism the reader must understand.</h2>
            <p>
              Motion is valuable when it makes emergence, lateness, accumulation, congestion,
              transformation, or dependency legible. Otherwise, turn off the fog machine and draw
              the simpler chart.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision verb="Explain distribution emergence" chart="Galton board" note="Separate observed samples from mechanical probability." />
            <Decision verb="Preserve crowded individuals" chart="Collision swarm" note="Only the value axis is measured." />
            <Decision verb="Inspect late event data" chart="Event drop" note="Arrival time and event time must both exist." />
            <Decision verb="Make units countable" chart="Physics pile" note="Keep exact totals in the projection." />
            <Decision verb="Show route throughput" chart="Physical flow" note="Packets sample a rate; pipes retain the total." />
            <Decision verb="Expose a bottleneck" chart="Process flow" note="Use computed capacity, not visual drag." />
            <Decision verb="Track a compound entity" chart="Gauntlet" note="Properties remain attached and outcomes stay explicit." />
            <Decision verb="Show authored transformation" chart="Crucible" note="Events own lineage and conservation." />
            <Decision verb="Explain blocker reach" chart="Chain reaction" note="Tokens satisfy prerequisites; they do not do work." />
            <Decision verb="Invent a mechanism" chart="Physics custom" note="Publish the apparatus’s semantic contract." />
            <Decision verb="Make a dashboard exciting" chart="Absolutely not" note="Excitement is not a data type." />
            <Decision verb="Support reduced motion" chart="Static projection" note="The conclusion must survive the pause button." />
          </div>
          <blockquote>
            Let physics explain how the answer forms—never decide what the answer is.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE SIXTH RULE</span>
            <strong>If the mechanism is not data, the motion is decoration.</strong>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function ChartToggle({ label, value, onChange, options }) {
  return (
    <div className="dvd-segmented dvd6-toggle" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className={value === id ? "is-active" : ""}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function ReplayButton({ onClick }) {
  return (
    <button type="button" className="dvd6-replay" onClick={onClick}>
      <span aria-hidden="true">↻</span>
      Replay chart
    </button>
  )
}

function GuideChapter({ id, number, eyebrow, title, lead, avoid, stats, children }) {
  return (
    <section id={id} className="dvd-chapter">
      <div className="dvd-chapter__copy">
        <div className="dvd-chapter__number">{number}</div>
        <p className="dvd-chapter__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="dvd-chapter__lead">{lead}</p>
        <div className="dvd-coach">
          <span>LAB SAFETY OFFICER</span>
          <p>{avoid}</p>
        </div>
        <ScoutingStats stats={stats} />
      </div>
      <div className="dvd-chapter__stage">{children}</div>
    </section>
  )
}

function ChartPanel({ eyebrow, title, note, feature, featureCopy, children }) {
  return (
    <article className="dvd-chart-panel">
      <header>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
        <span>{note}</span>
      </header>
      <div className="dvd-chart-panel__plot">{children}</div>
      <aside className="dvd-feature-note">
        <div className="dvd-feature-note__flag">
          <i aria-hidden="true">⚗</i> You should think about using this feature
        </div>
        <strong>{feature}</strong>
        <p>{featureCopy}</p>
      </aside>
    </article>
  )
}

function ScoutingStats({ stats }) {
  return (
    <div className="dvd-scout" aria-label="Chart laboratory ratings out of 100">
      <div className="dvd-scout__head">
        <span>LAB READOUT</span>
        <small>
          OVR{" "}
          {Math.round(
            Object.values(stats).reduce((sum, value) => sum + value, 0) /
              Object.keys(stats).length,
          )}
        </small>
      </div>
      {Object.entries(stats).map(([label, value]) => (
        <div className="dvd-scout__row" key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${value}%` }} /></div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Decision({ verb, chart, note }) {
  return (
    <article>
      <span>I need to…</span>
      <h3>{verb}</h3>
      <strong>{chart}</strong>
      <p>{note}</p>
    </article>
  )
}
