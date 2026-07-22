import React, { useState, useEffect, useRef, useCallback } from "react"
import { toConfig, fromConfig, toURL, fromURL, copyConfig } from "semiotic"
import PageLayout from "./PageLayout"
import PropControls from "./PropControls"
import CodeBlock from "./CodeBlock"
import { propertyToString } from "./LiveExample"
import PlaygroundDiagnostics from "./PlaygroundDiagnostics"

// Build a serializable ChartConfig from the current knob-derived props.
// Returns null when the component isn't in the serialization registry
// (some playgrounds wrap composite/streaming demos) so callers can hide
// the share affordances rather than throw. `toConfig` already strips
// functions, React nodes, and (with includeData:false) data arrays.
function buildConfig(componentName, props, { includeData }) {
  try {
    return toConfig(componentName, props, { includeData })
  } catch {
    return null
  }
}

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
  const [copied, setCopied] = useState(null)
  const vizRef = useRef(null)
  // Skip the URL-write effect until the mount-time restore has run, so a
  // restored permalink isn't immediately overwritten by default state.
  const restoredRef = useRef(false)

  // ── Permalink restore (mount) ──────────────────────────────────────────
  // Read ?sc= (serialized config) and ?ds= (dataset index) and rehydrate the
  // playground. The config round-trips through the library's own
  // fromURL/fromConfig, mapping serialized props back onto the knobs they
  // came from. Unknown/malformed configs are ignored — a bad link degrades to
  // defaults rather than crashing.
  useEffect(() => {
    if (typeof window === "undefined") {
      restoredRef.current = true
      return
    }
    const search = window.location.search
    try {
      if (search.includes("sc=")) {
        const { props } = fromConfig(fromURL(search))
        const restored = {}
        for (const c of controls) {
          if (props[c.name] !== undefined) restored[c.name] = props[c.name]
        }
        if (Object.keys(restored).length > 0) {
          setValues((prev) => ({ ...prev, ...restored }))
        }
      }
      const params = new URLSearchParams(search)
      const ds = params.get("ds")
      if (ds !== null) {
        const i = parseInt(ds, 10)
        if (Number.isInteger(i) && i >= 0 && i < datasets.length) setDatasetIndex(i)
      }
    } catch {
      /* malformed permalink — fall back to defaults */
    }
    restoredRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    // Handle nested propPath (e.g. ["sizeRange", 0] sets chartProps.sizeRange[0])
    if (c.propPath) {
      const [prop, index] = c.propPath
      if (!chartProps[prop]) chartProps[prop] = []
      chartProps[prop][index] = v
    } else {
      chartProps[c.name] = v
    }
  }

  // `chartProps` is now the clean, serializable prop set (knob values + data
  // accessors). The measured container width is a preview-only concern, so it
  // rides on a separate `renderProps` and never leaks into the shared config.
  const renderProps = containerWidth ? { ...chartProps, width: containerWidth } : chartProps

  // Generate code string
  const code = generateCode(componentName, controls, values, defaults, currentDataset)

  // Serializable config for the share affordances. URL excludes data (the
  // dataset picker restores it via ?ds=) to keep links short; the JSON export
  // includes data so the copied artifact is self-contained and runnable.
  const urlConfig = buildConfig(componentName, chartProps, { includeData: false })
  const shareable = urlConfig !== null

  // ── Permalink write (on knob / dataset change) ─────────────────────────
  // Only diverge the URL from its clean form once the state is non-default, so
  // a fresh visit keeps a tidy address bar and a reset clears the query.
  const isDefaultState =
    datasetIndex === 0 && controls.every((c) => values[c.name] === defaults[c.name])
  useEffect(() => {
    if (!restoredRef.current || typeof window === "undefined") return
    try {
      if (isDefaultState || !urlConfig) {
        window.history.replaceState(null, "", window.location.pathname)
      } else {
        const sc = toURL(urlConfig) // "sc=<encoded>"
        window.history.replaceState(null, "", `${window.location.pathname}?${sc}&ds=${datasetIndex}`)
      }
    } catch {
      /* never let a share-state write break the page */
    }
    // urlConfig is recomputed each render; key the effect off its serialized form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), datasetIndex])

  const handleCopy = useCallback(
    async (kind) => {
      if (typeof window === "undefined") return
      try {
        if (kind === "link") {
          const sc = toURL(buildConfig(componentName, chartProps, { includeData: false }))
          const url = `${window.location.origin}${window.location.pathname}?${sc}&ds=${datasetIndex}`
          await navigator.clipboard.writeText(url)
        } else {
          await copyConfig(buildConfig(componentName, chartProps, { includeData: true }), "json")
        }
        setCopied(kind)
        setTimeout(() => setCopied(null), 2000)
      } catch {
        /* clipboard denied or non-serializable — no-op */
      }
    },
    [componentName, chartProps, datasetIndex]
  )

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
        {containerWidth ? (
          <ChartComponent
            key={`chart-hover-${values.enableHover}`}
            {...renderProps}
          />
        ) : null}
      </div>

      <PlaygroundDiagnostics
        componentName={componentName}
        chartProps={chartProps}
      />

      {/* Controls */}
      <PropControls
        controls={controls}
        values={values}
        onChange={handleChange}
        onReset={handleReset}
      />

      {/* Generated code */}
      <h2 id="generated-code">Generated Code</h2>
      {shareable && (
        <div className="playground-share-toolbar" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" className="playground-share-button" onClick={() => handleCopy("link")}>
            {copied === "link" ? "Link copied!" : "Copy link"}
          </button>
          <button type="button" className="playground-share-button" onClick={() => handleCopy("config")}>
            {copied === "config" ? "Config copied!" : "Copy config (JSON)"}
          </button>
          <span className="playground-share-hint" style={{ alignSelf: "center", fontSize: "0.85em", color: "var(--text-secondary)" }}>
            The link restores this exact configuration; the config is a portable
            <code> ChartConfig</code> artifact.
          </span>
        </div>
      )}
      <CodeBlock code={code} language="jsx" />
    </PageLayout>
  )
}

function generateCode(componentName, controls, values, defaults, dataset) {
  let code = `import { ${componentName} } from "semiotic"\n\n`

  // Use proper variable names for network vs array data
  if (dataset.nodes || dataset.edges) {
    code += `const edges = ${dataset.codeString || "[\n  // your edges here\n]"}\n\n`
  } else {
    code += `const data = ${dataset.codeString || "[\n  // your data here\n]"}\n\n`
  }

  code += `<${componentName}\n`

  if (dataset.nodes || dataset.edges) {
    if (dataset.nodes) code += `  nodes={nodes}\n`
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
