import React, { useEffect, useState } from "react"
import { FlowMap, resolveReferenceGeography } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — international airports with real coordinates
// ---------------------------------------------------------------------------

const airports = [
  { id: "SFO", name: "San Francisco", lon: -122.375, lat: 37.619 },
  { id: "JFK", name: "New York JFK", lon: -73.779, lat: 40.640 },
  { id: "ORD", name: "Chicago O'Hare", lon: -87.905, lat: 41.978 },
  { id: "LAX", name: "Los Angeles", lon: -118.408, lat: 33.943 },
  { id: "ATL", name: "Atlanta", lon: -84.428, lat: 33.637 },
  { id: "DFW", name: "Dallas/Fort Worth", lon: -97.038, lat: 32.897 },
  { id: "DEN", name: "Denver", lon: -104.673, lat: 39.856 },
  { id: "SEA", name: "Seattle", lon: -122.309, lat: 47.449 },
  { id: "LHR", name: "London Heathrow", lon: -0.461, lat: 51.470 },
  { id: "CDG", name: "Paris CDG", lon: 2.550, lat: 49.013 },
  { id: "NRT", name: "Tokyo Narita", lon: 140.386, lat: 35.772 },
  { id: "DXB", name: "Dubai", lon: 55.364, lat: 25.253 },
  { id: "SIN", name: "Singapore Changi", lon: 103.994, lat: 1.350 },
  { id: "HKG", name: "Hong Kong", lon: 113.915, lat: 22.309 },
  { id: "SYD", name: "Sydney", lon: 151.177, lat: -33.946 },
  { id: "GRU", name: "São Paulo", lon: -46.473, lat: -23.432 },
]

const internationalFlights = [
  { source: "JFK", target: "LHR", passengers: 18000 },
  { source: "LAX", target: "NRT", passengers: 14000 },
  { source: "SFO", target: "HKG", passengers: 9500 },
  { source: "JFK", target: "CDG", passengers: 12000 },
  { source: "LHR", target: "DXB", passengers: 16000 },
  { source: "DXB", target: "SIN", passengers: 13000 },
  { source: "SIN", target: "SYD", passengers: 8500 },
  { source: "LHR", target: "JFK", passengers: 17000 },
  { source: "NRT", target: "SIN", passengers: 7200 },
  { source: "HKG", target: "SYD", passengers: 6800 },
  { source: "CDG", target: "DXB", passengers: 9000 },
  { source: "JFK", target: "GRU", passengers: 7500 },
  { source: "LHR", target: "SIN", passengers: 11000 },
  { source: "LAX", target: "SYD", passengers: 6500 },
  { source: "SFO", target: "NRT", passengers: 10000 },
  { source: "ORD", target: "LHR", passengers: 8800 },
]

const domesticFlights = [
  { source: "SFO", target: "JFK", passengers: 12000 },
  { source: "SFO", target: "ORD", passengers: 8500 },
  { source: "LAX", target: "JFK", passengers: 15000 },
  { source: "LAX", target: "ATL", passengers: 6000 },
  { source: "ORD", target: "ATL", passengers: 9200 },
  { source: "ORD", target: "DFW", passengers: 7100 },
  { source: "DFW", target: "JFK", passengers: 5400 },
  { source: "SEA", target: "SFO", passengers: 4800 },
  { source: "DEN", target: "ORD", passengers: 6300 },
  { source: "ATL", target: "JFK", passengers: 11000 },
]

const tradeNodes = [
  { id: "Shanghai", lon: 121.474, lat: 31.230 },
  { id: "Rotterdam", lon: 4.480, lat: 51.924 },
  { id: "Singapore", lon: 103.851, lat: 1.290 },
  { id: "Los Angeles", lon: -118.243, lat: 34.052 },
  { id: "Dubai", lon: 55.296, lat: 25.276 },
  { id: "Hamburg", lon: 9.993, lat: 53.551 },
  { id: "Busan", lon: 129.076, lat: 35.180 },
  { id: "Mumbai", lon: 72.878, lat: 19.076 },
]

const tradeFlows = [
  { source: "Shanghai", target: "Los Angeles", value: 85 },
  { source: "Shanghai", target: "Rotterdam", value: 72 },
  { source: "Singapore", target: "Rotterdam", value: 45 },
  { source: "Dubai", target: "Rotterdam", value: 38 },
  { source: "Shanghai", target: "Singapore", value: 55 },
  { source: "Busan", target: "Los Angeles", value: 42 },
  { source: "Shanghai", target: "Hamburg", value: 35 },
  { source: "Mumbai", target: "Dubai", value: 28 },
  { source: "Singapore", target: "Mumbai", value: 22 },
]

// ---------------------------------------------------------------------------
// Loading style
// ---------------------------------------------------------------------------

const loadingStyle = {
  background: "var(--surface-1)",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-secondary)",
}

// ---------------------------------------------------------------------------
// Streaming demo — push flows incrementally
// ---------------------------------------------------------------------------

const streamingFlowCode = `import { useState, useEffect } from "react"
import { FlowMap, resolveReferenceGeography } from "semiotic/geo"

const airports = [
  { id: "JFK", name: "New York JFK", lon: -73.779, lat: 40.640 },
  { id: "LHR", name: "London Heathrow", lon: -0.461, lat: 51.470 },
  { id: "NRT", name: "Tokyo Narita", lon: 140.386, lat: 35.772 },
  // ...more airports
]

const flights = [
  { source: "JFK", target: "LHR", passengers: 18000 },
  { source: "LAX", target: "NRT", passengers: 14000 },
  // ...more routes
]

function StreamingFlowMap() {
  const [areas, setAreas] = useState(null)
  const [flows, setFlows] = useState([])

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setAreas)
  }, [])

  useEffect(() => {
    if (!areas) return
    let i = 0
    const id = setInterval(() => {
      if (i < flights.length) {
        setFlows(prev => [...prev, flights[i]])
        i++
      } else clearInterval(id)
    }, 500)
    return () => clearInterval(id)
  }, [areas])

  if (!areas) return <div>Loading...</div>

  return (
    <FlowMap
      nodes={airports}
      flows={flows}
      areas={areas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      valueAccessor="passengers"
      edgeColorBy="source"
      showParticles
      particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.5 }}
      tooltip
      width={600}
      height={400}
    />
  )
}`

function StreamingFlowDemo({ width }) {
  const [areas, setAreas] = useState(null)
  const [flows, setFlows] = useState([])

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(setAreas)
  }, [])

  useEffect(() => {
    if (!areas) return
    let i = 0
    const id = setInterval(() => {
      if (i < internationalFlights.length) {
        const flow = internationalFlights[i]
        setFlows(prev => [...prev, flow])
        i++
      } else {
        clearInterval(id)
      }
    }, 500)
    return () => clearInterval(id)
  }, [areas])

  if (!areas) {
    return <div style={{ ...loadingStyle, width, height: 400 }}>Loading world map...</div>
  }

  return (
    <FlowMap
      nodes={airports}
      flows={flows}
      areas={areas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      valueAccessor="passengers"
      edgeColorBy="source"
      showParticles
      particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.5 }}
      tooltip
      width={width}
      height={400}
    />
  )
}

// ---------------------------------------------------------------------------
// World FlowMap wrapper — loads basemap asynchronously
// ---------------------------------------------------------------------------

function WorldFlowMap({ width = 700, height = 400, ...props }) {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={{ ...loadingStyle, width, height }}>Loading world map...</div>

  return (
    <FlowMap
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      width={width}
      height={height}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Domestic US FlowMap wrapper — loads basemap asynchronously
// ---------------------------------------------------------------------------

function DomesticFlowMap({ width = 600, height = 400, ...props }) {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={{ ...loadingStyle, width, height }}>Loading world map...</div>

  return (
    <FlowMap
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      width={width}
      height={height}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const flowMapProps = [
  { name: "nodes", type: "array", required: true, default: null, description: "Array of node objects with geographic coordinates." },
  { name: "flows", type: "array", required: true, default: null, description: "Array of flow objects with source, target, and optional value fields." },
  { name: "nodeIdAccessor", type: "string", required: false, default: '"id"', description: "Field name to identify nodes." },
  { name: "xAccessor", type: "string | function", required: false, default: '"lon"', description: "Longitude accessor." },
  { name: "yAccessor", type: "string | function", required: false, default: '"lat"', description: "Latitude accessor." },
  { name: "valueAccessor", type: "string", required: false, default: '"value"', description: "Field on flows for edge width scaling." },
  { name: "edgeWidthRange", type: "[number, number]", required: false, default: "[1, 8]", description: "Min and max edge stroke width." },
  { name: "lineType", type: '"geo" | "line"', required: false, default: '"geo"', description: '"geo" for great-circle arcs, "line" for straight lines.' },
  { name: "flowStyle", type: '"basic" | "offset" | "arc"', required: false, default: '"basic"', description: 'Flow rendering style. "basic" draws straight or great-circle lines. "offset" shifts bidirectional flows apart so A\u2192B and B\u2192A don\'t overlap. "arc" renders curved arcs that bulge perpendicular to the flow direction.' },
  { name: "edgeColorBy", type: "string | function", required: false, default: null, description: "Field or function for edge color." },
  { name: "edgeOpacity", type: "number", required: false, default: "0.6", description: "Opacity applied to flow lines." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme for edges." },
  { name: "projection", type: "string | object | function", required: false, default: '"equalEarth"', description: "Map projection." },
  { name: "areas", type: "GeoJSON.Feature[]", required: false, default: null, description: "Optional background geography (e.g. from resolveReferenceGeography)." },
  { name: "areaStyle", type: "object", required: false, default: null, description: "Style object applied to background geography areas." },
  { name: "zoomable", type: "boolean", required: false, default: "true with tileURL, false otherwise", description: "Enable pan and zoom interaction on the map. Defaults to true when tileURL is set." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Tooltip configuration." },
  { name: "showLegend", type: "boolean", required: false, default: "false", description: "Show a legend." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height." },
  { name: "showParticles", type: "boolean", required: false, default: "false", description: "Animate dots flowing along each route to convey directionality." },
  { name: "particleStyle", type: "object", required: false, default: null, description: "Particle appearance: { radius, color, opacity, speedMultiplier, maxPerLine, spawnRate }. Set color to \"source\" to inherit each line's stroke." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamGeoFrame props." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlowMapPage() {
  return (
    <PageLayout
      title="FlowMap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Geo Charts", path: "/charts" },
        { label: "FlowMap", path: "/charts/flow-map" },
      ]}
      prevPage={{ title: "Proportional Symbol Map", path: "/charts/proportional-symbol-map" }}
      nextPage={{ title: "Distance Cartogram", path: "/charts/distance-cartogram" }}
    >
      <ComponentMeta
        componentName="FlowMap"
        importStatement='import { FlowMap, resolveReferenceGeography } from "semiotic/geo"'
        tier="charts"
        wraps="StreamGeoFrame"
        wrapsPath="/frames/geo-frame"
        related={[
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
          { name: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
          { name: "StreamGeoFrame", path: "/frames/geo-frame" },
        ]}
      />

      <p>
        FlowMap visualizes directed flows between geographic locations. Nodes
        sit at real-world coordinates; edges connect them with lines whose width
        encodes flow magnitude. Choose between great-circle arcs or straight
        lines. Add a world basemap via <code>resolveReferenceGeography</code> for
        geographic context.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide <code>nodes</code> (with lon/lat) and <code>flows</code> (with
        source, target, value). Load a world basemap asynchronously with{" "}
        <code>resolveReferenceGeography("world-110m")</code> and pass the
        resolved features as <code>areas</code>. Edges auto-resolve their
        endpoints from the node list.
      </p>

      <StreamingToggle
        staticContent={
          <>
            <WorldFlowMap
              nodes={airports}
              flows={internationalFlights}
              nodeIdAccessor="id"
              valueAccessor="passengers"
              tooltip={true}
              projection="equalEarth"
              title="Major International Flight Routes"
            />

            <CodeBlock
              code={`import { FlowMap, resolveReferenceGeography } from "semiotic/geo"

function WorldFlowMap() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div>Loading world map...</div>

  return (
    <FlowMap
      nodes={[
        { id: "JFK", name: "New York JFK", lon: -73.779, lat: 40.640 },
        { id: "LHR", name: "London Heathrow", lon: -0.461, lat: 51.470 },
        { id: "NRT", name: "Tokyo Narita", lon: 140.386, lat: 35.772 },
        // ...more airports
      ]}
      flows={[
        { source: "JFK", target: "LHR", passengers: 18000 },
        { source: "LAX", target: "NRT", passengers: 14000 },
        // ...more routes
      ]}
      areas={worldAreas}
      areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
      valueAccessor="passengers"
      tooltip
    />
  )
}`}
              language="jsx"
            />
          </>
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingFlowDemo width={w} />}
            code={streamingFlowCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="domestic-routes">US Domestic Routes</h3>
      <p>
        The same component works at any scale. Here we show US domestic flights
        with the world basemap providing geographic context. Set{" "}
        <code>zoomable</code> to enable pan and zoom on non-tile maps.
      </p>

      <DomesticFlowMap
        nodes={airports.filter(a => !["LHR","CDG","NRT","DXB","SIN","HKG","SYD","GRU"].includes(a.id))}
        flows={domesticFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        projection="albersUsa"
        tooltip={true}
        title="US Domestic Flight Routes"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={usAirports}
  flows={domesticFlights}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  valueAccessor="passengers"
  projection="albersUsa"
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="colored-edges">Colored Edges</h3>
      <p>
        Use <code>edgeColorBy</code> to color flows by a field, such as the
        source airport. With a world basemap, patterns in hub connectivity
        become immediately visible.
      </p>

      <WorldFlowMap
        nodes={airports}
        flows={internationalFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        edgeColorBy="source"
        showLegend={true}
        tooltip={true}
        title="Routes Colored by Origin Hub"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={airports}
  flows={flights}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  valueAccessor="passengers"
  edgeColorBy="source"
  showLegend
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="straight-lines">Straight Lines</h3>
      <p>
        Set <code>lineType="line"</code> for straight connections instead of
        great-circle arcs. This can be useful for schematic maps where
        geographic accuracy is less important than clarity.
      </p>

      <WorldFlowMap
        nodes={airports}
        flows={internationalFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        lineType="line"
        tooltip={true}
        title="Straight-Line Flight Routes"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={airports}
  flows={flights}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  valueAccessor="passengers"
  lineType="line"
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="global-trade">Global Trade Routes</h3>
      <p>
        FlowMap handles worldwide data with the default Equal Earth projection.
        Great-circle arcs naturally follow the shortest path on the globe. Here
        we show major container shipping routes between world ports.
      </p>

      <WorldFlowMap
        nodes={tradeNodes}
        flows={tradeFlows}
        nodeIdAccessor="id"
        lineType="geo"
        edgeOpacity={0.7}
        edgeColorBy="source"
        showLegend={true}
        tooltip={true}
        projection="equalEarth"
        title="Global Container Shipping Routes"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={[
    { id: "Shanghai", lon: 121.474, lat: 31.230 },
    { id: "Rotterdam", lon: 4.480, lat: 51.924 },
    { id: "Singapore", lon: 103.851, lat: 1.290 },
    // ...more ports
  ]}
  flows={[
    { source: "Shanghai", target: "Los Angeles", value: 85 },
    { source: "Shanghai", target: "Rotterdam", value: 72 },
    // ...more routes
  ]}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  edgeColorBy="source"
  showLegend
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="particles">Animated Particles</h3>
      <p>
        Add <code>showParticles</code> to animate dots flowing along each
        route, conveying directionality and volume. Customize appearance
        with <code>particleStyle</code> — set <code>color</code> to{" "}
        <code>"source"</code> to inherit each line's stroke color.
      </p>

      <WorldFlowMap
        nodes={airports}
        flows={internationalFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        edgeColorBy="source"
        edgeOpacity={0.5}
        showParticles
        particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.5 }}
        tooltip={true}
        title="Flight Routes with Animated Particles"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={airports}
  flows={flights}
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }}
  valueAccessor="passengers"
  edgeColorBy="source"
  edgeOpacity={0.5}
  showParticles
  particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.5 }}
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="arc-style">Arc Flow Style</h3>
      <p>
        Set <code>flowStyle="arc"</code> to render curved arcs that bulge
        perpendicular to the flow direction. This makes overlapping routes
        easier to distinguish and adds a visual sense of motion. Particles
        follow the arc path automatically.
      </p>

      <WorldFlowMap
        nodes={airports}
        flows={internationalFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        edgeColorBy="source"
        flowStyle="arc"
        showParticles
        particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.2 }}
        tooltip={true}
        title="Arc-Style Flight Routes"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={airports}
  flows={flights}
  areas={worldAreas}
  valueAccessor="passengers"
  edgeColorBy="source"
  flowStyle="arc"
  showParticles
  particleStyle={{ radius: 2, color: "source", speedMultiplier: 1.2 }}
  tooltip
/>`}
        language="jsx"
      />

      <h3 id="offset-style">Offset Flow Style (Bidirectional)</h3>
      <p>
        Set <code>flowStyle="offset"</code> to draw each flow slightly offset
        from the direct centerline between its source and target. This
        separation makes overlapping routes easier to distinguish, especially
        when traffic exists in both directions (e.g. JFK&rarr;LHR and
        LHR&rarr;JFK).
      </p>

      <WorldFlowMap
        nodes={airports}
        flows={internationalFlights}
        nodeIdAccessor="id"
        valueAccessor="passengers"
        edgeColorBy="source"
        flowStyle="offset"
        tooltip={true}
        title="Offset Bidirectional Routes"
      />

      <CodeBlock
        code={`<FlowMap
  nodes={airports}
  flows={flights}
  areas={worldAreas}
  valueAccessor="passengers"
  edgeColorBy="source"
  flowStyle="offset"
  tooltip
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="FlowMap" props={flowMapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For streaming flows, animated particles, or custom line rendering,
        use{" "}
        <Link to="/frames/geo-frame">StreamGeoFrame</Link> directly.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { FlowMap, resolveReferenceGeography }
  from "semiotic/geo"

const [areas, setAreas] = useState(null)
useEffect(() => {
  resolveReferenceGeography("world-110m")
    .then(setAreas)
    .catch(err => console.error(
      "Failed to load world map:", err))
}, [])

<FlowMap
  nodes={airports}
  flows={flights}
  areas={areas}
  areaStyle={{ fill: "#f0f0f0",
    stroke: "#ccc", strokeWidth: 0.5 }}
  valueAccessor="passengers"
  lineType="geo"
  tooltip
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamGeoFrame,
  resolveReferenceGeography }
  from "semiotic/geo"

<StreamGeoFrame
  projection="equalEarth"
  areas={worldAreas}
  areaStyle={{ fill: "#f0f0f0",
    stroke: "#ccc" }}
  points={airports}
  lines={flowsWithCoordinates}
  lineDataAccessor="coordinates"
  lineType="geo"
  xAccessor="lon"
  yAccessor="lat"
  lineStyle={(d) => ({
    stroke: colorScale(d.source),
    strokeWidth: widthScale(d.value),
    strokeOpacity: 0.6,
  })}
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
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> — abstract flow
          visualization without geography
        </li>
        <li>
          <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link> — sized
          symbols without edges
        </li>
        <li>
          <Link to="/charts/distance-cartogram">DistanceCartogram</Link> — distort
          geography by cost
        </li>
        <li>
          <Link to="/frames/geo-frame">StreamGeoFrame</Link> — the underlying
          Frame
        </li>
      </ul>
    </PageLayout>
  )
}
