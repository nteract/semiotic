import React, { useState, useEffect } from "react"
import { ProportionalSymbolMap, resolveReferenceGeography } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — major world cities with real coordinates and population
// ---------------------------------------------------------------------------

const cityData = [
  { id: "tokyo", name: "Tokyo", lon: 139.7, lat: 35.7, population: 37400000, region: "Asia" },
  { id: "delhi", name: "Delhi", lon: 77.1, lat: 28.7, population: 30291000, region: "Asia" },
  { id: "shanghai", name: "Shanghai", lon: 121.5, lat: 31.2, population: 27058000, region: "Asia" },
  { id: "saopaulo", name: "São Paulo", lon: -46.6, lat: -23.5, population: 22043000, region: "South America" },
  { id: "mexico", name: "Mexico City", lon: -99.1, lat: 19.4, population: 21782000, region: "North America" },
  { id: "cairo", name: "Cairo", lon: 31.2, lat: 30.0, population: 20901000, region: "Africa" },
  { id: "mumbai", name: "Mumbai", lon: 72.9, lat: 19.1, population: 20411000, region: "Asia" },
  { id: "beijing", name: "Beijing", lon: 116.4, lat: 39.9, population: 20384000, region: "Asia" },
  { id: "dhaka", name: "Dhaka", lon: 90.4, lat: 23.8, population: 21006000, region: "Asia" },
  { id: "osaka", name: "Osaka", lon: 135.5, lat: 34.7, population: 19281000, region: "Asia" },
  { id: "nyc", name: "New York", lon: -74.0, lat: 40.7, population: 18819000, region: "North America" },
  { id: "karachi", name: "Karachi", lon: 67.0, lat: 24.9, population: 16094000, region: "Asia" },
  { id: "lagos", name: "Lagos", lon: 3.4, lat: 6.5, population: 15279000, region: "Africa" },
  { id: "istanbul", name: "Istanbul", lon: 29.0, lat: 41.0, population: 15190000, region: "Europe" },
  { id: "buenos", name: "Buenos Aires", lon: -58.4, lat: -34.6, population: 15024000, region: "South America" },
  { id: "london", name: "London", lon: -0.1, lat: 51.5, population: 9541000, region: "Europe" },
  { id: "paris", name: "Paris", lon: 2.3, lat: 48.9, population: 11020000, region: "Europe" },
  { id: "moscow", name: "Moscow", lon: 37.6, lat: 55.8, population: 12538000, region: "Europe" },
  { id: "sydney", name: "Sydney", lon: 151.2, lat: -33.9, population: 5312000, region: "Oceania" },
  { id: "nairobi", name: "Nairobi", lon: 36.8, lat: -1.3, population: 4735000, region: "Africa" },
]

// ---------------------------------------------------------------------------
// World map wrapper — loads basemap asynchronously
// ---------------------------------------------------------------------------

function WorldSymbolMap({ width = 600, height = 400, ...props }) {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={{ width, height, background: "var(--surface-1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>Loading world map...</div>

  return (
    <ProportionalSymbolMap
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      width={width}
      height={height}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Streaming demo — cities appearing one by one with graduated symbols
// ---------------------------------------------------------------------------

const streamingSymbolCode = `import { useState, useEffect } from "react"
import { ProportionalSymbolMap, resolveReferenceGeography } from "semiotic/geo"

const allCities = [
  { name: "Tokyo", lon: 139.7, lat: 35.7, population: 37400000, region: "Asia" },
  { name: "Delhi", lon: 77.1, lat: 28.7, population: 30291000, region: "Asia" },
  { name: "São Paulo", lon: -46.6, lat: -23.5, population: 22043000, region: "South America" },
  // ...more cities
]

function StreamingSymbolMap() {
  const [worldAreas, setWorldAreas] = useState(null)
  const [points, setPoints] = useState([])

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setWorldAreas)
  }, [])

  // Add one city at a time
  useEffect(() => {
    if (!worldAreas) return
    let idx = 0
    const id = setInterval(() => {
      if (idx < allCities.length) {
        setPoints(prev => [...prev, allCities[idx]])
        idx++
      } else {
        // Reset and start over
        setPoints([])
        idx = 0
      }
    }, 600)
    return () => clearInterval(id)
  }, [worldAreas])

  if (!worldAreas) return null

  return (
    <ProportionalSymbolMap
      points={points}
      sizeBy="population"
      colorBy="region"
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      showLegend
      tooltip
    />
  )
}`

function StreamingSymbolDemo({ width }) {
  const [worldAreas, setWorldAreas] = useState(null)
  const [points, setPoints] = useState([])

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setWorldAreas)
  }, [])

  useEffect(() => {
    if (!worldAreas) return
    let idx = 0
    const id = setInterval(() => {
      if (idx < cityData.length) {
        setPoints(prev => [...prev, cityData[idx]])
        idx++
      } else {
        setPoints([])
        idx = 0
      }
    }, 600)
    return () => clearInterval(id)
  }, [worldAreas])

  if (!worldAreas) return <div style={{ width, height: 450, background: "var(--surface-1)", borderRadius: 8 }} />

  return (
    <ProportionalSymbolMap
      points={points}
      xAccessor="lon"
      yAccessor="lat"
      sizeBy="population"
      sizeRange={[3, 30]}
      colorBy="region"
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      showLegend
      tooltip
      width={width}
      height={450}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const proportionalSymbolMapProps = [
  { name: "points", type: "array", required: true, default: null, description: "Array of data objects with geographic coordinates." },
  { name: "xAccessor", type: "string | function", required: false, default: '"lon"', description: "Longitude accessor." },
  { name: "yAccessor", type: "string | function", required: false, default: '"lat"', description: "Latitude accessor." },
  { name: "sizeBy", type: "string | function", required: true, default: null, description: "Field name or function to determine circle size." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[3, 30]", description: "Min and max circle radius." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine circle color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "projection", type: "string | object | function", required: false, default: '"equalEarth"', description: "Map projection." },
  { name: "areas", type: "GeoJSON.Feature[]", required: false, default: null, description: "Optional background geography (country/state boundaries)." },
  { name: "areaStyle", type: "object", required: false, default: '{ fill: "#f0f0f0", stroke: "#ccc" }', description: "Style for background areas." },
  { name: "zoomable", type: "boolean", required: false, default: "true with tileURL, false otherwise", description: "Enable pan and zoom on the map. Defaults to true when tileURL is set." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Tooltip configuration." },
  { name: "showLegend", type: "boolean", required: false, default: "false", description: "Show a color legend." },
  { name: "legendInteraction", type: '"none" | "highlight" | "isolate"', required: false, default: '"none"', description: "Legend interaction mode." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "selection", type: "object", required: false, default: null, description: "Selection config for LinkedCharts." },
  { name: "linkedHover", type: "object", required: false, default: null, description: "Linked hover config for cross-chart highlighting." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamGeoFrame props." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProportionalSymbolMapPage() {
  return (
    <PageLayout
      title="ProportionalSymbolMap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Geo Charts", path: "/charts" },
        { label: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
      ]}
      prevPage={{ title: "Choropleth Map", path: "/charts/choropleth-map" }}
      nextPage={{ title: "Flow Map", path: "/charts/flow-map" }}
    >
      <ComponentMeta
        componentName="ProportionalSymbolMap"
        importStatement='import { ProportionalSymbolMap, resolveReferenceGeography } from "semiotic/geo"'
        tier="charts"
        wraps="StreamGeoFrame"
        wrapsPath="/frames/geo-frame"
        related={[
          { name: "ChoroplethMap", path: "/charts/choropleth-map" },
          { name: "FlowMap", path: "/charts/flow-map" },
          { name: "BubbleChart", path: "/charts/bubble-chart" },
        ]}
      />

      <p>
        ProportionalSymbolMap places sized circles at geographic coordinates,
        encoding a numeric value as circle area. Optionally color circles by
        category and overlay them on a real-world basemap. Think of it as a
        geographic BubbleChart.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Load a world basemap with <code>resolveReferenceGeography</code>, then
        pass your city data as <code>points</code> with a <code>sizeBy</code>{" "}
        accessor. Circles scale automatically by population.
      </p>

      <StreamingToggle
        staticContent={
          <WorldSymbolMap
            points={cityData}
            xAccessor="lon"
            yAccessor="lat"
            sizeBy="population"
            tooltip={true}
            width={700}
            height={450}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingSymbolDemo width={w} />}
            code={streamingSymbolCode}
          />
        }
      />

      <CodeBlock
        code={`import { useState, useEffect } from "react"
import { ProportionalSymbolMap, resolveReferenceGeography } from "semiotic/geo"

const cities = [
  { name: "Tokyo", lon: 139.7, lat: 35.7, population: 37400000, region: "Asia" },
  { name: "Delhi", lon: 77.1, lat: 28.7, population: 30291000, region: "Asia" },
  { name: "São Paulo", lon: -46.6, lat: -23.5, population: 22043000, region: "South America" },
  // ...more cities with lon, lat, population
]

function WorldSymbolMap() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div>Loading world map...</div>

  return (
    <ProportionalSymbolMap
      points={cities}
      sizeBy="population"
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      tooltip
    />
  )
}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="colored">Color by Region</h3>
      <p>
        Add <code>colorBy</code> to color circles by a categorical field like
        continent or region. Enable <code>showLegend</code> to display the
        color key.
      </p>

      <WorldSymbolMap
        points={cityData}
        xAccessor="lon"
        yAccessor="lat"
        sizeBy="population"
        colorBy="region"
        showLegend={true}
        tooltip={true}
        width={700}
        height={450}
      />

      <CodeBlock
        code={`<ProportionalSymbolMap
  points={cities}
  sizeBy="population"
  colorBy="region"
  showLegend
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="size-range">Custom Size Range</h3>
      <p>
        Adjust <code>sizeRange</code> to control the minimum and maximum
        circle radii. Larger ranges make population differences more dramatic.
      </p>

      <WorldSymbolMap
        points={cityData}
        xAccessor="lon"
        yAccessor="lat"
        sizeBy="population"
        sizeRange={[5, 45]}
        colorBy="region"
        tooltip={true}
        width={700}
        height={450}
      />

      <CodeBlock
        code={`<ProportionalSymbolMap
  points={cities}
  sizeBy="population"
  sizeRange={[5, 45]}
  colorBy="region"
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="custom-tooltip">Custom Tooltip</h3>
      <p>
        Pass a function to <code>tooltip</code> for fully custom hover content.
      </p>

      <WorldSymbolMap
        points={cityData}
        xAccessor="lon"
        yAccessor="lat"
        sizeBy="population"
        colorBy="region"
        tooltip={(d) => (
          <div style={{ padding: 4 }}>
            <strong>{d.name}</strong>
            <br />
            Pop: {(d.population / 1e6).toFixed(1)}M
          </div>
        )}
        width={700}
        height={450}
      />

      <CodeBlock
        code={`<ProportionalSymbolMap
  points={cities}
  sizeBy="population"
  colorBy="region"
  tooltip={(d) => (
    <div>
      <strong>{d.name}</strong><br />
      Pop: {(d.population / 1e6).toFixed(1)}M
    </div>
  )}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ProportionalSymbolMap" props={proportionalSymbolMapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        Graduate to{" "}
        <Link to="/frames/geo-frame">StreamGeoFrame</Link> when you need
        mixed areas + points, streaming data, or custom renderers.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { ProportionalSymbolMap,
  resolveReferenceGeography } from "semiotic/geo"

// Load world basemap first
const worldAreas = await resolveReferenceGeography("world-110m")

<ProportionalSymbolMap
  points={cities}
  sizeBy="population"
  colorBy="region"
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  showLegend
  tooltip
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamGeoFrame,
  resolveReferenceGeography } from "semiotic/geo"

const worldAreas = await resolveReferenceGeography("world-110m")

<StreamGeoFrame
  projection="equalEarth"
  areas={worldAreas}
  points={cities}
  xAccessor="lon"
  yAccessor="lat"
  areaStyle={() => ({
    fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5,
  })}
  pointStyle={(d) => ({
    fill: colorScale(d.region),
    r: sizeScale(d.population),
    stroke: "#fff",
  })}
  enableHover
  size={[700, 450]}
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
          <Link to="/charts/choropleth-map">ChoroplethMap</Link> — color
          regions by value instead of placing symbols
        </li>
        <li>
          <Link to="/charts/flow-map">FlowMap</Link> — show connections
          between geographic points
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> — similar sized
          circles in abstract (non-geographic) space
        </li>
        <li>
          <Link to="/frames/geo-frame">StreamGeoFrame</Link> — the underlying
          Frame with full control
        </li>
      </ul>
    </PageLayout>
  )
}
