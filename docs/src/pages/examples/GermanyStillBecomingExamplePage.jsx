import React, { useMemo, useState } from "react"
import { ProcessSankey } from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ProcessRiverExampleLayout from "./ProcessRiverExampleLayout"
import {
  GERMANY_AXIS_TICKS,
  GERMANY_COLORS,
  GERMANY_DOMAIN,
  GERMANY_ENDPOINT_ATOMS,
  GERMANY_EVENTS,
  GERMANY_EXTERNAL_FLOWS,
  GERMANY_FLOW_TYPES,
  GERMANY_METRICS,
  GERMANY_PROCESS_EDGES,
  GERMANY_PROCESS_NODES,
  GERMANY_RIVER_METADATA,
  GERMANY_SOURCES,
  GERMANY_STAGES,
  formatGermanyStage,
  germanyEventsForStage,
  germanyNodeLabel,
  germanyStageById,
} from "./data/germanyStillBecoming"
import "./GermanyStillBecomingExamplePage.css"

const implementationCode = `import { ProcessSankey } from "semiotic"

<ProcessSankey
  nodes={historicalContainers}
  edges={massConservingTransitions}
  domain={[-0.18, 11.18]}
  axisTicks={historicalStages}
  orientation="vertical"
  nodeLabel="shortLabel"
  colorBy="lineageFamily"
  packing="reuse"
  laneOrder="crossing-min+inside-out"
  lanePlacement="hug"
  ribbonLane="both"
  lifetimeMode="full"
/>

// Each transition totals 100%. Width follows a fixed contribution
// from the 2022 German endpoint, not the historical state's size.`

const FLOW_BY_ID = new Map(GERMANY_FLOW_TYPES.map((flow) => [flow.id, flow]))
const METRIC_BY_ID = new Map(GERMANY_METRICS.map((metric) => [metric.id, metric]))

function percent(value) {
  return `${Number(value).toFixed(value >= 10 ? 1 : 2)}%`
}

function datumStageId(datum) {
  if (!datum) return null
  return datum.stageId ?? datum.chapterId ?? datum.target_stage ?? datum.source_stage ?? null
}

export function GermanyBecomingTooltip({ hover, metricId = "balanced_pct_DE", edges = GERMANY_PROCESS_EDGES }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  const metric = METRIC_BY_ID.get(metricId) ?? GERMANY_METRICS[0]

  if (datum.link_id || datum.source_node_id) {
    const flow = FLOW_BY_ID.get(datum.flow_type)
    return (
      <div className="semiotic-tooltip process-river__tooltip">
        <span>{datum.sourceBenchmark} → {datum.targetBenchmark} / {flow?.label ?? datum.flow_type}</span>
        <strong>{datum.sourceLabel} → {datum.targetLabel}</strong>
        <p>{datum.atom_count} endpoint contribution{datum.atom_count === 1 ? "" : "s"} travel together on this segment.</p>
        <b>{percent(datum[metric.id])} by {metric.shortLabel}</b>
        <small>{datum.notes}</small>
      </div>
    )
  }

  if (!datum.node_id && !datum.id) return null
  const related = edges.filter((edge) => edge.source === datum.id || edge.target === datum.id)
  return (
    <div className="semiotic-tooltip process-river__tooltip">
      <span>{datum.benchmark} / {datum.political_status}</span>
      <strong>{datum.label ?? datum.id}</strong>
      <p>{datum.description}</p>
      <b>{percent(datum[metric.id])} of the endpoint by {metric.shortLabel}</b>
      <small>{related.length} incoming or outgoing river segment{related.length === 1 ? "" : "s"}</small>
    </div>
  )
}

function MetricControl({ metricId, onChange }) {
  return (
    <div className="process-river__metric-control" role="group" aria-label="Choose what controls river width">
      <span>WIDTH FOLLOWS</span>
      <div>
        {GERMANY_METRICS.map((metric) => (
          <button
            type="button"
            key={metric.id}
            aria-pressed={metricId === metric.id}
            onClick={() => onChange(metric.id)}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StageReader({ stage, selectedDatum, metricId, onStageChange }) {
  const events = germanyEventsForStage(stage.id)
  const metric = METRIC_BY_ID.get(metricId) ?? GERMANY_METRICS[0]
  const selectedNode = selectedDatum?.node_id ? selectedDatum : null
  const selectedEdge = selectedDatum?.link_id ? selectedDatum : null

  return (
    <aside className="process-river__reader" aria-live="polite">
      <span className="process-river__reader-kicker">CURRENT OPENING</span>
      <label className="process-river__stage-select">
        <span>Inspect a stage</span>
        <select value={stage.id} onChange={(event) => onStageChange(event.target.value)}>
          {GERMANY_STAGES.map((option) => (
            <option key={option.id} value={option.id}>{option.benchmark} — {option.label}</option>
          ))}
        </select>
      </label>
      <strong className="process-river__reader-year">{stage.benchmark}</strong>
      <h3>{stage.label}</h3>
      <p>{stage.description}</p>

      {events.length > 0 && (
        <div className="process-river__reader-events">
          {events.map((event) => (
            <article key={event.id}>
              <small>{event.date} / {event.event_type}</small>
              <strong>{event.title}</strong>
              <p>{event.notes}</p>
            </article>
          ))}
        </div>
      )}

      {(selectedNode || selectedEdge) && (
        <div className="process-river__selection">
          <span>SELECTED {selectedNode ? "CONTAINER" : "PASSAGE"}</span>
          <strong>{selectedNode?.label ?? `${selectedEdge.sourceLabel} → ${selectedEdge.targetLabel}`}</strong>
          <p>{selectedNode?.description ?? selectedEdge.notes}</p>
          <b>{percent((selectedNode ?? selectedEdge)[metric.id])} by {metric.shortLabel}</b>
        </div>
      )}
    </aside>
  )
}

const FINDINGS = [
  {
    stageId: "S03",
    eyebrow: "1648 / exits become visible",
    title: "The river is also defined by what leaves it.",
    body: "Westphalia formalizes Swiss and Dutch separation while the core territory breaks into fifteen compressed streams. The missing tributaries matter even when their widths cannot be compared honestly.",
  },
  {
    stageId: "S05",
    eyebrow: "1867 / a narrow throat",
    title: "Unification begins as an exclusion and a bottleneck.",
    body: "Four southern states remain separate while most northern contributions compress into the Prussian-led North German Confederation. Austria’s confederal lands leave the route entirely.",
  },
  {
    stageId: "S09",
    eyebrow: "1957 → 1990 / identities return",
    title: "Administrative disappearance does not end a regional lineage.",
    body: "The eastern contributions disappear inside one GDR stream, then fan back into five restored Länder. Berlin’s halves recombine on a separate path.",
  },
]

export default function GermanyStillBecomingExamplePage() {
  const [metricId, setMetricId] = useState("balanced_pct_DE")
  const [selectedStageId, setSelectedStageId] = useState("S00")
  const [selectedDatum, setSelectedDatum] = useState(null)
  // Bucket width so ProcessSankey packing/order does not re-run every pixel of resize.
  const [chartWidth, chartRef] = useResponsiveWidth(300, 980, { bucket: 40 })
  const compact = chartWidth < 620
  const activeMetric = METRIC_BY_ID.get(metricId) ?? GERMANY_METRICS[0]
  const selectedStage = germanyStageById(selectedStageId)

  const weightedEdges = useMemo(() => GERMANY_PROCESS_EDGES.map((edge) => ({
    ...edge,
    value: edge[metricId],
  })), [metricId])

  function inspectDatum(hover) {
    const datum = unwrapDatum(hover)
    if (!datum) return
    setSelectedDatum(datum)
    const stageId = datumStageId(datum)
    if (stageId) setSelectedStageId(stageId)
  }

  return (
    <ProcessRiverExampleLayout
      pageTitle="Germany, Still Becoming"
      themeClass="germany-becoming"
      masthead={{
        kicker: "A HISTORY RIVER / c. 750 → 1990",
        title: <h2>HOW<br />GERMANY<br />RAN TOGETHER</h2>,
        copy: (
          <p>
            Follow the regional contributions inside present-day Germany as they split across duchies, electorates,
            kingdoms, occupation zones, and Länder—then repeatedly merge into larger political containers.
          </p>
        ),
        tagline: "Time falls. Width is conserved. Names change.",
      }}
      readingKey={[
        { icon: "↓", title: "READ DOWN", body: "Each horizontal opening is a historical benchmark." },
        { icon: "≈", title: "FOLLOW WIDTH", body: "Every transition conserves exactly 100% of the chosen modern endpoint measure." },
        { icon: "↯", title: "WATCH THE SHAPE", body: "Splits expose fragmentation; narrow throats expose consolidation; returning branches expose restoration." },
      ]}
      river={{
        idPrefix: "germany",
        kicker: "01 / The constitutional watershed",
        title: "Twelve openings, one changing river",
        intro: `The chart traces ${GERMANY_ENDPOINT_ATOMS.length} fixed endpoint contributions through ${GERMANY_STAGES.length} historical stages. Hover or click any stream; use the width control to ask a different question of the same topology.`,
        controls: <MetricControl metricId={metricId} onChange={setMetricId} />,
        chartRef,
        chart: (
          <ProcessSankey
            nodes={GERMANY_PROCESS_NODES}
            edges={weightedEdges}
            domain={GERMANY_DOMAIN}
            axisTicks={GERMANY_AXIS_TICKS}
            orientation="vertical"
            nodeLabel={germanyNodeLabel}
            width={Math.max(300, chartWidth)}
            height={compact ? 1900 : 2200}
            margin={{ top: 34, right: compact ? 8 : 28, bottom: 24, left: compact ? 58 : 88 }}
            colorBy="category"
            colorScheme={GERMANY_COLORS}
            showLegend={false}
            pairing="temporal"
            packing="reuse"
            laneOrder="crossing-min+inside-out"
            lanePlacement="hug"
            ribbonLane="both"
            lifetimeMode="full"
            // Docs stories stay on the main thread so first paint is immediate
            // and Vite dev does not wait on a layout worker module URL.
            layoutExecution="sync"
            showLabels={compact ? "auto" : true}
            edgeOpacity={0.82}
            tooltip={(hover) => <GermanyBecomingTooltip hover={hover} metricId={metricId} edges={weightedEdges} />}
            onClick={inspectDatum}
            timeFormat={formatGermanyStage}
            valueFormat={(value) => `${percent(value)} of modern Germany by ${activeMetric.shortLabel}`}
            accessibleTable
            description="A top-to-bottom history river traces twenty-six contributions to present-day Germany through twelve stages from regional societies around 750 to the sixteen Länder and the Federal Republic in 1990."
            summary="The river repeatedly fragments and consolidates. It narrows sharply into the North German Confederation and Empire, divides into occupation and postwar structures, then restores eastern Länder and reunites Berlin in 1990. Width represents a fixed share of modern Germany, not the historical size of any state."
            chartId="germany-history-river"
          />
        ),
        reader: (
          <StageReader
            stage={selectedStage}
            selectedDatum={selectedDatum}
            metricId={metricId}
            onStageChange={(stageId) => {
              setSelectedStageId(stageId)
              setSelectedDatum(null)
            }}
          />
        ),
        caption: (
          <>
            Width currently follows the {activeMetric.description}. It does not estimate a historical state’s land,
            population, economy, legitimacy, or influence. Labels are intentionally limited to larger streams; every
            container remains available through hover and the accessible table.
          </>
        ),
      }}
      findings={{
        kicker: "02 / Three shapes worth finding",
        title: "The structure carries the argument.",
        items: FINDINGS.map((finding) => ({
          key: finding.stageId,
          eyebrow: finding.eyebrow,
          title: finding.title,
          body: finding.body,
        })),
      }}
      outside={{
        kicker: "03 / The tributaries outside the core",
        title: "Some of the most important movements cannot share this width scale.",
        intro: (
          <p>
            The conserved river follows only land inside the 1990 endpoint. The source dataset separately records
            territorial arrivals and departures whose defensible measurements are historical area, contemporary
            population, or no comparable quantity at all.
          </p>
        ),
        items: GERMANY_EXTERNAL_FLOWS
          .filter((flow) => ["X04", "X07", "X08", "X09", "X10"].includes(flow.external_flow_id))
          .map((flow) => (
            <article key={flow.external_flow_id}>
              <small>{flow.event_date} / {flow.direction}</small>
              <strong>{flow.label}</strong>
              <p>{flow.relationship}. {flow.notes}</p>
              <span>{flow.render_recommendation}</span>
            </article>
          )),
      }}
      method={{
        kicker: "04 / What the width means",
        title: "A modern endpoint carried backward—carefully",
        body: (
          <>
            <p>{GERMANY_RIVER_METADATA.normalization}</p>
            <p className="process-river__warning">{GERMANY_RIVER_METADATA.critical_caveat}</p>
            <p>
              The model is deliberately compressed. Hundreds of imperial jurisdictions become regional macro-streams;
              external branches remain annotations when no compatible value exists. That is a visible limit, not hidden precision.
            </p>
          </>
        ),
        sources: GERMANY_SOURCES,
      }}
      code={{
        kicker: "05 / Turn the timeline downward",
        title: "Vertical is a layout orientation, not a rotated screenshot",
        intro: "The same conserved layout drives either direction. Vertical orientation projects bands, ribbons, particles, lifecycle rails, labels, hit geometry, and the time axis together.",
        source: implementationCode,
      }}
      footer={{
        kicker: "GERMANY / c. 750–1990 / A FEDERAL RIVER",
        tagline: "The endpoint is one state. The current is many histories.",
        stats: `${GERMANY_EVENTS.length} documented events · ${GERMANY_PROCESS_NODES.length} compressed containers · ${GERMANY_PROCESS_EDGES.length} conserved passages`,
      }}
    />
  )
}
