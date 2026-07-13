import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChartContainer, DetailsPanel, LinkedCharts } from "semiotic"
import { StreamPhysicsFrame, compilePhysicsEncoding } from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PhysicsArcStatus,
  usePhysicsExampleConversationArc,
} from "./PhysicsExampleConversationArc"
import "./YellowstoneExamplePage.css"

const CORE_NODES = [
  {
    id: "wolves",
    label: "Wolves",
    glyph: "wolf",
    habitat: "uplands",
    anchor: [0.16, 0.17],
    mobileAnchor: [0.28, 0.09],
    color: "#9d4f3d",
    evidence: "NPS wolf restoration and predator monitoring",
    caveat: "Wolf abundance varies by pack, disease, prey, and management.",
  },
  {
    id: "elk",
    label: "Elk pressure",
    glyph: "elk",
    habitat: "valley",
    anchor: [0.39, 0.25],
    mobileAnchor: [0.68, 0.2],
    color: "#b77b37",
    evidence: "Long-term ungulate counts and browsing studies",
    caveat: "Elk decline also reflects harvest, climate, movement, and other predators.",
  },
  {
    id: "coyotes",
    label: "Coyotes",
    glyph: "coyote",
    habitat: "uplands",
    anchor: [0.16, 0.48],
    mobileAnchor: [0.28, 0.31],
    color: "#a98b58",
    evidence: "Canid interaction studies",
    caveat: "Responses vary in space and through time.",
  },
  {
    id: "scavengers",
    label: "Scavengers",
    glyph: "wing",
    habitat: "valley",
    anchor: [0.39, 0.52],
    mobileAnchor: [0.68, 0.41],
    color: "#5f6759",
    evidence: "Carrion availability and scavenger observations",
    caveat: "Carrion benefits differ by season and species.",
  },
  {
    id: "woody-plants",
    label: "Willow and aspen",
    glyph: "sprout",
    habitat: "riparian",
    anchor: [0.62, 0.26],
    mobileAnchor: [0.28, 0.52],
    color: "#668447",
    evidence: "Riparian vegetation monitoring and browsing exclosures",
    caveat: "Recovery is patchy; hydrology and site history can dominate locally.",
  },
  {
    id: "beavers",
    label: "Beaver activity",
    glyph: "beaver",
    habitat: "riparian",
    anchor: [0.62, 0.55],
    mobileAnchor: [0.68, 0.62],
    color: "#6c5139",
    evidence: "Colony surveys and riparian engineering research",
    caveat: "Suitable willow and hydrology are necessary but not sufficient.",
  },
  {
    id: "wetlands",
    label: "Wetland structure",
    glyph: "wave",
    habitat: "water",
    anchor: [0.84, 0.43],
    mobileAnchor: [0.28, 0.74],
    color: "#3f7f87",
    evidence: "Beaver, channel, and wetland field studies",
    caveat: "Geomorphology has long lags and strong historical dependence.",
  },
  {
    id: "biodiversity",
    label: "Biodiversity",
    glyph: "star",
    habitat: "mosaic",
    anchor: [0.84, 0.72],
    mobileAnchor: [0.68, 0.85],
    color: "#b8942f",
    evidence: "Multi-taxa synthesis across riparian habitats",
    caveat: "This summary hides species-specific winners, losers, and uncertainty.",
  },
]

const PRESSURE_NODES = [
  {
    id: "harvest",
    label: "Human harvest",
    glyph: "target",
    habitat: "external",
    anchor: [0.29, 0.78],
    mobileAnchor: [0.23, 0.94],
    color: "#6f5947",
    evidence: "Management records and population models",
    caveat: "Regulation and hunter access change over time.",
  },
  {
    id: "climate",
    label: "Climate pressure",
    glyph: "sun",
    habitat: "external",
    anchor: [0.58, 0.82],
    mobileAnchor: [0.5, 0.94],
    color: "#c16d3d",
    evidence: "Snowpack, drought, and growing-season observations",
    caveat: "Climate acts through several pathways and is not a single force.",
  },
  {
    id: "bison",
    label: "Bison pressure",
    glyph: "bison",
    habitat: "external",
    anchor: [0.77, 0.9],
    mobileAnchor: [0.78, 0.94],
    color: "#504538",
    evidence: "Ungulate distribution and browsing observations",
    caveat: "Local overlap with elk and woody plants changes seasonally.",
  },
]

const ALL_NODES = [...CORE_NODES, ...PRESSURE_NODES]

const LINKS = [
  { id: "wolf-elk", source: "wolves", target: "elk", relation: "inhibits", sign: -1, activeFrom: 1, confidence: "high", lag: "direct", evidence: "Predation, risk, movement, and herd demography" },
  { id: "wolf-coyote", source: "wolves", target: "coyotes", relation: "suppresses", sign: -1, activeFrom: 1, confidence: "high", lag: "direct", evidence: "Interference and competition between canids" },
  { id: "wolf-scavenger", source: "wolves", target: "scavengers", relation: "provisions", sign: 1, activeFrom: 1, confidence: "high", lag: "seasonal", evidence: "Wolf kills redistribute carrion" },
  { id: "elk-plants", source: "elk", target: "woody-plants", relation: "browses", sign: -1, activeFrom: 0, confidence: "high", lag: "seasonal", evidence: "Browsing pressure on willow and aspen" },
  { id: "plants-beaver", source: "woody-plants", target: "beavers", relation: "supports", sign: 1, activeFrom: 2, confidence: "medium", lag: "years", evidence: "Forage and building material support colonies" },
  { id: "beaver-wetland", source: "beavers", target: "wetlands", relation: "engineers", sign: 1, activeFrom: 2, confidence: "high", lag: "years", evidence: "Dams alter water storage and channel form" },
  { id: "plants-biodiversity", source: "woody-plants", target: "biodiversity", relation: "habitat", sign: 1, activeFrom: 2, confidence: "medium", lag: "years", evidence: "Vegetation structure supports multiple taxa" },
  { id: "wetland-biodiversity", source: "wetlands", target: "biodiversity", relation: "habitat", sign: 1, activeFrom: 2, confidence: "medium", lag: "years", evidence: "Wetland mosaics create habitat diversity" },
  { id: "harvest-elk", source: "harvest", target: "elk", relation: "removes", sign: -1, activeFrom: 3, confidence: "high", lag: "annual", evidence: "Human harvest contributes to elk demography", fullOnly: true },
  { id: "climate-plants", source: "climate", target: "woody-plants", relation: "limits", sign: -1, activeFrom: 3, confidence: "medium", lag: "variable", evidence: "Drought and snowpack affect recruitment", fullOnly: true },
  { id: "climate-wetland", source: "climate", target: "wetlands", relation: "limits", sign: -1, activeFrom: 3, confidence: "medium", lag: "variable", evidence: "Hydrology responds to climate and legacy", fullOnly: true },
  { id: "bison-plants", source: "bison", target: "woody-plants", relation: "browses", sign: -1, activeFrom: 3, confidence: "medium", lag: "seasonal", evidence: "Other ungulates also browse woody plants", fullOnly: true },
]

const SCENARIOS = [
  {
    id: "absent",
    short: "Before restoration",
    title: "Wolves absent",
    chapter: "A simplified system already carrying history",
    narrative: "Elk browsing is prominent within a larger system that already includes hydrology, harvest, other predators, and legacy conditions.",
    values: { wolves: 0, elk: 100, coyotes: 84, scavengers: 34, "woody-plants": 25, beavers: 18, wetlands: 30, biodiversity: 38, harvest: 55, climate: 42, bison: 26 },
  },
  {
    id: "return",
    short: "1995-1996",
    title: "Reintroduction",
    chapter: "Restore a predator and the direct constraints first",
    narrative: "Wolf identity appears at the same semantic anchor. Direct relations to elk, coyotes, and scavengers activate; no shortcut connects wolves to rivers.",
    values: { wolves: 24, elk: 82, coyotes: 63, scavengers: 48, "woody-plants": 28, beavers: 20, wetlands: 31, biodiversity: 40, harvest: 52, climate: 45, bison: 28 },
  },
  {
    id: "early",
    short: "Early cascade",
    title: "Uneven response",
    chapter: "Fast trophic effects meet slow vegetation",
    narrative: "Canids and carrion respond sooner. Woody plants, beaver engineering, and wetlands carry longer lags, so the mobile moves without claiming instant recovery.",
    values: { wolves: 44, elk: 63, coyotes: 45, scavengers: 66, "woody-plants": 44, beavers: 31, wetlands: 39, biodiversity: 54, harvest: 47, climate: 54, bison: 35 },
  },
  {
    id: "later",
    short: "Later ecosystem",
    title: "A changed, not reset, ecosystem",
    chapter: "Engineering, confounders, and hysteresis",
    narrative: "Some riparian sites recover and beaver activity expands while other sites do not. Full mode exposes harvest, climate, bison, and hydrologic legacy as co-authors.",
    values: { wolves: 58, elk: 52, coyotes: 36, scavengers: 72, "woody-plants": 68, beavers: 56, wetlands: 70, biodiversity: 74, harvest: 43, climate: 68, bison: 46 },
  },
]

const implementationCode = `import { StreamPhysicsFrame, compilePhysicsEncoding } from "semiotic/physics"

const compiled = compilePhysicsEncoding({
  data: nodes,
  encoding: {
    id: "id",
    appearance: {
      color: "color",
      shape: () => ({ type: "aabb", width: 92, height: 58 }),
    },
    placement: { x: (d) => anchorX(d), y: (d) => anchorY(d) },
    process: { group: "habitat" },
    evidence: { value: "ecologicalIndex" },
    accessible: { label: "label", description: (d) => d.evidence },
  },
})

const spawns = compiled.spawns.map((body) => ({
  ...body,
  springs: [
    { id: \`anchor-\${body.id}\`, target: { type: "point", x: body.x, y: body.y }, stiffness: 14, damping: 4 },
    ...topologyConstraintsFor(body.id),
  ],
}))

<StreamPhysicsFrame
  initialSpawns={spawns}
  semanticItems={compiled.semanticItems}
  bodyStyle={compiled.bodyStyle}
  beforePaint={drawSignedRelationships}
  renderBody={drawIsotypePlate}
  accessibleTable
/>`

export default function YellowstoneExamplePage() {
  const hostRef = useRef(null)
  const frameRef = useRef(null)
  const positionsRef = useRef({})
  const [width, setWidth] = useState(920)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [detail, setDetail] = useState("simple")
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [selectedId, setSelectedId] = useState("wolves")
  const [lastObservation, setLastObservation] = useState(null)
  const reducedMotion = useReducedMotion()
  const scenario = SCENARIOS[scenarioIndex]
  const arc = usePhysicsExampleConversationArc({
    sessionId: "physics-yellowstone-example",
    arcId: "physics-yellowstone-mobile",
    component: "StreamPhysicsFrame",
    chartId: "yellowstone-mobile",
  })
  const recordArcEdit = arc.recordEdit
  const recordArcRendered = arc.recordRendered

  useEffect(() => {
    if (!hostRef.current || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(300, Math.floor(entry.contentRect.width)))
    })
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [])

  const compact = width < 620
  const chartWidth = Math.max(300, Math.min(980, width))
  const chartHeight = compact ? 720 : 570
  const plate = compact ? { width: 78, height: 54 } : { width: 96, height: 60 }
  const activeNodes = useMemo(
    () => (detail === "full" ? ALL_NODES : CORE_NODES),
    [detail],
  )
  const activeNodeIds = useMemo(
    () => new Set(activeNodes.map((node) => node.id)),
    [activeNodes],
  )
  const activeLinks = useMemo(
    () =>
      LINKS.filter(
        (link) =>
          link.activeFrom <= scenarioIndex &&
          (!link.fullOnly || detail === "full") &&
          activeNodeIds.has(link.source) &&
          activeNodeIds.has(link.target),
      ),
    [activeNodeIds, detail, scenarioIndex],
  )

  const scene = useMemo(() => {
    const nodeRows = activeNodes.map((node) => {
      const value = scenario.values[node.id] ?? 0
      const previous = scenarioIndex > 0 ? SCENARIOS[scenarioIndex - 1].values[node.id] ?? value : value
      const [nx, ny] = compact ? node.mobileAnchor : node.anchor
      return {
        ...node,
        value,
        delta: value - previous,
        x: 24 + nx * (chartWidth - 48),
        y: 32 + ny * (chartHeight - 64),
        unit: "ecological index",
        description: `${node.label}. ${value} ecological index points. ${node.evidence}. Caveat: ${node.caveat}`,
      }
    })
    const compiled = compilePhysicsEncoding({
      data: nodeRows,
      encoding: {
        id: "id",
        appearance: {
          color: "color",
          shape: () => ({ type: "aabb", width: plate.width, height: plate.height }),
        },
        placement: { x: "x", y: "y" },
        dynamics: { mass: (node) => 1 + Math.min(1.5, node.value / 100) },
        process: { group: "habitat" },
        evidence: { value: "value", delta: "delta", unit: "unit" },
        accessible: { label: "label", description: "description", group: "habitat" },
      },
      defaults: { size: plate.width },
    })
    const anchorById = new Map(compiled.rows.map((row) => [row.id, row]))
    const spawns = compiled.spawns.map((spawn, index) => {
      const row = anchorById.get(spawn.id)
      const previous = positionsRef.current[spawn.id]
      const jitter = seededOffset(spawn.id, runId)
      const linkSprings = activeLinks
        .filter((link) => link.source === spawn.id)
        .map((link) => {
          const target = anchorById.get(link.target)
          const distance = target && row
            ? Math.hypot(
                target.placement.x - row.placement.x,
                target.placement.y - row.placement.y,
              )
            : 120
          return {
            id: `relation-${link.id}`,
            target: { type: "body", bodyId: link.target },
            restLength: Math.max(74, distance * 0.82),
            stiffness: link.confidence === "high" ? 2.1 : 1.25,
            damping: 2.8,
          }
        })
      return {
        ...spawn,
        x: previous?.x ?? spawn.x + jitter.x,
        y: previous?.y ?? spawn.y + jitter.y,
        vx: scenarioIndex === 0 ? 0 : jitter.x * 3 + (index % 2 ? 8 : -8),
        vy: scenarioIndex === 0 ? 0 : jitter.y * 3,
        springs: [
          {
            id: `anchor-${spawn.id}`,
            target: { type: "point", x: row.placement.x, y: row.placement.y },
            restLength: 0,
            stiffness: 14,
            damping: 4.5,
          },
          ...linkSprings,
        ],
      }
    })
    const linkItems = activeLinks.map((link) => {
      const source = anchorById.get(link.source)
      const target = anchorById.get(link.target)
      return {
        id: `relationship-${link.id}`,
        label: `${source?.accessible.label ?? link.source} ${link.relation} ${target?.accessible.label ?? link.target}`,
        description: `${link.sign > 0 ? "Positive" : "Negative"} relationship. Confidence ${link.confidence}. Lag ${link.lag}. Evidence: ${link.evidence}.`,
        datum: { ...link, kind: "relationship" },
        x: ((source?.placement.x ?? 0) + (target?.placement.x ?? 0)) / 2,
        y: ((source?.placement.y ?? 0) + (target?.placement.y ?? 0)) / 2,
        shape: "circle",
        width: 18,
        height: 18,
        group: "relationships",
      }
    })
    return {
      ...compiled,
      nodeRows,
      spawns,
      semanticItems: [...compiled.semanticItems, ...linkItems],
    }
  }, [activeLinks, activeNodes, chartHeight, chartWidth, compact, plate.height, plate.width, runId, scenario, scenarioIndex])

  const selectedNode = scene.nodeRows.find((node) => node.id === selectedId)
  const selectedLink = activeLinks.find((link) => link.id === selectedId)
  const selected = selectedNode ?? selectedLink ?? scene.nodeRows[0]

  const capturePositions = useCallback(() => {
    const bodies = frameRef.current?.getData?.() ?? []
    positionsRef.current = Object.fromEntries(
      bodies.map((body) => [body.id, { x: body.x, y: body.y }]),
    )
  }, [])

  const transition = useCallback(
    (nextScenario, nextDetail = detail, action = "chapter") => {
      capturePositions()
      const bounded = Math.max(0, Math.min(SCENARIOS.length - 1, nextScenario))
      recordArcEdit(["scenario", "constraints", "value"], {
        action,
        scenarioId: SCENARIOS[bounded].id,
        detail: nextDetail,
      })
      setScenarioIndex(bounded)
      setDetail(nextDetail)
      setPaused(false)
      setRunId((value) => value + 1)
    },
    [capturePositions, detail, recordArcEdit],
  )

  useEffect(() => {
    recordArcRendered({
      scenarioId: scenario.id,
      detail,
      nodeCount: scene.nodeRows.length,
      relationshipCount: activeLinks.length,
    })
  }, [activeLinks.length, detail, recordArcRendered, runId, scenario.id, scene.nodeRows.length])

  useEffect(() => {
    if (!reducedMotion) return undefined
    const timer = window.setTimeout(() => {
      frameRef.current?.settle?.(2200)
      setPaused(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [chartWidth, reducedMotion, runId])

  const beforePaint = useCallback(
    (ctx, bodies) => {
      drawYellowstoneGround(ctx, chartWidth, chartHeight, compact)
      drawRelationships(ctx, bodies, activeLinks, selectedId)
    },
    [activeLinks, chartHeight, chartWidth, compact, selectedId],
  )

  const renderBody = useCallback(
    (ctx, body) => drawIsotypePlate(ctx, body, plate, selectedId),
    [plate, selectedId],
  )

  const controls = (
    <div className="yellowstone__container-controls" aria-label="Yellowstone playback status">
      <span>{paused ? "settled / paused" : "physics active"}</span>
      <b>{scenarioIndex + 1} / {SCENARIOS.length}</b>
    </div>
  )

  return (
    <ExamplePageLayout title="The Yellowstone Mobile">
      <div className="yellowstone">
        <section className="yellowstone__hero">
          <div>
            <span className="yellowstone__kicker">Constraint topology as a field-guide mobile</span>
            <p>
              Restore wolves and watch a signed ecological topology seek a new equilibrium.
              Spring movement keeps the dependencies legible; it does not encode a literal
              ecosystem. Every plate keeps its identity while its index, evidence, and
              constraints change by chapter.
            </p>
          </div>
          <div className="yellowstone__legend-note">
            <strong>1 glyph = 10 index points</strong>
            <span>Illustrative ecological index, never an animal count.</span>
          </div>
          <PhysicsArcStatus arc={arc} label="Physics story arc" />
        </section>

        <section className="yellowstone__chapter" aria-live="polite">
          <span>Chapter {scenarioIndex + 1}</span>
          <div>
            <h2>{scenario.title}</h2>
            <strong>{scenario.chapter}</strong>
            <p>{scenario.narrative}</p>
          </div>
        </section>

        <section className="yellowstone__controls" aria-label="Yellowstone controls">
          <button type="button" onClick={() => transition(0, detail, "remove-wolves")}>Remove wolves</button>
          <button type="button" onClick={() => transition(Math.max(1, scenarioIndex), detail, "restore-wolves")}>Restore wolves</button>
          <button type="button" disabled={scenarioIndex === 0} onClick={() => transition(scenarioIndex - 1)}>Previous</button>
          <button type="button" disabled={scenarioIndex === SCENARIOS.length - 1} onClick={() => transition(scenarioIndex + 1)}>Next</button>
          <div className="yellowstone__segmented" role="group" aria-label="Ecosystem detail">
            {[
              ["simple", "Core system"],
              ["full", "Full ecosystem"],
            ].map(([id, label]) => (
              <button key={id} type="button" className={detail === id ? "is-active" : ""} aria-pressed={detail === id} onClick={() => transition(scenarioIndex, id, "detail")}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => {
            const next = !paused
            recordArcEdit(["paused"], { paused: next })
            setPaused(next)
          }}>{paused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={() => {
            frameRef.current?.settleWithObservations?.(2400)
            recordArcEdit(["simulation"], { action: "settle" })
            setPaused(true)
          }}>Settle</button>
          <button type="button" onClick={() => {
            positionsRef.current = {}
            recordArcEdit(["scenario", "simulation"], { action: "reset" })
            setScenarioIndex(0)
            setDetail("simple")
            setPaused(false)
            setRunId((value) => value + 1)
          }}>Reset</button>
        </section>

        <section ref={hostRef} className="yellowstone__chart-host">
          <LinkedCharts>
            <ChartContainer
              title="Signed trophic topology"
              subtitle={`${scenario.short}: ${detail === "full" ? "core relations plus external pressures" : "core ecosystem relations"}`}
              status={paused ? "paused" : "live"}
              controls={controls}
              height={chartHeight + 108}
              actions={{ fullscreen: true, export: true }}
              detailsPanel={
                <DetailsPanel position="right" size={292} trigger="click" observation={lastObservation}>
                  {(datum) => <EvidencePanel datum={datum} links={activeLinks} nodes={scene.nodeRows} />}
                </DetailsPanel>
              }
            >
              <StreamPhysicsFrame
                key={`${runId}-${chartWidth}-${detail}`}
                ref={frameRef}
                chartId="yellowstone-mobile"
                title="The Yellowstone Mobile"
                summary={`${scenario.title}. ${scene.nodeRows.length} ecological plates and ${activeLinks.length} signed relationships. Values are illustrative ecological index points, not counts.`}
                description="A deterministic signed constraint topology. Node positions are bounded around semantic habitat anchors. Springs keep relationships legible but do not encode causal magnitude."
                size={[chartWidth, chartHeight]}
                config={{
                  kernel: {
                    seed: 3800 + runId,
                    gravity: { x: 0, y: 0 },
                    velocityDamping: 0.986,
                    collisionIterations: 5,
                    sleepSpeed: 2.6,
                    sleepAfter: 0.45,
                    restitution: 0.08,
                    friction: 0.62,
                    maxVelocity: 360,
                  },
                  fixedDt: 1 / 60,
                  maxSubsteps: 8,
                  settleStepLimit: 2600,
                  observation: { chartId: "yellowstone-mobile", chartType: "StreamPhysicsFrame" },
                }}
                initialSpawns={scene.spawns}
                semanticItems={scene.semanticItems}
                bodySemanticItems={false}
                bodyStyle={scene.bodyStyle}
                selectedBodyStyle={{ stroke: "#17251e", strokeWidth: 3 }}
                selection={{ predicate: (body) => body.id === selectedId }}
                beforePaint={beforePaint}
                renderBody={renderBody}
                background="transparent"
                paused={paused}
                suspendWhenHidden={false}
                accessibleTable
                enableHover
                hoverRadius={28}
                onClick={(datum) => {
                  if (datum?.id) setSelectedId(datum.id)
                }}
                onObservation={(observation) => {
                  if (observation?.type === "click") setLastObservation(observation)
                }}
                onSemanticItemActivate={(item) => {
                  const datum = item.datum ?? {}
                  setSelectedId(datum.kind === "relationship" ? datum.id : datum.id ?? item.id)
                }}
                tooltipContent={(hover) => {
                  const datum = hover.data ?? {}
                  return (
                    <div className="semiotic-tooltip yellowstone__tooltip">
                      <strong>{datum.label}</strong>
                      <span>{datum.value} ecological index points</span>
                      <small>{datum.caveat}</small>
                    </div>
                  )
                }}
              />
            </ChartContainer>
          </LinkedCharts>
        </section>

        <section className="yellowstone__inspector" aria-live="polite">
          <div>
            <span className="yellowstone__kicker">Selected evidence</span>
            <h2>{selectedNode?.label ?? relationshipLabel(selectedLink, scene.nodeRows)}</h2>
          </div>
          <EvidencePanel datum={selected} links={activeLinks} nodes={scene.nodeRows} />
        </section>

        <section className="yellowstone__reading" aria-labelledby="yellowstone-reading-title">
          <div>
            <span className="yellowstone__kicker">How to read the mobile</span>
            <h2 id="yellowstone-reading-title">Motion shows the topology settling after a change.</h2>
          </div>
          <div className="yellowstone__reading-grid">
            <article><strong>Value</strong><p>Repeated glyphs and printed index expose quantity. Collision envelopes stay fixed.</p></article>
            <article><strong>Relation</strong><p>Green plus and rust minus wires expose curated topology. Stiffness controls legibility only.</p></article>
            <article><strong>Scenario</strong><p>Stable IDs reheat from their prior positions. New glyphs bud locally instead of becoming new flying objects.</p></article>
            <article><strong>Uncertainty</strong><p>Dashed wires, evidence notes, lags, and caveats stay visible in the static reading.</p></article>
          </div>
        </section>

        <section className="yellowstone__tables" aria-labelledby="yellowstone-data-title">
          <div>
            <span className="yellowstone__kicker">Accessible static projection</span>
            <h2 id="yellowstone-data-title">The topology still reads with motion removed.</h2>
          </div>
          <details open>
            <summary>Node values and evidence</summary>
            <div className="yellowstone__table-scroll">
              <table>
                <thead><tr><th>Node</th><th>Index</th><th>Delta</th><th>Evidence</th><th>Caveat</th></tr></thead>
                <tbody>{scene.nodeRows.map((node) => (
                  <tr key={node.id}>
                    <th scope="row"><button type="button" onClick={() => setSelectedId(node.id)}>{node.label}</button></th>
                    <td>{node.value}</td><td>{formatDelta(node.delta)}</td><td>{node.evidence}</td><td>{node.caveat}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
          <details>
            <summary>Signed relationships</summary>
            <div className="yellowstone__table-scroll">
              <table>
                <thead><tr><th>Relationship</th><th>Sign</th><th>Confidence</th><th>Lag</th><th>Evidence</th></tr></thead>
                <tbody>{activeLinks.map((link) => (
                  <tr key={link.id}>
                    <th scope="row"><button type="button" onClick={() => setSelectedId(link.id)}>{relationshipLabel(link, scene.nodeRows)}</button></th>
                    <td>{link.sign > 0 ? "positive" : "negative"}</td><td>{link.confidence}</td><td>{link.lag}</td><td>{link.evidence}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </section>

        <section className="yellowstone__method">
          <div>
            <span className="yellowstone__kicker">API finding</span>
            <h2>Compile encodings before executing physics.</h2>
            <p>
              <code>compilePhysicsEncoding</code> resolves accessors into serializable spawns,
              visual styles, and semantic items. <code>StreamPhysicsFrame</code> remains a world
              renderer; a topology recipe adds named constraints without teaching the frame what
              a trophic cascade, supply chain, or causal model means.
            </p>
          </div>
          <CodeBlock language="jsx" showCopyButton code={implementationCode} />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function EvidencePanel({ datum, links, nodes }) {
  if (!datum) return <p>Select a plate or relationship to inspect its evidence.</p>
  if (datum.kind === "relationship" || datum.source) {
    const link = links.find((candidate) => candidate.id === datum.id) ?? datum
    return (
      <div className="yellowstone__evidence-panel">
        <strong>{relationshipLabel(link, nodes)}</strong>
        <dl>
          <div><dt>Sign</dt><dd>{link.sign > 0 ? "positive" : "negative"}</dd></div>
          <div><dt>Confidence</dt><dd>{link.confidence}</dd></div>
          <div><dt>Lag</dt><dd>{link.lag}</dd></div>
        </dl>
        <p>{link.evidence}</p>
        <small>Wire strength is a legibility preset, not an ecological effect size.</small>
      </div>
    )
  }
  return (
    <div className="yellowstone__evidence-panel">
      <strong>{datum.label}</strong>
      <dl>
        <div><dt>Value</dt><dd>{datum.value} index points</dd></div>
        <div><dt>Change</dt><dd>{formatDelta(datum.delta)}</dd></div>
        <div><dt>Habitat</dt><dd>{datum.habitat}</dd></div>
      </dl>
      <p>{datum.evidence}</p>
      <small>{datum.caveat}</small>
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])
  return reduced
}

function seededOffset(id, revision) {
  let hash = 2166136261 ^ revision
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return { x: ((hash & 255) / 255 - 0.5) * 18, y: (((hash >>> 8) & 255) / 255 - 0.5) * 18 }
}

function drawYellowstoneGround(ctx, width, height, compact) {
  ctx.save()
  ctx.fillStyle = "#f3ecd8"
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 0.16
  ctx.strokeStyle = "#6d593c"
  ctx.lineWidth = 1
  for (let y = 12; y < height; y += 22) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= width; x += 38) ctx.lineTo(x, y + Math.sin((x + y) * 0.03) * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.72
  ctx.strokeStyle = "#5e9ca1"
  ctx.lineWidth = compact ? 22 : 34
  ctx.beginPath()
  if (compact) {
    ctx.moveTo(width * 0.08, height * 0.69)
    ctx.bezierCurveTo(width * 0.45, height * 0.63, width * 0.45, height * 0.84, width * 0.93, height * 0.79)
  } else {
    ctx.moveTo(width * 0.52, height * 0.08)
    ctx.bezierCurveTo(width * 0.73, height * 0.3, width * 0.67, height * 0.62, width * 0.98, height * 0.93)
  }
  ctx.stroke()
  ctx.globalAlpha = 0.42
  ctx.fillStyle = "#345847"
  ctx.font = "700 10px Georgia, serif"
  ctx.fillText("UPLAND", 16, 20)
  ctx.fillText("RIPARIAN CORRIDOR", compact ? 14 : width * 0.54, compact ? height * 0.67 : 26)
  ctx.restore()
}

function drawRelationships(ctx, bodies, links, selectedId) {
  const byId = new Map(bodies.map((body) => [body.id, body]))
  ctx.save()
  for (const link of links) {
    const source = byId.get(link.source)
    const target = byId.get(link.target)
    if (!source || !target) continue
    const related = !selectedId || selectedId === link.id || selectedId === link.source || selectedId === link.target
    ctx.globalAlpha = related ? 0.82 : 0.12
    ctx.strokeStyle = link.sign > 0 ? "#52734d" : "#a24e3e"
    ctx.lineWidth = related ? 2.4 : 1.2
    ctx.setLineDash(link.confidence === "high" ? [] : [6, 5])
    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    const bend = (source.x < target.x ? 1 : -1) * 16
    ctx.quadraticCurveTo((source.x + target.x) / 2, (source.y + target.y) / 2 + bend, target.x, target.y)
    ctx.stroke()
    const x = (source.x + target.x) / 2
    const y = (source.y + target.y) / 2 + bend / 2
    ctx.setLineDash([])
    ctx.fillStyle = "#f3ecd8"
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = link.sign > 0 ? "#52734d" : "#a24e3e"
    ctx.stroke()
    ctx.fillStyle = ctx.strokeStyle
    ctx.font = "800 13px Georgia, serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(link.sign > 0 ? "+" : "-", x, y - 0.5)
  }
  ctx.restore()
}

function drawIsotypePlate(ctx, body, plate, selectedId) {
  const datum = body.datum ?? {}
  const x = body.x - plate.width / 2
  const y = body.y - plate.height / 2
  const isZero = Number(datum.value) === 0
  ctx.save()
  ctx.globalAlpha = isZero ? 0.52 : 0.96
  roundedRect(ctx, x, y, plate.width, plate.height, 7)
  ctx.fillStyle = isZero ? "#eee5cf" : "#fbf5e5"
  ctx.fill()
  ctx.strokeStyle = body.id === selectedId ? "#18271f" : datum.color ?? "#4c5a4d"
  ctx.lineWidth = body.id === selectedId ? 3 : 1.6
  ctx.stroke()
  ctx.fillStyle = "#24342b"
  ctx.font = `${plate.width < 90 ? 8 : 9}px Georgia, serif`
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText(datum.label ?? body.id, x + 7, y + 5)
  ctx.textAlign = "right"
  ctx.font = `700 ${plate.width < 90 ? 9 : 10}px ui-monospace, monospace`
  ctx.fillText(String(datum.value ?? 0), x + plate.width - 7, y + 5)

  const total = Math.max(0, Number(datum.value) || 0) / 10
  const slots = Math.ceil(total)
  const columns = 5
  const glyphSize = plate.width < 90 ? 7 : 8
  for (let i = 0; i < slots; i += 1) {
    const fraction = Math.min(1, total - i)
    const gx = x + 10 + (i % columns) * ((plate.width - 20) / columns)
    const gy = y + 29 + Math.floor(i / columns) * 13
    ctx.save()
    if (fraction < 1) {
      ctx.beginPath()
      ctx.rect(gx - glyphSize, gy - glyphSize, glyphSize * 2 * fraction, glyphSize * 2)
      ctx.clip()
    }
    ctx.strokeStyle = datum.color ?? "#4c5a4d"
    ctx.fillStyle = datum.color ?? "#4c5a4d"
    ctx.lineWidth = 1.3
    drawGlyph(ctx, datum.glyph, gx, gy, glyphSize)
    ctx.restore()
  }
  if (isZero) {
    ctx.fillStyle = "#7b6d59"
    ctx.font = "italic 8px Georgia, serif"
    ctx.textAlign = "left"
    ctx.fillText("absent", x + 8, y + plate.height - 13)
  }
  ctx.restore()
}

function drawGlyph(ctx, glyph, x, y, r) {
  ctx.beginPath()
  if (glyph === "wave") {
    ctx.moveTo(x - r, y)
    ctx.quadraticCurveTo(x - r / 2, y - r / 2, x, y)
    ctx.quadraticCurveTo(x + r / 2, y + r / 2, x + r, y)
    ctx.stroke()
  } else if (glyph === "sprout") {
    ctx.moveTo(x, y + r)
    ctx.lineTo(x, y - r)
    ctx.moveTo(x, y - r / 3)
    ctx.quadraticCurveTo(x - r, y - r, x - r, y)
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + r, y - r / 2, x + r, y + r / 3)
    ctx.stroke()
  } else if (glyph === "wing") {
    ctx.moveTo(x - r, y + r / 2)
    ctx.quadraticCurveTo(x - r / 2, y - r, x, y)
    ctx.quadraticCurveTo(x + r / 2, y - r, x + r, y + r / 2)
    ctx.stroke()
  } else if (glyph === "star") {
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 ? r * 0.42 : r
      const angle = -Math.PI / 2 + (Math.PI * i) / 5
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  } else if (glyph === "sun" || glyph === "target") {
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2)
    ctx.stroke()
    if (glyph === "sun") {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8
        ctx.moveTo(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7)
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
      }
      ctx.stroke()
    }
  } else if (glyph === "beaver") {
    ctx.rect(x - r * 0.7, y - r * 0.55, r * 1.05, r * 1.1)
    ctx.moveTo(x + r * 0.35, y)
    ctx.lineTo(x + r, y + r * 0.55)
    ctx.lineTo(x + r * 0.75, y - r * 0.4)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.moveTo(x - r, y + r * 0.7)
    ctx.lineTo(x - r * 0.55, y - r)
    ctx.lineTo(x, y - r * 0.25)
    ctx.lineTo(x + r * 0.55, y - r)
    ctx.lineTo(x + r, y + r * 0.7)
    ctx.closePath()
    ctx.fill()
    if (glyph === "elk" || glyph === "bison") {
      ctx.beginPath()
      ctx.moveTo(x - r * 0.5, y - r * 0.45)
      ctx.lineTo(x - r, y - r)
      ctx.moveTo(x + r * 0.5, y - r * 0.45)
      ctx.lineTo(x + r, y - r)
      ctx.stroke()
    }
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function relationshipLabel(link, nodes) {
  if (!link) return "Relationship"
  const source = nodes.find((node) => node.id === link.source)?.label ?? link.source
  const target = nodes.find((node) => node.id === link.target)?.label ?? link.target
  return `${source} ${link.relation} ${target}`
}

function formatDelta(value) {
  if (!Number.isFinite(value) || value === 0) return "no change"
  return `${value > 0 ? "+" : ""}${value} points`
}
