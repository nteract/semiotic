import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import { ThemeProvider } from "semiotic/themes/react"
import { LinkedCharts } from "semiotic/ai"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import { AtlasObservation } from "../../components/AtlasObservation"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import useExplainerMotion from "../../hooks/useExplainerMotion"
import { FlowCircuitChart } from "../../../../src/components/recipes/atlas/FlowCircuitChart"
import { flowCircuitChartProps } from "../../../../src/components/recipes/atlas/flowCircuitChartProps"
import { flowCircuitStory } from "../../../../src/components/recipes/atlas/flowCircuitStories"
import {
  exportCircuitEvidence,
  readCircuitEdition,
} from "../../../../src/components/recipes/atlas/flowCircuitTape"
import type { CircuitMode } from "../../../../src/components/recipes/atlas/flowCircuitTypes"
import {
  CircuitAssumptions,
  CircuitInspector,
  CircuitTotalsTable,
} from "./flow-circuit/CircuitInspector"
import "./FlowCircuitExamplePage.css"
import { CircuitGrammar } from "./flow-circuit/CircuitGrammar"

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function FlowCircuitExamplePage() {
  const [docsTheme] = useDocsTheme()
  const theme = docsTheme === "light" ? "light" : "dark"
  const [story, setStory] = useState<"etl" | "retry">("etl")
  const [mode, setMode] = useState<CircuitMode>("observed-snapshot")
  const [time, setTime] = useState(60)
  const [playing, setPlaying] = useState(false)
  const [reverseBackbone, setReverse] = useState(false)
  const [hotPartitions, setHot] = useState(4)
  const [retryBudget, setRetryBudget] = useState(1)
  const [particleBudget, setParticleBudget] = useState(24)
  const [placementSeed, setSeed] = useState(1)
  const [selected, setSelected] = useState("p1")
  const [highlightedEdgeIds, setHighlightedEdges] = useState<string[]>([])
  const [error, setError] = useState("")
  const motion = useExplainerMotion()
  const [width, container] = useResponsiveWidth(360, 1280)
  const prepared = useMemo(
    () => flowCircuitStory(story, { reverseBackbone, hotPartitions, retryBudget }),
    [story, reverseBackbone, hotPartitions, retryBudget],
  )
  const { circuit, observed, modeled } = prepared
  const observedReading = readCircuitEdition(
    observed,
    mode === "observed-replay" ? mode : "observed-snapshot",
    time,
  )
  const modelReading = readCircuitEdition(modeled, "modeled-scenario", time)
  const comparing = mode === "modeled-scenario"
  const edition = comparing ? modeled : observed
  const reading = comparing ? modelReading : observedReading
  const selection = {
    nodeId: selected,
    analysisRevision: circuit.atlas.analysisRevision,
    relationScopeId: "directed-admitted" as const,
  }
  const chartWidth = Math.max(880, width)
  const chartProps = {
    chartId: "flow-circuit",
    circuit,
    edition,
    reading,
    selection,
    particleBudget,
    placementSeed,
    reducedMotion: motion.reducedMotion,
    highlightedEdgeIds,
    width: chartWidth,
    height: story === "etl" ? 860 : 430,
  }
  useEffect(() => {
    if (!playing || motion.reducedMotion || mode !== "observed-replay") return
    const start = performance.now()
    const from = time >= 60 ? 0 : time
    let frame = 0
    const tick = (now: number) => {
      const next = Math.min(60, from + (now - start) / 100)
      setTime(next)
      if (next < 60) frame = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // The start time is captured when playback begins; tape lookup uses elapsed time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, motion.reducedMotion, mode])
  return (
    <ExamplePageLayout title="Flow Circuit">
      <ThemeProvider theme={theme}>
        <LinkedCharts>
          <div className="flow-circuit" ref={container}>
            <p className="flow-circuit__eyebrow">Network Atlas · synthetic process studies</p>
            <h1>
              {story === "etl"
                ? "Spare capacity. One growing queue."
                : "The boundary stays small. The work triples."}
            </h1>
            <p>
              {story === "etl"
                ? "Eight partitions offer 80,000 records/s of capacity. Uneven routing leaves one overloaded and the rest underused. Follow the measured work, then inspect a redistribution candidate."
                : "10,000 roots/s enter at the boundary. Retries raise offered inventory work to 30,000 attempts/s. Replay the interval observations, then test an explicit retry-budget model."}
            </p>
            <div className="flow-circuit__controls">
              <label>
                Study{" "}
                <select
                  value={story}
                  onChange={(event) => {
                    const value = event.target.value as typeof story
                    setStory(value)
                    setSelected(value === "etl" ? "p1" : "inventory")
                    setHighlightedEdges([])
                    setPlaying(false)
                    setTime(60)
                  }}
                >
                  <option value="etl">Hot-partition ETL</option>
                  <option value="retry">Retry incident</option>
                </select>
              </label>
              <label>
                Reading{" "}
                <select
                  value={mode}
                  onChange={(event) => {
                    const value = event.target.value as CircuitMode
                    setMode(value)
                    setPlaying(false)
                    setTime(value === "observed-replay" ? 0 : 60)
                  }}
                >
                  <option value="observed-snapshot">Observed snapshot</option>
                  <option value="observed-replay">Observed replay</option>
                  <option value="modeled-scenario">Modeled scenario</option>
                </select>
              </label>
              {comparing &&
                (story === "etl" ? (
                  <label>
                    Hot-key partitions{" "}
                    <select
                      value={hotPartitions}
                      onChange={(event) => setHot(Number(event.target.value))}
                    >
                      {[1, 2, 4].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Retry budget{" "}
                    <select
                      value={retryBudget}
                      onChange={(event) => setRetryBudget(Number(event.target.value))}
                    >
                      {[0, 1, 2].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ))}
            </div>
            <div className="flow-circuit__timeline">
              <label>
                Observation time{" "}
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={time}
                  onChange={(event) => {
                    setPlaying(false)
                    setTime(Number(event.target.value))
                  }}
                />
              </label>
              <output aria-live="polite" data-testid="circuit-time">
                Latest observation: {reading.observedAt}s
              </output>
              {mode === "observed-replay" && (
                <button
                  type="button"
                  disabled={motion.reducedMotion}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? "Pause replay" : "Play replay"}
                </button>
              )}
            </div>
            <p>
              Observations arrive every 10 seconds. The cursor holds the latest reading between
              observations. Individual event timings are unavailable.
            </p>
            <CircuitTotalsTable
              observed={observedReading}
              modeled={comparing ? modelReading : undefined}
              unit={edition.unit === "records" ? "records" : "attempts"}
            />
            {story === "retry" && (
              <p>
                Queue growth and observed success are <strong>unmeasured</strong>. Offered attempts
                do not establish completions, cancellations or usable capacity.
              </p>
            )}
            {comparing && (
              <section
                className="flow-circuit__guardrails"
                aria-label="Modeled scenario guardrails"
              >
                <h2>
                  {story === "etl"
                    ? "Check capacity and key semantics separately"
                    : "Less retry work can sacrifice successful outcomes"}
                </h2>
                <ul>
                  {modeled.model!.guardrails.map((guardrail) => (
                    <li key={guardrail.label}>
                      <strong>
                        {guardrail.label}: {guardrail.status}.
                      </strong>{" "}
                      {guardrail.detail}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <details className="flow-circuit__display">
              <summary>Display controls</summary>
              <label>
                Direction particles{" "}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={particleBudget}
                  onChange={(event) => setParticleBudget(Number(event.target.value))}
                />
              </label>
              <button type="button" onClick={() => setSeed(placementSeed + 1)}>
                Change particle pattern
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false)
                  motion.toggleReaderReducedMotion()
                }}
              >
                {motion.reducedMotion ? "Motion reduced" : "Reduce motion"}
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={reverseBackbone}
                  onChange={(event) => setReverse(event.target.checked)}
                />{" "}
                Reverse display backbone
              </label>
              <p>
                Particles show direction. They never count jobs, complete work, or evict records
                from the ledger.
              </p>
            </details>
            <p>
              Pipe width shows transferred volume/s in the labeled units. Outlines enclose modules;
              labeled residual pipes retain original cross-links and returns. Queue bars show stock,
              scaled to the largest visible queue. Partition readings show completions / capacity.
            </p>
            <div
              className={`flow-circuit__charts${comparing ? " flow-circuit__charts--compare" : ""}`}
              data-testid="circuit-overview"
            >
              {comparing && (
                <FlowCircuitChart
                  {...chartProps}
                  chartId="flow-circuit-reference"
                  edition={observed}
                  reading={observedReading}
                  onSelectNode={setSelected}
                />
              )}
              <FlowCircuitChart {...chartProps} onSelectNode={setSelected} />
            </div>
            <AtlasObservation chartId={chartProps.chartId} />
            <CircuitInspector
              circuit={circuit}
              reading={reading}
              selected={selected}
              onSelect={setSelected}
              onSelectEdges={setHighlightedEdges}
            />
            <CircuitAssumptions edition={edition} dictionary={prepared.dictionary} />
            <button
              type="button"
              onClick={() =>
                download(
                  `${story}-circuit-evidence.json`,
                  JSON.stringify(
                    {
                      ...exportCircuitEvidence(circuit, edition, reading, selection),
                      dictionary: prepared.dictionary,
                      observedReference: comparing
                        ? exportCircuitEvidence(circuit, observed, observedReading, selection)
                        : undefined,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              Export evidence and tape
            </button>{" "}
            <button
              type="button"
              onClick={async () => {
                try {
                  const { renderChart } = await import("semiotic/server")
                  download(
                    `${story}-circuit.svg`,
                    renderChart("PhysicsCustomChart", {
                      ...flowCircuitChartProps(chartProps),
                      theme,
                    }),
                    "image/svg+xml",
                  )
                  setError("")
                } catch (failure) {
                  setError(String(failure))
                }
              }}
            >
              Export static SVG
            </button>
            {error && <p role="alert">{error}</p>}
            <CircuitGrammar width={chartWidth} />
            <p>
              Network Atlas source preview. This example runs from the repository; public recipe
              imports and serialized configurations are planned for NA5.
            </p>
          </div>
        </LinkedCharts>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
