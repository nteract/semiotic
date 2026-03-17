import React, { useEffect, useState } from "react"
import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — country GDP per capita keyed by ISO 3166 numeric ID
// (matches world-atlas country IDs)
// ---------------------------------------------------------------------------

const countryGDP = [
  { id: "840", name: "United States", gdpPerCapita: 63544 },
  { id: "156", name: "China", gdpPerCapita: 12556 },
  { id: "392", name: "Japan", gdpPerCapita: 39313 },
  { id: "276", name: "Germany", gdpPerCapita: 51204 },
  { id: "826", name: "United Kingdom", gdpPerCapita: 46510 },
  { id: "356", name: "India", gdpPerCapita: 2277 },
  { id: "250", name: "France", gdpPerCapita: 43519 },
  { id: "380", name: "Italy", gdpPerCapita: 34997 },
  { id: "076", name: "Brazil", gdpPerCapita: 8918 },
  { id: "124", name: "Canada", gdpPerCapita: 52051 },
  { id: "410", name: "South Korea", gdpPerCapita: 34801 },
  { id: "643", name: "Russia", gdpPerCapita: 12173 },
  { id: "036", name: "Australia", gdpPerCapita: 51812 },
  { id: "724", name: "Spain", gdpPerCapita: 30104 },
  { id: "484", name: "Mexico", gdpPerCapita: 10046 },
  { id: "360", name: "Indonesia", gdpPerCapita: 4292 },
  { id: "528", name: "Netherlands", gdpPerCapita: 57768 },
  { id: "756", name: "Switzerland", gdpPerCapita: 93720 },
  { id: "682", name: "Saudi Arabia", gdpPerCapita: 27680 },
  { id: "792", name: "Turkey", gdpPerCapita: 9327 },
  { id: "752", name: "Sweden", gdpPerCapita: 55566 },
  { id: "616", name: "Poland", gdpPerCapita: 17840 },
  { id: "578", name: "Norway", gdpPerCapita: 89090 },
  { id: "566", name: "Nigeria", gdpPerCapita: 2066 },
  { id: "032", name: "Argentina", gdpPerCapita: 10636 },
  { id: "710", name: "South Africa", gdpPerCapita: 6994 },
  { id: "764", name: "Thailand", gdpPerCapita: 7066 },
  { id: "818", name: "Egypt", gdpPerCapita: 3699 },
  { id: "586", name: "Pakistan", gdpPerCapita: 1505 },
  { id: "704", name: "Vietnam", gdpPerCapita: 3694 },
]

// ---------------------------------------------------------------------------
// World map with data — resolved at render time
// ---------------------------------------------------------------------------

function WorldChoropleth({ colorScheme = "viridis", graticule = false, width = 700, height = 450, tooltip = true, ...rest }) {
  const [areas, setAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      const enriched = mergeData(features, countryGDP, {
        featureKey: "id",
        dataKey: "id"
      })
      setAreas(enriched)
    }).catch(err => {
      console.error("Failed to load world map:", err)
    })
  }, [])

  if (!areas) return <div style={{ width, height, background: "var(--surface-1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>Loading world map...</div>

  return (
    <ChoroplethMap
      areas={areas}
      valueAccessor="gdpPerCapita"
      colorScheme={colorScheme}
      graticule={graticule}
      projection="equalEarth"
      tooltip={tooltip}
      width={width}
      height={height}
      {...rest}
    />
  )
}

// ---------------------------------------------------------------------------
// Streaming demo — countries updating values over time (simulated live data)
// ---------------------------------------------------------------------------

// Subset of country IDs that will receive streaming updates
const streamingCountryIds = countryGDP.map(c => c.id)

const streamingChoroplethCode = `import { useState, useEffect } from "react"
import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"

function StreamingChoropleth() {
  const [areas, setAreas] = useState(null)
  const [liveData, setLiveData] = useState({})

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setAreas)
  }, [])

  // Simulate live data arriving — a random country gets a new value each tick
  useEffect(() => {
    if (!areas) return
    const id = setInterval(() => {
      setLiveData(prev => {
        const countryId = countryIds[Math.floor(Math.random() * countryIds.length)]
        return { ...prev, [countryId]: Math.random() * 100 }
      })
    }, 300)
    return () => clearInterval(id)
  }, [areas])

  if (!areas) return null

  // Merge live values into features
  const liveRows = Object.entries(liveData).map(([id, value]) => ({ id, value }))
  const enriched = mergeData(areas, liveRows, { featureKey: "id", dataKey: "id" })

  return (
    <ChoroplethMap
      areas={enriched}
      valueAccessor="value"
      colorScheme="viridis"
      projection="equalEarth"
      tooltip
    />
  )
}`

function StreamingChoroplethDemo({ width }) {
  const [baseAreas, setBaseAreas] = useState(null)
  const [liveData, setLiveData] = useState({})

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setBaseAreas)
  }, [])

  // Simulate live data — a random country gets a new value each tick
  useEffect(() => {
    if (!baseAreas) return
    const id = setInterval(() => {
      setLiveData(prev => {
        const countryId = streamingCountryIds[Math.floor(Math.random() * streamingCountryIds.length)]
        return { ...prev, [countryId]: Math.random() * 100 }
      })
    }, 300)
    return () => clearInterval(id)
  }, [baseAreas])

  if (!baseAreas) return <div style={{ width, height: 400, background: "var(--surface-1)", borderRadius: 8 }} />

  const liveRows = Object.entries(liveData).map(([id, value]) => ({ id, value }))
  const enriched = mergeData(baseAreas, liveRows, { featureKey: "id", dataKey: "id" })

  return (
    <ChoroplethMap
      areas={enriched}
      valueAccessor="value"
      colorScheme="viridis"
      projection="equalEarth"
      tooltip
      width={width}
      height={400}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const choroplethMapProps = [
  { name: "areas", type: 'GeoJSON.Feature[] | "world-110m" | "world-50m" | "land-110m" | "land-50m"', required: true, default: null, description: "GeoJSON features or a reference string. Reference strings load built-in Natural Earth data via dynamic import." },
  { name: "valueAccessor", type: "string | function", required: true, default: null, description: "Field name or function to extract the numeric value for color encoding from each feature's properties." },
  { name: "colorScheme", type: '"blues" | "reds" | "greens" | "viridis"', required: false, default: '"blues"', description: "Sequential color scheme for the choropleth fill." },
  { name: "projection", type: "string | object | function", required: false, default: '"equalEarth"', description: 'Projection name ("mercator", "equalEarth", "naturalEarth", etc.), config object, or d3 projection function.' },
  { name: "projectionExtent", type: "[[number, number], [number, number]]", required: false, default: null, description: "Geographic bounding box [[west, south], [east, north]] to constrain the projection fit." },
  { name: "graticule", type: "boolean | object", required: false, default: "false", description: "Show a latitude/longitude grid. Pass true or a config { step, stroke, strokeWidth }." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Tooltip configuration. true for default, function for custom render, or config object." },
  { name: "showLegend", type: "boolean", required: false, default: "true", description: "Show a color legend." },
  { name: "legendInteraction", type: '"none" | "highlight" | "isolate"', required: false, default: '"none"', description: "How legend items interact with the chart on hover/click." },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects to overlay on the map." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 10, bottom: 10, left: 10, right: 10 }", description: "Margin around the chart area." },
  { name: "selection", type: "object", required: false, default: null, description: "Selection config for LinkedCharts integration." },
  { name: "linkedHover", type: "object", required: false, default: null, description: "Linked hover config for cross-chart highlighting." },
  { name: "onObservation", type: "function", required: false, default: null, description: "Callback for chart observation events (hover, click)." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamGeoFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChoroplethMapPage() {
  return (
    <PageLayout
      title="ChoroplethMap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Geo Charts", path: "/charts" },
        { label: "ChoroplethMap", path: "/charts/choropleth-map" },
      ]}
      prevPage={{ title: "Orbit Diagram", path: "/charts/orbit-diagram" }}
      nextPage={{ title: "Proportional Symbol Map", path: "/charts/proportional-symbol-map" }}
    >
      <ComponentMeta
        componentName="ChoroplethMap"
        importStatement='import { ChoroplethMap } from "semiotic/geo"'
        tier="charts"
        wraps="StreamGeoFrame"
        wrapsPath="/frames/geo-frame"
        related={[
          { name: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
          { name: "FlowMap", path: "/charts/flow-map" },
          { name: "StreamGeoFrame", path: "/frames/geo-frame" },
        ]}
      />

      <p>
        ChoroplethMap colors geographic regions by a data value, producing
        the classic thematic map. Pass <code>"world-110m"</code> as the{" "}
        <code>areas</code> prop to load a built-in world map, or bring your
        own GeoJSON. Join external data via <code>mergeData</code> and get
        automatic projection fitting, sequential color encoding, and hover
        tooltips.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start — world map */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The fastest way to a world choropleth: use the built-in{" "}
        <code>"world-110m"</code> reference, join your data by ISO country
        ID, and point <code>valueAccessor</code> at the merged field.
      </p>

      <StreamingToggle
        staticContent={
          <WorldChoropleth colorScheme="viridis" width={700} height={450} />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingChoroplethDemo width={w} />}
            code={streamingChoroplethCode}
          />
        }
      />

      <CodeBlock
        code={`import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"

// 1. Load built-in world map (Natural Earth 110m via topojson-client)
const worldFeatures = await resolveReferenceGeography("world-110m")

// 2. Join your data by ISO 3166 numeric ID
const areas = mergeData(worldFeatures, countryGDP, {
  featureKey: "id",       // world-atlas uses ISO numeric IDs
  dataKey: "id"           // your data's matching key
})

// 3. Render
<ChoroplethMap
  areas={areas}
  valueAccessor="gdpPerCapita"
  colorScheme="viridis"
  projection="equalEarth"
  tooltip
/>`}
        language="jsx"
      />

      <p>
        Or use the string shorthand directly — <code>areas="world-110m"</code>{" "}
        resolves the reference automatically (but won't have your data merged in).
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Reference Geography */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="reference-geography">Reference Geography</h2>

      <p>
        Built-in reference maps use{" "}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
          Natural Earth
        </a>{" "}
        data from the <code>world-atlas</code> npm package, converted from
        TopoJSON to GeoJSON at runtime via <code>topojson-client</code>.
        Results are cached — the conversion only happens once.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Reference</th>
            <th style={{ padding: "8px 12px" }}>Content</th>
            <th style={{ padding: "8px 12px" }}>Size (gzipped)</th>
            <th style={{ padding: "8px 12px" }}>Join Key</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}><code>"world-110m"</code></td>
            <td style={{ padding: "8px 12px" }}>177 countries</td>
            <td style={{ padding: "8px 12px" }}>~24 KB</td>
            <td style={{ padding: "8px 12px" }}><code>id</code> = ISO 3166 numeric</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}><code>"world-50m"</code></td>
            <td style={{ padding: "8px 12px" }}>177 countries (higher detail)</td>
            <td style={{ padding: "8px 12px" }}>~100 KB</td>
            <td style={{ padding: "8px 12px" }}><code>id</code> = ISO 3166 numeric</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}><code>"land-110m"</code></td>
            <td style={{ padding: "8px 12px" }}>Land mass outline</td>
            <td style={{ padding: "8px 12px" }}>~10 KB</td>
            <td style={{ padding: "8px 12px" }}>n/a</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px" }}><code>"land-50m"</code></td>
            <td style={{ padding: "8px 12px" }}>Land mass outline (higher detail)</td>
            <td style={{ padding: "8px 12px" }}>~40 KB</td>
            <td style={{ padding: "8px 12px" }}>n/a</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* mergeData */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="merge-data">Joining Data</h2>

      <p>
        <code>mergeData(features, data, {"{"} featureKey, dataKey {"}"})</code>{" "}
        performs a key-based join — each row in your data array is merged
        into the matching feature's <code>properties</code>. Supports nested
        key paths like <code>"properties.iso_a3"</code>.
      </p>

      <CodeBlock
        code={`import { mergeData, resolveReferenceGeography } from "semiotic/geo"

const world = await resolveReferenceGeography("world-110m")

// Join by ISO 3166 numeric ID (default for world-atlas)
const byNumericId = mergeData(world, data, {
  featureKey: "id",
  dataKey: "country_id"
})

// Or join by country name if your features have it
const byName = mergeData(world, data, {
  featureKey: "properties.name",
  dataKey: "country_name"
})`}
        language="ts"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-schemes">Color Schemes</h3>
      <p>
        Four built-in sequential schemes: <code>"blues"</code>,{" "}
        <code>"reds"</code>, <code>"greens"</code>, and <code>"viridis"</code>.
      </p>

      <WorldChoropleth colorScheme="blues" width={700} height={400} />

      <h3 id="graticule">Graticule Grid</h3>
      <p>
        Enable <code>graticule</code> to overlay a latitude/longitude grid
        for geographic context.
      </p>

      <WorldChoropleth colorScheme="reds" graticule width={700} height={400} />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ChoroplethMap" props={choroplethMapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need full control — custom area styles, mixed points and
        areas, streaming, zoom — graduate to{" "}
        <Link to="/frames/geo-frame">StreamGeoFrame</Link>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { ChoroplethMap } from "semiotic/geo"

<ChoroplethMap
  areas="world-110m"
  valueAccessor="population"
  colorScheme="blues"
  tooltip
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamGeoFrame } from "semiotic/geo"

<StreamGeoFrame
  projection="equalEarth"
  areas={features}
  areaStyle={(d) => ({
    fill: colorScale(d.properties.population),
    stroke: "#fff",
    strokeWidth: 0.5,
  })}
  enableHover
  tooltipContent={(d) => <CustomTooltip data={d} />}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link> — sized
          circles on a map for point data
        </li>
        <li>
          <Link to="/charts/flow-map">FlowMap</Link> — visualize flows between
          geographic locations
        </li>
        <li>
          <Link to="/charts/distance-cartogram">DistanceCartogram</Link> — distort
          geography by cost/distance
        </li>
        <li>
          <Link to="/frames/geo-frame">StreamGeoFrame</Link> — the underlying
          Frame with full control
        </li>
      </ul>
    </PageLayout>
  )
}
