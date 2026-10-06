import * as React from "react"
import { useLayoutEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ForceDirectedGraph, SankeyDiagram, ChordDiagram } from "semiotic/network"
import { MotifBraidChart, DependencyForestChart, FlowCircuitChart } from "semiotic/atlas"
import {
  ResolutionAtlasChart,
  BoundaryLoomChart,
} from "semiotic/experimental/network-resolution/react"
import { defaultResolutionView } from "semiotic/experimental/network-resolution"
import { useTheme } from "semiotic/themes/react"
import { useResponsiveSize } from "semiotic/utils"
import {
  atlas,
  circuit,
  edition,
  forest,
  ledger,
  reading,
  resolution,
  views,
  type ViewId,
} from "./data"

type Datum = Record<string, unknown>
type SemanticTarget = Parameters<
  NonNullable<React.ComponentProps<typeof ResolutionAtlasChart>["onSelect"]>
>[1]
const record = (value: unknown): Datum =>
  value && typeof value === "object" ? (value as Datum) : {}
function raw(value: unknown) {
  const d = record(value)
  return d.data && typeof d.data === "object" ? record(d.data) : d
}
const endpoint = (value: unknown) =>
  typeof value === "string" ? value : String(record(value).id ?? "")

/** Shared ledger lookup keeps counts consistent across different callback shapes. */
export function LabTooltip({ datum, pairwise = false }: { datum: unknown; pairwise?: boolean }) {
  const d = raw(datum)
  if (d.kind === "braid-track")
    return (
      <div className="novel-tooltip">
        <strong>
          {String(d.fromNodeId)} → {String(d.nodeId)}
        </strong>
        <span>{String(d.entityCount)} manuscripts on this journey</span>
        <span>
          Steps {Number(d.fromStep) + 1}–{Number(d.toStep) + 1}
        </span>
      </div>
    )
  const source = endpoint(d.source),
    target = endpoint(d.target)
  if (source && target) {
    const matches = ledger.edges.filter((edge) =>
      pairwise
        ? (edge.source === source && edge.target === target) ||
          (edge.source === target && edge.target === source)
        : edge.id === d.id || (edge.source === source && edge.target === target),
    )
    return (
      <div className="novel-tooltip">
        <strong>
          {source} {pairwise ? "↔" : "→"} {target}
        </strong>
        {matches.map((edge) => (
          <span key={edge.id}>
            {edge.source} → {edge.target}: {edge.value} handoffs · {edge.channel}
          </span>
        ))}
        <span>
          {pairwise
            ? "Both directions; parallel channels aggregated in the ribbon."
            : "Repeated manuscript visits count again."}
        </span>
      </div>
    )
  }
  const node = ledger.nodes.find((node) => node.id === (d.nodeId ?? d.id))
  if (!node)
    return (
      <div className="novel-tooltip">
        <strong>{String(d.label ?? d.id ?? "Network mark")}</strong>
      </div>
    )
  return (
    <div className="novel-tooltip">
      <strong>
        {node.id}
        {d.step ? ` · step ${d.step}` : ""}
      </strong>
      <span>{node.department}</span>
      <span>
        {node.visits} visits · {node.manuscripts} unique manuscripts
      </span>
      <span>
        {node.incoming} incoming · {node.outgoing} outgoing handoffs
      </span>
      {d.kind === "circuit-module" && <span>Queue and capacity: unmeasured</span>}
    </div>
  )
}

interface ChartPaneProps {
  side: "A" | "B"
  viewId: ViewId
  onView: (id: ViewId) => void
  selected: string
  onSelect: (id: string) => void
  selectionName: string
  colors: Record<string, string>
  expanded: boolean
  onExpand: () => void
  generation: number
}

export default function ChartPane({
  side,
  viewId,
  onView,
  selected,
  onSelect,
  selectionName,
  colors,
  expanded,
  onExpand,
  generation,
}: ChartPaneProps) {
  const theme = useTheme()
  const view = views.find((item) => item.id === viewId)!
  const wide = ["braid", "atlas", "loom", "circuit"].includes(viewId)
  const minimum = viewId === "circuit" ? 1080 : wide ? 820 : viewId === "sankey" ? 760 : 520
  const [host, [width]] = useResponsiveSize([minimum, 0], true, false, {
    minWidth: minimum,
    maxWidth: 1600,
  })
  const [circuitHover, setCircuitHover] = useState<unknown>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const hasCircuitTooltip = viewId === "circuit" && circuitHover != null
  // Install dismissal before the tooltip is painted, so immediate Escape works.
  useLayoutEffect(() => {
    if (!hasCircuitTooltip) return
    const dismiss = () => setCircuitHover(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss()
    }
    window.addEventListener("scroll", dismiss, true)
    window.addEventListener("resize", dismiss)
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("scroll", dismiss, true)
      window.removeEventListener("resize", dismiss)
      window.removeEventListener("keydown", onKey, true)
    }
  }, [hasCircuitTooltip])
  const height = viewId === "circuit" ? 660 : 500
  const selectDatum = (value: unknown) => {
    const d = raw(value)
    const id = d.nodeId ?? d.id
    if (typeof id === "string" && ledger.nodes.some((node) => node.id === id)) onSelect(id)
  }
  const common = {
    width,
    height,
    title: view.name,
    description: view.question,
    summary: `${view.strength} ${view.limit}`,
    accessibleTable: false,
  }
  const selection = { name: selectionName, unselectedOpacity: 0.3 }
  const graphProps = {
    ...common,
    nodes: ledger.nodes,
    edges: ledger.edges,
    colorBy: "department" as const,
    colorScheme: colors,
    showLegend: false,
    nodeLabel: "id" as const,
    showLabels: true,
    onClick: selectDatum,
    selection,
    tooltip: (datum: unknown) => <LabTooltip datum={datum} pairwise={viewId === "chord"} />,
    margin: { top: 40, bottom: 35, left: 50, right: 60 },
  }
  const canonical = {
    nodeId: selected,
    analysisRevision: atlas.analysisRevision,
    relationScopeId: "directed-admitted" as const,
  }
  const resolutionProps = {
    ...common,
    resolution,
    view: {
      ...defaultResolutionView(
        resolution,
        viewId === "atlas" ? "resolution-atlas" : "boundary-loom",
      ),
      pageIds: resolution.pages.slice(0, generation + 1).map((page) => page.id),
    },
    appearance: {
      styles: {
        component: ({ datum }: { datum: Record<string, unknown> }) =>
          Array.isArray(datum.nodeIds) && datum.nodeIds.includes(selected)
            ? { stroke: theme.colors.primary, strokeWidth: 3 }
            : {},
      },
    },
    // Group clicks keep the reader's full membership inspector. Singleton clicks
    // can also update the lab's canonical stage, without inventing a representative.
    onSelect: (_selection: unknown, target: SemanticTarget) => {
      if (target.kind === "original-node" && target.nodeId) onSelect(target.nodeId)
      if (target.kind === "group") {
        const page = resolution.pages.find((page) => page.id === target.pageId)!
        const members = Object.entries(page.nodeOwner).filter(
          ([, owner]) => owner === target.groupId,
        )
        if (members.length === 1) onSelect(members[0][0])
      }
    },
  }
  return (
    <section className="novel-pane" data-view={viewId} aria-label={`View ${side}: ${view.name}`}>
      <div className="novel-pane-toolbar">
        <span className="novel-pane-letter" aria-hidden="true">
          {side}
        </span>
        <label>
          <span className="novel-sr">View {side}</span>
          <select
            aria-label={`View ${side}`}
            value={viewId}
            onChange={(event) => {
              setCircuitHover(null)
              onView(event.target.value as ViewId)
            }}
          >
            {views.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onExpand} aria-pressed={expanded}>
          {expanded ? "Compare both" : `Expand ${side}`}
        </button>
      </div>
      <div className="novel-pane-intro">
        <h3>{view.question}</h3>
        <p>{view.strength}</p>
      </div>
      <div
        ref={host}
        className="novel-plot"
        tabIndex={0}
        role="region"
        aria-label={`${view.name} chart. Scroll horizontally for the full diagram.`}
        onPointerMove={
          viewId === "circuit"
            ? (event) => {
                setPointer({ x: event.clientX, y: event.clientY })
                // Circuit modules publish observations; pipes expose their
                // original edge IDs on SVG chrome. Use that painted geometry
                // for pipe inspection, with the same canonical ledger lookup.
                const pipe = (event.target as Element).closest("[data-circuit-edge]")
                const edge = ledger.edges.find(
                  (edge) => edge.id === pipe?.getAttribute("data-circuit-edge"),
                )
                if (edge) setCircuitHover({ ...edge, kind: "circuit-pipe" })
                else
                    setCircuitHover((current: unknown) =>
                    record(current).kind === "circuit-pipe" ? null : current,
                  )
              }
            : undefined
        }
        onPointerLeave={() => setCircuitHover(null)}
        onBlur={() => setCircuitHover(null)}
      >
        {viewId === "force" && (
          <ForceDirectedGraph
            {...graphProps}
            nodeSize="visits"
            nodeSizeRange={[6, 21]}
            edgeWidth={(edge) => Math.sqrt(edge.value) / 1.5}
            edgeColor={theme.colors.textSecondary}
            iterations={400}
            layoutExecution="sync"
          />
        )}
        {viewId === "sankey" && (
          <SankeyDiagram
            {...graphProps}
            valueAccessor="value"
            edgeOpacity={0.65}
            nodeWidth={14}
            nodePaddingRatio={0.13}
          />
        )}
        {viewId === "chord" && (
          <ChordDiagram {...graphProps} valueAccessor="value" edgeOpacity={0.7} />
        )}
        {viewId === "braid" && (
          <MotifBraidChart
            {...common}
            atlas={atlas}
            selection={selection}
            onClick={selectDatum}
            frameProps={{ tooltipContent: (datum) => <LabTooltip datum={datum} /> }}
          />
        )}
        {viewId === "forest" && (
          <DependencyForestChart
            {...common}
            forest={forest}
            reading="required-paths"
            selection={canonical}
            onSelectNode={onSelect}
            frameProps={{ tooltipContent: (datum) => <LabTooltip datum={datum} /> }}
          />
        )}
        {viewId === "circuit" && (
          <FlowCircuitChart
            {...common}
            chartId={`novel-circuit-${side}`}
            circuit={circuit}
            edition={edition}
            reading={reading}
            selection={canonical}
            onSelectNode={onSelect}
            particleBudget={0}
            reducedMotion
            onObservation={(event) => {
              if (event.type === "hover") setCircuitHover(event.datum)
              if (event.type === "hover-end") setCircuitHover(null)
            }}
          />
        )}
        {viewId === "atlas" && <ResolutionAtlasChart {...resolutionProps} />}
        {viewId === "loom" && <BoundaryLoomChart {...resolutionProps} />}
      </div>
      {viewId === "circuit" && circuitHover != null && (
        <div
          className="novel-circuit-tooltip"
          role="tooltip"
          style={{
            left: Math.max(8, Math.min(pointer.x + 14, window.innerWidth - 292)),
            top: Math.max(8, Math.min(pointer.y + 14, window.innerHeight - 165)),
          }}
        >
          <LabTooltip datum={circuitHover} />
        </div>
      )}
      <div className="novel-pane-notes">
        <p>
          <strong>Encoding</strong> {view.encoding}
        </p>
        <p>
          <strong>Interpretation limit</strong> {view.limit}
        </p>
        <Link to={`/charts/${view.route}`}>{view.component} documentation ↗</Link>
      </div>
    </section>
  )
}
