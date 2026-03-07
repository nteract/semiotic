import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { ConnectedScatterplot } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const countryTrajectory = Array.from({ length: 25 }, (_, i) => ({
  x: 20 + i * 4 + Math.sin(i * 0.4) * 8,
  y: 55 + i * 1.8 + Math.cos(i * 0.5) * 6 + (Math.random() - 0.5) * 3,
  year: 2000 + i,
}))

const spiral = Array.from({ length: 40 }, (_, i) => {
  const t = i * 0.25
  return {
    x: Math.cos(t) * (30 + i * 2.5) + 80,
    y: Math.sin(t) * (30 + i * 2.5) + 80,
    step: i,
  }
})

const climate = Array.from({ length: 30 }, (_, i) => ({
  x: 280 + i * 1.5 + (Math.random() - 0.5) * 3,
  y: 13.5 + i * 0.05 + Math.sin(i * 0.8) * 0.3,
  year: 1990 + i,
}))

const datasets = [
  { label: "Country Development (25 pts)", data: countryTrajectory, xLabel: "GDP per capita", yLabel: "Life Expectancy", orderAccessor: "year", orderLabel: "Year" },
  { label: "Spiral (40 pts)", data: spiral, xLabel: "X", yLabel: "Y", orderAccessor: "step", orderLabel: "Step" },
  { label: "Climate (30 pts)", data: climate, xLabel: "CO₂ (ppm)", yLabel: "Temperature (°C)", orderAccessor: "year", orderLabel: "Year" },
]

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const controls = [
  { name: "pointRadius", type: "number", label: "Point Radius", group: "Points",
    default: 4, min: 2, max: 12, step: 1 },
  { name: "showGrid", type: "boolean", label: "Show Grid", group: "Layout",
    default: true },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConnectedScatterplotPlayground() {
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(null)
  const vizRef = useRef(null)

  const dataset = datasets[datasetIndex]

  const defaults = {}
  for (const c of controls) defaults[c.name] = c.default

  const [values, setValues] = useState(defaults)

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
    setValues(defaults)
  }, [])

  const chartWidth = containerWidth || 600
  const chartHeight = 450

  const code = generateCode(values, defaults, dataset)

  return (
    <PageLayout
      title="Connected Scatterplot Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Connected Scatterplot", path: "/playground/connected-scatterplot" },
      ]}
      prevPage={{ title: "Scatterplot Playground", path: "/playground/scatterplot" }}
    >
      <p>
        Points connected in sequence, colored with viridis from start (purple)
        to end (yellow). Line width matches point radius. White halo appears
        under lines when fewer than 100 points.
      </p>

      <div className="playground-dataset-picker">
        <label htmlFor="pg-dataset">Dataset:</label>
        <select
          id="pg-dataset"
          className="playground-select"
          value={datasetIndex}
          onChange={(e) => setDatasetIndex(parseInt(e.target.value, 10))}
        >
          {datasets.map((ds, i) => (
            <option key={i} value={i}>{ds.label}</option>
          ))}
        </select>
      </div>

      <div ref={vizRef} className="playground-chart-container">
        {containerWidth ? (
          <ConnectedScatterplot
            key={`cs-${datasetIndex}-${values.enableHover}`}
            data={dataset.data}
            xAccessor="x"
            yAccessor="y"
            orderAccessor={dataset.orderAccessor}
            orderLabel={dataset.orderLabel}
            pointRadius={values.pointRadius}
            showGrid={values.showGrid}
            enableHover={values.enableHover}
            xLabel={dataset.xLabel}
            yLabel={dataset.yLabel}
            width={chartWidth}
            height={chartHeight}
          />
        ) : null}
      </div>

      <PropControls
        controls={controls}
        values={values}
        onChange={handleChange}
        onReset={handleReset}
      />

      <h2 id="generated-code">Generated Code</h2>
      <CodeBlock code={code} language="jsx" />
    </PageLayout>
  )
}

function generateCode(values, defaults, dataset) {
  let code = `import { ConnectedScatterplot } from "semiotic"\n\n`
  code += `const data = [...] // ${dataset.label}\n\n`
  code += `<ConnectedScatterplot\n`
  code += `  data={data}\n`
  code += `  xAccessor="x"\n`
  code += `  yAccessor="y"\n`
  if (dataset.orderAccessor) code += `  orderAccessor="${dataset.orderAccessor}"\n`
  if (dataset.orderLabel) code += `  orderLabel="${dataset.orderLabel}"\n`
  if (values.pointRadius !== 4) code += `  pointRadius={${values.pointRadius}}\n`
  if (values.showGrid) code += `  showGrid\n`
  if (!values.enableHover) code += `  enableHover={false}\n`
  code += `  xLabel="${dataset.xLabel}"\n`
  code += `  yLabel="${dataset.yLabel}"\n`
  code += `/>`
  return code
}
