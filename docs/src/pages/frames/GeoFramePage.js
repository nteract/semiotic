import React, { useRef, useEffect, useState } from "react"
import { StreamGeoFrame, resolveReferenceGeography } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Loading style shared across async examples
// ---------------------------------------------------------------------------

const loadingStyle = {
  width: "100%",
  height: 400,
  background: "var(--surface-1)",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-secondary)",
}

// ---------------------------------------------------------------------------
// Sample data — real-world earthquake locations (notable recent events)
// ---------------------------------------------------------------------------

const earthquakes = [
  { id: "eq1", name: "Tohoku, Japan", lon: 142.37, lat: 38.32, magnitude: 9.1 },
  { id: "eq2", name: "Sumatra, Indonesia", lon: 95.98, lat: 3.30, magnitude: 9.1 },
  { id: "eq3", name: "Maule, Chile", lon: -72.90, lat: -35.85, magnitude: 8.8 },
  { id: "eq4", name: "Nepal", lon: 84.73, lat: 28.23, magnitude: 7.8 },
  { id: "eq5", name: "Haiti", lon: -72.53, lat: 18.44, magnitude: 7.0 },
  { id: "eq6", name: "Christchurch, NZ", lon: 172.63, lat: -43.53, magnitude: 6.3 },
  { id: "eq7", name: "L'Aquila, Italy", lon: 13.38, lat: 42.35, magnitude: 6.3 },
  { id: "eq8", name: "Alaska, USA", lon: -150.02, lat: 61.35, magnitude: 7.1 },
  { id: "eq9", name: "Mexico City", lon: -99.17, lat: 19.42, magnitude: 7.1 },
  { id: "eq10", name: "Türkiye–Syria", lon: 37.17, lat: 37.22, magnitude: 7.8 },
  { id: "eq11", name: "Morocco", lon: -8.39, lat: 31.13, magnitude: 6.8 },
  { id: "eq12", name: "Iran–Iraq", lon: 45.96, lat: 34.91, magnitude: 7.3 },
]

const majorFlightRoutes = [
  { source: "eq1", target: "eq8", coordinates: [{ lon: 142.37, lat: 38.32 }, { lon: -150.02, lat: 61.35 }] },
  { source: "eq5", target: "eq9", coordinates: [{ lon: -72.53, lat: 18.44 }, { lon: -99.17, lat: 19.42 }] },
  { source: "eq7", target: "eq10", coordinates: [{ lon: 13.38, lat: 42.35 }, { lon: 37.17, lat: 37.22 }] },
]

// ---------------------------------------------------------------------------
// WorldGeoFrame — wraps StreamGeoFrame with async world map loading
// ---------------------------------------------------------------------------

function WorldGeoFrame({ width = 600, height = 400, ...props }) {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={{ ...loadingStyle, width, height }}>Loading world map...</div>

  return <StreamGeoFrame areas={worldAreas} size={[width, height]} {...props} />
}

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingGeoCode = `import { useRef, useEffect, useState } from "react"
import { StreamGeoFrame, resolveReferenceGeography } from "semiotic/geo"

function StreamingEarthquakes() {
  const chartRef = useRef()
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  useEffect(() => {
    if (!worldAreas) return
    const id = setInterval(() => {
      if (chartRef.current) {
        // Random earthquake-like event along tectonic boundaries
        const zone = Math.random()
        let lon, lat
        if (zone < 0.3) {
          // Pacific Ring of Fire — western Pacific
          lon = 120 + Math.random() * 40
          lat = -10 + Math.random() * 50
        } else if (zone < 0.6) {
          // Pacific Ring of Fire — eastern Pacific
          lon = -170 + Math.random() * 60
          lat = -40 + Math.random() * 70
        } else if (zone < 0.8) {
          // Mediterranean–Himalayan belt
          lon = 10 + Math.random() * 70
          lat = 25 + Math.random() * 20
        } else {
          // Mid-Atlantic Ridge
          lon = -40 + Math.random() * 20
          lat = -30 + Math.random() * 70
        }
        const magnitude = 2 + Math.random() * 7
        chartRef.current.push({ lon, lat, magnitude })
      }
    }, 400)
    return () => clearInterval(id)
  }, [worldAreas])

  if (!worldAreas) return <div>Loading world map...</div>

  return (
    <StreamGeoFrame
      ref={chartRef}
      projection="equalEarth"
      areas={worldAreas}
      xAccessor="lon"
      yAccessor="lat"
      runtimeMode="streaming"
      size={[600, 400]}
      areaStyle={() => ({ fill: "#1a1a2e", stroke: "#333", strokeWidth: 0.5 })}
      pointStyle={(d) => ({
        fill: d.magnitude > 6 ? "#ef4444" : d.magnitude > 4 ? "#f59e0b" : "#6366f1",
        r: Math.max(2, d.magnitude * 0.8),
      })}
      decay={{ type: "exponential", minOpacity: 0.1 }}
      pulse={{ duration: 800, color: "rgba(239,68,68,0.6)", glowRadius: 10 }}
      enableHover
    />
  )
}`

function StreamingGeoDemo({ width }) {
  const chartRef = useRef()
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  useEffect(() => {
    if (!worldAreas) return
    const id = setInterval(() => {
      if (chartRef.current) {
        const zone = Math.random()
        let lon, lat
        if (zone < 0.3) {
          lon = 120 + Math.random() * 40
          lat = -10 + Math.random() * 50
        } else if (zone < 0.6) {
          lon = -170 + Math.random() * 60
          lat = -40 + Math.random() * 70
        } else if (zone < 0.8) {
          lon = 10 + Math.random() * 70
          lat = 25 + Math.random() * 20
        } else {
          lon = -40 + Math.random() * 20
          lat = -30 + Math.random() * 70
        }
        const magnitude = 2 + Math.random() * 7
        chartRef.current.push({ lon, lat, magnitude })
      }
    }, 400)
    return () => clearInterval(id)
  }, [worldAreas])

  if (!worldAreas) return <div style={loadingStyle}>Loading world map...</div>

  return (
    <StreamGeoFrame
      ref={chartRef}
      projection="equalEarth"
      areas={worldAreas}
      xAccessor="lon"
      yAccessor="lat"
      runtimeMode="streaming"
      size={[width, 400]}
      areaStyle={() => ({ fill: "#1a1a2e", stroke: "#333", strokeWidth: 0.5 })}
      pointStyle={(d) => ({
        fill: d.magnitude > 6 ? "#ef4444" : d.magnitude > 4 ? "#f59e0b" : "#6366f1",
        r: Math.max(2, d.magnitude * 0.8),
      })}
      decay={{ type: "exponential", minOpacity: 0.1 }}
      pulse={{ duration: 800, color: "rgba(239,68,68,0.6)", glowRadius: 10 }}
      enableHover
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const geoFrameProps = [
  { name: "projection", type: "string | object | function", required: true, default: null, description: 'Projection: name string ("mercator", "equalEarth", etc.), config object { type, rotate, center }, or d3 projection function.' },
  { name: "projectionExtent", type: "[[number, number], [number, number]]", required: false, default: null, description: "Geographic bounding box to constrain projection fit." },
  { name: "areas", type: "GeoJSON.Feature[]", required: false, default: null, description: "GeoJSON features rendered as filled polygons. Use resolveReferenceGeography() to load built-in basemaps." },
  { name: "points", type: "array", required: false, default: null, description: "Point data with lon/lat coordinates." },
  { name: "lines", type: "array", required: false, default: null, description: "Line data with coordinate arrays." },
  { name: "xAccessor", type: "string | function", required: false, default: '"lon"', description: "Longitude accessor for points." },
  { name: "yAccessor", type: "string | function", required: false, default: '"lat"', description: "Latitude accessor for points." },
  { name: "lineDataAccessor", type: "string | function", required: false, default: null, description: "Accessor to extract coordinate arrays from line objects." },
  { name: "pointIdAccessor", type: "string | function", required: false, default: null, description: "Accessor for point IDs (used by cartogram)." },
  { name: "lineType", type: '"geo" | "line"', required: false, default: '"line"', description: '"geo" renders great-circle arcs; "line" renders straight lines.' },
  { name: "areaStyle", type: "Style | function", required: false, default: null, description: "Style object or function for area features." },
  { name: "pointStyle", type: "function", required: false, default: null, description: "Function returning style + optional r for each point." },
  { name: "lineStyle", type: "Style | function", required: false, default: null, description: "Style for line features." },
  { name: "colorScheme", type: "string | string[]", required: false, default: null, description: "Color scheme." },
  { name: "graticule", type: "boolean | object", required: false, default: "false", description: "Latitude/longitude grid overlay." },
  { name: "zoomable", type: "boolean", required: false, default: "false", description: "Enable mouse/touch zoom and pan on the map." },
  { name: "projectionTransform", type: "DistanceCartogramConfig", required: false, default: null, description: "Distance cartogram transform config: { center, centerAccessor, costAccessor, strength, lineMode }." },
  { name: "size", type: "[number, number]", required: false, default: null, description: "Chart dimensions [width, height]." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins." },
  { name: "background", type: "string", required: false, default: null, description: "Background color." },
  { name: "runtimeMode", type: '"bounded" | "streaming"', required: false, default: '"bounded"', description: "Data mode. Streaming enables push API." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover interaction." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip render function." },
  { name: "customClickBehavior", type: "function", required: false, default: null, description: "Click handler receiving { type, data, x, y }." },
  { name: "customHoverBehavior", type: "function", required: false, default: null, description: "Hover handler receiving { type, data, x, y } or null." },
  { name: "decay", type: "DecayConfig", required: false, default: null, description: "Decay encoding for streaming points: { type, minOpacity }." },
  { name: "pulse", type: "PulseConfig", required: false, default: null, description: "Pulse glow on new data: { duration, color, glowRadius }." },
  { name: "transition", type: "TransitionConfig", required: false, default: null, description: "Animated position transitions: { duration }." },
  { name: "annotations", type: "array", required: false, default: null, description: "Annotation overlay objects." },
  { name: "title", type: "string | ReactNode", required: false, default: null, description: "Chart title." },
  { name: "legend", type: "object", required: false, default: null, description: "Legend configuration (usually set by HOC)." },
  { name: "responsiveWidth", type: "boolean", required: false, default: "false", description: "Auto-resize to container width." },
  { name: "responsiveHeight", type: "boolean", required: false, default: "false", description: "Auto-resize to container height." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeoFramePage() {
  return (
    <PageLayout
      title="StreamGeoFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "StreamGeoFrame", path: "/frames/geo-frame" },
      ]}
      prevPage={{ title: "StreamNetworkFrame", path: "/frames/network-frame" }}
      nextPage={null}
    >
      <ComponentMeta
        componentName="StreamGeoFrame"
        importStatement='import { StreamGeoFrame, resolveReferenceGeography } from "semiotic/geo"'
        tier="frames"
        related={[
          { name: "ChoroplethMap", path: "/charts/choropleth-map" },
          { name: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
          { name: "FlowMap", path: "/charts/flow-map" },
          { name: "DistanceCartogram", path: "/charts/distance-cartogram" },
        ]}
      />

      <p>
        StreamGeoFrame is the foundational frame for all geographic
        visualization. It renders GeoJSON areas, projected points, and
        connecting lines on canvas with d3-geo projections. Use it when the
        HOC charts (ChoroplethMap, FlowMap, etc.) don't expose the control
        you need — custom area styling, mixed data layers, streaming geo
        data, or projection transforms.
      </p>

      <p>
        Use <code>resolveReferenceGeography("world-110m")</code> to load
        built-in world map basemaps asynchronously. The data comes from
        Natural Earth via the <code>world-atlas</code> package and is
        cached after first load.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        At minimum, provide a <code>projection</code> and one data source
        (<code>areas</code>, <code>points</code>, or <code>lines</code>).
        For real-world maps, load areas from{" "}
        <code>resolveReferenceGeography()</code> and overlay your own point
        and line data.
      </p>

      <StreamingToggle
        staticContent={
          <QuickStartExample />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingGeoDemo width={w} />}
            code={streamingGeoCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="mixed-layers">World Map with Earthquakes and Routes</h3>
      <p>
        Combine all three data layers on a real world basemap: areas as
        country boundaries, points as notable earthquake locations, and
        lines as connecting routes. Set <code>zoomable</code> to enable
        mouse/touch zoom and pan.
      </p>

      <MixedLayersExample />

      <h3 id="projections">Projections</h3>
      <p>
        StreamGeoFrame supports six built-in projections: <code>mercator</code>,{" "}
        <code>equalEarth</code>, <code>naturalEarth</code>,{" "}
        <code>equirectangular</code>, <code>orthographic</code>, and{" "}
        <code>albersUsa</code>. You can also pass a d3 projection function or a
        config object. Here the world map is shown with an orthographic
        (globe) projection.
      </p>

      <ProjectionsExample />

      <h3 id="graticule">Graticule</h3>
      <p>
        Enable <code>graticule</code> to render a latitude/longitude grid.
        The graticule is non-interactive and renders behind all data layers.
        Earthquake locations are plotted on top.
      </p>

      <GraticuleExample />

      {/* ----------------------------------------------------------------- */}
      {/* Push API */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="push-api">Push API (Streaming)</h2>

      <p>
        Set <code>runtimeMode="streaming"</code> and use the ref to push data
        incrementally. Combine with <code>decay</code> and <code>pulse</code>{" "}
        for realtime geographic visualization. The streaming demo above
        simulates earthquake events along real tectonic plate boundaries.
      </p>

      <CodeBlock
        code={`import { useRef, useEffect, useState } from "react"
import { StreamGeoFrame, resolveReferenceGeography } from "semiotic/geo"

function StreamingMap() {
  const chartRef = useRef()
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  useEffect(() => {
    if (!worldAreas) return
    const ws = new WebSocket("wss://events.example.com/earthquakes")
    ws.onmessage = (e) => {
      const { lon, lat, magnitude } = JSON.parse(e.data)
      chartRef.current?.push({ lon, lat, magnitude })
    }
    return () => ws.close()
  }, [worldAreas])

  if (!worldAreas) return <div>Loading world map...</div>

  return (
    <StreamGeoFrame
      ref={chartRef}
      projection="equalEarth"
      areas={worldAreas}
      xAccessor="lon"
      yAccessor="lat"
      runtimeMode="streaming"
      pointStyle={(d) => ({
        fill: d.magnitude > 5 ? "#ef4444" : "#6366f1",
        r: Math.max(2, d.magnitude),
      })}
      decay={{ type: "exponential", minOpacity: 0.05 }}
      pulse={{ duration: 1000, color: "rgba(239,68,68,0.6)" }}
      size={[800, 500]}
    />
  )
}`}
        language="jsx"
      />

      <p>
        <strong>Ref methods:</strong>
      </p>
      <ul>
        <li><code>ref.current.push(datum)</code> — push one point</li>
        <li><code>ref.current.pushMany(data)</code> — push an array of points</li>
        <li><code>ref.current.clear()</code> — clear all data</li>
        <li><code>ref.current.getProjection()</code> — get the d3 projection</li>
        <li><code>ref.current.getGeoPath()</code> — get the d3 geoPath generator</li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Reference Geography */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="reference-geography">Reference Geography</h2>

      <p>
        The <code>resolveReferenceGeography</code> function loads built-in
        map data asynchronously and caches the result. Available references:
      </p>

      <ul>
        <li><code>"world-110m"</code> — 110m resolution world countries (~108KB)</li>
        <li><code>"world-50m"</code> — 50m resolution world countries (~540KB)</li>
        <li><code>"land-110m"</code> — 110m land mass (no country boundaries)</li>
        <li><code>"land-50m"</code> — 50m land mass</li>
      </ul>

      <CodeBlock
        code={`import { resolveReferenceGeography } from "semiotic/geo"

// Load once, cache automatically
const features = await resolveReferenceGeography("world-110m")
// features is GeoJSON.Feature[] — pass directly to areas prop`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Distance Cartogram */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="cartogram">Distance Cartogram Transform</h2>

      <p>
        The <code>projectionTransform</code> prop applies a post-projection
        distortion that repositions points by cost rather than geographic distance.
        See <Link to="/charts/distance-cartogram">DistanceCartogram</Link> for the
        simplified HOC.
      </p>

      <CodeBlock
        code={`<StreamGeoFrame
  projection="mercator"
  points={cities}
  xAccessor="lon"
  yAccessor="lat"
  pointIdAccessor="id"
  projectionTransform={{
    center: "Rome",
    centerAccessor: "id",
    costAccessor: "travelDays",
    strength: 0.8,
    lineMode: "straight",
  }}
  size={[600, 400]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StreamGeoFrame" props={geoFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/choropleth-map">ChoroplethMap</Link> — simplified
          Chart for color-encoded areas
        </li>
        <li>
          <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link> — simplified
          Chart for sized symbols
        </li>
        <li>
          <Link to="/charts/flow-map">FlowMap</Link> — simplified Chart for
          geographic flows
        </li>
        <li>
          <Link to="/charts/distance-cartogram">DistanceCartogram</Link> — simplified
          Chart for cost-distance distortion
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — for continuous
          x/y data
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — for
          network/hierarchy data
        </li>
      </ul>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Async example components — each loads the world map independently
// ---------------------------------------------------------------------------

function QuickStartExample() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={loadingStyle}>Loading world map...</div>

  return (
    <LiveExample
      frameProps={{
        projection: "equalEarth",
        areas: worldAreas,
        points: earthquakes,
        xAccessor: "lon",
        yAccessor: "lat",
        areaStyle: () => ({
          fill: "#e2e8f0",
          stroke: "#94a3b8",
          strokeWidth: 0.5,
        }),
        pointStyle: (d) => ({
          fill: "#ef4444",
          r: Math.max(3, d.magnitude * 0.7),
          stroke: "#fff",
          strokeWidth: 0.5,
        }),
        enableHover: true,
        size: [600, 400],
      }}
      type={StreamGeoFrame}
      startHidden={false}
      overrideProps={{
        areas: `// loaded via resolveReferenceGeography("world-110m")
worldAreas`,
        points: `[
  { id: "eq1", name: "Tohoku, Japan", lon: 142.37, lat: 38.32, magnitude: 9.1 },
  { id: "eq2", name: "Sumatra, Indonesia", lon: 95.98, lat: 3.30, magnitude: 9.1 },
  // ...more earthquake locations
]`,
        areaStyle: `() => ({
  fill: "#e2e8f0",
  stroke: "#94a3b8",
  strokeWidth: 0.5,
})`,
        pointStyle: `(d) => ({
  fill: "#ef4444",
  r: Math.max(3, d.magnitude * 0.7),
  stroke: "#fff",
  strokeWidth: 0.5,
})`,
      }}
      hiddenProps={{}}
    />
  )
}

function MixedLayersExample() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={loadingStyle}>Loading world map...</div>

  return (
    <LiveExample
      frameProps={{
        projection: "equalEarth",
        areas: worldAreas,
        points: earthquakes,
        lines: majorFlightRoutes,
        xAccessor: "lon",
        yAccessor: "lat",
        lineDataAccessor: "coordinates",
        areaStyle: () => ({ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 }),
        pointStyle: (d) => ({
          fill: d.magnitude > 8 ? "#dc2626" : d.magnitude > 7 ? "#f59e0b" : "#6366f1",
          r: Math.max(3, d.magnitude * 0.6),
          stroke: "#fff",
          strokeWidth: 1.5,
        }),
        lineStyle: () => ({ stroke: "#6366f1", strokeWidth: 2, strokeOpacity: 0.5 }),
        enableHover: true,
        size: [600, 400],
      }}
      type={StreamGeoFrame}
      overrideProps={{
        areas: `// loaded via resolveReferenceGeography("world-110m")
worldAreas`,
        points: "earthquakes",
        lines: "majorFlightRoutes",
        lineDataAccessor: '"coordinates"',
        areaStyle: '() => ({ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 })',
        pointStyle: `(d) => ({
  fill: d.magnitude > 8 ? "#dc2626" : d.magnitude > 7 ? "#f59e0b" : "#6366f1",
  r: Math.max(3, d.magnitude * 0.6),
  stroke: "#fff",
  strokeWidth: 1.5,
})`,
        lineStyle: '() => ({ stroke: "#6366f1", strokeWidth: 2, strokeOpacity: 0.5 })',
      }}
      hiddenProps={{}}
    />
  )
}

function ProjectionsExample() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={loadingStyle}>Loading world map...</div>

  return (
    <LiveExample
      frameProps={{
        projection: { type: "orthographic", rotate: [0, -20] },
        areas: worldAreas,
        points: earthquakes,
        xAccessor: "lon",
        yAccessor: "lat",
        areaStyle: () => ({ fill: "#10b981", fillOpacity: 0.6, stroke: "#fff", strokeWidth: 0.5 }),
        pointStyle: (d) => ({
          fill: "#ef4444",
          r: Math.max(3, d.magnitude * 0.7),
          stroke: "#fff",
          strokeWidth: 1,
        }),
        graticule: true,
        dragRotate: true,
        zoomable: true,
        enableHover: true,
        size: [600, 500],
      }}
      type={StreamGeoFrame}
      overrideProps={{
        projection: '{ type: "orthographic", rotate: [0, -20] }',
        graticule: "true",
        areas: `// loaded via resolveReferenceGeography("world-110m")
worldAreas`,
      }}
      hiddenProps={{}}
    />
  )
}

function GraticuleExample() {
  const [worldAreas, setWorldAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      setWorldAreas(features)
    }).catch(err => console.error("Failed to load world map:", err))
  }, [])

  if (!worldAreas) return <div style={loadingStyle}>Loading world map...</div>

  return (
    <LiveExample
      frameProps={{
        projection: "naturalEarth",
        areas: worldAreas,
        points: earthquakes,
        xAccessor: "lon",
        yAccessor: "lat",
        areaStyle: () => ({ fill: "#10b981", fillOpacity: 0.6, stroke: "#fff", strokeWidth: 0.5 }),
        pointStyle: (d) => ({
          fill: "#f59e0b",
          r: Math.max(3, d.magnitude * 0.6),
          stroke: "#fff",
          strokeWidth: 1,
        }),
        graticule: { stroke: "#059669", strokeWidth: 0.5 },
        enableHover: true,
        size: [600, 400],
      }}
      type={StreamGeoFrame}
      overrideProps={{
        areas: `// loaded via resolveReferenceGeography("world-110m")
worldAreas`,
        points: "earthquakes",
        graticule: '{ stroke: "#059669", strokeWidth: 0.5 }',
      }}
      hiddenProps={{}}
    />
  )
}
