import React, { useState, useRef, useEffect, useCallback } from "react"
import { Scatterplot, StreamXYFrame } from "semiotic"
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
        Experiment with LOESS smoothing and streaming anomaly detection
        annotations. Adjust the controls below each chart to see how the
        parameters affect the visualization, then copy the generated code.
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
    </PageLayout>
  )
}
