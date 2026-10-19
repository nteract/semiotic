import * as React from "react"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { NetworkZoomOptions, ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import type { NetworkViewportSnapshot } from "semiotic/network"
import { CompositionalNavigator } from "semiotic/recipes/react"
import type { CompositionalEndpointRef } from "semiotic/recipes/core"
import { traceCompositionalGraph, patchCompositionalGraph } from "semiotic/recipes/core"
import {
  initialPipelineSolution,
  preparedPipeline,
  solvePipeline,
  pipelineSolveCalls,
  partLabels,
} from "./geometry"
import { ExplorerContext } from "./PipelineCard"
import { RowNodeExample } from "./RowNodeExample"
import { PipelineMinimap } from "./PipelineMinimap"
import { layout, networkZoomDemoLayoutCalls, pipelineTooltip } from "./scene"
import {
  nodes,
  edges,
  byId,
  stages,
  colors,
  bounds,
  margin,
  cardWidth,
  cardHeight,
  formatRows,
} from "./data"
import "./pipeline-explorer.css"

export { networkZoomDemoLayoutCalls } from "./scene"

/** Fixed authored geometry; the camera, selected step and notes never rerun layout. */
export default function PipelineExplorer() {
  const ref = React.useRef<ZoomableNetworkCustomChartHandle>(null)
  const host = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(600)
  const [pan, setPan] = React.useState<NetworkZoomOptions["pan"]>(true)
  const [locked, setLocked] = React.useState(false)
  const [minZoom, setMinZoom] = React.useState(0.15)
  const [maxZoom, setMaxZoom] = React.useState(4)
  const [phase, setPhase] = React.useState("idle")
  const [selected, select] = React.useState("step-0")
  const [representation, setRepresentation] = React.useState<
    "composite" | "wires" | "exploded" | "summary"
  >("composite")
  const [showGlyphs, setShowGlyphs] = React.useState(true)
  const [optimized, setOptimized] = React.useState(false)
  const [selectedEdge, selectEdge] = React.useState("")
  const [prepared, setPrepared] = React.useState(preparedPipeline)
  const activeEdges = prepared.graph.edges as typeof edges
  const [selectedEndpoint, selectEndpoint] = React.useState<CompositionalEndpointRef | undefined>()
  const projection = representation === "wires" ? "composite" : representation
  const solution = React.useMemo(
    () =>
      !optimized && projection === "composite" && prepared === preparedPipeline
        ? initialPipelineSolution
        : solvePipeline(optimized, projection, prepared),
    [optimized, projection, prepared],
  )
  const layoutConfig = React.useMemo(() => ({ solved: solution }), [solution])
  const trace = React.useMemo(() => {
    const edge = activeEdges.find((e) => e.id === selectedEdge)
    const start = edge ? { nodeId: edge.target, endpoint: edge.targetEndpoint } : selectedEndpoint
    return start
      ? traceCompositionalGraph(prepared, {
          start,
          direction: "upstream",
          maxDepth: 100,
          maxVisited: 1000,
        })
      : null
  }, [selectedEdge, selectedEndpoint, prepared])
  const traceEdges = trace?.edgeIds ?? []
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [viewport, setViewport] = React.useState<NetworkViewportSnapshot | null>(null)
  const saveNote = React.useCallback(
    (id: string, value: string) => setNotes((previous) => ({ ...previous, [id]: value })),
    [],
  )
  const context = React.useMemo(
    () => ({
      selected,
      select,
      notes,
      saveNote,
      solution,
      representation,
      showGlyphs,
      selectedEdge,
      selectEdge,
      traceEdges,
    }),
    [selected, notes, saveNote, solution, representation, showGlyphs, selectedEdge, traceEdges],
  )
  const node = byId.get(selected)!
  const pinnedIds = React.useMemo(() => [selected], [selected])
  const inspectorTitle = React.useId()
  React.useEffect(() => {
    if (!host.current || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])

  const focusStep = () => {
    const plot = viewport?.plotRect
    if (!plot) return
    const k = Math.min(1, (plot.width - 24) / cardWidth, (plot.height - 24) / cardHeight)
    ref.current?.zoomTo({
      k,
      x: plot.width / 2 - (node.x + cardWidth / 2) * k,
      y: plot.height / 2 - (node.y + cardHeight / 2) * k,
    })
  }

  return (
    <ExplorerContext.Provider value={context}>
      <section
        className="pipeline-explorer"
        aria-label="Interactive pipeline explorer"
        data-layout-calls={networkZoomDemoLayoutCalls}
        data-solve-calls={pipelineSolveCalls}
        data-visible-count={viewport?.visibleMarkIds?.length ?? 0}
        data-mounted-count={viewport?.mountedMarkIds.length ?? 0}
      >
        <header className="pipeline-toolbar">
          <div>
            <strong>Daily pipeline snapshot</strong>
            <span>6 pipelines · 30 steps · illustrative data</span>
          </div>
          <span className="pipeline-phase" data-testid="zoom-phase" role="status">
            {phase === "moving" ? "Exploring…" : "Detail ready"}
          </span>
        </header>
        <ol className="pipeline-stages" aria-label="Processing stages">
          {stages.map((stage, i) => (
            <li key={stage}>
              <i style={{ background: colors[i] }} aria-hidden="true" />
              {stage}
            </li>
          ))}
        </ol>
        <div className="pipeline-wiring-controls">
          <label>
            Representation{" "}
            <select
              aria-label="Wiring representation"
              value={representation}
              onChange={(event) => setRepresentation(event.target.value as typeof representation)}
            >
              <option value="composite">Rows in cards</option>
              <option value="wires">Wire slots</option>
              <option value="exploded">Individual parts</option>
              <option value="summary">Collapsed interfaces</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={showGlyphs}
              onChange={(event) => setShowGlyphs(event.target.checked)}
            />{" "}
            Show row graphics
          </label>
          <label>
            <input
              type="checkbox"
              checked={optimized}
              onChange={(event) => setOptimized(event.target.checked)}
            />{" "}
            Optimize part order
          </label>
          <output aria-label="Wiring metrics">
            {solution.metrics.crossings} crossings · {solution.metrics.alignmentError.toFixed(0)}{" "}
            alignment error
          </output>
        </div>
        <div className="pipeline-workspace">
          <div className="pipeline-chart" ref={host}>
            <ZoomableNetworkCustomChart
              ref={ref}
              nodes={nodes}
              edges={activeEdges}
              layout={layout}
              layoutConfig={layoutConfig}
              width={width}
              height={500}
              margin={margin}
              animate={false}
              title="Daily pipeline topology"
              description="Six pipelines flow left to right through five stages. Drag or pinch to explore. Use the step selector and inspector to read any step without zooming."
              summary="Payments validation needs review; Inventory enrichment is delayed. All other steps are healthy. The complete snapshot is also available in the table below."
              accessibleTable={false}
              tooltip={pipelineTooltip}
              onClick={(datum) => {
                if (typeof datum?.id === "string") {
                  if (byId.has(datum.id)) select(datum.id)
                  else if (edges.some((e) => e.id === datum.id)) selectEdge(datum.id)
                }
              }}
              onObservation={(event) => {
                if (
                  event.type === "focus" &&
                  typeof event.datum?.id === "string" &&
                  byId.has(event.datum.id)
                )
                  select(event.datum.id)
              }}
              zoomOptions={{ minZoom, maxZoom, pan, locked, panBounds: bounds, wheelZoom: true }}
              onZoomChange={(_zoom, event) => setPhase(event.phase)}
              frameProps={{
                edgeIdentity: "id",
                edgeIdAccessor: "id",
                htmlMarkCulling: { overscan: 80, pinnedIds },
                onViewportChange: setViewport,
              }}
            />
            <p className="pipeline-help">
              Drag to pan · scroll or pinch to zoom. Focus the chart for + / − and Alt + arrow
              controls.
            </p>
          </div>
          <aside className="pipeline-inspector" aria-labelledby={inspectorTitle}>
            <label className="pipeline-field">
              Inspect a step
              <select value={selected} onChange={(event) => select(event.target.value)}>
                {nodes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <h2 id={inspectorTitle}>
              {node.pipeline} <span>{node.stage}</span>
            </h2>
            <span className="pipeline-status" data-status={node.status}>
              {node.status === "Healthy" ? "✓" : "!"} {node.status}
            </span>
            <p className="pipeline-step-detail">{node.detail}</p>
            <dl className="pipeline-inspector-metrics">
              <div>
                <dt>Output rows</dt>
                <dd>{formatRows(node.rows)}</dd>
              </div>
              <div>
                <dt>Fields</dt>
                <dd>{node.fields}</dd>
              </div>
              <div>
                <dt>Batch latency</dt>
                <dd>{node.latency} ms</dd>
              </div>
            </dl>
            <button type="button" onClick={focusStep} disabled={locked}>
              Focus step
            </button>
            <label className="pipeline-field pipeline-inspector-note">
              Step note
              <textarea
                value={notes[selected] ?? ""}
                placeholder="Leave a note for this step…"
                onChange={(event) => saveNote(selected, event.target.value)}
                rows={2}
              />
            </label>
            <p className="pipeline-note-hint">
              Notes stay while this page is open, including when cards leave view.
            </p>
            <PipelineMinimap
              visibleRect={viewport?.visibleRect ?? null}
              selected={selected}
              solved={solution}
            />
          </aside>
        </div>
        <div className="pipeline-footer">
          <span>{viewport?.visibleMarkIds?.length ?? 0} of 30 steps in view</span>
          <span>Silhouettes → shapes → summaries → full detail</span>
        </div>
        <details className="pipeline-connections-table">
          <summary>Trace and select all {activeEdges.length} connections</summary>
          <p>
            Illustrative metric wiring, not execution or record provenance. Containment adds no
            dependency. Selecting a connection traces only declared transfers of that metric.
          </p>
          <label className="pipeline-field">
            Select a connection
            <select
              aria-label="Select a connection"
              value={selectedEdge}
              onChange={(event) => selectEdge(event.target.value)}
            >
              <option value="">No connection selected</option>
              {selectedEdge && !activeEdges.some((e) => e.id === selectedEdge) && (
                <option value={selectedEdge}>{selectedEdge} (removed)</option>
              )}
              {activeEdges.map((edge) => (
                <option key={edge.id} value={edge.id}>
                  {edge.id} · {partLabels[edge.sourceEndpoint.partId]} · {edge.source} →{" "}
                  {edge.target}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!activeEdges.some((e) => e.id === selectedEdge)}
            onClick={() =>
              setPrepared((previous) =>
                patchCompositionalGraph(previous, {
                  baseRevision: previous.graph.revision,
                  revision: String(Number(previous.graph.revision) + 1),
                  removeEdgeIds: [selectedEdge],
                }),
              )
            }
          >
            Remove selected connection
          </button>{" "}
          <button
            type="button"
            disabled={activeEdges.some((e) => e.id === "step-0-next-duplicate")}
            onClick={() =>
              setPrepared((previous) =>
                patchCompositionalGraph(previous, {
                  baseRevision: previous.graph.revision,
                  revision: String(Number(previous.graph.revision) + 1),
                  upsertEdges: [edges.find((e) => e.id === "step-0-next-duplicate")!],
                }),
              )
            }
          >
            Restore duplicate connection
          </button>
          {selectedEdge && !activeEdges.some((e) => e.id === selectedEdge) && (
            <p role="status">{selectedEdge} was removed; selection remains on that ID.</p>
          )}
          <CompositionalNavigator
            prepared={prepared}
            selected={selectedEndpoint}
            proxy={representation === "summary"}
            onSelect={(endpoint) => {
              selectEndpoint(endpoint)
              selectEdge("")
              select(endpoint.nodeId)
            }}
          />
          <p role="status" data-testid="trace-status">
            {trace
              ? `${selectedEdge}: ${trace.edgeIds.length} modeled dependencies; ${trace.completeness} within this illustrative graph. Evidence precision: unknown.`
              : "Select a connection to inspect its declared dependencies."}
          </p>
          <div
            className="pipeline-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Connection identities and evidence"
          >
            <table>
              <caption>Every edge retains its own ID, including exact duplicates.</caption>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Source</th>
                  <th>Part / port</th>
                  <th>Target</th>
                  <th>Part / port</th>
                  <th>Evidence / attachment</th>
                </tr>
              </thead>
              <tbody>
                {activeEdges.map((edge) => (
                  <tr key={edge.id} data-traced={traceEdges.includes(edge.id)}>
                    <th scope="row">
                      <button
                        type="button"
                        aria-pressed={selectedEdge === edge.id}
                        onClick={() => selectEdge(edge.id)}
                      >
                        {edge.id}
                      </button>
                    </th>
                    <td>{edge.source}</td>
                    <td>{edge.sourceEndpoint.partId} / out</td>
                    <td>{edge.target}</td>
                    <td>{edge.targetEndpoint.partId} / in</td>
                    <td>
                      Illustrative; unknown /{" "}
                      {representation === "summary" ? "proxy" : "exact geometry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <RowNodeExample />
        <details className="pipeline-settings">
          <summary>Camera settings</summary>
          <div className="pipeline-settings-grid">
            <label className="pipeline-field">
              Pan axes
              <select
                value={String(pan)}
                onChange={(event) =>
                  setPan(
                    event.target.value === "true"
                      ? true
                      : event.target.value === "false"
                        ? false
                        : (event.target.value as "x" | "y"),
                  )
                }
              >
                <option value="true">Both axes</option>
                <option value="x">Horizontal</option>
                <option value="y">Vertical</option>
                <option value="false">Locked</option>
              </select>
            </label>
            <label className="pipeline-field">
              Minimum zoom
              <select value={minZoom} onChange={(event) => setMinZoom(Number(event.target.value))}>
                <option value={0.15}>15%</option>
                <option value={0.3}>30%</option>
                <option value={0.5}>50%</option>
              </select>
            </label>
            <label className="pipeline-field">
              Maximum zoom
              <select value={maxZoom} onChange={(event) => setMaxZoom(Number(event.target.value))}>
                <option value={1}>100%</option>
                <option value={2}>200%</option>
                <option value={4}>400%</option>
              </select>
            </label>
            <label className="pipeline-lock">
              <input
                type="checkbox"
                checked={locked}
                onChange={(event) => setLocked(event.target.checked)}
              />
              Lock camera
            </label>
          </div>
          <p className="pipeline-note-hint">
            Fit, Focus step and Reset respect these bounds and locks.
          </p>
        </details>
        <details className="pipeline-table">
          <summary>Read all 30 steps as a table</summary>
          <div
            tabIndex={0}
            role="region"
            aria-label="Pipeline snapshot table"
            className="pipeline-table-scroll"
          >
            <table>
              <caption>
                Illustrative daily snapshot. Each pipeline connects consecutive stages from left to
                right.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Pipeline</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Status</th>
                  <th scope="col">Output rows</th>
                  <th scope="col">Fields</th>
                  <th scope="col">Batch latency</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.pipeline}</th>
                    <td>{item.stage}</td>
                    <td>{item.status}</td>
                    <td>{formatRows(item.rows)}</td>
                    <td>{item.fields}</td>
                    <td>{item.latency} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </ExplorerContext.Provider>
  )
}
