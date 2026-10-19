import * as React from "react"
import { Link } from "react-router-dom"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import { traceCompositionalGraph } from "semiotic/recipes/core"
import type { CompositionalEndpointRef } from "semiotic/recipes/core"
import { CompositionalNavigator } from "semiotic/recipes/react"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  describeEndpoint,
  edges,
  nodes,
  prepared,
  solve,
  solveCount,
} from "./compositional-dag/model"
import type { Representation } from "./compositional-dag/model"
import { layout, tooltip } from "./compositional-dag/scene"
import "./compositional-dag/compositional-dag.css"

export default function CompositionalDagExamplePage() {
  const host = React.useRef<HTMLDivElement>(null)
  const chart = React.useRef<ZoomableNetworkCustomChartHandle>(null)
  const [width, setWidth] = React.useState(850)
  const [mode, setMode] = React.useState<Representation>("composite")
  const [optimized, setOptimized] = React.useState(false)
  const [showRows, setShowRows] = React.useState(true)
  const [cameraPhase, setCameraPhase] = React.useState("moving")
  const [selectedEdge, setSelectedEdge] = React.useState("output-customer")
  const [selectedPart, setSelectedPart] = React.useState<CompositionalEndpointRef>()
  // Wire-only visibility reuses exactly the composite solution.
  const projection = mode === "wires" ? "composite" : mode
  const solved = React.useMemo(() => solve(optimized, projection), [optimized, projection])
  const trace = React.useMemo(() => {
    const edge = edges.find((e) => e.id === selectedEdge)
    const start = edge ? { nodeId: edge.target, endpoint: edge.targetEndpoint! } : selectedPart
    return start
      ? traceCompositionalGraph(prepared, {
          start,
          direction: "upstream",
          maxDepth: 32,
          maxVisited: 128,
        })
      : null
  }, [selectedEdge, selectedPart])
  const config = React.useMemo(
    () => ({
      solved,
      showRows: showRows && mode !== "wires",
      summary: mode === "summary",
      selectedEdge,
      activeEdges: trace?.edgeIds ?? [],
    }),
    [solved, showRows, mode, selectedEdge, trace],
  )

  React.useEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  React.useEffect(() => {
    const id = requestAnimationFrame(() => chart.current?.fitToContent(solved.bounds))
    return () => cancelAnimationFrame(id)
  }, [width, solved])

  const selectPart = (ref: CompositionalEndpointRef) => {
    setSelectedEdge("")
    setSelectedPart(ref)
  }

  return (
    <ExamplePageLayout title="Compositional DAGs" prevPage={undefined} nextPage={undefined}>
      <p className="compositional-intro">
        Connect to a field inside a card. Keep each wire’s identity, even when two wires share the
        same endpoints. Then change the presentation without changing what the graph means.
      </p>
      <section
        className="compositional-lab"
        aria-label="Interactive compositional DAG"
        data-representation={mode}
        data-solve-count={solveCount}
        data-camera-phase={cameraPhase}
      >
        <div className="compositional-toolbar">
          <label>
            Representation
            <select
              aria-label="DAG representation"
              value={mode}
              onChange={(e) => setMode(e.target.value as Representation)}
            >
              <option value="composite">Rows in cards</option>
              <option value="wires">Wire-only slots</option>
              <option value="exploded">Individual part boxes</option>
              <option value="summary">Collapsed interfaces</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={optimized}
              onChange={(e) => setOptimized(e.target.checked)}
            />{" "}
            Allow row reordering
          </label>
          <label>
            <input
              type="checkbox"
              checked={showRows}
              disabled={mode === "wires" || mode === "summary"}
              onChange={(e) => setShowRows(e.target.checked)}
            />{" "}
            Show row graphics
          </label>
        </div>
        <div className="compositional-metrics" aria-label="Layout measurements">
          <span>
            <strong data-testid="dag-crossings">{solved.metrics.crossings}</strong> routed crossings
          </span>
          <span>
            <strong>{solved.metrics.alignmentError.toFixed(0)}</strong> alignment error
          </span>
          <span>
            <strong>{solved.edges.length}</strong> distinct wires
          </span>
        </div>
        <div ref={host} className="compositional-chart">
          <ZoomableNetworkCustomChart
            ref={chart}
            nodes={nodes}
            edges={edges}
            layout={layout}
            layoutConfig={config}
            width={Math.max(1, width)}
            height={330}
            margin={{ top: 12, bottom: 12, left: 12, right: 12 }}
            animate={false}
            title="Order fields to invoice fields"
            description="Three fields connect through a copy operation. Customer has two independent input wires. Drag to pan or use the zoom controls."
            summary="Seven illustrative wires and three declared identity transfers. Every connection is listed below."
            accessibleTable={false}
            tooltip={tooltip}
            frameProps={{ edgeIdentity: "id", edgeIdAccessor: "id" }}
            zoomOptions={{ minZoom: 0.2, maxZoom: 3, panBounds: solved.bounds, wheelZoom: false }}
            onZoomChange={(_zoom, event) => setCameraPhase(event.phase)}
            onClick={(datum) => {
              if (edges.some((e) => e.id === datum?.id)) setSelectedEdge(String(datum!.id))
              else if (typeof datum?.nodeId === "string" && typeof datum?.partId === "string")
                selectPart({
                  nodeId: datum.nodeId,
                  endpoint: { kind: "part", partId: datum.partId, portId: "out" },
                })
            }}
          />
        </div>
        <p className="compositional-caption">
          Teal: Customer · amber: Quantity · purple: Unit price. Circles mark the solved attachment
          points. Dashed wires in the collapsed view disclose proxy attachments. Drag to pan; use
          Fit to return to the whole graph.
        </p>
        <div className="compositional-inspector">
          <div>
            <label>
              Trace a connection upstream
              <select
                aria-label="Trace a connection upstream"
                value={selectedEdge}
                onChange={(e) => {
                  setSelectedEdge(e.target.value)
                  setSelectedPart(undefined)
                }}
              >
                <option value="">No connection selected</option>
                {edges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id}
                  </option>
                ))}
              </select>
            </label>
            <p role="status" data-testid="dag-trace">
              {trace
                ? `${trace.edgeIds.length} wires · ${trace.transferIds.length} declared transfer${trace.transferIds.length === 1 ? "" : "s"} · ${trace.completeness} within this illustrative graph`
                : "Select a wire or an interface to trace."}
            </p>
            {trace?.boundaryRefs.length ? (
              <p>
                The trace stops at a whole-owner boundary. Select a named port for a fine-grained
                trace.
              </p>
            ) : null}
            <p>
              The two Customer input wires have distinct IDs. Following Customer through its
              declared copy transfer leaves Quantity and Unit price unhighlighted.
            </p>
          </div>
          <details>
            <summary>Navigate parts and ports with the keyboard</summary>
            <CompositionalNavigator
              prepared={prepared}
              selected={selectedPart}
              onSelect={selectPart}
              proxy={mode === "summary"}
            />
          </details>
        </div>
        <details className="compositional-connection-table">
          <summary>Inspect all 7 connections</summary>
          <div
            className="compositional-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Connection records"
          >
            <table>
              <caption>Illustrative wiring. All records have unknown evidence precision.</caption>
              <thead>
                <tr>
                  <th scope="col">Select ID</th>
                  <th scope="col">Source port</th>
                  <th scope="col">Target port</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e) => (
                  <tr key={e.id}>
                    <th scope="row">
                      <button
                        type="button"
                        aria-pressed={selectedEdge === e.id}
                        onClick={() => setSelectedEdge(e.id)}
                      >
                        {e.id}
                      </button>
                    </th>
                    <td>
                      {describeEndpoint(
                        e.source,
                        e.sourceEndpoint?.kind === "part" ? e.sourceEndpoint.partId : undefined,
                        e.sourceEndpoint?.portId,
                      )}
                    </td>
                    <td>
                      {describeEndpoint(
                        e.target,
                        e.targetEndpoint?.kind === "part" ? e.targetEndpoint.partId : undefined,
                        e.targetEndpoint?.portId,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {solved.diagnostics.length > 0 && (
          <details className="compositional-diagnostics">
            <summary>Layout diagnostics ({solved.diagnostics.length})</summary>
            <ul>
              {solved.diagnostics.map((d, i) => (
                <li key={`${d.code}:${i}`}>{d.message}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <div className="compositional-lessons">
        <section>
          <h2>Keep the endpoints</h2>
          <p>
            Hide the row graphics or choose wire-only slots. The attachment coordinates stay fixed.
            Selecting, hovering, panning and zooming reuse the accepted solution.
          </p>
        </section>
        <section>
          <h2>Give the layout permission</h2>
          <p>
            The middle card starts in reverse order. Allow row reordering to optimize actual wire
            crossings and alignment. Rows, anchors and paths move together; fixed order is never
            silently relaxed.
          </p>
        </section>
        <section>
          <h2>Declare the dependency</h2>
          <p>
            A shared card creates no relationship between its fields. This fixture explicitly
            declares three identity transfers from input to output ports. It demonstrates graph
            semantics, not observed database provenance.
          </p>
        </section>
      </div>
      <section>
        <h2>Use it in a chart</h2>
        <p>
          Prepare the semantic graph once. Solve when graph, view or measured geometry changes, then
          give the synchronous chart layout the accepted result.
        </p>
        <CodeBlock
          language="tsx"
          code={undefined}
          codeAreaLabel="Compositional DAG chart setup"
        >{`import { NetworkCustomChart } from "semiotic/network"
import {
  prepareCompositionalGraph, routeCompositionalGraph,
  compositionalLayoutOptions, compositionalDagLayout
} from "semiotic/recipes/core"

const prepared = prepareCompositionalGraph(graph)
const solved = routeCompositionalGraph({
  requestId: "layout-1", prepared, view, geometry,
  options: compositionalLayoutOptions({ mode: "optimize" })
})
// On an infeasible result, retain the last accepted solution.
const layoutConfig = { prepared, solved, showParts: true }

const chart = <NetworkCustomChart
  nodes={[...graph.nodes]} edges={[...graph.edges]}
  layout={compositionalDagLayout} layoutConfig={layoutConfig}
  frameProps={{ edgeIdentity: "id", edgeIdAccessor: "id" }}
  title="Field dependencies" accessibleTable
/>`}</CodeBlock>
        <p>
          The Full Code view includes this fixture’s complete graph, geometry, controls, paint and
          hit targets. The optimizer is a bounded heuristic. General compound optimization and
          flexible port permutations require another adapter.
        </p>
        <p>
          See the{" "}
          <Link to="/custom-charts/custom-layouts#compositional-dags">compositional API guide</Link>{" "}
          for patches, workers and measurement, or the{" "}
          <Link to="/examples/pipeline-explorer">Pipeline Explorer</Link> for a larger graph with
          HTML cards, notes and culling.
        </p>
      </section>
    </ExamplePageLayout>
  )
}
