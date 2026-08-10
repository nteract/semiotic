import React, { useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { BarChart } from "semiotic/ordinal"
import { networkHitTarget, unwrapDatum } from "semiotic/recipes"
import { Heatmap, QuadrantChart } from "semiotic/xy"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import { APHORISM_LEDGER, GENRE_SIGNATURES, RELATION_META, relationRows } from "./parataxisData"

const RISK_COLORS = {
  supported: "#5cc8be",
  "needs-context": "#f2b84b",
  "weak-support": "#ef8a5b",
  unsupported: "#ef5b63",
}

export function ClauseConstellation({ pair, selectedRelation, reducedMotion }) {
  const [width, hostRef] = useResponsiveWidth(320, 800, { bucket: 20 })
  const [hovered, setHovered] = useState(null)
  const candidates = useMemo(
    () =>
      Object.entries(pair.candidates)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5),
    [pair],
  )
  const nodes = useMemo(
    () => [
      { id: "clause-a", kind: "clause", label: pair.clauses[0] },
      { id: "clause-b", kind: "clause", label: pair.clauses[1] },
      ...candidates.map(([relation, confidence]) => ({
        id: relation,
        kind: "relation",
        label: RELATION_META[relation].label,
        confidence,
      })),
    ],
    [candidates, pair],
  )
  const edges = useMemo(
    () =>
      candidates.flatMap(([relation, confidence]) => [
        { id: `a-${relation}`, source: "clause-a", target: relation, relation, confidence },
        { id: `${relation}-b`, source: relation, target: "clause-b", relation, confidence },
      ]),
    [candidates],
  )
  const chartHeight = width < 520 ? 430 : 350

  return (
    <div ref={hostRef} className="pm-constellation">
      <NetworkCustomChart
        key={`${pair.id}-${selectedRelation}`}
        chartId="parataxis-clause-constellation"
        nodes={nodes}
        edges={edges}
        layout={constellationLayout}
        layoutConfig={{ selectedRelation, reducedMotion }}
        width={Math.max(320, width)}
        height={chartHeight}
        margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
        enableHover
        accessibleTable
        animate={!reducedMotion}
        onObservation={(event) => {
          if (event.type === "hover" && event.datum) setHovered(unwrapDatum(event.datum))
          if (event.type === "hover-end") setHovered(null)
        }}
        description={`A clause constellation for “${pair.clauses.join(" ")}” Candidate relations appear in the undeclared space between the two clauses.`}
        summary={`${candidates.length} editorially annotated relation candidates. ${selectedRelation ? `${RELATION_META[selectedRelation].label} is selected.` : "No relation is declared."}`}
        tooltip={(datum) => {
          const row = unwrapDatum(datum)
          if (!row) return null
          if (row.kind === "clause") return row.label
          return `${row.label}: ${row.confidence}% editorial plausibility`
        }}
        frameProps={{ background: "transparent" }}
      />
      <p className="pm-chart-readout" aria-live="polite">
        <span>{hovered ? "SELECTED ITEM" : "EDITORIAL NOTE"}</span>
        {hovered?.kind === "relation"
          ? `${hovered.label}: ${hovered.confidence}% plausibility in this demonstration.`
          : (hovered?.label ?? pair.note)}
      </p>
    </div>
  )
}

function constellationLayout(context) {
  if (!context.nodes.length) return { sceneNodes: [], sceneEdges: [] }

  const { plot } = context.dimensions
  const selectedRelation = context.config?.selectedRelation
  const reducedMotion = context.config?.reducedMotion
  const rawNodes = context.nodes.map(unwrapDatum)
  const rawEdges = context.edges.map(unwrapDatum)
  const compact = plot.width < 500
  const clauseA = rawNodes.find((node) => node.id === "clause-a")
  const clauseB = rawNodes.find((node) => node.id === "clause-b")
  const relationNodes = rawNodes.filter((node) => node.kind === "relation")
  const clausePositions = compact
    ? {
        "clause-a": { x: plot.width / 2, y: 54 },
        "clause-b": { x: plot.width / 2, y: plot.height - 54 },
      }
    : {
        "clause-a": { x: 102, y: plot.height / 2 },
        "clause-b": { x: plot.width - 102, y: plot.height / 2 },
      }
  const relationPositions = relationNodes.map((node, index) => {
    const spread = relationNodes.length === 1 ? 0.5 : index / (relationNodes.length - 1)
    return {
      ...node,
      x: compact
        ? 54 + spread * (plot.width - 108)
        : plot.width / 2 + Math.cos(spread * Math.PI) * 96,
      y: compact
        ? plot.height / 2 + Math.sin(spread * Math.PI * 2) * 44
        : 46 + spread * (plot.height - 92),
    }
  })
  const positioned = [
    { ...clauseA, ...clausePositions["clause-a"] },
    { ...clauseB, ...clausePositions["clause-b"] },
    ...relationPositions,
  ]

  return {
    sceneNodes: positioned.map((node) =>
      networkHitTarget({
        x: node.x,
        y: node.y,
        r: node.kind === "clause" ? 28 : 15,
        datum: node,
        id: `parataxis-${node.id}`,
        label: node.label,
      }),
    ),
    sceneEdges: [],
    restyle: () => undefined,
    overlays: (
      <ConstellationOverlay
        nodes={positioned}
        edges={rawEdges}
        selectedRelation={selectedRelation}
        reducedMotion={reducedMotion}
        compact={compact}
      />
    ),
  }
}

function ConstellationOverlay({ nodes, edges, selectedRelation, reducedMotion, compact }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return (
    <g pointerEvents="none" className="pm-constellation-svg" aria-hidden="true">
      <defs>
        <filter id="pm-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        if (!source || !target) return null
        const active = selectedRelation === edge.relation
        const visible = !selectedRelation || active
        return (
          <line
            key={edge.id}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke={RELATION_META[edge.relation].color}
            strokeWidth={active ? 2.8 : 0.7 + edge.confidence / 90}
            strokeDasharray={active ? undefined : "2 7"}
            opacity={visible ? (active ? 0.96 : 0.26 + edge.confidence / 220) : 0.06}
            className={reducedMotion ? undefined : "pm-relation-line"}
          />
        )
      })}
      {nodes.map((node) => {
        if (node.kind === "clause") {
          const boxWidth = compact ? Math.min(250, Math.max(190, node.label.length * 8.2)) : 188
          return (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              <rect
                x={-boxWidth / 2}
                y="-29"
                width={boxWidth}
                height="58"
                rx="2"
                fill="var(--pm-clause-fill)"
                stroke="var(--pm-clause-rule)"
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--pm-ink)"
                fontSize={compact ? 13 : 14}
                fontWeight="700"
              >
                {node.label}
              </text>
            </g>
          )
        }
        const active = node.id === selectedRelation
        const radius = 6 + node.confidence / 15
        return (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}>
            <circle
              r={radius}
              fill={active ? RELATION_META[node.id].color : "var(--pm-panel)"}
              stroke={RELATION_META[node.id].color}
              strokeWidth={active ? 2.5 : 1.2}
              opacity={selectedRelation && !active ? 0.28 : 1}
              filter={active ? "url(#pm-glow)" : undefined}
            />
            <text
              y={radius + 13}
              textAnchor="middle"
              fill="var(--pm-ink-soft)"
              fontSize="9"
              fontWeight="800"
              letterSpacing="0.8"
              opacity={selectedRelation && !active ? 0.32 : 1}
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function AmbiguityMatrix({ selectedPairId }) {
  const [width, hostRef] = useResponsiveWidth(320, 860, { bucket: 20 })
  const data = useMemo(() => relationRows(), [])

  return (
    <div ref={hostRef} className="pm-chart-shell pm-heatmap-shell">
      <Heatmap
        data={data}
        xAccessor="relation"
        yAccessor="pair"
        valueAccessor="value"
        width={Math.max(320, width)}
        height={width < 520 ? 420 : 390}
        margin={{ top: 24, right: 18, bottom: 86, left: width < 520 ? 90 : 132 }}
        colorScheme="custom"
        customColorScale={ambiguityColor}
        cellBorderColor="var(--pm-paper)"
        cellBorderWidth={2}
        showValues={width >= 520}
        valueFormat={(value) => (value ? `${value}` : "")}
        xLabel="Possible bridge"
        yLabel="Clause specimen"
        accessibleTable
        description="A heatmap of editorial judgments about synthetic clause pairs. Rows are clause pairs, columns are possible relationships, and brighter cells indicate a more plausible reading in this example."
        summary={`${data.filter((row) => row.value > 0).length} nonzero editorial judgments across six synthetic clause pairs. The selected pair is ${selectedPairId}.`}
        tooltip={(datum) => {
          const row = unwrapDatum(datum)
          return row
            ? `${row.pairLabel} — ${row.relation}: ${row.value}% editorial plausibility`
            : null
        }}
        frameProps={{
          background: "transparent",
          xAxis: { tickFormat: (value) => String(value).slice(0, 8) },
        }}
      />
      <div className="pm-integrity-note">
        <strong>EXAMPLE SCORES · NOT MEASUREMENTS</strong>
        The values are editorial judgments created for this explainer. They are not corpus
        frequencies or survey results.
      </div>
    </div>
  )
}

function ambiguityColor(value) {
  const amount = Math.max(0, Math.min(100, Number(value) || 0))
  if (amount < 10) return "#172126"
  if (amount < 30) return "#33454a"
  if (amount < 50) return "#59635e"
  if (amount < 70) return "#9c754d"
  if (amount < 85) return "#d99b49"
  return "#f4d27b"
}

export function AphorismDebtChart({ selectedId, onSelect }) {
  const [width, hostRef] = useResponsiveWidth(320, 760, { bucket: 20 })

  return (
    <div ref={hostRef} className="pm-chart-shell">
      <QuadrantChart
        data={APHORISM_LEDGER}
        xAccessor="evidence"
        yAccessor="compression"
        xCenter={55}
        yCenter={60}
        width={Math.max(320, width)}
        height={width < 520 ? 430 : 470}
        margin={{ top: 36, right: 26, bottom: 62, left: 62 }}
        quadrants={{
          topRight: { label: "high compression · high support", color: "#5cc8be", opacity: 0.11 },
          topLeft: { label: "high compression · low support", color: "#ef6a5b", opacity: 0.13 },
          bottomRight: { label: "low compression · high support", color: "#63a8ff", opacity: 0.09 },
          bottomLeft: { label: "low compression · low support", color: "#6f7a7e", opacity: 0.08 },
        }}
        colorBy="risk"
        colorScheme={RISK_COLORS}
        sizeBy={(datum) => (datum.id === selectedId ? 100 : 48)}
        sizeRange={[8, 16]}
        pointIdAccessor="id"
        pointOpacity={0.94}
        showLegend
        legendPosition="bottom"
        xLabel="evidentiary support →"
        yLabel="compression →"
        accessibleTable
        description="Five synthetic statements plotted by editorially assigned compression and evidentiary support."
        summary="Statements with high compression and low support require the most scrutiny. The placements are editorial examples, not measured scores."
        tooltip={(datum) => {
          const row = unwrapDatum(datum)
          return row ? `${row.label} Support assessment: ${row.risk}. ${row.note}` : null
        }}
        onClick={(datum) => {
          const row = unwrapDatum(datum)
          if (row?.id) onSelect(row.id)
        }}
        frameProps={{ background: "transparent" }}
      />
    </div>
  )
}

export function GenreSignatureChart({ metric }) {
  const [width, hostRef] = useResponsiveWidth(320, 720, { bucket: 20 })
  const labels = {
    connectorSuppression: "connector suppression",
    ambiguity: "interpretive openness",
    pressure: "rhetorical pressure",
  }

  return (
    <div ref={hostRef} className="pm-chart-shell">
      <BarChart
        data={GENRE_SIGNATURES}
        categoryAccessor="genre"
        valueAccessor={metric}
        orientation="horizontal"
        sort="desc"
        colorBy="genre"
        colorScheme={["#f2b84b", "#ef6a5b", "#5cc8be", "#63a8ff", "#a991d4", "#8bcf7b"]}
        width={Math.max(320, width)}
        height={380}
        margin={{ top: 22, right: 36, bottom: 50, left: width < 520 ? 88 : 120 }}
        showGrid
        showLegend={false}
        accessibleTable
        categoryLabel="Synthetic genre specimen"
        valueLabel={labels[metric]}
        description={`A ranked bar chart comparing ${labels[metric]} across six purpose-written style examples.`}
        summary={`The chart compares editorial scores for ${labels[metric]}. It is an illustration, not a corpus estimate.`}
        tooltip={(datum) => {
          const row = unwrapDatum(datum)
          return row ? `${row.genre}: ${row[metric]} out of 100, editorial score` : null
        }}
        frameProps={{ background: "transparent" }}
      />
    </div>
  )
}
