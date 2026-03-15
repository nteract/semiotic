import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Scatterplot, StreamXYFrame, LineChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// LOESS datasets
// ---------------------------------------------------------------------------

const curvedData = [
  { x: 1, y: 5 }, { x: 2, y: 8 }, { x: 3, y: 14 }, { x: 4, y: 11 },
  { x: 5, y: 18 }, { x: 6, y: 22 }, { x: 7, y: 28 }, { x: 8, y: 25 },
  { x: 9, y: 30 }, { x: 10, y: 35 }, { x: 11, y: 32 }, { x: 12, y: 28 },
  { x: 13, y: 24 }, { x: 14, y: 20 }, { x: 15, y: 18 }, { x: 16, y: 22 },
  { x: 17, y: 26 }, { x: 18, y: 30 }, { x: 19, y: 34 }, { x: 20, y: 38 },
]

const sineData = Array.from({ length: 40 }, (_, i) => ({
  x: i,
  y: Math.sin(i * 0.3) * 20 + 30 + (Math.random() - 0.5) * 12,
}))

const clusterData = [
  // cluster 1
  ...Array.from({ length: 12 }, (_, i) => ({
    x: 5 + Math.random() * 10,
    y: 15 + Math.random() * 10,
  })),
  // transition
  ...Array.from({ length: 6 }, (_, i) => ({
    x: 18 + i * 2,
    y: 25 + i * 5 + (Math.random() - 0.5) * 6,
  })),
  // cluster 2
  ...Array.from({ length: 12 }, (_, i) => ({
    x: 32 + Math.random() * 10,
    y: 55 + Math.random() * 10,
  })),
]

const loessDatasets = [
  { label: "Rise–Dip–Rise (20 pts)", data: curvedData },
  { label: "Noisy Sine (40 pts)", data: sineData },
  { label: "Two Clusters (30 pts)", data: clusterData },
]

// ---------------------------------------------------------------------------
// LOESS controls
// ---------------------------------------------------------------------------

const loessControls = [
  { name: "bandwidth", type: "number", label: "Bandwidth", group: "LOESS",
    default: 0.3, min: 0.05, max: 1, step: 0.05 },
  { name: "loessColor", type: "color", label: "LOESS Color", group: "LOESS",
    default: "#8b5cf6" },
  { name: "loessWidth", type: "number", label: "LOESS Width", group: "LOESS",
    default: 2.5, min: 1, max: 6, step: 0.5 },
  { name: "showLinear", type: "boolean", label: "Show Linear", group: "LOESS",
    default: true },
  { name: "pointRadius", type: "number", label: "Point Radius", group: "Points",
    default: 5, min: 2, max: 12, step: 1 },
  { name: "pointOpacity", type: "number", label: "Point Opacity", group: "Points",
    default: 0.7, min: 0.1, max: 1, step: 0.05 },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: false },
]

// ---------------------------------------------------------------------------
// Anomaly streaming signals
// ---------------------------------------------------------------------------

function makeNormalWithSpikes(spikeRate) {
  return (t) => {
    const isSpike = Math.random() < spikeRate
    return isSpike
      ? 50 + (Math.random() > 0.5 ? 1 : -1) * (35 + Math.random() * 15)
      : 50 + (Math.random() - 0.5) * 20
  }
}

const anomalySignals = [
  { label: "Normal + 8% Spikes", generate: makeNormalWithSpikes(0.08) },
  { label: "Normal + 15% Spikes", generate: makeNormalWithSpikes(0.15) },
  {
    label: "Sine + Outliers",
    generate: (t) => {
      const base = Math.sin(t * 0.04) * 20 + 50
      return Math.random() < 0.06
        ? base + (Math.random() > 0.5 ? 40 : -40)
        : base + (Math.random() - 0.5) * 8
    },
  },
  {
    label: "Gradual Drift",
    generate: (() => {
      let val = 50
      return (t) => {
        val += (Math.random() - 0.48) * 2
        const spike = Math.random() < 0.05 ? (Math.random() - 0.5) * 60 : 0
        return val + spike
      }
    })(),
  },
]

// ---------------------------------------------------------------------------
// Pre-computed forecast dataset
// ---------------------------------------------------------------------------

function generatePrecomputedDataset() {
  const total = 80
  const trainEnd = Math.floor(total * 0.25) // first 25% training
  const forecastStart = Math.floor(total * 0.9) // last 10% forecast
  const data = []

  for (let i = 0; i < total; i++) {
    const base = 40 + Math.sin(i * 0.1) * 15 + i * 0.3
    const noise = (Math.random() - 0.5) * 10
    const value = Math.round((base + noise) * 100) / 100

    const isTrain = i < trainEnd
    const isForecast = i >= forecastStart
    const isObserved = !isTrain && !isForecast

    // Training: no bounds
    // Observed: bounds follow the curve shape
    // Forecast: bounds widen over time
    let upperBounds = undefined
    let lowerBounds = undefined
    let isAnomaly = false

    if (isObserved) {
      const bandwidth = 8 + Math.abs(Math.sin(i * 0.08)) * 4
      upperBounds = Math.round((base + bandwidth) * 100) / 100
      lowerBounds = Math.round((base - bandwidth) * 100) / 100
      // Flag anomalies: points outside bounds
      isAnomaly = value > upperBounds || value < lowerBounds
    }

    if (isForecast) {
      const stepsIntoForecast = i - forecastStart
      const widening = 4 + stepsIntoForecast * 1.8
      upperBounds = Math.round((base + widening) * 100) / 100
      lowerBounds = Math.round((base - widening) * 100) / 100
    }

    const datum = {
      time: i,
      value: isForecast ? Math.round(base * 100) / 100 : value,
      isTraining: isTrain,
      isForecast,
      isAnomaly,
      ...(upperBounds != null && { upperBounds }),
      ...(lowerBounds != null && { lowerBounds }),
    }

    // Hard-coded anomaly spikes so the demo always shows them
    if (i === 36) { datum.value = 58; datum.isAnomaly = true }
    if (i === 62) { datum.value = 40; datum.isAnomaly = true }

    data.push(datum)
  }
  return data
}

// Auto-mode forecast dataset
function generateAutoDataset() {
  const data = []
  for (let i = 0; i < 80; i++) {
    const base = 20 + i * 0.5 + Math.sin(i * 0.15) * 5
    const noise = (Math.random() - 0.5) * 8
    const isAnomaly = Math.random() < 0.06
    const value = isAnomaly
      ? base + (Math.random() > 0.5 ? 1 : -1) * (noise * 3 + Math.random() * 10)
      : base + noise
    data.push({ time: i, value: Math.round(value * 100) / 100 })
  }
  return data
}

const forecastDatasets = [
  { label: "Auto: Linear Trend + Anomalies", mode: "auto", trainEnd: 60 },
  { label: "Pre-computed: ML Model Bounds", mode: "precomputed" },
]

// ---------------------------------------------------------------------------
// Forecast controls
// ---------------------------------------------------------------------------

const forecastControls = [
  { name: "fSteps", type: "number", label: "Forecast Steps", group: "Forecast",
    default: 15, min: 3, max: 30, step: 1 },
  { name: "fConfidence", type: "number", label: "Confidence Level", group: "Forecast",
    default: 0.95, min: 0.8, max: 0.99, step: 0.01 },
  { name: "fColor", type: "color", label: "Forecast Color", group: "Forecast",
    default: "#6366f1" },
  { name: "fBandOpacity", type: "number", label: "Envelope Opacity", group: "Forecast",
    default: 0.15, min: 0.05, max: 0.4, step: 0.05 },
  { name: "fEnableAnomaly", type: "boolean", label: "Enable Anomaly Detection", group: "Anomaly",
    default: true },
  { name: "fThreshold", type: "number", label: "Threshold (σ)", group: "Anomaly",
    default: 2, min: 0.5, max: 4, step: 0.25 },
  { name: "fAnomalyColor", type: "color", label: "Anomaly Dot Color", group: "Anomaly",
    default: "#ef4444" },
  { name: "fAnomalyRadius", type: "number", label: "Anomaly Dot Radius", group: "Anomaly",
    default: 6, min: 3, max: 15, step: 1 },
  { name: "fShowGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: true },
  { name: "fCurve", type: "select", label: "Curve", group: "Layout",
    default: "monotoneX", options: ["linear", "monotoneX", "step", "basis", "cardinal"] },
  { name: "fMode", type: "select", label: "Chart Mode", group: "Layout",
    default: "primary", options: ["primary", "context", "sparkline"] },
]

function generateForecastCode(values, isPrecomputed) {
  let code = `import { LineChart } from "semiotic"\n\n`

  if (isPrecomputed) {
    code += `// Data includes segment flags and bounds from your ML model\n`
    code += `const data = [\n`
    code += `  // Training segment — no bounds, model hasn't learned yet\n`
    code += `  { time: 0, value: 42, isTraining: true },\n`
    code += `  // ...\n`
    code += `  // Observed segment — model provides bounds\n`
    code += `  { time: 25, value: 48, upperBounds: 56, lowerBounds: 40, isAnomaly: false },\n`
    code += `  { time: 26, value: 65, upperBounds: 57, lowerBounds: 41, isAnomaly: true },\n`
    code += `  // ...\n`
    code += `  // Forecast segment — bounds widen over time\n`
    code += `  { time: 72, value: 60, isForecast: true, upperBounds: 68, lowerBounds: 52 },\n`
    code += `  { time: 78, value: 63, isForecast: true, upperBounds: 78, lowerBounds: 48 },\n`
    code += `]\n\n`
    code += `<LineChart\n`
    code += `  data={data}\n`
    code += `  xAccessor="time"\n`
    code += `  yAccessor="value"\n`
    if (values.fMode && values.fMode !== "primary") code += `  mode="${values.fMode}"\n`
    if (values.fShowGrid) code += `  showGrid\n`
    if (values.fCurve !== "monotoneX") code += `  curve="${values.fCurve}"\n`
    code += `  forecast={{\n`
    code += `    isTraining: "isTraining",\n`
    code += `    isForecast: "isForecast",\n`
    code += `    isAnomaly: "isAnomaly",\n`
    code += `    upperBounds: "upperBounds",\n`
    code += `    lowerBounds: "lowerBounds",\n`
    if (values.fColor !== "#6366f1") code += `    color: "${values.fColor}",\n`
    if (values.fBandOpacity !== 0.15) code += `    bandOpacity: ${values.fBandOpacity},\n`
    if (values.fAnomalyColor !== "#ef4444") code += `    anomalyColor: "${values.fAnomalyColor}",\n`
    if (values.fAnomalyRadius !== 6) code += `    anomalyRadius: ${values.fAnomalyRadius},\n`
    code += `  }}\n`
    code += `/>`
  } else {
    code += `const data = [...] // time series with trend + anomalies\n\n`
    code += `<LineChart\n`
    code += `  data={data}\n`
    code += `  xAccessor="time"\n`
    code += `  yAccessor="value"\n`
    if (values.fMode && values.fMode !== "primary") code += `  mode="${values.fMode}"\n`
    if (values.fShowGrid) code += `  showGrid\n`
    if (values.fCurve !== "monotoneX") code += `  curve="${values.fCurve}"\n`
    code += `  forecast={{\n`
    code += `    trainEnd: 60,\n`
    if (values.fSteps !== 15) code += `    steps: ${values.fSteps},\n`
    if (values.fConfidence !== 0.95) code += `    confidence: ${values.fConfidence},\n`
    if (values.fColor !== "#6366f1") code += `    color: "${values.fColor}",\n`
    if (values.fBandOpacity !== 0.15) code += `    bandOpacity: ${values.fBandOpacity},\n`
    code += `  }}\n`
    if (values.fEnableAnomaly) {
      code += `  anomaly={{\n`
      if (values.fThreshold !== 2) code += `    threshold: ${values.fThreshold},\n`
      if (values.fAnomalyColor !== "#ef4444") code += `    anomalyColor: "${values.fAnomalyColor}",\n`
      if (values.fAnomalyRadius !== 6) code += `    anomalyRadius: ${values.fAnomalyRadius},\n`
      code += `  }}\n`
    }
    code += `/>`
  }

  return code
}

// ---------------------------------------------------------------------------
// Anomaly controls
// ---------------------------------------------------------------------------

const anomalyControls = [
  { name: "threshold", type: "number", label: "Threshold (σ)", group: "Anomaly Band",
    default: 2, min: 0.5, max: 4, step: 0.25 },
  { name: "showBand", type: "boolean", label: "Show Band", group: "Anomaly Band",
    default: true },
  { name: "bandFill", type: "color", label: "Band Fill", group: "Anomaly Band",
    default: "#6366f1" },
  { name: "bandOpacity", type: "number", label: "Band Opacity", group: "Anomaly Band",
    default: 0.1, min: 0.02, max: 0.4, step: 0.02 },
  { name: "anomalyColor", type: "color", label: "Anomaly Color", group: "Anomaly Band",
    default: "#ef4444" },
  { name: "anomalyRadius", type: "number", label: "Anomaly Radius", group: "Anomaly Band",
    default: 6, min: 3, max: 15, step: 1 },
  { name: "windowSize", type: "number", label: "Buffer Size", group: "Stream",
    default: 200, min: 50, max: 500, step: 50 },
  { name: "showAxes", type: "boolean", label: "Show Axes", group: "Stream",
    default: true },
]

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

function generateLoessCode(values, loessDefaults, dataset) {
  const annotations = []
  const bw = values.bandwidth !== 0.3 ? `, bandwidth: ${values.bandwidth}` : ""
  const col = values.loessColor !== "#8b5cf6" ? `, color: "${values.loessColor}"` : ""
  const sw = values.loessWidth !== 2.5 ? `, strokeWidth: ${values.loessWidth}` : ""
  annotations.push(`  { type: "trend", method: "loess"${bw}${col}${sw}, label: "LOESS" }`)
  if (values.showLinear) {
    annotations.push(`  { type: "trend", method: "linear", color: "#94a3b8", strokeDasharray: "4,4", label: "Linear" }`)
  }

  let code = `import { Scatterplot } from "semiotic"\n\n`
  code += `const data = ${JSON.stringify(dataset.data.slice(0, 4), null, 2).replace(/\]$/, "  // ..." + dataset.data.length + " points\n]")}\n\n`
  code += `<Scatterplot\n`
  code += `  data={data}\n`
  code += `  xAccessor="x"\n`
  code += `  yAccessor="y"\n`
  if (values.pointRadius !== 5) code += `  pointRadius={${values.pointRadius}}\n`
  if (values.pointOpacity !== 0.7) code += `  pointOpacity={${values.pointOpacity}}\n`
  if (values.showGrid) code += `  showGrid\n`
  code += `  annotations={[\n${annotations.join(",\n")}\n  ]}\n`
  code += `/>`
  return code
}

function generateAnomalyCode(values) {
  let code = `import { useRef, useEffect } from "react"\nimport { StreamXYFrame } from "semiotic"\n\n`
  code += `const chartRef = useRef()\n\n`
  code += `// Push data at any frequency\n`
  code += `chartRef.current.push({ time: Date.now(), value: reading })\n\n`
  code += `<StreamXYFrame\n`
  code += `  ref={chartRef}\n`
  code += `  chartType="scatter"\n`
  code += `  runtimeMode="streaming"\n`
  code += `  timeAccessor="time"\n`
  code += `  valueAccessor="value"\n`
  if (values.windowSize !== 200) code += `  windowSize={${values.windowSize}}\n`
  if (values.showAxes) code += `  showAxes\n`
  code += `  pointStyle={() => ({ fill: "#6366f1", r: 3, opacity: 0.6 })}\n`
  code += `  annotations={[\n`
  code += `    {\n`
  code += `      type: "anomaly-band",\n`
  if (values.threshold !== 2) code += `      threshold: ${values.threshold},\n`
  if (!values.showBand) code += `      showBand: false,\n`
  if (values.bandFill !== "#6366f1") code += `      fill: "${values.bandFill}",\n`
  if (values.bandOpacity !== 0.1) code += `      fillOpacity: ${values.bandOpacity},\n`
  if (values.anomalyColor !== "#ef4444") code += `      anomalyColor: "${values.anomalyColor}",\n`
  if (values.anomalyRadius !== 6) code += `      anomalyRadius: ${values.anomalyRadius},\n`
  code += `      label: "±${values.threshold}σ",\n`
  code += `    },\n`
  code += `  ]}\n`
  code += `/>`
  return code
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ForecastChart({ data, dataset, values, width }) {
  const isPrecomputed = dataset.mode === "precomputed"

  const forecastConfig = isPrecomputed
    ? {
        isTraining: "isTraining",
        isForecast: "isForecast",
        isAnomaly: "isAnomaly",
        upperBounds: "upperBounds",
        lowerBounds: "lowerBounds",
        color: values.fColor,
        bandOpacity: values.fBandOpacity,
        anomalyColor: values.fAnomalyColor,
        anomalyRadius: values.fAnomalyRadius,
      }
    : {
        trainEnd: dataset.trainEnd,
        steps: values.fSteps,
        confidence: values.fConfidence,
        color: values.fColor,
        bandOpacity: values.fBandOpacity,
      }

  const anomalyConfig = !isPrecomputed && values.fEnableAnomaly ? {
    threshold: values.fThreshold,
    anomalyColor: values.fAnomalyColor,
    anomalyRadius: values.fAnomalyRadius,
  } : undefined

  const mode = values.fMode || "primary"

  return (
    <LineChart
      key={`forecast-${dataset.mode}-${values.fCurve}-${mode}`}
      data={data}
      xAccessor="time"
      yAccessor="value"
      mode={mode}
      width={mode === "primary" ? width : undefined}
      height={mode === "primary" ? 420 : undefined}
      showGrid={values.fShowGrid}
      curve={values.fCurve}
      xLabel="Time"
      yLabel="Value"
      forecast={forecastConfig}
      anomaly={anomalyConfig}
    />
  )
}

export default function StatisticalAnnotationsPlayground() {
  // ---- LOESS state ----
  const loessDefaults = {}
  for (const c of loessControls) loessDefaults[c.name] = c.default
  const [loessValues, setLoessValues] = useState(loessDefaults)
  const [loessDatasetIndex, setLoessDatasetIndex] = useState(0)
  const [loessWidth, setLoessWidth] = useState(null)
  const loessVizRef = useRef(null)

  // ---- Anomaly state ----
  const anomalyDefaults = {}
  for (const c of anomalyControls) anomalyDefaults[c.name] = c.default
  const [anomalyValues, setAnomalyValues] = useState(anomalyDefaults)
  const [signalIndex, setSignalIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [anomalyWidth, setAnomalyWidth] = useState(null)
  const anomalyVizRef = useRef(null)
  const chartRef = useRef(null)
  const tickRef = useRef(0)

  // ---- Forecast state ----
  const forecastDefaults = {}
  for (const c of forecastControls) forecastDefaults[c.name] = c.default
  const [forecastValues, setForecastValues] = useState(forecastDefaults)
  const [forecastDatasetIndex, setForecastDatasetIndex] = useState(0)
  const [forecastWidth, setForecastWidth] = useState(null)
  const forecastVizRef = useRef(null)

  const precomputedData = useMemo(() => generatePrecomputedDataset(), [])
  const autoData = useMemo(() => generateAutoDataset(), [])

  // Responsive widths
  useEffect(() => {
    const observers = []
    if (loessVizRef.current) {
      const obs = new ResizeObserver((entries) => {
        for (const e of entries) setLoessWidth(e.contentRect.width)
      })
      obs.observe(loessVizRef.current)
      observers.push(obs)
    }
    if (anomalyVizRef.current) {
      const obs = new ResizeObserver((entries) => {
        for (const e of entries) setAnomalyWidth(e.contentRect.width)
      })
      obs.observe(anomalyVizRef.current)
      observers.push(obs)
    }
    if (forecastVizRef.current) {
      const obs = new ResizeObserver((entries) => {
        for (const e of entries) setForecastWidth(e.contentRect.width)
      })
      obs.observe(forecastVizRef.current)
      observers.push(obs)
    }
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  // Streaming data pump
  useEffect(() => {
    if (!running) return
    const signal = anomalySignals[signalIndex]
    const interval = setInterval(() => {
      tickRef.current += 1
      chartRef.current?.push({
        time: tickRef.current,
        value: signal.generate(tickRef.current),
      })
    }, 60)
    return () => clearInterval(interval)
  }, [running, signalIndex])

  const handleClear = useCallback(() => {
    chartRef.current?.clear()
    tickRef.current = 0
  }, [])

  // ---- Build LOESS chart props ----
  const loessDataset = loessDatasets[loessDatasetIndex]
  const loessAnnotations = [
    {
      type: "trend",
      method: "loess",
      bandwidth: loessValues.bandwidth,
      color: loessValues.loessColor,
      strokeWidth: loessValues.loessWidth,
      label: "LOESS",
    },
  ]
  if (loessValues.showLinear) {
    loessAnnotations.push({
      type: "trend",
      method: "linear",
      color: "#94a3b8",
      strokeDasharray: "4,4",
      label: "Linear",
    })
  }

  // ---- Build anomaly chart props ----
  const anomalyAnnotation = {
    type: "anomaly-band",
    threshold: anomalyValues.threshold,
    showBand: anomalyValues.showBand,
    fill: anomalyValues.bandFill,
    fillOpacity: anomalyValues.bandOpacity,
    anomalyColor: anomalyValues.anomalyColor,
    anomalyRadius: anomalyValues.anomalyRadius,
    label: `±${anomalyValues.threshold}σ`,
  }

  return (
    <PageLayout
      title="Statistical Annotations Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Statistical Annotations", path: "/playground/statistical-annotations" },
      ]}
      prevPage={{ title: "Circle Pack Playground", path: "/playground/circle-pack" }}
      nextPage={{ title: "Forecast & Anomaly Playground", path: "/playground/forecast" }}
    >
      <p>
        Experiment with LOESS smoothing, streaming anomaly detection, and
        forecast/anomaly overlays on LineChart. Adjust the controls below
        each chart to see how the parameters affect the visualization, then
        copy the generated code.
      </p>

      {/* ================================================================= */}
      {/* LOESS Section */}
      {/* ================================================================= */}
      <h2 id="loess-smoothing">LOESS Smoothing</h2>

      <p>
        LOESS fits a locally-weighted regression at each data point, producing a
        smooth curve that follows non-linear patterns. The <strong>bandwidth</strong>{" "}
        parameter controls how much of the data influences each local fit — low
        values track closely, high values smooth aggressively. Toggle the linear
        comparison to see how LOESS captures structure that a straight line misses.
      </p>

      {/* Dataset picker */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-loess-dataset">Dataset:</label>
        <select
          id="pg-loess-dataset"
          className="playground-select"
          value={loessDatasetIndex}
          onChange={(e) => setLoessDatasetIndex(parseInt(e.target.value, 10))}
        >
          {loessDatasets.map((ds, i) => (
            <option key={i} value={i}>{ds.label}</option>
          ))}
        </select>
      </div>

      {/* LOESS chart */}
      <div ref={loessVizRef} className="playground-chart-container">
        {loessWidth ? (
          <Scatterplot
            data={loessDataset.data}
            xAccessor="x"
            yAccessor="y"
            width={loessWidth}
            height={400}
            pointRadius={loessValues.pointRadius}
            pointOpacity={loessValues.pointOpacity}
            showGrid={loessValues.showGrid}
            annotations={loessAnnotations}
          />
        ) : null}
      </div>

      {/* LOESS controls */}
      <PropControls
        controls={loessControls}
        values={loessValues}
        onChange={(name, value) => setLoessValues((prev) => ({ ...prev, [name]: value }))}
        onReset={() => setLoessValues(loessDefaults)}
      />

      {/* LOESS generated code */}
      <h3 id="loess-code">Generated Code</h3>
      <CodeBlock
        code={generateLoessCode(loessValues, loessDefaults, loessDataset)}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Streaming Anomaly Section */}
      {/* ================================================================= */}
      <h2 id="streaming-anomaly">Streaming Anomaly Detection</h2>

      <p>
        The anomaly band recomputes from the current window buffer each frame.
        The <strong>threshold</strong> slider controls how many standard
        deviations define the normal range — lower values flag more points as
        anomalies, higher values only catch extreme outliers. Try different
        signals to see how the band adapts to varying data distributions.
      </p>

      {/* Signal picker + transport controls */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-anomaly-signal">Signal:</label>
        <select
          id="pg-anomaly-signal"
          className="playground-select"
          value={signalIndex}
          onChange={(e) => {
            setSignalIndex(parseInt(e.target.value, 10))
            handleClear()
          }}
        >
          {anomalySignals.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
        </select>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 8 }}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Resume"}
        </button>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 4 }}
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      {/* Anomaly chart */}
      <div ref={anomalyVizRef} className="playground-chart-container">
        {anomalyWidth ? (
          <StreamXYFrame
            key={`anomaly-${anomalyValues.windowSize}-${anomalyValues.showAxes}`}
            ref={chartRef}
            chartType="scatter"
            runtimeMode="streaming"
            size={[anomalyWidth, 350]}
            timeAccessor="time"
            valueAccessor="value"
            windowSize={anomalyValues.windowSize}
            showAxes={anomalyValues.showAxes}
            pointStyle={() => ({ fill: "#6366f1", r: 3, opacity: 0.6 })}
            annotations={[anomalyAnnotation]}
          />
        ) : null}
      </div>

      {/* Anomaly controls */}
      <PropControls
        controls={anomalyControls}
        values={anomalyValues}
        onChange={(name, value) => setAnomalyValues((prev) => ({ ...prev, [name]: value }))}
        onReset={() => setAnomalyValues(anomalyDefaults)}
      />

      {/* Anomaly generated code */}
      <h3 id="anomaly-code">Generated Code</h3>
      <CodeBlock
        code={generateAnomalyCode(anomalyValues)}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Forecast & Anomaly Section */}
      {/* ================================================================= */}
      <h2 id="forecast-anomaly">Forecast & Anomaly Detection</h2>

      <p>
        The <code>forecast</code> and <code>anomaly</code> props on{" "}
        <code>LineChart</code> provide built-in statistical overlays.{" "}
        <strong>Auto mode</strong> computes regression from training data and
        extrapolates with a confidence envelope. <strong>Pre-computed mode</strong>{" "}
        reads segment flags and bounds directly from your data — use this when
        bounds come from an external ML model.
      </p>
      <p>
        In pre-computed mode, the line is styled by segment: <em>training</em>{" "}
        (dashed, no bounds), <em>observed</em> (solid, with model bounds and
        anomaly flags), and <em>forecast</em> (dotted, with widening bounds).
      </p>

      {/* Dataset picker */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-forecast-dataset">Dataset:</label>
        <select
          id="pg-forecast-dataset"
          className="playground-select"
          value={forecastDatasetIndex}
          onChange={(e) => setForecastDatasetIndex(parseInt(e.target.value, 10))}
        >
          {forecastDatasets.map((ds, i) => (
            <option key={i} value={i}>{ds.label}</option>
          ))}
        </select>
        <span style={{ marginLeft: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          {forecastDatasets[forecastDatasetIndex].mode === "precomputed"
            ? `Pre-computed bounds · ${precomputedData.length} points`
            : `Train/Forecast split at x=${forecastDatasets[forecastDatasetIndex].trainEnd} · ${autoData.length} points`}
        </span>
      </div>

      {/* Forecast chart */}
      <div ref={forecastVizRef} className="playground-chart-container">
        {forecastWidth ? (
          <ForecastChart
            data={forecastDatasets[forecastDatasetIndex].mode === "precomputed" ? precomputedData : autoData}
            dataset={forecastDatasets[forecastDatasetIndex]}
            values={forecastValues}
            width={forecastWidth}
          />
        ) : null}
      </div>

      {/* Forecast controls — filter by mode */}
      <PropControls
        controls={forecastDatasets[forecastDatasetIndex].mode === "precomputed"
          ? forecastControls.filter(c =>
              !["fSteps", "fConfidence", "fEnableAnomaly", "fThreshold"].includes(c.name))
          : forecastControls}
        values={forecastValues}
        onChange={(name, value) => setForecastValues((prev) => ({ ...prev, [name]: value }))}
        onReset={() => setForecastValues(forecastDefaults)}
      />

      {/* Forecast generated code */}
      <h3 id="forecast-code">Generated Code</h3>
      <CodeBlock
        code={generateForecastCode(forecastValues, forecastDatasets[forecastDatasetIndex].mode === "precomputed")}
        language="jsx"
      />
    </PageLayout>
  )
}
