import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GaltonBoardChart } from "semiotic/physics"
import { generateTokens, mulberry32 } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PhysicsArcStatus,
  usePhysicsExampleConversationArc,
} from "./PhysicsExampleConversationArc"
import "./PlinkoQuantileDotplotExamplePage.css"

const BOARD_HEIGHT = 360
const POSTERIOR_SAMPLE_COUNT = 1400
const OUTCOME_COLORS = {
  win: "#76b7b2",
  loss: "#f28e2b",
}

const SCENARIOS = [
  {
    id: "tossup",
    label: "Toss-up district",
    seed: 7121,
    threshold: 50,
    claim: "A local forecast gives the measure a narrow edge, but the posterior still crosses 50% often.",
    components: [
      { weight: 0.72, mean: 50.8, sd: 3.6 },
      { weight: 0.28, mean: 47.2, sd: 2.8 },
    ],
  },
  {
    id: "leaning",
    label: "Leaning passage",
    seed: 7237,
    threshold: 50,
    claim: "Most simulated worlds clear the threshold, but a visible tail still misses.",
    components: [
      { weight: 0.8, mean: 54.2, sd: 2.7 },
      { weight: 0.2, mean: 49.6, sd: 3.1 },
    ],
  },
  {
    id: "volatile",
    label: "Volatile late count",
    seed: 7351,
    threshold: 50,
    claim: "Two posterior modes make the animation useful: the same point estimate hides two possible stories.",
    components: [
      { weight: 0.52, mean: 47.1, sd: 2.4 },
      { weight: 0.48, mean: 54.9, sd: 2.6 },
    ],
  },
]

const implementationCode = `import { GaltonBoardChart } from "semiotic/physics"
import { generateTokens } from "semiotic/recipes"

const tokenSet = generateTokens(posteriorSamples, {
  tokenType: "dot",
  tokenSemantics: "posterior-sample",
  countStrategy: "posterior-sample",
  tokenCount: 96,
})

const drops = tokenSet.tokens.map((token) => ({
  id: \`posterior-\${token.index}\`,
  value: token.sample,
  token,
}))

// Threshold is NOT baked into the data or the key. Coloring by a function of
// the live threshold recolors every body on repaint — dragging the slider
// re-classifies wins/losses in place, without re-running the drop.
const colorByOutcome = (d) => (d.value >= threshold ? "win" : "loss")

<GaltonBoardChart
  key={\`\${scenario.id}-\${tokenCount}-\${runId}\`}
  data={drops}
  valueAccessor="value"
  valueExtent={posteriorDomain}
  colorBy={colorByOutcome}
  bins={13}
  ballRadius={8}
  seed={scenario.seed}
  referenceLines={{ value: threshold, label: \`\${threshold.toFixed(1)}%\` }}
  frameProps={{ onTick, onBodyPointerDown }}
/>`

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalSample(random) {
  const u = Math.max(1e-9, random())
  const v = Math.max(1e-9, random())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function pickComponent(components, random) {
  const target = random()
  let running = 0
  for (const component of components) {
    running += component.weight
    if (target <= running) return component
  }
  return components[components.length - 1]
}

function makePosteriorSamples(scenario) {
  const random = mulberry32(scenario.seed)
  return Array.from({ length: POSTERIOR_SAMPLE_COUNT }, () => {
    const component = pickComponent(scenario.components, random)
    const draw = component.mean + normalSample(random) * component.sd
    return clamp(draw, 38, 62)
  }).sort((a, b) => a - b)
}

function quantile(sorted, p) {
  if (!sorted.length) return 0
  if (sorted.length === 1) return sorted[0]
  const clamped = clamp(p, 0, 1)
  const index = (sorted.length - 1) * clamped
  const low = Math.floor(index)
  const high = Math.ceil(index)
  const mix = index - low
  return sorted[low] * (1 - mix) + sorted[high] * mix
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`
}

function summarizeSamples(samples, threshold) {
  const wins = samples.filter((sample) => sample >= threshold).length
  return {
    median: quantile(samples, 0.5),
    low: quantile(samples, 0.05),
    high: quantile(samples, 0.95),
    probability: samples.length ? wins / samples.length : 0,
  }
}

function useBoardRuntime(resetKey) {
  const tickRef = useRef(0)
  const runtimeRef = useRef({
    live: 0,
    queued: 0,
    state: "starting",
    elapsed: 0,
  })
  const lastPublishedRef = useRef(runtimeRef.current)
  const bodiesScratchRef = useRef([])
  const [runtime, setRuntime] = useState({
    live: 0,
    queued: 0,
    state: "starting",
    elapsed: 0,
  })

  useEffect(() => {
    tickRef.current = 0
    const reset = { live: 0, queued: 0, state: "starting", elapsed: 0 }
    runtimeRef.current = reset
    lastPublishedRef.current = reset
    setRuntime(reset)
  }, [resetKey])

  const onTick = useCallback((result, controls) => {
    tickRef.current += 1
    const previous = runtimeRef.current
    const state = result.shouldContinue ? "running" : "settled"
    const next = {
      live: previous.live,
      queued: result.queueSize,
      state,
      elapsed: result.elapsedSeconds,
    }
    runtimeRef.current = next

    const published = lastPublishedRef.current
    const stateChanged =
      published.live !== next.live ||
      published.queued !== next.queued ||
      published.state !== next.state
    const elapsedBucketChanged =
      Math.floor(published.elapsed * 4) !== Math.floor(next.elapsed * 4)
    const bodiesChanged =
      result.spawned.length > 0 ||
      result.evicted.length > 0 ||
      result.sedimented.length > 0
    if (
      !stateChanged &&
      !elapsedBucketChanged &&
      !bodiesChanged &&
      tickRef.current % 30 !== 0
    ) {
      return
    }

    const publishedNext = {
      ...next,
      live: controls.readBodies(bodiesScratchRef.current).length,
    }
    runtimeRef.current = publishedNext
    lastPublishedRef.current = publishedNext
    setRuntime(publishedNext)
  }, [])

  return [runtime, onTick]
}

export default function PlinkoQuantileDotplotExamplePage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [tokenCount, setTokenCount] = useState(96)
  const [threshold, setThreshold] = useState(SCENARIOS[0].threshold)
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [selectedDrop, setSelectedDrop] = useState(null)
  const [containerWidth, chartRef] = useResponsiveWidth(640, 940)
  const boardViewRef = useRef(null)
  const wasOutOfViewRef = useRef(false)

  const scenario = useMemo(
    () => SCENARIOS.find((candidate) => candidate.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  )

  useEffect(() => {
    setThreshold(scenario.threshold)
    setSelectedDrop(null)
  }, [scenario])

  // Re-drop when the board scrolls back into view, so a reader arriving
  // mid-page meets a fresh cascade rather than a settled pile.
  useEffect(() => {
    const host = boardViewRef.current
    if (!host || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            wasOutOfViewRef.current = true
          } else if (wasOutOfViewRef.current) {
            wasOutOfViewRef.current = false
            setSelectedDrop(null)
            setPaused(false)
            setRunId((value) => value + 1)
          }
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const posteriorSamples = useMemo(() => makePosteriorSamples(scenario), [scenario])
  const tokenSet = useMemo(
    () =>
      generateTokens(posteriorSamples, {
        tokenType: "dot",
        tokenSemantics: "posterior-sample",
        countStrategy: "posterior-sample",
        tokenCount,
      }),
    [posteriorSamples, tokenCount],
  )
  // Drops are independent of the threshold: the bin a ball falls into encodes
  // its value, and win/loss is a live coloring on top. Keeping this array (and
  // the board key) stable across threshold changes is what avoids a re-drop.
  const drops = useMemo(
    () =>
      tokenSet.tokens.map((token) => ({
        id: `${scenario.id}-${runId}-${token.index}`,
        value: token.sample,
        quantile: tokenSet.tokens.length
          ? (token.index + 0.5) / tokenSet.tokens.length
          : 0,
        token,
      })),
    [runId, scenario.id, tokenSet.tokens],
  )
  // Color by a function of the LIVE threshold so bodies recolor on repaint.
  const colorByOutcome = useCallback(
    (datum) => (Number(datum?.value) >= threshold ? "win" : "loss"),
    [threshold],
  )
  const summary = useMemo(
    () => summarizeSamples(posteriorSamples, threshold),
    [posteriorSamples, threshold],
  )
  const posteriorDomain = useMemo(
    () => [
      posteriorSamples[0] ?? 38,
      posteriorSamples[posteriorSamples.length - 1] ?? 62,
    ],
    [posteriorSamples],
  )
  const chartWidth = Math.max(640, Math.min(940, containerWidth || 940))
  const boardSize = useMemo(() => [chartWidth, BOARD_HEIGHT], [chartWidth])
  // No threshold in the key: threshold only re-colors/re-counts, it never
  // rebuilds the board. Only scenario, token count, and replay do.
  const boardKey = `${scenario.id}-${tokenCount}-${runId}`
  const [runtime, onTick] = useBoardRuntime(boardKey)
  const arc = usePhysicsExampleConversationArc({
    sessionId: "physics-plinko-example",
    arcId: "physics-plinko-quantile-dotplot",
    component: "GaltonBoardChart",
    chartId: "plinko-quantile-dotplot",
  })
  const recordArcEdit = arc.recordEdit
  const recordArcRendered = arc.recordRendered
  const recordedBoardKeyRef = useRef(null)

  useEffect(() => {
    if (recordedBoardKeyRef.current === boardKey) return
    recordedBoardKeyRef.current = boardKey
    recordArcRendered({
      scenarioId: scenario.id,
      tokenCount,
      threshold,
      visibleTokens: tokenSet.shown,
      posteriorSampleCount: posteriorSamples.length,
    })
  }, [
    boardKey,
    posteriorSamples.length,
    recordArcRendered,
    scenario.id,
    threshold,
    tokenCount,
    tokenSet.shown,
  ])

  const physicsRuntimeFrameProps = useMemo(
    () => ({
      workerBodyThreshold: 90,
      onTick,
      onBodyPointerDown: (body) => {
        const datum = body?.datum ?? null
        recordArcEdit(["selectedDrop"], {
          dropId: datum?.id ?? null,
          value: datum?.value,
        })
        setSelectedDrop(datum)
      },
    }),
    [onTick, recordArcEdit],
  )

  return (
    <ExamplePageLayout title="Plinko Quantile Dotplot">
      <section className="plinko-example__intro">
        <div>
          <div className="plinko-example__eyebrow">Forecast uncertainty as falling outcomes</div>
          <p>
            Will the forecast clear the line? Every ball is one draw from the
            posterior; they rain through the board and settle into a dotplot of the
            whole distribution. The threshold splits them into wins and losses
            &mdash; drag it and each ball re-colors as the odds shift, with no
            re-drop.
          </p>
        </div>
        <div className="plinko-example__status-stack">
          <div className="plinko-example__status" aria-live="polite">
            <span>{runtime.state}</span>
            <strong>{runtime.live}</strong>
            <span>live</span>
            <strong>{runtime.queued}</strong>
            <span>queued</span>
          </div>
          <PhysicsArcStatus arc={arc} />
        </div>
      </section>

      <section className="plinko-example__controls" aria-label="Plinko controls">
        <label>
          Scenario
          <select
            value={scenarioId}
            onChange={(event) => {
              const nextScenarioId = event.target.value
              const nextScenario = SCENARIOS.find((candidate) => candidate.id === nextScenarioId)
              recordArcEdit(["data", "scenario", "threshold"], {
                action: "scenario",
                scenarioId: nextScenarioId,
                label: nextScenario?.label,
                threshold: nextScenario?.threshold,
              })
              setScenarioId(nextScenarioId)
              setRunId((value) => value + 1)
            }}
          >
            {SCENARIOS.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>

        <div className="plinko-example__segmented" aria-label="Token count">
          {[48, 96, 144].map((count) => (
            <button
              key={count}
              type="button"
              className={count === tokenCount ? "is-active" : ""}
              onClick={() => {
                recordArcEdit(["tokenCount"], { tokenCount: count })
                setTokenCount(count)
                setRunId((value) => value + 1)
              }}
            >
              {count}
            </button>
          ))}
        </div>

        <label className="plinko-example__range">
          Threshold {formatPercent(threshold)}
          <input
            type="range"
            min="46"
            max="54"
            step="0.5"
            value={threshold}
            onChange={(event) => {
              const nextThreshold = Number(event.target.value)
              recordArcEdit(["threshold", "colorBy"], { threshold: nextThreshold })
              setThreshold(nextThreshold)
            }}
          />
        </label>

        <button
          type="button"
          className="plinko-example__button"
          onClick={() => {
            const nextPaused = !paused
            recordArcEdit(["paused"], { paused: nextPaused })
            setPaused(nextPaused)
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="plinko-example__button"
          onClick={() => {
            recordArcEdit(["simulation"], { action: "replay", scenarioId })
            setPaused(false)
            setSelectedDrop(null)
            setRunId((value) => value + 1)
          }}
        >
          Replay
        </button>
      </section>

      <section className="plinko-example__metrics" aria-label="Posterior summary">
        <Metric label="Chance above threshold" value={`${Math.round(summary.probability * 100)}%`} />
        <Metric label="Median draw" value={formatPercent(summary.median)} />
        <Metric label="90% interval" value={`${formatPercent(summary.low)} to ${formatPercent(summary.high)}`} />
        <Metric label="Visible tokens" value={`${tokenSet.shown} of ${tokenSet.total}`} />
      </section>

      <section className="plinko-example__main">
        <div ref={chartRef} className="plinko-example__board">
          <div className="plinko-example__board-header">
            <div>
              <h2>{scenario.label}</h2>
              <p>{scenario.claim}</p>
            </div>
            <div className="plinko-example__clock">{runtime.elapsed.toFixed(1)}s</div>
          </div>
          <div className="plinko-example__chart-shell" ref={boardViewRef}>
            <GaltonBoardChart
              key={boardKey}
              data={drops}
              valueAccessor="value"
              valueExtent={posteriorDomain}
              colorBy={colorByOutcome}
              bins={13}
              ballRadius={8}
              seed={scenario.seed + runId}
              paused={paused}
              referenceLines={{
                value: threshold,
                label: formatPercent(threshold),
                color: "#b0454c",
                strokeDasharray: "7 5",
                strokeWidth: 2.5,
              }}
              size={boardSize}
              title={`${scenario.label} posterior Plinko`}
              description={`Posterior Plinko: ${Math.round(summary.probability * 100)}% of draws clear the ${formatPercent(threshold)} threshold`}
              frameProps={physicsRuntimeFrameProps}
            />
          </div>
        </div>

        <aside className="plinko-example__inspection">
          <h2>Selected Drop</h2>
          {selectedDrop ? (
            <dl>
              <div>
                <dt>Sample</dt>
                <dd>{formatPercent(selectedDrop.value)}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{selectedDrop.value >= threshold ? "above threshold" : "below threshold"}</dd>
              </div>
              <div>
                <dt>Quantile slot</dt>
                <dd>{Math.round((selectedDrop.quantile ?? 0) * 100)}%</dd>
              </div>
            </dl>
          ) : (
            <p>Click a falling or settled body to inspect the posterior sample that created it.</p>
          )}
        </aside>
      </section>

      <section className="plinko-example__dotplot-section">
        <div className="plinko-example__section-heading">
          <h2>Settled Quantile Dotplot</h2>
          <p>
            The dotplot is not a separate summary. It is laid out from the same
            <code>posterior-sample</code> tokens that fall through the board.
          </p>
        </div>
        <QuantileDotplot
          tokens={drops}
          threshold={threshold}
          summary={summary}
          width={940}
          height={220}
        />
      </section>

      <section className="plinko-example__implementation">
        <h2>Implementation</h2>
        <CodeBlock language="jsx" showCopyButton code={implementationCode} />
      </section>
    </ExamplePageLayout>
  )
}

function Metric({ label, value }) {
  return (
    <div className="plinko-example__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

const QuantileDotplot = React.memo(function QuantileDotplot({ tokens, threshold, summary, width, height }) {
  const margin = { top: 24, right: 22, bottom: 42, left: 44 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const xScale = useCallback(
    (value) => margin.left + ((value - 38) / 24) * innerWidth,
    [innerWidth, margin.left],
  )
  const thresholdX = xScale(threshold)
  const lowX = xScale(summary.low)
  const highX = xScale(summary.high)
  const stacks = new Map()
  const dots = tokens.map((token) => {
    const x = xScale(token.value)
    const bucket = Math.round((x - margin.left) / 8)
    const stack = stacks.get(bucket) ?? 0
    stacks.set(bucket, stack + 1)
    return {
      ...token,
      x,
      y: margin.top + innerHeight - stack * 7,
    }
  })

  return (
    <svg
      className="plinko-example__dotplot"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Quantile dotplot of posterior samples"
    >
      <rect width={width} height={height} rx="8" className="plinko-example__dotplot-bg" />
      <rect
        x={lowX}
        y={margin.top + 8}
        width={Math.max(1, highX - lowX)}
        height={innerHeight - 2}
        className="plinko-example__interval"
      />
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={margin.top + innerHeight}
        y2={margin.top + innerHeight}
        className="plinko-example__axis"
      />
      {[40, 45, 50, 55, 60].map((tick) => {
        const x = xScale(tick)
        return (
          <g key={tick}>
            <line
              x1={x}
              x2={x}
              y1={margin.top + innerHeight}
              y2={margin.top + innerHeight + 6}
              className="plinko-example__axis"
            />
            <text x={x} y={height - 16} textAnchor="middle" className="plinko-example__axis-label">
              {tick}%
            </text>
          </g>
        )
      })}
      <line
        x1={thresholdX}
        x2={thresholdX}
        y1={margin.top}
        y2={margin.top + innerHeight}
        className="plinko-example__threshold"
      />
      {dots.map((dot) => (
        <circle
          key={dot.id}
          cx={dot.x}
          cy={dot.y}
          r="3.4"
          fill={OUTCOME_COLORS[dot.value >= threshold ? "win" : "loss"]}
          stroke="#1f2933"
          strokeWidth="0.7"
          opacity="0.92"
        />
      ))}
      <text x={lowX} y={margin.top} className="plinko-example__interval-label">
        5th
      </text>
      <text x={highX} y={margin.top} textAnchor="end" className="plinko-example__interval-label">
        95th
      </text>
      <text x={thresholdX + 6} y={margin.top + 16} className="plinko-example__threshold-label">
        threshold
      </text>
    </svg>
  )
})
