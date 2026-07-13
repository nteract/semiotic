import React, { useCallback, useEffect, useMemo, useState } from "react"
import { XYCustomChart } from "semiotic/xy"
import {
  Glyph,
  clamp,
  diagnoseTokenEncoding,
  hitTargetRect,
  isotypeBusGlyph,
  isotypePersonGlyph,
  linearAxis,
  mean,
  mulberry32,
  suggestTokenEncoding,
  tokenLayer,
  unwrapDatum,
} from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./SometimesDiscreteExamplePage.css"

const INK = "#1d2730"
const PANEL = "#ffffff"
const MUTED = "#6c7480"
const BLUE = "#236d99"
const BLUE_PALE = "#d8edf7"
const RED = "#c93d3d"
const GREEN = "#287f68"
const YELLOW = "#d7a93b"
const RAIL = "#d9dee5"
const GHOST = "#c3ccd4"

const DEFAULT_THRESHOLD = 10
const DOMAIN_MAX = 22
const TOKEN_COUNTS = [20, 50, 100]
const HOP_MORNINGS = 60

const TASKS = [
  { id: "measure", label: "Measure", dataType: "measure" },
  { id: "estimate probability", label: "Estimate probability", dataType: "probability" },
  { id: "understand risk", label: "Understand risk", dataType: "risk" },
  { id: "remember", label: "Remember", dataType: "count" },
  { id: "decide", label: "Decide", dataType: "distribution" },
]

const TOKEN_STYLES = [
  { id: "dots", label: "Dots" },
  { id: "icons", label: "Bus signs" },
]

const SABOTAGES = [
  { id: "none", label: "Sound design" },
  { id: "raw", label: "800 raw marks" },
  { id: "icon-only", label: "Icons replace labels" },
  { id: "decorative", label: "Decoration" },
]

const SABOTAGE_NOTES = {
  none: null,
  raw: "Every recorded morning at once. The distribution is in there somewhere, but nothing is countable anymore — unitize, sample, or take quantiles.",
  "icon-only":
    "The pictograms stayed, the words left. Without labels the signs are a rebus, not a chart — icons supplement text, they never replace it.",
  decorative:
    "Same tokens, meaning-free inks, a jaunty rotation. Decoration that does not clarify the data actively harms recall and speed.",
}

const RECOMMENDATION_LABELS = {
  "bar-or-line": "Continuous bar or line",
  "quantile-dotplot": "Quantile dotplot",
  "fixed-denominator-icon-array": "Fixed-denominator icon array",
  "semantic-isotype": "Semantic ISOTYPE",
  "hybrid-continuous-token": "Hybrid continuous + token",
}

const RECOMMENDED_PANEL = {
  "bar-or-line": "density",
  "quantile-dotplot": "outcomes",
  "fixed-denominator-icon-array": "risk",
  "semantic-isotype": "outcomes",
  "hybrid-continuous-token": "hybrid",
}

const LINEAGE = [
  {
    year: "1926",
    title: "ISOTYPE",
    who: "Neurath · Reidemeister · Arntz",
    line: "Repeat a sign, never grow it — quantities become countable things.",
    motif: "isotype",
  },
  {
    year: "1995",
    title: "Natural frequencies",
    who: "Gigerenzer & Hoffrage",
    line: "Show risk as 18 visible cases among 100 commuters.",
    motif: "frequency",
  },
  {
    year: "2015",
    title: "Hypothetical outcome plots",
    who: "Hullman · Resnick · Adar",
    line: "Uncertainty as possible worlds, drawn one at a time.",
    motif: "hop",
  },
  {
    year: "2016",
    title: "Quantile dotplots",
    who: "Kay · Kola · Hullman · Munson",
    line: "“When(ish) is my bus?” — a distribution you can count.",
    motif: "dotplot",
  },
]

const implementationCode = `import { XYCustomChart } from "semiotic/xy"
import {
  diagnoseTokenEncoding,
  generateTokens,
  suggestTokenEncoding,
  tokenLayer,
} from "semiotic/recipes"

// 1 · Say what a repeated mark MEANS before anything is drawn.
const encoding = {
  tokenType: "glyph",
  icon: "bus",                 // the built-in ISOTYPE bus sign
  tokenSemantics: "possible-outcome",
  countStrategy: "quantile",   // Kay/Hullman: equally likely arrivals
  tokenCount: 50,
  layout: "dotplot",           // Wilkinson-stacked quantile dotplot
}

// 2 · The records carry the ledger and a live design critique.
const tokenSet = generateTokens(arrivalSamples, encoding)
tokenSet.diagnostics // e.g. TOO_MANY_VISIBLE_TOKENS if you ask for 800

// 3 · Any custom layout stamps them as real scene nodes — canvas + SVG,
//    hover, keyboard nav, transitions, accessible rows, for free.
function busDotplotLayout(ctx) {
  const { height } = ctx.dimensions.plot
  const layer = tokenLayer({
    input: tokenSet,
    options: {
      tokenSize: 17,
      cellHeight: -19,                 // negative step: stack up from the axis
      y: height - 32,
      valueToX: (arrival) => ctx.scales.x(arrival),
      color: (t) => (t.sample <= threshold ? "#236d99" : "#c93d3d"),
      datum: (t) => ({ arrival: t.sample, quantile: t.quantile }),
      pointId: (t) => \`outcome-\${t.index}\`,
    },
  })
  return { nodes: layer.nodes, overlays: <ThresholdLine /> }
}

<XYCustomChart data={arrivalData} layout={busDotplotLayout} xExtent={[0, 22]} />

// 4 · Or ask for the encoding first — task in, semantics out.
suggestTokenEncoding({ taskIntent: "estimate probability", dataType: "distribution" })
// → { recommendedEncoding: "quantile-dotplot", tokenEncoding, rationale, … }`

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
const HOP_DATA = [{ id: "hypothetical-mornings" }]
const EXPECTED_WAIT_DATA = [{ id: "expected-wait" }]

function gaussianKernel(distance, bandwidth) {
  return Math.exp(-0.5 * (distance / bandwidth) ** 2) / (bandwidth * Math.sqrt(Math.PI * 2))
}

function kernelDensity(samples, bandwidth = 0.82) {
  return Array.from({ length: 110 }, (_, index) => {
    const x = (DOMAIN_MAX * index) / 109
    const density =
      samples.reduce((sum, value) => sum + gaussianKernel(x - value, bandwidth), 0) / samples.length
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

/** A seeded shuffle of distinct mornings for the HOP panel. */
function hopSchedule(seed, count = HOP_MORNINGS) {
  const rand = mulberry32(seed)
  const order = Array.from({ length: ARRIVAL_SAMPLES.length }, (_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  return order.slice(0, count).map((index) => ARRIVAL_SAMPLES[index])
}

function densityPath(points, xScale, yScale) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L"
      return `${command}${xScale(point.x).toFixed(2)},${yScale(point.density).toFixed(2)}`
    })
    .join(" ")
}

function areaPath(points, xScale, yScale, baseline) {
  if (!points.length) return ""
  const start = points[0]
  const end = points[points.length - 1]
  const top = densityPath(points, xScale, yScale).replace(/^M/, "L")
  return `M${xScale(start.x).toFixed(2)},${baseline.toFixed(2)} ${top} L${xScale(end.x).toFixed(2)},${baseline.toFixed(2)} Z`
}

function tickOverlay(xScale, y, { ticks = [0, 5, 10, 15, 20], showLabels = true } = {}) {
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
        format: showLabels ? undefined : () => "",
      })}
    </g>
  )
}

function thresholdChrome({ x, y1, y2, label, labelY = 16 }) {
  return (
    <g>
      <line x1={x} x2={x} y1={y1} y2={y2} stroke={RED} strokeWidth="2" strokeDasharray="5 4" />
      {label ? (
        <text x={x + 7} y={labelY} className="discrete-example__callout">
          {label}
        </text>
      ) : null}
    </g>
  )
}

// The possible-outcomes encoding, shared by the dotplot layout AND the design
// critic panel, so the diagnostics the page prints are the diagnostics of
// exactly the encoding on screen. `sabotage` deliberately misconfigures it.
function outcomeEncoding({ tokenStyle, tokenCount, sabotage }) {
  if (sabotage === "raw") {
    return {
      encoding: {
        tokenType: "dot",
        tokenSemantics: "possible-outcome",
        countStrategy: "sample",
        tokenCount: ARRIVAL_SAMPLES.length,
        layout: "quantile-strip",
        labelPolicy: "text-plus-token",
      },
      visibleTokens: ARRIVAL_SAMPLES.length,
    }
  }
  if (sabotage === "icon-only") {
    return {
      encoding: {
        tokenType: "glyph",
        icon: "bus",
        tokenSemantics: "possible-outcome",
        countStrategy: "quantile",
        tokenCount,
        layout: "dotplot",
        labelPolicy: "icon-only",
      },
      visibleTokens: tokenCount,
    }
  }
  if (sabotage === "decorative") {
    return {
      encoding: {
        tokenType: "glyph",
        icon: "bus",
        tokenSemantics: "decorative",
        countStrategy: "quantile",
        tokenCount,
        layout: "dotplot",
        labelPolicy: "text-plus-token",
      },
      visibleTokens: tokenCount,
    }
  }
  const icons = tokenStyle === "icons"
  return {
    encoding: {
      tokenType: icons ? "glyph" : "dot",
      icon: icons ? "bus" : undefined,
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount,
      layout: "dotplot",
      labelPolicy: "text-plus-token",
    },
    visibleTokens: tokenCount,
  }
}

function makeDensityLayout({ threshold, revealed, probability }) {
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
        <text
          x={width - 4}
          y={height - 4}
          textAnchor="end"
          className="discrete-example__axis-title"
        >
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
          {revealed
            ? `${Math.round(probability * 100)}% of the area is left of the line`
            : "how much area is left of the line?"}
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
          datum: revealed
            ? {
                id: "density",
                chart: "continuous density",
                probability,
                threshold,
                lesson: "area under the curve",
              }
            : {
                id: "density",
                chart: "continuous density",
                threshold,
                lesson: "estimate the shaded area, then reveal",
              },
          id: "density-hit-area",
        }),
      ],
      overlays,
    }
  }
}

function makeOutcomeLayout({ threshold, tokenStyle, tokenCount, sabotage, compact }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const x = ctx.scales.x
    const thresholdX = x(threshold)
    const baselineY = height - 24
    const { encoding } = outcomeEncoding({ tokenStyle, tokenCount, sabotage })
    const icons = encoding.tokenType === "glyph"
    const showText = encoding.labelPolicy !== "icon-only"

    const tokenSize =
      sabotage === "raw"
        ? 5
        : icons
          ? compact
            ? 13
            : 17
          : tokenCount === 100
            ? compact
              ? 6.5
              : 8
            : tokenCount === 20
              ? compact
                ? 13
                : 15
              : compact
                ? 8.5
                : 10

    const spin = mulberry32(23)
    const decorativeInks = [BLUE, RED, GREEN, YELLOW]

    const tokens = tokenLayer({
      input: ARRIVAL_SAMPLES,
      encoding,
      options:
        sabotage === "raw"
          ? {
              rows: 14,
              y: 30,
              width,
              cellHeight: 6,
              gutter: 4,
              tokenSize,
              radius: 2.6,
              color: (token) => (token.sample <= threshold ? BLUE : RED),
              valueToX: (arrival) => x(arrival),
              datum: (token) => ({
                id: `arrival-${token.index}`,
                chart: "raw sample strip",
                arrival: Number(token.sample?.toFixed(1)),
                threshold,
                beforeThreshold: token.sample <= threshold,
              }),
              pointId: (token) => `arrival-token-${token.index}`,
            }
          : {
              // Negative step stacks the Wilkinson bins upward from the axis.
              y: baselineY - tokenSize / 2 - 2,
              width,
              cellWidth: tokenSize + (icons ? 4 : 3),
              cellHeight: -(tokenSize + 2),
              tokenSize,
              radius: icons ? undefined : tokenSize / 2,
              color:
                sabotage === "decorative"
                  ? (token) => decorativeInks[token.index % decorativeInks.length]
                  : (token) => (token.sample <= threshold ? BLUE : RED),
              accent: PANEL,
              rotation: sabotage === "decorative" ? () => (spin() - 0.5) * 70 : undefined,
              valueToX: (arrival) => x(arrival),
              datum: (token) => ({
                id: `arrival-${token.index}`,
                chart: icons ? "isotype quantile dotplot" : "quantile dotplot",
                arrival: Number(token.sample?.toFixed(1)),
                threshold,
                beforeThreshold: token.sample <= threshold,
                semantics: token.tokenSemantics,
              }),
              pointId: (token) => `arrival-token-${token.index}`,
            },
    })

    const withinCount = tokens.tokenSet.tokens.filter(
      (token) => (token.sample ?? 0) <= threshold,
    ).length
    const countLabel =
      sabotage === "raw"
        ? `${tokens.tokenSet.shown} raw marks — nothing left to count`
        : `${withinCount} of ${tokens.tokenSet.shown} before the line · ≈${Math.round(
            (withinCount / Math.max(1, tokens.tokenSet.shown)) * 100,
          )}%`

    const overlays = (
      <g>
        <line x1="0" x2={width} y1={baselineY} y2={baselineY} stroke={RAIL} />
        {tickOverlay(x, baselineY, { showLabels: showText })}
        {thresholdChrome({
          x: thresholdX,
          y1: 8,
          y2: baselineY,
          label: showText ? `${threshold} min` : undefined,
        })}
        {showText ? (
          <text x="2" y="14" className="discrete-example__callout">
            {countLabel}
          </text>
        ) : null}
      </g>
    )

    return { nodes: tokens.nodes, overlays }
  }
}

function makeRiskLayout({ riskCount, compact }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const cell = compact ? 22 : 24
    const gutter = compact ? 3 : 4
    const gridWidth = 10 * cell + 9 * gutter
    const legendReserve = compact ? 42 : 18
    const x0 = Math.max(2, (width - gridWidth) / 2)
    const y0 = Math.max(8, (height - legendReserve - gridWidth) / 2)
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
        cellWidth: cell,
        cellHeight: cell,
        gutter,
        anchor: [0.5, 1],
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

    const legendY = compact ? height - 34 : height - 15
    const secondLegendX = compact ? x0 + 2 : x0 + 168
    const secondLegendY = compact ? height - 17 : legendY
    const overlays = (
      <g>
        <Glyph def={isotypePersonGlyph} x={x0 + 2} y={legendY} size={13} color={RED} />
        <text x={x0 + 13} y={legendY + 11} className="discrete-example__axis-text">
          misses the connection ({riskCount})
        </text>
        <Glyph
          def={isotypePersonGlyph}
          x={secondLegendX}
          y={secondLegendY}
          size={13}
          color={GHOST}
        />
        <text
          x={secondLegendX + 11}
          y={secondLegendY + 11}
          className="discrete-example__axis-text"
        >
          makes it ({100 - riskCount})
        </text>
      </g>
    )
    return { nodes: tokens.nodes, overlays }
  }
}

// A hypothetical outcome plot: one sampled morning at a time. The bus jumps —
// it never glides, because an interpolated position would be a fake datum —
// and each remembered morning stacks into the panel-02 quantile dotplot.
function makeHopLayout({ schedule, morning, threshold, compact }) {
  return (ctx) => {
    const { width, height } = ctx.dimensions.plot
    const x = ctx.scales.x
    const roadY = 42
    const baselineY = height - 24
    const seenCount = Math.min(morning, schedule.length)
    const seen = schedule.slice(0, seenCount)
    const current = schedule[(morning - 1) % schedule.length]
    const withinSeen = seen.filter((value) => value <= threshold).length
    const complete = seenCount === schedule.length
    const cell = compact ? 6 : 7

    // The memory of past mornings, stacked with the same dotplot layout the
    // library uses in panel 02 — a quantile dotplot forming in real time.
    const ghosts = tokenLayer({
      input: { samples: seen },
      encoding: {
        tokenType: "dot",
        tokenSemantics: "possible-outcome",
        countStrategy: "sample",
        tokenCount: seen.length,
        layout: "dotplot",
        labelPolicy: "text-plus-token",
      },
      options: {
        y: baselineY - cell / 2 - 2,
        width,
        cellWidth: cell + 2,
        cellHeight: -(cell + 1.5),
        tokenSize: cell,
        radius: cell / 2,
        color: (token) => (token.sample <= threshold ? BLUE : RED),
        style: (token) => ({
          fillOpacity: token.index === seenCount - 1 ? 1 : 0.45,
        }),
        valueToX: (arrival) => x(arrival),
        datum: () => null,
        pointId: (token) => `remembered-${token.index}`,
      },
    })

    const bus = {
      type: "glyph",
      x: x(current),
      y: roadY,
      size: compact ? 20 : 24,
      glyph: isotypeBusGlyph,
      color: current <= threshold ? BLUE : RED,
      accent: PANEL,
      style: {},
      datum: {
        id: "hop-bus",
        chart: "hypothetical outcome plot",
        morning,
        arrival: Number(current.toFixed(1)),
        beforeThreshold: current <= threshold,
      },
      // A fresh identity every morning: HOP frames replace, they never tween.
      pointId: `morning-${morning}`,
    }

    const overlays = (
      <g>
        <line x1="0" x2={width} y1={roadY + 2} y2={roadY + 2} stroke={RAIL} strokeWidth="2" />
        <line x1="0" x2={width} y1={baselineY} y2={baselineY} stroke={RAIL} />
        {tickOverlay(x, baselineY)}
        {thresholdChrome({ x: x(threshold), y1: 10, y2: baselineY })}
        <line
          x1={x(current)}
          x2={x(current)}
          y1={roadY + 6}
          y2={baselineY - 2}
          stroke={MUTED}
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <text x="2" y="14" className="discrete-example__callout">
          {`Morning ${morning} · arrived at ${current.toFixed(1)} min · ${withinSeen} of ${seenCount} made it by ${threshold}`}
        </text>
        {complete ? (
          <text x="2" y="27" className="discrete-example__axis-text">
            {schedule.length} mornings remembered — the quantile dotplot appears.
          </text>
        ) : null}
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
            id: "hypothetical-mornings",
            chart: "hypothetical outcome plot",
            morning,
            arrival: Number(current.toFixed(1)),
            withinSoFar: withinSeen,
            of: seenCount,
          },
          id: "hop-hit-area",
        }),
        ...ghosts.nodes,
        bus,
      ],
      overlays,
    }
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

    const fullSigns = tokenizedBar.tokenSet.tokens.filter((token) => token.fraction === 1).length
    const partial = tokenizedBar.tokenSet.tokens.find((token) => token.fraction < 1)
    const ledger = partial
      ? `${fullSigns} full signs + one ${Math.round(partial.fraction * 100)}% sign · one sign = 2 minutes`
      : `${fullSigns} full signs · one sign = 2 minutes`

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
          <text x="2" y={baseline + 56} className="discrete-example__axis-text">
            {ledger}
          </text>
        </g>
      ),
    }
  }
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="discrete-example__segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? "is-active" : ""}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ChartPanel({
  eyebrow,
  title,
  note,
  metric,
  recommended,
  tone,
  actions,
  afterChart,
  className,
  children,
}) {
  const classes = [
    "discrete-example__panel",
    recommended ? "discrete-example__panel--recommended" : "",
    tone === "warning" ? "discrete-example__panel--warning" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <section className={classes}>
      <div className="discrete-example__panel-head">
        <div>
          <div className="discrete-example__eyebrow">
            {eyebrow}
            {recommended ? <span className="discrete-example__pick">IDID pick</span> : null}
          </div>
          <h2>{title}</h2>
        </div>
        {metric ? <strong>{metric}</strong> : null}
      </div>
      <p>{note}</p>
      {actions ? <div className="discrete-example__panel-actions">{actions}</div> : null}
      <div className="discrete-example__chart-shell">{children}</div>
      {afterChart}
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

function LineageMotif({ motif }) {
  if (motif === "isotype") {
    return (
      <svg viewBox="0 0 130 46" className="discrete-example__lineage-motif" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <Glyph
            key={index}
            def={isotypePersonGlyph}
            x={8 + index * 24}
            y={6}
            size={34}
            color={INK}
          />
        ))}
        <Glyph
          def={isotypePersonGlyph}
          x={104}
          y={6}
          size={34}
          color={INK}
          fraction={0.5}
          fractionDirection="vertical"
          ghostColor={GHOST}
        />
      </svg>
    )
  }
  if (motif === "frequency") {
    return (
      <svg viewBox="0 0 130 46" className="discrete-example__lineage-motif" aria-hidden="true">
        {Array.from({ length: 20 }, (_, index) => (
          <circle
            key={index}
            cx={12 + (index % 10) * 12}
            cy={index < 10 ? 15 : 32}
            r="4.4"
            fill={index === 3 || index === 11 || index === 16 ? RED : GHOST}
          />
        ))}
      </svg>
    )
  }
  if (motif === "hop") {
    return (
      <svg viewBox="0 0 130 46" className="discrete-example__lineage-motif" aria-hidden="true">
        <line x1="8" x2="122" y1="38" y2="38" stroke={GHOST} strokeWidth="2" />
        {[0, 1, 2].map((index) => (
          <line
            key={index}
            x1={16 + index * 11}
            x2={26 + index * 11}
            y1={20 + index * 3}
            y2={20 + index * 3}
            stroke={GHOST}
            strokeWidth="2.5"
          />
        ))}
        <Glyph def={isotypeBusGlyph} x={64} y={4} size={34} color={BLUE} accent={PANEL} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 130 46" className="discrete-example__lineage-motif" aria-hidden="true">
      <line x1="8" x2="122" y1="40" y2="40" stroke={GHOST} strokeWidth="2" />
      {[1, 2, 4, 6, 4, 2, 1].map((count, column) =>
        Array.from({ length: count }, (_, stack) => (
          <circle
            key={`${column}-${stack}`}
            cx={24 + column * 13}
            cy={35 - stack * 8.5}
            r="3.6"
            fill={column < 4 ? BLUE : RED}
          />
        )),
      )}
    </svg>
  )
}

function HopPanel({ threshold, compact, chartWidth, tooltip, className }) {
  const reducedMotion = useReducedMotion()
  const [seed, setSeed] = useState(7)
  const [morning, setMorning] = useState(1)
  const [playing, setPlaying] = useState(true)
  const schedule = useMemo(() => hopSchedule(seed), [seed])
  const running = playing && !reducedMotion

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setMorning((value) => value + 1), 950)
    return () => window.clearInterval(id)
  }, [running])

  const layout = useMemo(
    () => makeHopLayout({ schedule, morning, threshold, compact }),
    [schedule, morning, threshold, compact],
  )

  const reshuffle = useCallback(() => {
    setSeed((value) => value + 1)
    setMorning(1)
  }, [])

  return (
    <ChartPanel
      eyebrow="04 · Hypothetical outcomes"
      title="One possible morning at a time"
      note="Hullman's HOPs show uncertainty as single possible worlds in sequence. Watch the remembered mornings pile up into the quantile dotplot from panel 02 — a distribution is just many mornings, remembered."
      metric={`morning ${morning}`}
      className={className}
      actions={
        <>
          <button
            type="button"
            className="discrete-example__button"
            aria-pressed={running}
            onClick={() => setPlaying((value) => !value)}
            disabled={reducedMotion}
          >
            {running ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="discrete-example__button"
            onClick={() => setMorning((value) => value + 1)}
          >
            Next morning
          </button>
          <button type="button" className="discrete-example__button" onClick={reshuffle}>
            New order
          </button>
          {reducedMotion ? (
            <span className="discrete-example__motion-note">
              Reduced motion is on — step through mornings manually.
            </span>
          ) : null}
        </>
      }
    >
      <XYCustomChart
        data={HOP_DATA}
        layout={layout}
        width={chartWidth}
        height={264}
        xExtent={[0, DOMAIN_MAX]}
        yExtent={[0, 1]}
        margin={{ top: 8, right: 14, bottom: 30, left: 16 }}
        enableHover
        accessibleTable
        tooltip={tooltip}
        description="A hypothetical outcome plot: one sampled bus arrival at a time, accumulating into a quantile dotplot."
        summary={`Morning ${morning} of a shuffled sequence of possible bus arrivals, judged against a ${threshold} minute threshold.`}
        frameProps={{ background: "transparent" }}
      />
    </ChartPanel>
  )
}

function SometimesDiscreteExamplePage() {
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [guess, setGuess] = useState(50)
  const [revealed, setRevealed] = useState(false)
  const [taskIntent, setTaskIntent] = useState("estimate probability")
  const [tokenStyle, setTokenStyle] = useState("dots")
  const [tokenCount, setTokenCount] = useState(50)
  const [sabotage, setSabotage] = useState("none")

  const compact = pageWidth < 780
  const panelChartWidth = Math.floor((pageWidth - 18) / 2) - 34
  const chartWidth = compact
    ? Math.max(260, pageWidth - 34)
    : Math.max(260, panelChartWidth)
  const riskChartWidth = compact
    ? Math.max(260, pageWidth - 34)
    : Math.max(260, panelChartWidth)
  const probability = useMemo(() => probabilityWithin(threshold), [threshold])
  const actualPct = Math.round(probability * 100)
  const riskCount = Math.round((1 - probability) * 100)
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
  const recommendedPanel = RECOMMENDED_PANEL[suggestion.recommendedEncoding]

  const outcome = useMemo(
    () => outcomeEncoding({ tokenStyle, tokenCount, sabotage }),
    [sabotage, tokenCount, tokenStyle],
  )
  const diagnostics = useMemo(
    () => diagnoseTokenEncoding(outcome.encoding, { visibleTokens: outcome.visibleTokens }),
    [outcome],
  )

  const densityLayout = useMemo(
    () => makeDensityLayout({ threshold, revealed, probability }),
    [probability, revealed, threshold],
  )
  const outcomeLayout = useMemo(
    () => makeOutcomeLayout({ threshold, tokenStyle, tokenCount, sabotage, compact }),
    [compact, sabotage, threshold, tokenCount, tokenStyle],
  )
  const riskLayout = useMemo(() => makeRiskLayout({ riskCount, compact }), [compact, riskCount])
  const hybridLayout = useMemo(() => makeHybridLayout({ threshold }), [threshold])

  const handleThreshold = useCallback((event) => {
    setThreshold(Number(event.target.value))
    setRevealed(false)
  }, [])

  const tooltip = useCallback((hover) => {
    const datum = unwrapDatum(hover)
    if (!datum?.chart) return null
    return (
      <div className="discrete-example__tooltip">
        <strong>{datum.chart}</strong>
        {datum.arrival != null ? <span>{datum.arrival} minute arrival</span> : null}
        {datum.morning != null ? <span>morning {datum.morning}</span> : null}
        {datum.probability != null ? (
          <span>{Math.round(datum.probability * 100)}% before threshold</span>
        ) : null}
        {datum.riskCase != null ? (
          <span>{datum.riskCase ? "misses the connection" : "makes the connection"}</span>
        ) : null}
        {datum.unitMeaning ? <span>{datum.unitMeaning}</span> : null}
        {datum.lesson ? <span>{datum.lesson}</span> : null}
      </div>
    )
  }, [])

  const outcomeTitle =
    sabotage === "raw"
      ? "Every morning at once"
      : tokenStyle === "icons"
        ? `${tokenCount} possible buses`
        : `${tokenCount} possible arrivals`

  const outcomeNote =
    SABOTAGE_NOTES[sabotage] ??
    (tokenStyle === "icons"
      ? "The same quantile tokens as bus signs: the distribution survives, and each token now says what it is. Count the buses left of the line."
      : "Kay and Hullman's quantile dotplot: each dot is one equally likely arrival, stacked so interval probability becomes literal counting.")

  return (
    <ExamplePageLayout title="Sometimes it's better to be discrete">
      <div className="discrete-example" ref={pageRef}>
        <header className="discrete-example__header">
          <div>
            <div className="discrete-example__eyebrow">
              Tokenized reasoning · ISOTYPE · uncertainty
            </div>
            <p className="discrete-example__lede">
              When dots, icons, and tokens beat bars, blobs, and densities.
            </p>
            <h2>Should I leave now or wait for the bus?</h2>
          </div>
          <svg className="discrete-example__header-sign" viewBox="0 0 120 96" aria-hidden="true">
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
            <span>What should the chart help people do?</span>
            <SegmentedControl
              label="Task intent"
              options={TASKS}
              value={taskIntent}
              onChange={setTaskIntent}
            />
          </div>

          <div className="discrete-example__control-block">
            <span>Possible worlds</span>
            <SegmentedControl
              label="Token style"
              options={TOKEN_STYLES}
              value={tokenStyle}
              onChange={setTokenStyle}
            />
            <SegmentedControl
              label="Token count"
              options={TOKEN_COUNTS.map((count) => ({ id: count, label: `${count}` }))}
              value={tokenCount}
              onChange={setTokenCount}
            />
          </div>
        </section>

        <section className="discrete-example__stats" aria-label="Bus wait summary">
          <div>
            <span>Probability</span>
            <strong>{revealed ? `${actualPct}%` : "?"}</strong>
            <p>{revealed ? `arrive by ${threshold} minutes` : "estimate it in panel 01 first"}</p>
          </div>
          <div>
            <span>Natural frequency</span>
            <strong>{100 - riskCount}</strong>
            <p>of 100 commuters make the connection</p>
          </div>
          <div>
            <span>Expected wait</span>
            <strong>{EXPECTED_ARRIVAL.toFixed(1)}</strong>
            <p>minutes, kept as measurable length</p>
          </div>
        </section>

        <div className="discrete-example__grid">
          <ChartPanel
            eyebrow="01 · Continuous"
            title="Area is the answer"
            note="A density curve represents the probability correctly, but the reader must estimate a shaded area. Commit to a guess before revealing the count so you can compare the two tasks."
            metric={revealed ? `${actualPct}%` : "?"}
            recommended={recommendedPanel === "density"}
            actions={
              <div className="discrete-example__guess">
                <label htmlFor="probability-guess">
                  Your estimate: <strong>{guess}%</strong>
                </label>
                <input
                  id="probability-guess"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={guess}
                  onChange={(event) => setGuess(Number(event.target.value))}
                  disabled={revealed}
                />
                {revealed ? (
                  <p className="discrete-example__guess-result" role="status">
                    You said {guess}%, the area says {actualPct}% — off by{" "}
                    {Math.abs(guess - actualPct)} points. In panel 02 you can simply count.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="discrete-example__button discrete-example__button--primary"
                    onClick={() => setRevealed(true)}
                  >
                    Reveal the answer
                  </button>
                )}
              </div>
            }
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
              summary={
                revealed
                  ? `${actualPct}% of arrivals happen within ${threshold} minutes in the simulated bus wait distribution.`
                  : `A shaded density area poses the estimation question for a ${threshold} minute threshold.`
              }
              frameProps={{ background: "transparent" }}
            />
          </ChartPanel>

          <ChartPanel
            eyebrow="02 · Possible outcomes"
            title={outcomeTitle}
            note={outcomeNote}
            metric={sabotage === "raw" ? "800 marks" : `${tokenCount} tokens`}
            recommended={recommendedPanel === "outcomes"}
            tone={sabotage !== "none" ? "warning" : undefined}
            afterChart={
              <div className="discrete-example__inline-critic">
                <p>
                  Live results from <code>diagnoseTokenEncoding</code> for exactly the encoding
                  rendered in panel 02 — sabotage it and the critique updates with it.
                </p>
                <SegmentedControl
                  label="Sabotage the outcome panel"
                  options={SABOTAGES}
                  value={sabotage}
                  onChange={setSabotage}
                />
                {diagnostics.length === 0 ? (
                  <p className="discrete-example__all-clear">
                    No warnings. The tokens declare their semantics, the count strategy matches the
                    meaning, and {outcome.visibleTokens} visible tokens is within budget.
                  </p>
                ) : (
                  <ul className="discrete-example__diagnostics">
                    {diagnostics.map((diagnostic) => (
                      <li key={diagnostic.code}>
                        <code>{diagnostic.code}</code>
                        <span>{diagnostic.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            }
          >
            <XYCustomChart
              data={ARRIVAL_DATA}
              layout={outcomeLayout}
              width={chartWidth}
              height={260}
              xExtent={[0, DOMAIN_MAX]}
              yExtent={[0, 1]}
              margin={{ top: 8, right: 14, bottom: 30, left: 16 }}
              enableHover
              accessibleTable
              tooltip={tooltip}
              description="A quantile dotplot of possible bus arrivals: equally likely outcomes stacked into countable columns."
              summary={`${tokenCount} quantile tokens rendered as ${tokenStyle}, judged against a ${threshold} minute threshold.`}
              frameProps={{ background: "transparent" }}
            />
          </ChartPanel>

          <ChartPanel
            eyebrow="03 · Natural frequency"
            title="Risk is easier as people"
            note="The same threshold, translated: out of 100 commuters making this exact choice, the highlighted people miss their connection. Fixed denominators keep percentages honest and countable."
            metric={`${riskCount}/100`}
            recommended={recommendedPanel === "risk"}
            className="discrete-example__panel--risk"
          >
            <XYCustomChart
              data={RISK_DATA}
              layout={riskLayout}
              width={riskChartWidth}
              height={326}
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

          <HopPanel
            threshold={threshold}
            compact={compact}
            chartWidth={chartWidth}
            tooltip={tooltip}
            className="discrete-example__panel--hop"
          />

          <section
            className={
              recommendedPanel === "hybrid"
                ? "discrete-example__panel discrete-example__panel--hybrid discrete-example__wide-panel--recommended"
                : "discrete-example__panel discrete-example__panel--hybrid"
            }
          >
            <div className="discrete-example__wide-copy">
              <div className="discrete-example__eyebrow">
                05 · Hybrid encoding
                {recommendedPanel === "hybrid" ? (
                  <span className="discrete-example__pick">IDID pick</span>
                ) : null}
              </div>
              <h2>Keep precision where it matters, tokenize where it helps.</h2>
              <p>
                The expected wait remains a measurable bar; <code>tokenLayer</code> stamps one bus
                sign per two minutes on top of it, partial final sign included. The ledger under the
                axis comes from the token records, so <em>total</em> versus <em>shown</em> stays
                honest even when a sign is fractional.
              </p>
            </div>
            <div className="discrete-example__chart-shell">
              <XYCustomChart
                data={EXPECTED_WAIT_DATA}
                layout={hybridLayout}
                width={chartWidth}
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
            </div>
          </section>

          <section className="discrete-example__panel discrete-example__panel--recommendation">
            <div className="discrete-example__panel-head">
              <div>
                <div className="discrete-example__eyebrow">06 · IDID recommendation</div>
                <h2>
                  {RECOMMENDATION_LABELS[suggestion.recommendedEncoding] ??
                    suggestion.recommendedEncoding}
                </h2>
              </div>
            </div>
            <p>{suggestion.rationale}</p>
            <EncodingCard encoding={suggestion.tokenEncoding} />
            {suggestion.recommendedEncoding === "semantic-isotype" && tokenStyle !== "icons" ? (
              <p className="discrete-example__hint">
                Tip: switch panel 02 to <strong>bus signs</strong> to see the semantic version.
              </p>
            ) : null}
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
            <p className="discrete-example__fine-print">
              <code>suggestTokenEncoding</code> maps the task above to the encoding it would hand to{" "}
              <code>generateTokens</code>; the panel it picks carries the &ldquo;IDID pick&rdquo;
              badge.
            </p>
          </section>
        </div>

        <section className="discrete-example__lineage" aria-label="A century of counting">
          <div className="discrete-example__eyebrow">A century of counting</div>
          <div className="discrete-example__lineage-grid">
            {LINEAGE.map((entry) => (
              <div key={entry.year} className="discrete-example__lineage-card">
                <LineageMotif motif={entry.motif} />
                <div className="discrete-example__lineage-year">{entry.year}</div>
                <h3>{entry.title}</h3>
                <div className="discrete-example__lineage-who">{entry.who}</div>
                <p>{entry.line}</p>
              </div>
            ))}
          </div>
          <p className="discrete-example__fine-print">
            One idea connects pictograms, infographics, icon arrays, and uncertainty visualization:
            replace an abstract magnitude with things a reader can count — units, cases, and
            possible worlds. <code>tokenSemantics</code> is that idea as an API.
          </p>
        </section>

        <section className="discrete-example__code">
          <div>
            <div className="discrete-example__eyebrow">Implementation</div>
            <h2>TokenLayer generates the countable marks.</h2>
            <p>
              Semantics first, then placement, then marks: <code>generateTokens</code> decides what
              each token means, the <code>dotplot</code> layout Wilkinson-stacks the quantiles, and{" "}
              <code>tokenLayer</code> emits ordinary Semiotic scene nodes with the same canvas, SVG,
              hover, focus, and accessible-table machinery as every other custom chart.
            </p>
          </div>
          <CodeBlock language="jsx" code={implementationCode} wrap />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

export default SometimesDiscreteExamplePage
