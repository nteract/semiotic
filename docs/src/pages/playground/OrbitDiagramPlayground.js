import React, { useState, useRef, useEffect, useCallback } from "react"
import { OrbitDiagram } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

const orgData = {
  name: "CEO", children: [
    { name: "Engineering", children: [
      { name: "Frontend", children: [
        { name: "L3" }, { name: "L3" }, { name: "L4" }, { name: "L5" }, { name: "L4" }, { name: "L3" }
      ]},
      { name: "Backend", children: [
        { name: "L3" }, { name: "L4" }, { name: "L4" }, { name: "L5" }
      ]},
      { name: "Infra", children: [{ name: "L5" }, { name: "L6" }] },
      { name: "Data", children: [
        { name: "L3" }, { name: "L3" }, { name: "L4" }, { name: "L5" }, { name: "L7" }
      ]}
    ]},
    { name: "Design", children: [
      { name: "Product", children: [{ name: "L3" }, { name: "L4" }, { name: "L4" }] },
      { name: "Brand", children: [{ name: "L2" }] }
    ]},
    { name: "Sales", children: [
      { name: "Enterprise", children: [{ name: "L1" }, { name: "L1" }, { name: "L2" }, { name: "L2" }, { name: "L3" }] },
      { name: "SMB", children: [{ name: "L1" }, { name: "L1" }, { name: "L1" }, { name: "L2" }] },
      { name: "Partners" }
    ]},
    { name: "Marketing", children: [
      { name: "Content", children: [{ name: "L2" }, { name: "L3" }] },
      { name: "Growth", children: [{ name: "L3" }, { name: "L4" }, { name: "L3" }] }
    ]},
  ]
}

const solarSystem = {
  name: "Sun", children: [
    { name: "Mercury" }, { name: "Venus" },
    { name: "Earth", children: [{ name: "Moon" }] },
    { name: "Mars", children: [{ name: "Phobos" }, { name: "Deimos" }] },
    { name: "Jupiter", children: [{ name: "Io" }, { name: "Europa" }, { name: "Ganymede" }, { name: "Callisto" }] },
    { name: "Saturn", children: [{ name: "Titan" }, { name: "Enceladus" }, { name: "Rhea" }] },
    { name: "Uranus" }, { name: "Neptune" },
  ]
}

const atomData = {
  name: "Nucleus", children: Array.from({ length: 18 }, (_, i) => ({
    name: `e${i + 1}`,
  }))
}

const datasets = [
  { label: "Organization Chart", data: orgData },
  { label: "Solar System", data: solarSystem },
  { label: "Atom (18 electrons)", data: atomData },
]

const controls = [
  { name: "orbitMode", type: "select", label: "Orbit Mode", group: "Layout",
    default: "flat", options: ["flat", "solar", "atomic"] },
  { name: "speed", type: "number", label: "Speed", group: "Animation",
    default: 0.25, min: 0, max: 2, step: 0.05 },
  { name: "eccentricity", type: "number", label: "Eccentricity", group: "Layout",
    default: 1, min: 0.3, max: 1, step: 0.05 },
  { name: "orbitSize", type: "number", label: "Orbit Size", group: "Layout",
    default: 2.95, min: 1.5, max: 5, step: 0.05 },
  { name: "nodeRadius", type: "number", label: "Node Radius", group: "Nodes",
    default: 6, min: 2, max: 16, step: 1 },
  { name: "showRings", type: "boolean", label: "Show Rings", group: "Display",
    default: true },
  { name: "showLabels", type: "boolean", label: "Show Labels", group: "Display",
    default: true },
  { name: "colorByDepth", type: "boolean", label: "Color By Depth", group: "Display",
    default: true },
  { name: "animated", type: "boolean", label: "Animated", group: "Animation",
    default: true },
]

export default function OrbitDiagramPlayground() {
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(null)
  const vizRef = useRef(null)

  const defaults = {}
  for (const c of controls) defaults[c.name] = c.default
  const [values, setValues] = useState(defaults)

  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const dataset = datasets[datasetIndex]
  const chartSize = Math.min(containerWidth || 600, 600)

  const code = `import { OrbitDiagram } from "semiotic"

<OrbitDiagram
  data={hierarchyData}
  childrenAccessor="children"
  nodeIdAccessor="name"
  orbitMode="${values.orbitMode}"${values.speed !== 0.25 ? `\n  speed={${values.speed}}` : ""}${values.eccentricity !== 1 ? `\n  eccentricity={${values.eccentricity}}` : ""}${values.orbitSize !== 2.95 ? `\n  orbitSize={${values.orbitSize}}` : ""}${values.nodeRadius !== 6 ? `\n  nodeRadius={${values.nodeRadius}}` : ""}${!values.showRings ? "\n  showRings={false}" : ""}${values.showLabels ? "\n  showLabels" : ""}${values.colorByDepth ? "\n  colorByDepth" : ""}${!values.animated ? "\n  animated={false}" : ""}
  width={${chartSize}}
  height={${chartSize}}
/>`

  return (
    <PageLayout
      title="Orbit Diagram Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Orbit Diagram", path: "/playground/orbit-diagram" },
      ]}
      prevPage={{ title: "Connected Scatterplot Playground", path: "/playground/connected-scatterplot" }}
    >
      <p>
        Hierarchical data as animated orbital rings. Children revolve around
        their parent node. Try "solar" mode for one-per-ring or "atomic" for
        electron shell capacities.
      </p>

      <div className="playground-dataset-picker">
        <label htmlFor="pg-dataset">Dataset:</label>
        <select id="pg-dataset" className="playground-select" value={datasetIndex}
          onChange={(e) => setDatasetIndex(parseInt(e.target.value, 10))}>
          {datasets.map((ds, i) => <option key={i} value={i}>{ds.label}</option>)}
        </select>
      </div>

      <div ref={vizRef} className="playground-chart-container" style={{ display: "flex", justifyContent: "center" }}>
        {containerWidth ? (
          <OrbitDiagram
            key={`orbit-${datasetIndex}-${values.orbitMode}-${values.animated}`}
            data={dataset.data}
            childrenAccessor="children"
            nodeIdAccessor="name"
            orbitMode={values.orbitMode}
            speed={values.speed}
            eccentricity={values.eccentricity}
            orbitSize={values.orbitSize}
            nodeRadius={values.nodeRadius}
            showRings={values.showRings}
            showLabels={values.showLabels}
            colorByDepth={values.colorByDepth}
            animated={values.animated}
            width={chartSize}
            height={chartSize}
          />
        ) : null}
      </div>

      <PropControls
        controls={controls}
        values={values}
        onChange={handleChange}
        onReset={() => setValues(defaults)}
      />

      <h2 id="generated-code">Generated Code</h2>
      <CodeBlock code={code} language="jsx" />
    </PageLayout>
  )
}
