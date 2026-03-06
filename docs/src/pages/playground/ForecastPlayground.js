import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { LineChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Sample datasets
// ---------------------------------------------------------------------------

function generateTimeSeries(n, trend, noise, anomalyRate) {
  const data = []
  for (let i = 0; i < n; i++) {
    const base = trend(i)
    const isAnomaly = Math.random() < anomalyRate
    const value = isAnomaly
      ? base + (Math.random() > 0.5 ? 1 : -1) * (noise * 3 + Math.random() * noise * 2)
      : base + (Math.random() - 0.5) * noise
    data.push({ time: i, value: Math.round(value * 100) / 100 })
  }
  return data
}

// Pre-computed dataset with ML-style bounds
function generatePrecomputed() {
  const data = []
  const trainLen = 60
  const forecastLen = 20
  for (let i = 0; i < trainLen + forecastLen; i++) {
    const base = 30 + Math.sin(i * 0.12) * 15 + i * 0.15
    const noise = (Math.random() - 0.5) * 8
    const value = Math.round((base + noise) * 100) / 100
    // Model bounds follow the sine pattern (non-rectilinear)
    const bandwidth = 8 + Math.abs(Math.sin(i * 0.08)) * 6
    const isTrain = i < trainLen
    const isForecast = i >= trainLen
    const isAnomaly = !isForecast && Math.abs(noise) > bandwidth * 0.9
    data.push({
      time: i,
      value: isForecast ? Math.round(base * 100) / 100 : value,
      isTraining: isTrain,
      isForecast,
      isAnomaly,
      upperBounds: Math.round((base + bandwidth) * 100) / 100,
      lowerBounds: Math.round((base - bandwidth) * 100) / 100,
    })
  }
  return data
}

const datasets = [
  {
    label: "Auto: Linear Trend + Anomalies",
    data: generateTimeSeries(80, (i) => 20 + i * 0.5, 8, 0.06),
    trainEnd: 60,
    mode: "auto",
  },
  {
    label: "Auto: Seasonal Pattern",
    data: generateTimeSeries(100, (i) => 50 + Math.sin(i * 0.15) * 20 + i * 0.1, 6, 0.05),
    trainEnd: 70,
    mode: "auto",
  },
  {
    label: "Pre-computed: ML Model Bounds",
    data: generatePrecomputed(),
    trainEnd: null,
    mode: "precomputed",
  },
]

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const forecastControls = [
  { name: "steps", type: "number", label: "Forecast Steps", group: "Forecast",
    default: 15, min: 3, max: 30, step: 1 },
  { name: "confidence", type: "number", label: "Confidence Level", group: "Forecast",
    default: 0.95, min: 0.8, max: 0.99, step: 0.01 },
  { name: "forecastColor", type: "color", label: "Forecast Color", group: "Forecast",
    default: "#6366f1" },
  { name: "bandOpacity", type: "number", label: "Envelope Opacity", group: "Forecast",
    default: 0.15, min: 0.05, max: 0.4, step: 0.05 },
  { name: "trainDasharray", type: "select", label: "Training Dash", group: "Forecast",
    default: "8,4", options: ["8,4", "6,3", "12,4", "4,4", "none"] },
  { name: "forecastDasharray", type: "select", label: "Forecast Dash", group: "Forecast",
    default: "4,4", options: ["4,4", "3,3", "6,2", "2,6", "none"] },
]

const anomalyControls = [
  { name: "enableAnomaly", type: "boolean", label: "Enable Anomaly Detection", group: "Anomaly",
    default: true },
  { name: "threshold", type: "number", label: "Threshold (σ)", group: "Anomaly",
    default: 2, min: 0.5, max: 4, step: 0.25 },
  { name: "showBand", type: "boolean", label: "Show Band", group: "Anomaly",
    default: true },
  { name: "bandColor", type: "color", label: "Band Color", group: "Anomaly",
    default: "#6366f1" },
  { name: "anomalyColor", type: "color", label: "Anomaly Dot Color", group: "Anomaly",
    default: "#ef4444" },
  { name: "anomalyRadius", type: "number", label: "Anomaly Dot Radius", group: "Anomaly",
    default: 6, min: 3, max: 15, step: 1 },
]

const chartControls = [
  { name: "lineWidth", type: "number", label: "Line Width", group: "Line",
    default: 2, min: 1, max: 6, step: 0.5 },
  { name: "showPoints", type: "boolean", label: "Show Points", group: "Line",
    default: false },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: true },
  { name: "curve", type: "select", label: "Curve", group: "Line",
    default: "monotoneX", options: ["linear", "monotoneX", "step", "basis", "cardinal"] },
]

const allControls = [...forecastControls, ...anomalyControls, ...chartControls]

// ---------------------------------------------------------------------------
// Code generator
// ---------------------------------------------------------------------------

function generateCode(values, datasetLabel, isPrecomputed) {
  let code = `import { LineChart } from "semiotic"\n\n`

  if (isPrecomputed) {
    code += `// Pre-computed: data includes segment flags and bounds from your ML model\n`
    code += `const data = [\n`
    code += `  { time: 0, value: 30, isTraining: true, upperBounds: 38, lowerBounds: 22 },\n`
    code += `  { time: 1, value: 32, isTraining: true, upperBounds: 39, lowerBounds: 23, isAnomaly: true },\n`
    code += `  // ... observed points (isTraining: false, isForecast: false)\n`
    code += `  { time: 70, value: 45, isForecast: true, upperBounds: 55, lowerBounds: 35 },\n`
    code += `  // ...\n`
    code += `]\n\n`
  } else {
    code += `// ${datasetLabel}\n`
    code += `const data = [...] // ${datasetLabel}\n\n`
  }

  code += `<LineChart\n`
  code += `  data={data}\n`
  code += `  xAccessor="time"\n`
  code += `  yAccessor="value"\n`

  if (values.lineWidth !== 2) code += `  lineWidth={${values.lineWidth}}\n`
  if (values.showPoints) code += `  showPoints\n`
  if (values.showGrid) code += `  showGrid\n`
  if (values.curve !== "monotoneX") code += `  curve="${values.curve}"\n`

  if (isPrecomputed) {
    // Pre-computed forecast prop
    const props = [
      `isTraining: "isTraining"`,
      `isForecast: "isForecast"`,
      `isAnomaly: "isAnomaly"`,
      `upperBounds: "upperBounds"`,
      `lowerBounds: "lowerBounds"`,
    ]
    if (values.forecastColor !== "#6366f1") props.push(`color: "${values.forecastColor}"`)
    if (values.bandOpacity !== 0.15) props.push(`bandOpacity: ${values.bandOpacity}`)
    if (values.anomalyColor !== "#ef4444") props.push(`anomalyColor: "${values.anomalyColor}"`)
    if (values.anomalyRadius !== 6) props.push(`anomalyRadius: ${values.anomalyRadius}`)
    if (values.trainDasharray !== "8,4") props.push(`trainDasharray: "${values.trainDasharray}"`)
    if (values.forecastDasharray !== "4,4") props.push(`forecastDasharray: "${values.forecastDasharray}"`)

    code += `  forecast={{\n`
    code += props.map(p => `    ${p},`).join("\n") + "\n"
    code += `  }}\n`
  } else {
    // Auto forecast prop
    const forecastProps = [`trainEnd: ${values.trainEnd}`]
    if (values.steps !== 15) forecastProps.push(`steps: ${values.steps}`)
    if (values.confidence !== 0.95) forecastProps.push(`confidence: ${values.confidence}`)
    if (values.forecastColor !== "#6366f1") forecastProps.push(`color: "${values.forecastColor}"`)
    if (values.bandOpacity !== 0.15) forecastProps.push(`bandOpacity: ${values.bandOpacity}`)
    if (values.trainDasharray !== "8,4") forecastProps.push(`trainDasharray: "${values.trainDasharray}"`)
    if (values.forecastDasharray !== "4,4") forecastProps.push(`forecastDasharray: "${values.forecastDasharray}"`)

    code += `  forecast={{\n`
    code += forecastProps.map(p => `    ${p},`).join("\n") + "\n"
    code += `  }}\n`

    // Anomaly prop (only auto mode)
    if (values.enableAnomaly) {
      const anomalyProps = []
      if (values.threshold !== 2) anomalyProps.push(`threshold: ${values.threshold}`)
      if (!values.showBand) anomalyProps.push(`showBand: false`)
      if (values.bandColor !== "#6366f1") anomalyProps.push(`bandColor: "${values.bandColor}"`)
      if (values.anomalyColor !== "#ef4444") anomalyProps.push(`anomalyColor: "${values.anomalyColor}"`)
      if (values.anomalyRadius !== 6) anomalyProps.push(`anomalyRadius: ${values.anomalyRadius}`)

      if (anomalyProps.length === 0) {
        code += `  anomaly={{}}\n`
      } else {
        code += `  anomaly={{\n`
        code += anomalyProps.map(p => `    ${p},`).join("\n") + "\n"
        code += `  }}\n`
      }
    }
  }

  code += `/>`
  return code
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForecastPlayground() {
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(null)
  const vizRef = useRef(null)

  const dataset = datasets[datasetIndex]

  const [values, setValues] = useState(() => {
    const d = {}
    for (const c of allControls) d[c.name] = c.default
    d.trainEnd = datasets[0].trainEnd
    return d
  })

  const defaults = useMemo(() => {
    const d = {}
    for (const c of allControls) d[c.name] = c.default
    return d
  }, [])

  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setValues(() => {
      const d = {}
      for (const c of allControls) d[c.name] = c.default
      d.trainEnd = dataset.trainEnd
      return d
    })
  }, [dataset])

  const handleDatasetChange = useCallback((e) => {
    const idx = parseInt(e.target.value, 10)
    setDatasetIndex(idx)
    setValues((prev) => ({ ...prev, trainEnd: datasets[idx].trainEnd }))
  }, [])

  const chartWidth = containerWidth || 700
  const chartHeight = 420

  const isPrecomputed = dataset.mode === "precomputed"

  const forecastConfig = isPrecomputed
    ? {
        isTraining: "isTraining",
        isForecast: "isForecast",
        isAnomaly: "isAnomaly",
        upperBounds: "upperBounds",
        lowerBounds: "lowerBounds",
        color: values.forecastColor,
        bandOpacity: values.bandOpacity,
        anomalyColor: values.anomalyColor,
        anomalyRadius: values.anomalyRadius,
        trainDasharray: values.trainDasharray === "none" ? undefined : values.trainDasharray,
        forecastDasharray: values.forecastDasharray === "none" ? undefined : values.forecastDasharray,
      }
    : {
        trainEnd: dataset.trainEnd,
        steps: values.steps,
        confidence: values.confidence,
        color: values.forecastColor,
        bandOpacity: values.bandOpacity,
        trainDasharray: values.trainDasharray === "none" ? undefined : values.trainDasharray,
        forecastDasharray: values.forecastDasharray === "none" ? undefined : values.forecastDasharray,
      }

  const anomalyConfig = !isPrecomputed && values.enableAnomaly ? {
    threshold: values.threshold,
    showBand: values.showBand,
    bandColor: values.bandColor,
    anomalyColor: values.anomalyColor,
    anomalyRadius: values.anomalyRadius,
  } : undefined

  const code = generateCode({ ...values, trainEnd: dataset.trainEnd }, dataset.label, isPrecomputed)

  return (
    <PageLayout
      title="Forecast & Anomaly Detection Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Forecast & Anomaly", path: "/playground/forecast" },
      ]}
      prevPage={{ title: "Statistical Annotations Playground", path: "/playground/statistical-annotations" }}
    >
      <p>
        The <code>forecast</code> prop on LineChart provides built-in statistical
        overlays. The line splits into three visual segments:
        {" "}<strong>training</strong> (dashed),{" "}
        <strong>observed</strong> (solid), and{" "}
        <strong>forecast</strong> (dotted with confidence envelope).
      </p>
      <p>
        <strong>Auto mode</strong> computes regression from training data and
        extrapolates. <strong>Pre-computed mode</strong> reads segment flags and
        bounds from your data — use this when bounds come from an ML model. The
        envelope follows per-point upper/lower bounds (non-rectilinear), and
        anomalous points are flagged via an <code>isAnomaly</code> field.
      </p>

      {/* Dataset picker */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-dataset">Dataset:</label>
        <select
          id="pg-dataset"
          className="playground-select"
          value={datasetIndex}
          onChange={handleDatasetChange}
        >
          {datasets.map((ds, i) => (
            <option key={i} value={i}>{ds.label}</option>
          ))}
        </select>

        <span style={{ marginLeft: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          {isPrecomputed
            ? `Pre-computed bounds · ${dataset.data.length} points`
            : `Train/Forecast split at x=${dataset.trainEnd} · ${dataset.data.length} points`}
        </span>
      </div>

      {/* Chart */}
      <div ref={vizRef} className="playground-chart-container">
        {containerWidth ? (
          <LineChart
            key={`forecast-${datasetIndex}-${values.curve}-${values.trainDasharray}-${values.forecastDasharray}`}
            data={dataset.data}
            xAccessor="time"
            yAccessor="value"
            width={chartWidth}
            height={chartHeight}
            lineWidth={values.lineWidth}
            showPoints={values.showPoints}
            showGrid={values.showGrid}
            curve={values.curve}
            xLabel="Time"
            yLabel="Value"
            forecast={forecastConfig}
            anomaly={anomalyConfig}
          />
        ) : null}
      </div>

      {/* Controls */}
      <PropControls
        controls={allControls}
        values={values}
        onChange={handleChange}
        onReset={handleReset}
      />

      {/* Generated code */}
      <h2 id="generated-code">Generated Code</h2>
      <CodeBlock code={code} language="jsx" />
    </PageLayout>
  )
}
