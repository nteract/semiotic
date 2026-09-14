import * as React from "react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DependencyForestChart } from "semiotic/atlas"
import { LinkedCharts, useSelectionActions } from "semiotic/ai"
import { getRequiredPaths } from "semiotic/atlas/core"
import { ThemeProvider } from "semiotic/themes/react"
import ExamplePageLayout from "./ExamplePageLayout"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import { AtlasObservation } from "../../components/AtlasObservation"
import { AtlasEvaluationClient } from "./atlas-evaluation/workerClient"
import { atlasEvaluationChartProps, measureAtlasSelections } from "./atlas-evaluation/view"
import type { AtlasEvaluation } from "./atlas-evaluation/prepare"
import type { AtlasWorkloadOptions } from "../../../../scripts/network-atlas/workloads"
import "./AtlasEvaluationExamplePage.css"

const linkedSelection = { name: "atlas-acceptance-selection" }
const Diagram = memo(DependencyForestChart)
const number = (value: number) => value.toLocaleString("en-US")

function save(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PreparedOverview({
  result,
  theme,
}: {
  result: AtlasEvaluation
  theme: "light" | "dark"
}) {
  const [region, setRegion] = useState(0)
  const [selected, setSelected] = useState(result.groups[0].nodeIds[0])
  const [timing, setTiming] = useState<Awaited<ReturnType<typeof measureAtlasSelections>> | null>(
    null,
  )
  const [measuring, setMeasuring] = useState(false)
  const [error, setError] = useState("")
  const timingAbort = useRef<AbortController | null>(null)
  const { selectPoints, clear } = useSelectionActions(linkedSelection.name)
  useEffect(
    () => () => {
      timingAbort.current?.abort()
      clear()
    },
    [clear],
  )
  const groupByNode = useMemo(
    () =>
      new Map(
        result.groups.flatMap((group, index) => group.nodeIds.map((id) => [id, index] as const)),
      ),
    [result],
  )
  const select = useCallback(
    (id: string) => {
      const nextRegion = groupByNode.get(id)
      if (nextRegion === undefined) return
      setRegion(nextRegion)
      setSelected(id)
      selectPoints({ nodeId: [id] })
    },
    [groupByNode, selectPoints],
  )
  const chartProps = useMemo(() => atlasEvaluationChartProps(result, region), [result, region])
  const { atlas } = result.forest
  const node = atlas.source.nodes.find((item) => item.id === selected)!
  const required = getRequiredPaths(atlas, selected)
  const support = atlas.source.edges.filter(
    (edge) => edge.source === selected || edge.target === selected,
  )
  const selection = {
    nodeId: selected,
    analysisRevision: atlas.analysisRevision,
    relationScopeId: "directed-admitted",
  }
  const exportReading = async (format: "json" | "svg") => {
    try {
      const config = { component: "DependencyForestChart", props: { ...chartProps, selection } }
      const content =
        format === "json"
          ? JSON.stringify(
              { synthetic: true, config, facts: result.facts, selectionTiming: timing },
              null,
              2,
            )
          : (await import("semiotic/server")).renderChartWithEvidence(config.component, {
              ...config.props,
              theme,
            }).svg
      save(
        content,
        `atlas-acceptance.${format}`,
        format === "json" ? "application/json" : "image/svg+xml",
      )
      setError("")
    } catch (failure) {
      setError(String(failure))
    }
  }
  const measure = async () => {
    const overview = document.getElementById("atlas-evaluation-overview")
    if (!overview?.offsetWidth) {
      setError("Selection timing requires a visible overview. Use a wider viewport.")
      return
    }
    overview.scrollIntoView({ block: "start", behavior: "instant" })
    const abort = new AbortController()
    timingAbort.current?.abort()
    timingAbort.current = abort
    setMeasuring(true)
    setError("")
    try {
      const measured = await measureAtlasSelections(
        select,
        result.groups[region].nodeIds,
        abort.signal,
      )
      if (!abort.signal.aborted) setTiming(measured)
    } catch (failure) {
      if (!abort.signal.aborted) setError(String(failure))
    } finally {
      if (!abort.signal.aborted) setMeasuring(false)
    }
  }
  return (
    <>
      <div className="atlas-evaluation__controls">
        <label>
          Open region{" "}
          <select
            value={region}
            disabled={measuring}
            onChange={(event) => select(result.groups[Number(event.target.value)].nodeIds[0])}
          >
            {result.groups.map((group, i) => (
              <option key={group.id} value={i}>
                {group.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inspect vertex{" "}
          <select
            value={selected}
            disabled={measuring}
            onChange={(event) => select(event.target.value)}
          >
            {result.groups[region].nodeIds.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <button className="atlas-evaluation__measure" disabled={measuring} onClick={measure}>
          Measure 50 selections
        </button>
        <button onClick={() => exportReading("json")}>Export evidence JSON</button>
        <button onClick={() => exportReading("svg")}>Export static SVG</button>
      </div>
      <p id="atlas-timing-method">
        Timing includes selection, React updates and canvas painting through the next two animation
        frames, after three warm-up selections. The target is p95 below 50 ms on a prepared
        overview. Hidden tabs cancel the measurement.
      </p>
      <p role="status" data-testid="selection-timing">
        {measuring
          ? "Measuring selection response…"
          : timing
            ? `${timing.samples} samples · median ${timing.medianMs.toFixed(1)} ms · p95 ${timing.p95Ms.toFixed(1)} ms · ${timing.targetMet ? "target met on this run" : "target not met on this run"}`
            : "Selection response has not been measured in this browser."}
      </p>
      {error && <p role="alert">{error}</p>}
      <table data-testid="atlas-vertex-reading">
        <caption>Selected vertex · exact synthetic evidence</caption>
        <thead>
          <tr>
            <th>Vertex</th>
            <th>Band</th>
            <th>Stock</th>
            <th>Required predecessors</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{selected}</th>
            <td>{node.sectionId}</td>
            <td>1 work item</td>
            <td>
              {required.value
                ? required.value.reachable
                  ? required.value.dominatorIds.join(", ") || "None"
                  : "Unreachable from declared roots"
                : "Unknown"}{" "}
              ({required.status})
            </td>
          </tr>
        </tbody>
      </table>
      <details>
        <summary>Show original-edge support for {selected}</summary>
        <p>
          These admitted directed edges explain the connection. Required predecessors use every
          original edge in the declared root scope; the display backbone does not decide them. This
          synthetic graph has no capacity or completion measurements.
        </p>
        <table aria-label={`Original edges incident to ${selected}`}>
          <thead>
            <tr>
              <th>Edge</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {support.map((edge) => (
              <tr key={edge.id}>
                <th scope="row">{edge.id}</th>
                <td>{edge.source}</td>
                <td>{edge.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p>
        {number(atlas.source.nodes.length - chartProps.collapsedNodeIds.length * 99)} visible
        glyphs. Each collapsed region accounts for 99 hidden vertices and 500 internal original
        edges. All source data remains in the prepared atlas and the JSON export.
      </p>
      <div
        id="atlas-evaluation-overview"
        className="atlas-evaluation__diagram"
        role="region"
        aria-label="Prepared atlas overview; scroll to inspect all bands"
        tabIndex={0}
      >
        <Diagram
          {...chartProps}
          chartId="atlas-acceptance"
          linkedSelection={linkedSelection}
          onSelectNode={select}
        />
      </div>
      <AtlasObservation chartId="atlas-acceptance" />
    </>
  )
}

export default function AtlasEvaluationExamplePage() {
  const [docsTheme] = useDocsTheme()
  const [options, setOptions] = useState<AtlasWorkloadOptions>({
    size: 1000,
    witnessLimit: 5,
    reverse: false,
  })
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<AtlasEvaluation | null>(null)
  const [status, setStatus] = useState("Preparation starts in a worker after this page mounts.")
  const [requests, setRequests] = useState(0)
  const [busy, setBusy] = useState(false)
  const client = useRef<AtlasEvaluationClient | null>(null)
  useEffect(() => {
    client.current = new AtlasEvaluationClient(
      () =>
        new Worker(new URL("./atlas-evaluation/worker.ts", import.meta.url), {
          type: "module",
          name: "atlas-acceptance",
        }),
    )
    return () => {
      client.current?.cancel()
      client.current = null
    }
  }, [])
  useEffect(() => {
    setResult(null)
    setBusy(true)
    setStatus(`Preparing ${number(options.size)} vertices in a worker…`)
    setRequests((value) => value + 1)
    const start = performance.now()
    client.current!.request(options, (response) => {
      setBusy(false)
      if (!response.ok) {
        setStatus(`Preparation failed: ${response.message}`)
        return
      }
      setResult(response.result)
      setStatus(
        `Prepared revision ${response.generation} in ${(performance.now() - start).toFixed(0)} ms including worker startup, source construction and transfer.`,
      )
    })
    return () => client.current?.cancel()
  }, [options, retry])
  return (
    <ExamplePageLayout title="Atlas acceptance lab" prevPage={undefined} nextPage={undefined}>
      <ThemeProvider theme={docsTheme === "light" ? "light" : "dark"}>
        <LinkedCharts>
          <section
            className="atlas-evaluation"
            data-testid="atlas-evaluation"
            data-preparations={requests}
            data-ready={Boolean(result)}
            data-ranking-policy={result?.forest.forest.rankingPolicyId}
          >
            <p className="atlas-evaluation__eyebrow">Network Atlas · acceptance and performance</p>
            <h2>Keep the evidence. Bound the drawing.</h2>
            <p>
              <strong>Synthetic stress fixture.</strong> Explore 20 bands of directed feedback
              structure, with five original edges per vertex. Preparation runs in a module worker.
              Selecting a prepared vertex changes its reading and highlight without matching motifs
              again.
            </p>
            <div className="atlas-evaluation__controls">
              <label>
                Workload{" "}
                <select
                  value={options.size}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      size: Number(event.target.value) as AtlasWorkloadOptions["size"],
                    })
                  }
                >
                  <option value={1000}>1,000 vertices / 5,000 edges</option>
                  <option value={10000}>10,000 vertices / 50,000 edges</option>
                </select>
              </label>
              <label>
                Fan witness limit{" "}
                <select
                  value={options.witnessLimit}
                  onChange={(event) =>
                    setOptions({ ...options, witnessLimit: Number(event.target.value) })
                  }
                >
                  <option value={5}>All five neighbors</option>
                  <option value={2}>Two neighbors, disclose the remainder</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.reverse}
                  onChange={(event) => setOptions({ ...options, reverse: event.target.checked })}
                />{" "}
                Reverse display backbone
              </label>
              <button
                disabled={!busy}
                onClick={() => {
                  client.current?.cancel()
                  setBusy(false)
                  setStatus("Preparation cancelled. No partial revision was published.")
                }}
              >
                Cancel preparation
              </button>
              <button disabled={busy} onClick={() => setRetry((value) => value + 1)}>
                Prepare again
              </button>
            </div>
            <p role="status" data-testid="preparation-status">
              {status}
            </p>
            {result && (
              <>
                <dl className="atlas-evaluation__facts" data-testid="atlas-facts">
                  <div>
                    <dt>Vertices</dt>
                    <dd>{number(result.facts.nodes)}</dd>
                  </div>
                  <div>
                    <dt>Original edges</dt>
                    <dd>{number(result.facts.edges)}</dd>
                  </div>
                  <div>
                    <dt>Stock</dt>
                    <dd>{number(result.facts.stock)} work items</dd>
                  </div>
                  <div>
                    <dt>Motif matches</dt>
                    <dd>{number(result.facts.matches)}</dd>
                  </div>
                  <div>
                    <dt>Truncated witnesses</dt>
                    <dd>{number(result.facts.truncatedMatches)}</dd>
                  </div>
                </dl>
                <ul data-testid="acceptance-checks">
                  {result.facts.checks.map((check) => (
                    <li key={check.name}>
                      {check.passed ? "Pass" : "Fail"}: {check.name}
                    </li>
                  ))}
                </ul>
                <p>
                  Worker preparation: {result.timings.preparationMs.toFixed(1)} ms. Dependency
                  projection: {result.timings.projectionMs.toFixed(1)} ms. These single-run values
                  are separate from the selection response measurement.
                </p>
                <PreparedOverview
                  key={result.forest.atlas.analysisRevision}
                  result={result}
                  theme={docsTheme === "light" ? "light" : "dark"}
                />
              </>
            )}
            <h2>What this run establishes</h2>
            <p>
              The controls exercise edge accounting, declared-root reachability, disclosed witness
              truncation and cancellation. Display backbone changes retain the original graph and
              stock. Motif matches overlap and do not partition that stock. These measurements
              describe this fixture on this browser and device.
            </p>
            <p>
              The separate reader-benefit target needs comparisons with well-designed conventional
              charts, matched information and training. The plan calls for task-level accuracy,
              unsupported claims and diagnosis time; faster preparation does not establish that
              benefit.
            </p>
            <p>
              Read the public <a href="/charts/motif-braid-chart">Motif Braid</a>,{" "}
              <a href="/charts/dependency-forest-chart">Dependency Forest</a> and{" "}
              <a href="/charts/flow-circuit-chart">Flow Circuit</a> examples for the five synthetic
              analysis stories.
            </p>
          </section>
        </LinkedCharts>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
