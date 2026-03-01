import React, { useState, useEffect, useRef, useCallback } from "react"
import PageLayout from "./PageLayout"
import PropControls from "./PropControls"
import CodeBlock from "./CodeBlock"
import { propertyToString } from "./LiveExample"

/**
 * Orchestrator for playground pages.
 * Owns knob state, renders chart, controls, and generated code.
 *
 * Props:
 *   title           - Page title
 *   breadcrumbs     - Array of { label, path }
 *   prevPage        - { title, path }
 *   nextPage        - { title, path }
 *   chartComponent  - React component (e.g. LineChart)
 *   componentName   - String name for code generation
 *   controls        - Schema array for PropControls
 *   datasets        - [{ label, data, codeString }]
 *   dataProps       - Function: (dataset) => object of data-related props
 *   mapProps        - Optional: (name, value) => transformed value (return undefined to skip)
 *   children        - Optional description content
 */
export default function PlaygroundLayout({
  title,
  breadcrumbs,
  prevPage,
  nextPage,
  chartComponent: ChartComponent,
  componentName,
  controls,
  datasets,
  dataProps,
  mapProps,
  children,
}) {
  // Build defaults from control schema
  const defaults = {}
  for (const c of controls) {
    defaults[c.name] = c.default
  }

  const [values, setValues] = useState(defaults)
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(null)
  const vizRef = useRef(null)

  // ResizeObserver for responsive chart width
  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
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

  // Build chart props from current knob values
  const currentDataset = datasets[datasetIndex]
  const chartDataProps = dataProps
    ? dataProps(currentDataset)
    : { data: currentDataset.data }

  const chartProps = { ...chartDataProps }
  for (const c of controls) {
    let v = values[c.name]
    // Only pass prop if it has a meaningful value
    if (c.type === "string" && v === "") continue
    // Allow per-page value transformation
    if (mapProps) {
      v = mapProps(c.name, v)
      if (v === undefined) continue
    }
    chartProps[c.name] = v
  }

  // Apply responsive width
  if (containerWidth) {
    chartProps.width = containerWidth
  }

  // Generate code string
  const code = generateCode(componentName, controls, values, defaults, currentDataset)

  return (
    <PageLayout
      title={title}
      breadcrumbs={breadcrumbs}
      prevPage={prevPage}
      nextPage={nextPage}
    >
      {children}

      {/* Dataset picker */}
      {datasets.length > 1 && (
        <div className="playground-dataset-picker">
          <label htmlFor="pg-dataset">Dataset:</label>
          <select
            id="pg-dataset"
            className="playground-select"
            value={datasetIndex}
            onChange={(e) => setDatasetIndex(parseInt(e.target.value, 10))}
          >
            {datasets.map((ds, i) => (
              <option key={i} value={i}>
                {ds.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chart preview */}
      <div ref={vizRef} className="playground-chart-container">
        {containerWidth ? <ChartComponent {...chartProps} /> : null}
      </div>

      {/* Controls */}
      <PropControls
        controls={controls}
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

function generateCode(componentName, controls, values, defaults, dataset) {
  let code = `import { ${componentName} } from "semiotic"\n\n`
  code += `const data = ${dataset.codeString || "[\n  // your data here\n]"}\n\n`
  code += `<${componentName}\n`

  // For network charts use nodes={...} edges={...}, otherwise data={data}
  if (dataset.nodes) {
    code += `  nodes={nodes}\n`
    code += `  edges={edges}\n`
  } else {
    code += `  data={data}\n`
  }

  for (const c of controls) {
    const v = values[c.name]
    // Skip defaults to keep output clean
    if (v === defaults[c.name]) continue
    // Skip empty strings
    if (c.type === "string" && v === "") continue

    const propStr = formatPropValue(c, v)
    code += `  ${c.name}=${propStr}\n`
  }

  code += `/>`
  return code
}

function formatPropValue(control, value) {
  if (control.type === "string") {
    return `"${value}"`
  }
  if (control.type === "select") {
    return `"${value}"`
  }
  if (control.type === "boolean") {
    return `{${value}}`
  }
  if (control.type === "number") {
    return `{${value}}`
  }
  if (control.type === "color") {
    return `"${value}"`
  }
  return `{${propertyToString(value, 0, false)}}`
}
