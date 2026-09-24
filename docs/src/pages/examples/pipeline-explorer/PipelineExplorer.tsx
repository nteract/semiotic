import * as React from "react"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { NetworkZoomOptions, ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import type { NetworkViewportSnapshot } from "semiotic/network"
import { ExplorerContext } from "./PipelineCard"
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
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [viewport, setViewport] = React.useState<NetworkViewportSnapshot | null>(null)
  const saveNote = React.useCallback(
    (id: string, value: string) => setNotes((previous) => ({ ...previous, [id]: value })),
    [],
  )
  const context = React.useMemo(
    () => ({ selected, select, notes, saveNote }),
    [selected, notes, saveNote],
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
        <div className="pipeline-workspace">
          <div className="pipeline-chart" ref={host}>
            <ZoomableNetworkCustomChart
              ref={ref}
              nodes={nodes}
              edges={edges}
              layout={layout}
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
                if (typeof datum?.id === "string" && byId.has(datum.id)) select(datum.id)
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
            <PipelineMinimap visibleRect={viewport?.visibleRect ?? null} selected={selected} />
          </aside>
        </div>
        <div className="pipeline-footer">
          <span>{viewport?.visibleMarkIds?.length ?? 0} of 30 steps in view</span>
          <span>Silhouettes → shapes → summaries → full detail</span>
        </div>
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
