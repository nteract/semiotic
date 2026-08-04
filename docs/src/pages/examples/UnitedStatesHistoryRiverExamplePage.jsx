import React, { useState } from "react"
import { ProcessSankey } from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ProcessRiverExampleLayout from "./ProcessRiverExampleLayout"
import {
  US_AXIS_TICKS,
  US_COLORS,
  US_DOMAIN,
  US_FLOW_TYPES,
  US_MILESTONES,
  US_PROCESS_EDGES,
  US_PROCESS_NODES,
  US_RIVER_METADATA,
  US_SOURCES,
  US_WIDTH_UNIT,
  formatUsYear,
  usEventsForMilestone,
  usMilestoneById,
  usNodeLabel,
} from "./data/unitedStatesHistoryRiver"
import "./UnitedStatesHistoryRiverExamplePage.css"

const implementationCode = `import { ProcessSankey } from "semiotic"

<ProcessSankey
  nodes={institutionsAndSources}
  edges={jurisdictionEvents}
  domain={[1763, 2025]}
  axisTicks={historicalMilestones}
  orientation="vertical"
  nodeLabel="shortLabel"
  colorBy="category"
  groupBy="group"
  systemInTimeAccessor="systemInTime"
  systemOutTimeAccessor="systemOutTime"
  packing="reuse"
  laneOrder="crossing-min+inside-out"
  lanePlacement="hug"
  ribbonLane="both"
  ribbonMinRun="auto"
  lifetimeMode="full"
/>

// US_STATES, US_TERRITORIES, and US_COLONIES are long-lived nodes.
// Pre-domain sources blur into view. Acquisitions add stock; statehood
// transfers it; secession removes and Reconstruction returns it.
// Colonial exits fade at systemOutTime.
// Width counts jurisdiction routes—one polity thread per unit.`

const FLOW_BY_ID = new Map(US_FLOW_TYPES.map((flow) => [flow.id, flow]))

function routes(value) {
  return `${value} ${value === 1 ? US_WIDTH_UNIT.singular : US_WIDTH_UNIT.plural}`
}

function namedMembers(edge) {
  const members = edge.members ?? []
  if (members.length === 0) return "This jurisdiction"
  if (members.length === 1) return members[0]
  if (members.length === 2) return `${members[0]} and ${members[1]}`
  return `${members.slice(0, -1).join(", ")}, and ${members.at(-1)}`
}

function datumMilestoneId(datum) {
  return datum?.milestoneId ?? null
}

export function usInventoryAt(nodeId, time, edges = US_PROCESS_EDGES) {
  const events = []
  for (const edge of edges) {
    if (edge.target === nodeId) events.push({ time: edge.endTime, delta: edge.value })
    if (edge.source === nodeId) events.push({ time: edge.startTime, delta: -edge.value })
    if (edge.target === nodeId && edge.systemOutTime != null) {
      events.push({ time: edge.systemOutTime, delta: -edge.value })
    }
  }
  events.sort((a, b) => a.time - b.time || b.delta - a.delta)

  // Predecessor/source nodes begin with authored stock rather than an inbound
  // transaction. Infer only the opening amount required to keep their ledger
  // non-negative; persistent institutions already begin at zero.
  let running = 0
  let minimum = 0
  let balanceAtTime = 0
  for (const event of events) {
    running += event.delta
    minimum = Math.min(minimum, running)
    if (event.time <= time) balanceAtTime += event.delta
  }
  return balanceAtTime - minimum
}

function nodeInventorySummary(node, edges = US_PROCESS_EDGES) {
  const outgoing = edges.filter((edge) => edge.source === node.id)
  if (node.nodeType === "source") {
    return `${routes(outgoing.reduce((sum, edge) => sum + edge.value, 0))} depart this source`
  }
  const inventory = usInventoryAt(node.id, US_DOMAIN[1], edges)
  return `${inventory} active ${inventory === 1 ? US_WIDTH_UNIT.singular : US_WIDTH_UNIT.plural} at present`
}

export function UnitedStatesRiverTooltip({ hover, edges = US_PROCESS_EDGES }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null

  if (datum.source && datum.target) {
    const flow = FLOW_BY_ID.get(datum.eventType)
    return (
      <div className="semiotic-tooltip process-river__tooltip usa-becoming__tooltip">
        <span>{datum.dateLabel} / {flow?.label ?? datum.eventType}</span>
        <strong>{datum.sourceLabel} → {datum.targetLabel}</strong>
        <p>{namedMembers(datum)} travel{datum.members?.length === 1 ? "s" : ""} on this route.</p>
        <b>{routes(datum.value)}</b>
        {datum.systemOutTime != null && (
          <em>Fades from the U.S. Colonies band on {datum.systemOutDateLabel}: {datum.systemOutLabel}.</em>
        )}
        <small>{datum.legalStatus ? `${datum.legalStatus}. ` : ""}{datum.notes}</small>
      </div>
    )
  }

  if (!datum.id) return null
  const incoming = edges.filter((edge) => edge.target === datum.id)
  const outgoing = edges.filter((edge) => edge.source === datum.id)
  const [start, end] = datum.xExtent ?? []
  return (
    <div className="semiotic-tooltip process-river__tooltip usa-becoming__tooltip">
      <span>{start == null ? "event source" : `${formatUsYear(start)} → ${formatUsYear(end)}`} / {datum.status}</span>
      <strong>{datum.label ?? datum.id}</strong>
      <p>{datum.description}</p>
      <b>{nodeInventorySummary(datum, edges)}</b>
      <small>{incoming.length} inflow{incoming.length === 1 ? "" : "s"} · {outgoing.length} departure{outgoing.length === 1 ? "" : "s"}</small>
    </div>
  )
}

function StatusKey() {
  const statuses = [
    { id: "states", label: "United States", note: "dark blue / states" },
    { id: "territories", label: "U.S. Territories", note: "mid blue / nonstate territorial routes" },
    { id: "colonies", label: "U.S. Colonies", note: "light blue / external administration" },
  ]
  return (
    <div className="usa-becoming__status-key" aria-label="Persistent institution color key">
      <span>THE THREE INSTITUTIONS</span>
      <div>
        {statuses.map((status) => (
          <article key={status.id}>
            <i style={{ background: US_COLORS[status.id] }} aria-hidden="true" />
            <span><strong>{status.label}</strong>{status.note}</span>
          </article>
        ))}
      </div>
    </div>
  )
}

function EventReader({ milestone, selectedDatum, onMilestoneChange }) {
  const events = usEventsForMilestone(milestone.id)
  const selectedNode = selectedDatum?.id && !selectedDatum.source ? selectedDatum : null
  const selectedEdge = selectedDatum?.source && selectedDatum?.target ? selectedDatum : null

  return (
    <aside className="process-river__reader" aria-live="polite">
      <span className="process-river__reader-kicker">CURRENT EVENT</span>
      <label className="process-river__stage-select">
        <span>Inspect an event</span>
        <select value={milestone.id} onChange={(event) => onMilestoneChange(event.target.value)}>
          {US_MILESTONES.map((option) => (
            <option key={option.id} value={option.id}>{option.benchmark} — {option.label}</option>
          ))}
        </select>
      </label>
      <strong className="process-river__reader-year">{milestone.benchmark}</strong>
      <h3>{milestone.label}</h3>
      <p>{milestone.description}</p>

      {events.length > 0 && (
        <div className="process-river__reader-events">
          {events.map((event) => (
            <article key={event.id}>
              <small>{event.date} / {event.event_type}</small>
              <strong>{event.title}</strong>
              <p>{event.status_consequence || event.notes}</p>
            </article>
          ))}
        </div>
      )}

      {(selectedNode || selectedEdge) && (
        <div className="process-river__selection">
          <span>SELECTED {selectedNode ? "INSTITUTION" : "ROUTE"}</span>
          <strong>{selectedNode?.label ?? `${selectedEdge.sourceLabel} → ${selectedEdge.targetLabel}`}</strong>
          <p>{selectedNode?.description ?? selectedEdge.notes}</p>
          <b>{selectedNode
            ? nodeInventorySummary(selectedNode)
            : routes(selectedEdge.value)}</b>
        </div>
      )}
    </aside>
  )
}

const FINDINGS = [
  {
    eyebrow: "1783 → 1959 / inventory before admission",
    title: "Statehood is a transfer, not an arrival from nowhere.",
    body: "Acquisitions collect inside Territories, sometimes for generations. Thirty-two routes eventually cross into the United States; five inhabited territorial routes still do not.",
  },
  {
    eyebrow: "1860 → 1870 / rupture and return",
    title: "The state river tears from within.",
    body: "Eleven routes leave in two secession waves, then return in three unequal Reconstruction passages. Military defeat in 1865 does not instantly restore political representation.",
  },
  {
    eyebrow: "1898 → 1999 / exits without statehood",
    title: "The colonial branch is not a waiting room.",
    body: "Cuba leaves occupation, the Philippines reaches independence, three Pacific trust successors become sovereign, and canal control returns to Panama. None moves into the state band.",
  },
]

const EXIT_IDS = [
  "CUBA_OCCUPATION_1898",
  "CUBA_OCCUPATION_1906",
  "PHILIPPINES",
  "TTPI_FSM",
  "TTPI_RMI",
  "TTPI_PALAU",
  "PANAMA_CANAL_CONTROL",
]

export default function UnitedStatesHistoryRiverExamplePage() {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("FOUNDING")
  const [selectedDatum, setSelectedDatum] = useState(null)
  // Bucket width so ProcessSankey packing/order does not re-run every pixel of resize.
  const [chartWidth, chartRef] = useResponsiveWidth(300, 980, { bucket: 40 })
  const compact = chartWidth < 620
  const selectedMilestone = usMilestoneById(selectedMilestoneId)

  function inspectDatum(hover) {
    const datum = unwrapDatum(hover)
    if (!datum) return
    setSelectedDatum(datum)
    const milestoneId = datumMilestoneId(datum)
    if (milestoneId) setSelectedMilestoneId(milestoneId)
  }

  return (
    <ProcessRiverExampleLayout
      pageTitle="The United States, Drawn Together"
      themeClass="usa-becoming"
      masthead={{
        kicker: "A HISTORY RIVER / 1763 → PRESENT",
        title: <h2>HOW<br />THE UNION<br />HELD &amp; CHANGED</h2>,
        copy: (
          <p>
            Follow named jurisdiction routes as they enter, wait inside, leave, and sometimes return to three
            persistent institutions: the United States, United States Territories, and United States Colonies.
          </p>
        ),
        tagline: "Time falls. Institutions persist. Jurisdictions move.",
      }}
      readingKey={[
        { icon: "↓", title: "READ DOWN", body: "Calendar time runs from imperial North America to the present." },
        { icon: "+", title: "WATCH INVENTORY", body: "A band grows when routes enter and shrinks when they transfer out." },
        { icon: "∿", title: "FOLLOW THE FADE", body: "A dissolving light-blue route marks the end of U.S. administration." },
      ]}
      river={{
        idPrefix: "usa",
        kicker: "01 / A national stock-and-flow history",
        title: "Three institutions, 262 years of movement",
        intro: "A bonded red, grey-white, and blue colonial braid forms the United States. The dark, mid, and light-blue bands then persist through time: acquisitions feed them; thirty-two statehood passages move routes between them; Civil War removes and Reconstruction restores eleven.",
        controls: <StatusKey />,
        chartRef,
        chart: (
          <ProcessSankey
            nodes={US_PROCESS_NODES}
            edges={US_PROCESS_EDGES}
            domain={US_DOMAIN}
            axisTicks={US_AXIS_TICKS}
            orientation="vertical"
            nodeLabel={usNodeLabel}
            width={Math.max(300, chartWidth)}
            height={compact ? 2600 : 2900}
            margin={{ top: 28, right: compact ? 8 : 24, bottom: 22, left: compact ? 68 : 94 }}
            colorBy="category"
            colorScheme={US_COLORS}
            groupBy="group"
            showLegend={false}
            systemInTimeAccessor="systemInTime"
            systemOutTimeAccessor="systemOutTime"
            pairing="temporal"
            packing="reuse"
            laneOrder="crossing-min+inside-out"
            lanePlacement="hug"
            ribbonLane="both"
            ribbonMinRun="auto"
            lifetimeMode="full"
            // Docs stories stay on the main thread so first paint is immediate
            // and Vite dev does not wait on a layout worker module URL.
            layoutExecution="sync"
            showLabels={compact ? "auto" : true}
            edgeOpacity={0.8}
            tooltip={(hover) => <UnitedStatesRiverTooltip hover={hover} />}
            onClick={inspectDatum}
            timeFormat={formatUsYear}
            valueFormat={(value) => routes(value)}
            accessibleTable
            description="A top-to-bottom ProcessSankey shows one persistent United States node, one United States Territories node, and one United States Colonies node receiving jurisdiction routes from 1763 to the present. Territorial routes transfer to statehood, Confederate routes leave and return, and colonial administrations fade when they end."
            summary="Thirteen colonies enter one United States in 1776. Continental and island acquisitions accumulate in a persistent Territories band before statehood or continued territorial status. Eleven state routes leave during the Civil War and return during Reconstruction. Cuba, the Philippines, Pacific trust successors, and canal control leave a separate colonies-and-administration band without being forced into statehood."
            chartId="united-states-history-river"
          />
        ),
        reader: (
          <EventReader
            milestone={selectedMilestone}
            selectedDatum={selectedDatum}
            onMilestoneChange={(milestoneId) => {
              setSelectedMilestoneId(milestoneId)
              setSelectedDatum(null)
            }}
          />
        ),
        caption: (
          <>
            Width counts {US_WIDTH_UNIT.description}. It does not compare land area, population, wealth, legitimacy,
            or the intensity of control. Source lineages already present before 1763 blur in at the top boundary;
            the three founding-region bundles and the 1783 interior cessions enter sharply because this model creates
            them inside the displayed period. The three blue institutions are intentionally not bonded: the space between
            them makes each legal-status transfer visible. “United States Colonies” is an analytical administration
            band, not a claim that Cuba, the Canal Zone, or a U.N. trust shared one constitutional status. The federal
            district is outside this focused comparison rather than being mislabeled as a territory.
          </>
        ),
      }}
      findings={{
        kicker: "02 / Three movements worth following",
        title: "Formation is a sequence of residence, transfer, rupture, and exit.",
        items: FINDINGS.map((finding) => ({
          key: finding.eyebrow,
          eyebrow: finding.eyebrow,
          title: finding.title,
          body: finding.body,
        })),
      }}
      outside={{
        kicker: "03 / Routes that leave",
        title: "Some administrations end instead of becoming states.",
        intro: (
          <p>
            The light-blue band uses lifecycle exits: its color holds from entry to the recorded end of U.S.
            administration, then fades away. No invented “former colony” endpoint is needed to keep the ribbon on screen.
          </p>
        ),
        note: (
          <p className="usa-becoming__outside-note">
            Cuba appears twice because occupation ended in 1902 and resumed from 1906 to 1909. It was never annexed
            as a U.S. territory. Philippine rule is shown as one long route with contested military, colonial, and Commonwealth phases.
          </p>
        ),
        items: US_PROCESS_EDGES.filter((edge) => EXIT_IDS.includes(edge.holdingId)).map((edge) => (
          <article key={edge.id}>
            <small>{edge.dateLabel} → {edge.systemOutDateLabel} / {edge.legalStatus}</small>
            <strong>{edge.members.join(", ")}</strong>
            <p>{edge.notes}</p>
            <span>{edge.systemOutLabel}</span>
          </article>
        )),
      }}
      method={{
        kicker: "04 / What a route means",
        title: "Count status-bearing paths, then preserve the legal differences.",
        body: (
          <>
            <p>{US_RIVER_METADATA.width_definition}</p>
            <p>
              Acquisition cohorts use each modern jurisdiction’s primary route from the source ledger. Mixed present-state
              geographies remain in provenance notes rather than being split into unsupported fractions.
            </p>
            <p className="process-river__warning">{US_RIVER_METADATA.civil_war_caveat}</p>
            <p className="process-river__warning">
              Colonial administration is not one legal category: occupation, possession, international trusteeship,
              treaty control, unincorporated territory, and sovereign free association remain distinct in labels and tooltips.
            </p>
          </>
        ),
        sources: US_SOURCES,
      }}
      code={{
        kicker: "05 / Let the institutions persist",
        title: "Build an event ledger, not a stack of snapshots.",
        intro: "Each acquisition, admission, secession, restoration, and administrative exit is one dated transaction. ProcessSankey holds the inventory between transactions, reuses short-lived source lanes, and renders lifecycle fades on the vertical time axis. Adaptive feeder runway lets compressed events begin curving earlier; the source band hands each route to its curve at that same visual point without changing the historical date.",
        source: implementationCode,
      }}
      footer={{
        kicker: "UNITED STATES / 1763–PRESENT / AN INSTITUTIONAL RIVER",
        tagline: "Statehood is one destination. History keeps the other exits visible.",
        stats: "13 founding routes · 32 territorial statehood transfers · 11 Civil War departures and returns · 7 lifecycle exits",
      }}
    />
  )
}
