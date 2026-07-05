import React, { useCallback, useMemo, useState } from "react"
import { XYCustomChart } from "semiotic/xy"
import {
  Glyph,
  clamp,
  hitTargetRect,
  isotypeBusGlyph,
  linearAxis,
  mean,
  mulberry32,
  suggestTokenEncoding,
  tokenLayer,
  unwrapDatum,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./SometimesDiscreteExamplePage.css"

const INK = "#1d2730"
const PAPER = "#f6f7f1"
const PANEL = "#ffffff"
const MUTED = "#6c7480"
const BLUE = "#236d99"
const BLUE_PALE = "#d8edf7"
const RED = "#c93d3d"
const RED_PALE = "#f6d8d6"
const GREEN = "#287f68"
const YELLOW = "#d7a93b"
const RAIL = "#d9dee5"

const DEFAULT_THRESHOLD = 10
const DOMAIN_MAX = 22
const OUTCOME_TOKEN_COUNT = 50

const TASKS = [
  { id: "measure", label: "Measure", dataType: "measure" },
  { id: "estimate probability", label: "Estimate probability", dataType: "probability" },
  { id: "understand risk", label: "Understand risk", dataType: "risk" },
  { id: "remember", label: "Remember", dataType: "count" },
  { id: "decide", label: "Decide", dataType: "distribution" },
]

const TOKEN_STYLES = [
  { id: "dots", label: "Dots" },
  { id: "icons", label: "Bus icons" },
  { id: "hybrid", label: "Hybrid bar" },
]

const RECOMMENDATION_LABELS = {
  "bar-or-line": "Continuous bar or line",
  "quantile-dotplot": "Quantile dotplot",
  "fixed-denominator-icon-array": "Fixed-denominator icon array",
  "semantic-isotype": "Semantic ISOTYPE",
  "hybrid-continuous-token": "Hybrid continuous + token",
}

const implementationCode = `import { XYCustomChart } from "semiotic/xy"
import { tokenLayer } from "semiotic/recipes"

const busOutcomeEncoding = {
  tokenType: "glyph",
  tokenSemantics: "possible-outcome",
  countStrategy: "quantile",
  tokenCount: 50,
  layout: "dotplot",
  icon: "bus",
  labelPolicy: "text-plus-token",
}

const arrivalData = arrivalSamples.map((arrival) => ({ arrival }))

function busOutcomeLayout(ctx) {
  const tokens = tokenLayer({
    input: arrivalSamples,
    encoding: busOutcomeEncoding,
    options: {
      rows: 4,
      tokenSize: 18,
      valueToX: (arrival) => ctx.scales.x(arrival),
      color: (token) => token.sample <= threshold ? "#236d99" : "#c93d3d",
      datum: (token) => ({
        arrival: token.sample,
        semantics: token.tokenSemantics,
        quantile: token.quantile,
      }),
      pointId: (token) => \`arrival-\${token.index}\`,
    },
  })

  return {
    nodes: tokens.nodes,
    overlays: <ThresholdLine x={ctx.scales.x(threshold)} />,
  }
}

<XYCustomChart
  data={arrivalData}
  layout={busOutcomeLayout}
  xExtent={[0, 22]}
  yExtent={[0, 1]}
  enableHover
  accessibleTable
/>`

function normalPair(rand) {
  const u1 = Math.max(rand(), 0.000001)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}

function buildArrivalSamples() {
  const rand = mulberry32(1978)
  return Array.from({ length: 800 }, () => {
    const ordinary = 6.7 + normalPair(rand) * 2.15
    const tail = rand() < 0.12 ? 4.7 + rand() * 6.2 : 0
    const pulse = rand() < 0.06 ? rand() * 2.2 : 0
    return Number(clamp(ordinary + tail + pulse, 0.8, DOMAIN_MAX).toFixed(2))
  })
}

const ARRIVAL_SAMPLES = buildArrivalSamples()
const ARRIVAL_DATA = ARRIVAL_SAMPLES.map((arrival) => ({ arrival }))
const DENSITY_DATA = [{ id: "density" }]
const RISK_DATA = [{ id: "commuter-risk" }]
const EXPECTED_WAIT_DATA = [{ id: "expected-wait" }]

function gaussianKernel(distance, bandwidth) {
  return Math.exp(-0.5 * (distance / bandwidth) ** 2) / (bandwidth * Math.sqrt(Math.PI * 2))
}

function kernelDensity(samples, bandwidth = 0.82) {
  return Array.from({ length: 110 }, (_, index) => {
    const x = (DOMAIN_MAX * index) / 109
    const density =
      samples.reduce((sum, value) => sum + gaussianKernel(x - value, bandwidth), 0) /
      samples.length
    return { x, density }
  })
}

const DENSITY_POINTS = kernelDensity(ARRIVAL_SAMPLES)
const MAX_DENSITY = Math.max(...DENSITY_POINTS.map((point) => point.density))

function probabilityWithin(threshold) {
  const within = ARRIVAL_SAMPLES.filter((arrival) => arrival <= threshold).length
  return within / ARRIVAL_SAMPLES.length
}

const EXPECTED_ARRIVAL = mean(ARRIVAL_SAMPLES)

function densityPath(points, xScale, yScale) {
  return points.map((point, index) => {
    const command = index === 0 ? "M" : "L"
    return `${command}${xScale(point.x).toFixed(2)},${yScale(point.density).toFixed(2)}`
  }).join(" ")
}

function areaPath(points, xScale, yScale, baseline) {
  if (!points.length) return ""
  const start = points[0]
  const end = points[points.length - 1]
  const top = densityPath(points, xScale, yScale).replace(/^M/, "L")
  return `M${xScale(start.x).toFixed(2)},${baseline.toFixed(2)} ${top} L${xScale(end.x).toFixed(2)},${baseline.toFixed(2)} Z`
}

function tickOverlay(xScale, y, ticks = [0, 5, 10, 15, 20]) {
  return (
    <g transform={`translate(0 ${y})`}>
      {linearAxis({
        scale: xScale,
        ticks,
        orient: "bottom",
        tickLength: 4,
        labelGap: 5,
        color: MUTED,
        fontSize: 10,
      })}
    </g>
  )
}

function thresholdChrome({ x, y1, y2, label, labelY = 16 }) {
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={y1}
        y2={y2}
        stroke={RED}
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      {label ? (
        <text x={x + 7} y={labelY} className="discrete-example__callout">
          {label}
        </text>
      ) : null}
    </g>
  )
}

function makeDensityLayout({ threshold, probability }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const x = ctx.scales.x
    const y = ctx.scales.y
    const baseline = y(0)
    const thresholdX = x(threshold)
    const shadedPoints = DENSITY_POINTS.filter((point) => point.x <= threshold)
    const overlays = (
      <g>
        <line x1="0" x2={width} y1={baseline} y2={baseline} stroke={RAIL} />
        {tickOverlay(x, Math.min(height - 18, baseline))}
        <text x={width - 4} y={height - 4} textAnchor="end" className="discrete-example__axis-title">
          minutes until bus arrives
        </text>
        <path
          d={areaPath(shadedPoints, x, y, baseline)}
          fill={BLUE_PALE}
          stroke="none"
          opacity="0.92"
        />
        <path
          d={densityPath(DENSITY_POINTS, x, y)}
          fill="none"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {thresholdChrome({
          x: thresholdX,
          y1: Math.max(8, y(MAX_DENSITY) - 6),
          y2: baseline,
        })}
        <text
          x={Math.min(width - 4, thresholdX + 8)}
          y={Math.max(16, y(MAX_DENSITY) + 18)}
          className="discrete-example__callout"
        >
          {Math.round(probability * 100)}% before {threshold} min
        </text>
      </g>
    )

    return {
      nodes: [
        hitTargetRect({
          x: 0,
          y: 0,
          width,
          height,
          datum: {
            id: "density",
            chart: "continuous density",
            probability,
            threshold,
            lesson: "area under the curve",
          },
          id: "density-hit-area",
        }),
      ],
      overlays,
    }
  }
}

function makeOutcomeLayout({ threshold, tokenStyle, compact }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const x = ctx.scales.x
    const thresholdX = x(threshold)
    const rows = compact ? 4 : 5
    const tokenSize = tokenStyle === "icons" ? (compact ? 13 : 17) : compact ? 8 : 9
    const tokenY = tokenStyle === "icons" ? 22 : 28
    const encoding = {
      tokenType: tokenStyle === "icons" ? "glyph" : "dot",
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount: OUTCOME_TOKEN_COUNT,
      layout: "dotplot",
      icon: tokenStyle === "icons" ? "bus" : undefined,
      labelPolicy: "text-plus-token",
    }

    const tokens = tokenLayer({
      input: ARRIVAL_SAMPLES,
      encoding,
      options: {
        rows,
        y: tokenY,
        width,
        cellHeight: tokenSize + 2,
        cellWidth: tokenSize + (tokenStyle === "icons" ? 5 : 4),
        gutter: tokenStyle === "icons" ? 6 : 5,
        tokenSize,
        radius: tokenStyle === "icons" ? undefined : tokenSize / 2,
        color: (token) => (token.sample <= threshold ? BLUE : RED),
        inactiveColor: "#b9c1ca",
        accent: PANEL,
        valueToX: (arrival) => x(arrival),
        datum: (token) => ({
          id: `arrival-${token.index}`,
          chart: tokenStyle === "icons" ? "isotype bus outcomes" : "quantile dotplot",
          arrival: Number(token.sample?.toFixed(1)),
          threshold,
          beforeThreshold: token.sample <= threshold,
          semantics: token.tokenSemantics,
        }),
        pointId: (token) => `arrival-token-${token.index}`,
      },
    })

    const overlays = (
      <g>
        <line x1="0" x2={width} y1={height - 24} y2={height - 24} stroke={RAIL} />
        {tickOverlay(x, height - 24)}
        {thresholdChrome({ x: thresholdX, y1: 8, y2: height - 24, label: `${threshold} min` })}
      </g>
    )

    return { nodes: tokens.nodes, overlays }
  }
}

function makeRiskLayout({ riskCount, compact }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const cell = compact ? 13 : 16
    const gutter = compact ? 3 : 4
    const side = cell + gutter
    const gridWidth = 10 * cell + 9 * gutter
    const x0 = Math.max(2, (width - gridWidth) / 2)
    const y0 = Math.max(8, (height - (10 * cell + 9 * gutter)) / 2)
    const tokens = tokenLayer({
      input: { numerator: riskCount, denominator: 100 },
      encoding: {
        tokenType: "icon",
        icon: "person",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
        denominator: 100,
        layout: "waffle",
        labelPolicy: "text-plus-token",
      },
      options: {
        x: x0,
        y: y0,
        cellWidth: side,
        cellHeight: side,
        tokenSize: cell,
        color: RED,
        inactiveColor: "#ced5dc",
        datum: (token) => ({
          id: `commuter-${token.index}`,
          chart: "natural-frequency risk array",
          commuter: token.index + 1,
          riskCase: token.highlighted !== false,
        }),
        pointId: (token) => `commuter-${token.index}`,
      },
    })

    const overlays = (
      <g>
        <text x="0" y={height - 3} className="discrete-example__axis-title">
          {riskCount} highlighted out of 100 commuters
        </text>
      </g>
    )
    return { nodes: tokens.nodes, overlays }
  }
}

function makeHybridLayout({ threshold }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const x = ctx.scales.x
    const baseline = height / 2
    const barHeight = 22
    const expectedX = x(EXPECTED_ARRIVAL)
    const thresholdX = x(threshold)

    const tokenizedBar = tokenLayer({
      input: EXPECTED_ARRIVAL,
      encoding: {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 2,
        unitMeaning: "one bus sign = 2 minutes of expected waiting",
        layout: "bar-segment",
        icon: "bus",
        labelPolicy: "text-plus-token",
      },
      options: {
        tokenSize: 20,
        color: GREEN,
        accent: PANEL,
        ghostColor: "#cddbd6",
        fractionDirection: "horizontal",
        y: baseline - 3,
        anchor: [0.5, 0],
        valueToX: (value) => x(value),
        datum: (token) => ({
          id: `expected-token-${token.index}`,
          chart: "hybrid expected wait",
          startMinute: Number(token.start.toFixed(1)),
          endMinute: Number(token.end.toFixed(1)),
          unitMeaning: token.unitMeaning,
        }),
        pointId: (token) => `expected-token-${token.index}`,
      },
    })

    return {
      nodes: [
        {
          type: "rect",
          x: 0,
          y: baseline - barHeight / 2,
          w: Math.max(0, expectedX),
          h: barHeight,
          style: { fill: "#cfe7df", stroke: "none" },
          datum: {
            id: "expected-wait-bar",
            chart: "hybrid expected wait",
            expectedArrival: Number(EXPECTED_ARRIVAL.toFixed(1)),
          },
          _transitionKey: "expected-wait-bar",
        },
        ...tokenizedBar.nodes,
      ],
      overlays: (
        <g>
          <line x1="0" x2={width} y1={baseline + 24} y2={baseline + 24} stroke={RAIL} />
          {tickOverlay(x, baseline + 24)}
          {thresholdChrome({
            x: thresholdX,
            y1: baseline - 42,
            y2: baseline + 25,
          })}
          <text x={expectedX + 8} y={baseline - 20} className="discrete-example__callout">
            expected {EXPECTED_ARRIVAL.toFixed(1)} min
          </text>
        </g>
      ),
    }
  }
}

function ChartPanel({ eyebrow, title, note, metric, children }) {
  return (
    <section className="discrete-example__panel">
      <div className="discrete-example__panel-head">
        <div>
          <div className="discrete-example__eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {metric ? <strong>{metric}</strong> : null}
      </div>
      <p>{note}</p>
      <div className="discrete-example__chart-shell">{children}</div>
    </section>
  )
}

function EncodingCard({ encoding }) {
  if (!encoding) {
    return (
      <dl className="discrete-example__encoding">
        <div>
          <dt>Encoding</dt>
          <dd>continuous position or length</dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd>read exact magnitudes before tokenizing</dd>
        </div>
      </dl>
    )
  }

  return (
    <dl className="discrete-example__encoding">
      <div>
        <dt>Token type</dt>
        <dd>{encoding.tokenType}</dd>
      </div>
      <div>
        <dt>Semantics</dt>
        <dd>{encoding.tokenSemantics}</dd>
      </div>
      <div>
        <dt>Count</dt>
        <dd>{encoding.countStrategy}</dd>
      </div>
      <div>
        <dt>Layout</dt>
        <dd>{encoding.layout ?? "grid"}</dd>
      </div>
    </dl>
  )
}

function SometimesDiscreteExamplePage() {
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [taskIntent, setTaskIntent] = useState("estimate probability")
  const [tokenStyle, setTokenStyle] = useState("icons")

  const compact = pageWidth < 780
  const chartWidth = compact
    ? Math.max(292, pageWidth - 28)
    : Math.max(340, Math.floor((pageWidth - 58) / 2))
  const wideChartWidth = Math.max(292, pageWidth - (compact ? 28 : 58))
  const probability = useMemo(() => probabilityWithin(threshold), [threshold])
  const riskCount = Math.round((1 - probability) * 100)
  const withinLabel = `${Math.round(probability * 100)}%`
  const activeTask = TASKS.find((task) => task.id === taskIntent) ?? TASKS[1]
  const suggestion = useMemo(
    () =>
      suggestTokenEncoding({
        taskIntent,
        dataType: activeTask.dataType,
        audience: "general-public",
        precisionNeed: taskIntent === "measure" ? "high" : "medium",
        availableSpace: compact ? "small" : "medium",
        concreteEntity: taskIntent === "understand risk" ? "person" : "bus",
      }),
    [activeTask.dataType, compact, taskIntent],
  )

  const densityLayout = useMemo(
    () => makeDensityLayout({ threshold, probability }),
    [probability, threshold],
  )
  const outcomeLayout = useMemo(
    () => makeOutcomeLayout({ threshold, tokenStyle, compact }),
    [compact, threshold, tokenStyle],
  )
  const riskLayout = useMemo(
    () => makeRiskLayout({ riskCount, compact }),
    [compact, riskCount],
  )
  const hybridLayout = useMemo(
    () => makeHybridLayout({ threshold }),
    [threshold],
  )

  const handleThreshold = useCallback((event) => {
    setThreshold(Number(event.target.value))
  }, [])

  const tooltip = useCallback((hover) => {
    const datum = unwrapDatum(hover)
    if (!datum?.chart) return null
    return (
      <div className="discrete-example__tooltip">
        <strong>{datum.chart}</strong>
        {datum.arrival != null ? <span>{datum.arrival} minute arrival</span> : null}
        {datum.probability != null ? (
          <span>{Math.round(datum.probability * 100)}% before threshold</span>
        ) : null}
        {datum.riskCase != null ? (
          <span>{datum.riskCase ? "misses the connection" : "makes the connection"}</span>
        ) : null}
        {datum.unitMeaning ? <span>{datum.unitMeaning}</span> : null}
      </div>
    )
  }, [])

  const outcomeTitle =
    tokenStyle === "dots"
      ? "Fifty possible arrivals"
      : tokenStyle === "icons"
        ? "Fifty possible buses"
        : "A continuous bar, segmented into signs"

  const outcomeNote =
    tokenStyle === "dots"
      ? "Quantile dots make probability countable: dots left of the line are arrivals soon enough to wait."
      : tokenStyle === "icons"
        ? "The same quantile tokens become bus signs, preserving the distribution while making the scenario concrete."
        : "The hybrid keeps the expected time as length, then stamps each two-minute interval as a unitized sign."

  return (
    <ExamplePageLayout title="Sometimes it's better to be discrete">
      <div className="discrete-example" ref={pageRef}>
        <header className="discrete-example__header">
          <div>
            <div className="discrete-example__eyebrow">Tokenization strategy · ISOTYPE</div>
            <p className="discrete-example__lede">
              When dots, icons, and tokens beat bars, blobs, and densities.
            </p>
            <h2>Should I leave now or wait for the bus?</h2>
          </div>
          <svg
            className="discrete-example__header-sign"
            viewBox="0 0 120 96"
            aria-hidden="true"
          >
            <rect x="10" y="18" width="100" height="58" rx="6" fill={BLUE_PALE} />
            <Glyph def={isotypeBusGlyph} x={22} y={14} size={64} color={BLUE} accent={PANEL} />
            <line x1="20" x2="100" y1="84" y2="84" stroke={INK} strokeWidth="3" />
          </svg>
        </header>

        <section className="discrete-example__controls" aria-label="Discrete chart controls">
          <div className="discrete-example__control-block discrete-example__control-block--wide">
            <label htmlFor="bus-threshold">Arrives within {threshold} minutes</label>
            <input
              id="bus-threshold"
              type="range"
              min="2"
              max="18"
              step="1"
              value={threshold}
              onChange={handleThreshold}
            />
            <div className="discrete-example__range-labels" aria-hidden="true">
              <span>2</span>
              <span>10</span>
              <span>18</span>
            </div>
          </div>

          <div className="discrete-example__control-block">
            <span>Task intent</span>
            <div className="discrete-example__segmented" role="group" aria-label="Task intent">
              {TASKS.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={taskIntent === task.id ? "is-active" : ""}
                  aria-pressed={taskIntent === task.id}
                  onClick={() => setTaskIntent(task.id)}
                >
                  {task.label}
                </button>
              ))}
            </div>
          </div>

          <div className="discrete-example__control-block">
            <span>Token style</span>
            <div className="discrete-example__segmented" role="group" aria-label="Token style">
              {TOKEN_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={tokenStyle === style.id ? "is-active" : ""}
                  aria-pressed={tokenStyle === style.id}
                  onClick={() => setTokenStyle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="discrete-example__stats" aria-label="Bus wait summary">
          <div>
            <span>Probability</span>
            <strong>{withinLabel}</strong>
            <p>arrive by {threshold} minutes</p>
          </div>
          <div>
            <span>Natural frequency</span>
            <strong>{100 - riskCount}</strong>
            <p>of 100 make the connection</p>
          </div>
          <div>
            <span>Expected wait</span>
            <strong>{EXPECTED_ARRIVAL.toFixed(1)}</strong>
            <p>minutes, kept as length</p>
          </div>
        </section>

        <div className="discrete-example__grid">
          <ChartPanel
            eyebrow="01 · Continuous"
            title="Area is the answer"
            note="A density plot has the right math, but the reader has to translate shaded area into probability."
            metric={withinLabel}
          >
            <XYCustomChart
              data={DENSITY_DATA}
              layout={densityLayout}
              width={chartWidth}
              height={250}
              xExtent={[0, DOMAIN_MAX]}
              yExtent={[0, MAX_DENSITY * 1.14]}
              margin={{ top: 10, right: 14, bottom: 30, left: 16 }}
              enableHover
              accessibleTable
              tooltip={tooltip}
              description="A bus-arrival probability density with a threshold line and shaded probability area."
              summary={`${withinLabel} of arrivals happen within ${threshold} minutes in the simulated bus wait distribution.`}
              frameProps={{ background: "transparent" }}
            />
          </ChartPanel>

          <ChartPanel
            eyebrow="02 · Tokenized outcomes"
            title={outcomeTitle}
            note={outcomeNote}
            metric={`${OUTCOME_TOKEN_COUNT} tokens`}
          >
            <XYCustomChart
              data={ARRIVAL_DATA}
              layout={tokenStyle === "hybrid" ? hybridLayout : outcomeLayout}
              width={chartWidth}
              height={tokenStyle === "hybrid" ? 216 : 236}
              xExtent={[0, DOMAIN_MAX]}
              yExtent={[0, 1]}
              margin={{ top: 8, right: 14, bottom: 30, left: 16 }}
              enableHover
              accessibleTable
              tooltip={tooltip}
              description="A tokenized view of possible bus arrivals."
              summary={`The current token view uses ${tokenStyle} to show arrivals against a ${threshold} minute threshold.`}
              frameProps={{ background: "transparent" }}
            />
          </ChartPanel>

          <ChartPanel
            eyebrow="03 · Natural frequency"
            title="Risk is easier as people"
            note="A percentage turns into a fixed denominator: out of 100 commuters, highlighted people miss the connection."
            metric={`${riskCount}/100`}
          >
            <XYCustomChart
              data={RISK_DATA}
              layout={riskLayout}
              width={chartWidth}
              height={248}
              xExtent={[0, 1]}
              yExtent={[0, 1]}
              margin={{ top: 10, right: 12, bottom: 20, left: 12 }}
              enableHover
              accessibleTable
              tooltip={tooltip}
              description="A one-hundred-person natural-frequency icon array for bus connection risk."
              summary={`${riskCount} of 100 commuters miss the connection when the bus must arrive within ${threshold} minutes.`}
              frameProps={{ background: "transparent" }}
            />
          </ChartPanel>

          <section className="discrete-example__panel discrete-example__panel--recommendation">
            <div className="discrete-example__panel-head">
              <div>
                <div className="discrete-example__eyebrow">04 · IDID recommendation</div>
                <h2>{RECOMMENDATION_LABELS[suggestion.recommendedEncoding] ?? suggestion.recommendedEncoding}</h2>
              </div>
            </div>
            <p>{suggestion.rationale}</p>
            <EncodingCard encoding={suggestion.tokenEncoding} />
            {suggestion.warnings.length > 0 ? (
              <ul className="discrete-example__warnings">
                {suggestion.warnings.map((warning) => (
                  <li key={warning.code}>{warning.message}</li>
                ))}
              </ul>
            ) : null}
            <div className="discrete-example__alternatives">
              {suggestion.alternatives.map((alternative) => (
                <span key={alternative}>{alternative}</span>
              ))}
            </div>
          </section>
        </div>

        <section className="discrete-example__wide-panel">
          <div className="discrete-example__wide-copy">
            <div className="discrete-example__eyebrow">05 · Hybrid encoding</div>
            <h2>Keep precision where it matters, tokenize where it helps.</h2>
            <p>
              The expected wait remains a bar. The segments are generated by
              <code> tokenLayer</code>, so the pictograms still carry explicit unit semantics,
              partial-fill behavior, hover targets, and accessible rows.
            </p>
          </div>
          <XYCustomChart
            data={EXPECTED_WAIT_DATA}
            layout={hybridLayout}
            width={wideChartWidth}
            height={230}
            xExtent={[0, DOMAIN_MAX]}
            yExtent={[0, 1]}
            margin={{ top: 12, right: 18, bottom: 32, left: 18 }}
            enableHover
            accessibleTable
            tooltip={tooltip}
            description="A continuous expected-wait bar segmented into bus-sign units."
            summary={`Expected wait is ${EXPECTED_ARRIVAL.toFixed(1)} minutes, represented as one bus sign for every two minutes.`}
            frameProps={{ background: "transparent" }}
          />
        </section>

        <section className="discrete-example__code">
          <div>
            <div className="discrete-example__eyebrow">Implementation</div>
            <h2>The example is not drawing icons by hand.</h2>
            <p>
              The layout asks for semantic tokens, then lets Semiotic render ordinary scene nodes
              with the same canvas, SVG, hover, focus, and table machinery as other custom charts.
            </p>
          </div>
          <CodeBlock language="jsx" code={implementationCode} wrap />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

export default SometimesDiscreteExamplePage
