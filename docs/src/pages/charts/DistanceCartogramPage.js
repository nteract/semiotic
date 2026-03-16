import React, { useRef, useEffect } from "react"
import { DistanceCartogram } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — Flight hours from London Heathrow to major world cities
// ---------------------------------------------------------------------------

const worldCities = [
  { id: "London", lon: -0.1, lat: 51.5, flightHours: 0 },
  { id: "Paris", lon: 2.35, lat: 48.86, flightHours: 1.2 },
  { id: "Amsterdam", lon: 4.9, lat: 52.37, flightHours: 1.3 },
  { id: "Dublin", lon: -6.26, lat: 53.35, flightHours: 1.5 },
  { id: "Madrid", lon: -3.7, lat: 40.42, flightHours: 2.5 },
  { id: "Rome", lon: 12.5, lat: 41.9, flightHours: 2.8 },
  { id: "Istanbul", lon: 28.98, lat: 41.01, flightHours: 4.0 },
  { id: "Moscow", lon: 37.62, lat: 55.75, flightHours: 4.0 },
  { id: "Cairo", lon: 31.24, lat: 30.04, flightHours: 5.0 },
  { id: "Dubai", lon: 55.27, lat: 25.2, flightHours: 7.0 },
  { id: "New York", lon: -74.0, lat: 40.71, flightHours: 7.5 },
  { id: "Mumbai", lon: 72.88, lat: 19.08, flightHours: 9.0 },
  { id: "Beijing", lon: 116.4, lat: 39.9, flightHours: 10.5 },
  { id: "Tokyo", lon: 139.69, lat: 35.69, flightHours: 11.5 },
  { id: "Singapore", lon: 103.85, lat: 1.35, flightHours: 13.0 },
  { id: "Sydney", lon: 151.21, lat: -33.87, flightHours: 22.0 },
  { id: "Buenos Aires", lon: -58.38, lat: -34.6, flightHours: 14.0 },
  { id: "Cape Town", lon: 18.42, lat: -33.93, flightHours: 11.5 },
  { id: "Los Angeles", lon: -118.24, lat: 34.05, flightHours: 11.0 },
  { id: "Sao Paulo", lon: -46.63, lat: -23.55, flightHours: 12.0 },
]

const flightRoutes = [
  { source: "London", target: "Paris" },
  { source: "London", target: "Amsterdam" },
  { source: "London", target: "Dublin" },
  { source: "London", target: "Madrid" },
  { source: "London", target: "Rome" },
  { source: "London", target: "Istanbul" },
  { source: "London", target: "Moscow" },
  { source: "London", target: "Cairo" },
  { source: "London", target: "Dubai" },
  { source: "London", target: "New York" },
  { source: "London", target: "Mumbai" },
  { source: "London", target: "Beijing" },
  { source: "London", target: "Tokyo" },
  { source: "London", target: "Singapore" },
  { source: "London", target: "Sydney" },
  { source: "London", target: "Cape Town" },
  { source: "London", target: "Los Angeles" },
  { source: "Dubai", target: "Mumbai" },
  { source: "Dubai", target: "Singapore" },
  { source: "Istanbul", target: "Cairo" },
  { source: "New York", target: "Los Angeles" },
  { source: "New York", target: "Sao Paulo" },
  { source: "Sao Paulo", target: "Buenos Aires" },
  { source: "Singapore", target: "Sydney" },
  { source: "Beijing", target: "Tokyo" },
]

// European rail hours from Paris Gare du Nord
const europeanCities = [
  { id: "Paris", lon: 2.35, lat: 48.86, railHours: 0 },
  { id: "Brussels", lon: 4.35, lat: 50.85, railHours: 1.4 },
  { id: "London", lon: -0.1, lat: 51.5, railHours: 2.3 },
  { id: "Amsterdam", lon: 4.9, lat: 52.37, railHours: 3.3 },
  { id: "Lyon", lon: 4.83, lat: 45.76, railHours: 2.0 },
  { id: "Cologne", lon: 6.96, lat: 50.94, railHours: 3.2 },
  { id: "Frankfurt", lon: 8.68, lat: 50.11, railHours: 3.9 },
  { id: "Zurich", lon: 8.54, lat: 47.38, railHours: 4.1 },
  { id: "Milan", lon: 9.19, lat: 45.46, railHours: 7.1 },
  { id: "Barcelona", lon: 2.17, lat: 41.39, railHours: 6.5 },
  { id: "Munich", lon: 11.58, lat: 48.14, railHours: 5.7 },
  { id: "Berlin", lon: 13.41, lat: 52.52, railHours: 8.0 },
  { id: "Vienna", lon: 16.37, lat: 48.21, railHours: 10.0 },
  { id: "Madrid", lon: -3.7, lat: 40.42, railHours: 10.5 },
  { id: "Rome", lon: 12.5, lat: 41.9, railHours: 11.0 },
]

const railRoutes = [
  { source: "Paris", target: "Brussels" },
  { source: "Paris", target: "London" },
  { source: "Paris", target: "Lyon" },
  { source: "Paris", target: "Amsterdam" },
  { source: "Paris", target: "Frankfurt" },
  { source: "Paris", target: "Barcelona" },
  { source: "Brussels", target: "Cologne" },
  { source: "Brussels", target: "Amsterdam" },
  { source: "Cologne", target: "Frankfurt" },
  { source: "Frankfurt", target: "Munich" },
  { source: "Frankfurt", target: "Berlin" },
  { source: "Lyon", target: "Zurich" },
  { source: "Lyon", target: "Milan" },
  { source: "Zurich", target: "Milan" },
  { source: "Munich", target: "Vienna" },
  { source: "Milan", target: "Rome" },
  { source: "Barcelona", target: "Madrid" },
]

// ---------------------------------------------------------------------------
// Streaming demo — strength interpolation
// ---------------------------------------------------------------------------

const streamingCartogramCode = `import { useRef, useEffect, useState } from "react"
import { DistanceCartogram } from "semiotic/geo"

function AnimatedCartogram() {
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    let frame
    let t = 0
    const animate = () => {
      t += 0.02
      // Oscillate strength between 0 and 1
      setStrength((Math.sin(t) + 1) / 2)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <DistanceCartogram
      points={cities}
      center="London"
      costAccessor="flightHours"
      strength={strength}
      lines={routes}
      projection="mercator"
      width={600}
      height={400}
      zoomable
      tooltip
    />
  )
}`

function AnimatedCartogramDemo({ width }) {
  const [strength, setStrength] = React.useState(0)

  useEffect(() => {
    let frame
    let t = 0
    const animate = () => {
      t += 0.015
      setStrength((Math.sin(t) + 1) / 2)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <DistanceCartogram
      points={worldCities}
      center="London"
      costAccessor="flightHours"
      strength={strength}
      lines={flightRoutes}
      projection="mercator"
      width={width}
      height={400}
      zoomable
      tooltip
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const distanceCartogramProps = [
  { name: "points", type: "array", required: true, default: null, description: "Array of data objects with geographic coordinates and a cost/distance field." },
  { name: "center", type: "string", required: true, default: null, description: "ID of the center point. All distances are measured from this node." },
  { name: "costAccessor", type: "string | function", required: true, default: null, description: "Field name or function to extract the cost/distance value from each point." },
  { name: "strength", type: "number", required: false, default: "1", description: "Interpolation between geographic positions (0) and cartogram positions (1). Animate this for smooth transitions." },
  { name: "lineMode", type: '"straight" | "fractional"', required: false, default: '"straight"', description: "How connecting lines are drawn. Straight snaps to endpoints; fractional interpolates intermediate points." },
  { name: "nodeIdAccessor", type: "string", required: false, default: '"id"', description: "Field name to identify points." },
  { name: "xAccessor", type: "string | function", required: false, default: '"lon"', description: "Longitude accessor." },
  { name: "yAccessor", type: "string | function", required: false, default: '"lat"', description: "Latitude accessor." },
  { name: "lines", type: "array", required: false, default: null, description: "Array of { source, target } objects for connecting lines between points." },
  { name: "projection", type: "string | object | function", required: false, default: '"mercator"', description: "Base geographic projection before cartogram distortion." },
  { name: "zoomable", type: "boolean", required: false, default: "false", description: "Enable mouse wheel zoom and pan on the cartogram." },
  { name: "transition", type: "number", required: false, default: null, description: "Transition duration in ms when center or strength changes." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function for point color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme." },
  { name: "pointRadius", type: "number", required: false, default: "5", description: "Base circle radius." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Tooltip configuration." },
  { name: "showLegend", type: "boolean", required: false, default: "false", description: "Show a legend." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height." },
  { name: "selection", type: "object", required: false, default: null, description: "Selection config for LinkedCharts." },
  { name: "linkedHover", type: "object", required: false, default: null, description: "Linked hover config." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamGeoFrame props." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DistanceCartogramPage() {
  return (
    <PageLayout
      title="DistanceCartogram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Geo Charts", path: "/charts" },
        { label: "DistanceCartogram", path: "/charts/distance-cartogram" },
      ]}
      prevPage={{ title: "Flow Map", path: "/charts/flow-map" }}
      nextPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
    >
      <ComponentMeta
        componentName="DistanceCartogram"
        importStatement='import { DistanceCartogram } from "semiotic/geo"'
        tier="charts"
        wraps="StreamGeoFrame"
        wrapsPath="/frames/geo-frame"
        related={[
          { name: "FlowMap", path: "/charts/flow-map" },
          { name: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
          { name: "StreamGeoFrame", path: "/frames/geo-frame" },
        ]}
      />

      <p>
        DistanceCartogram distorts a geographic map so that distances reflect a
        cost metric (travel time, shipping cost, network latency) rather than
        physical distance. Inspired by Stanford's{" "}
        <a href="https://orbis.stanford.edu" target="_blank" rel="noopener noreferrer">ORBIS</a>{" "}
        project, it repositions points in polar coordinates around a center
        node, with the <code>strength</code> prop controlling the blend between
        geographic truth and cost-based distortion.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide <code>points</code> with coordinates and a cost field, a{" "}
        <code>center</code> node ID, and a <code>costAccessor</code>. Points
        closer in cost cluster near the center. This example shows flight hours
        from London Heathrow to 20 major world cities.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              points: worldCities,
              center: "London",
              costAccessor: "flightHours",
              lines: flightRoutes,
              projection: "mercator",
              zoomable: true,
              tooltip: true,
              width: 600,
              height: 400,
            }}
            type={DistanceCartogram}
            startHidden={false}
            overrideProps={{
              points: `[
  { id: "London", lon: -0.1, lat: 51.5, flightHours: 0 },
  { id: "Paris", lon: 2.35, lat: 48.86, flightHours: 1.2 },
  { id: "New York", lon: -74.0, lat: 40.71, flightHours: 7.5 },
  { id: "Tokyo", lon: 139.69, lat: 35.69, flightHours: 11.5 },
  { id: "Sydney", lon: 151.21, lat: -33.87, flightHours: 22.0 },
  // ...20 major world cities with flight hours from London
]`,
              lines: `[
  { source: "London", target: "Paris" },
  { source: "London", target: "New York" },
  { source: "London", target: "Tokyo" },
  // ...direct and connecting flight routes
]`,
              center: '"London"',
              costAccessor: '"flightHours"',
              zoomable: "true",
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <AnimatedCartogramDemo width={w} />}
            code={streamingCartogramCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="strength">Strength Control</h3>
      <p>
        <code>strength=0</code> shows pure geographic positions.{" "}
        <code>strength=1</code> shows full cartogram distortion. Values between
        blend the two. The streaming demo above animates this continuously.
        Notice how Paris (1.2 hrs) stays close to London while Sydney (22 hrs)
        moves far away in the distorted view.
      </p>

      <LiveExample
        frameProps={{
          points: worldCities,
          center: "London",
          costAccessor: "flightHours",
          strength: 0,
          lines: flightRoutes,
          projection: "mercator",
          zoomable: true,
          tooltip: true,
          title: "strength=0 (geographic)",
          width: 600,
          height: 400,
        }}
        type={DistanceCartogram}
        overrideProps={{
          points: "worldCities",
          lines: "flightRoutes",
          center: '"London"',
          costAccessor: '"flightHours"',
          strength: "0",
          zoomable: "true",
          title: '"strength=0 (geographic)"',
        }}
        hiddenProps={{}}
      />

      <h3 id="rail-network">European Rail Network</h3>
      <p>
        High-speed rail distorts European geography differently than air travel.
        Paris to Brussels takes just 1.4 hours by Thalys, while Paris to Rome
        takes 11 hours despite the shorter flight time. This cartogram reveals
        the rail accessibility landscape from Paris Gare du Nord.
      </p>

      <LiveExample
        frameProps={{
          points: europeanCities,
          center: "Paris",
          costAccessor: "railHours",
          lines: railRoutes,
          projection: "mercator",
          zoomable: true,
          tooltip: true,
          pointRadius: 6,
          width: 600,
          height: 400,
        }}
        type={DistanceCartogram}
        overrideProps={{
          points: `[
  { id: "Paris", lon: 2.35, lat: 48.86, railHours: 0 },
  { id: "Brussels", lon: 4.35, lat: 50.85, railHours: 1.4 },
  { id: "London", lon: -0.1, lat: 51.5, railHours: 2.3 },
  { id: "Berlin", lon: 13.41, lat: 52.52, railHours: 8.0 },
  { id: "Rome", lon: 12.5, lat: 41.9, railHours: 11.0 },
  // ...15 European cities with rail hours from Paris
]`,
          center: '"Paris"',
          costAccessor: '"railHours"',
          zoomable: "true",
        }}
        hiddenProps={{}}
      />

      <h3 id="colored-points">Colored by Reachability</h3>
      <p>
        Combine cartogram distortion with color encoding to double-encode the
        cost dimension. Cities are grouped by flight time: under 5 hours
        (short-haul), 5 to 10 hours (medium-haul), and over 10 hours
        (long-haul).
      </p>

      <LiveExample
        frameProps={{
          points: worldCities,
          center: "London",
          costAccessor: "flightHours",
          lines: flightRoutes,
          projection: "mercator",
          zoomable: true,
          colorBy: (d) => d.flightHours === 0 ? "Hub" : d.flightHours <= 5 ? "Short-haul" : d.flightHours <= 10 ? "Medium-haul" : "Long-haul",
          showLegend: true,
          tooltip: true,
          width: 600,
          height: 400,
        }}
        type={DistanceCartogram}
        overrideProps={{
          points: "worldCities",
          lines: "flightRoutes",
          center: '"London"',
          costAccessor: '"flightHours"',
          zoomable: "true",
          colorBy: '(d) => d.flightHours === 0 ? "Hub" : d.flightHours <= 5 ? "Short-haul" : d.flightHours <= 10 ? "Medium-haul" : "Long-haul"',
          showLegend: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* How It Works */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="how-it-works">How It Works</h2>

      <p>
        The distance cartogram applies a post-projection transform:
      </p>

      <ol>
        <li>Project all points to screen coordinates using the base projection (e.g., Mercator).</li>
        <li>Identify the center point's screen position.</li>
        <li>For each other point, compute the angle from center (preserved) and a new radius proportional to its cost value.</li>
        <li>Interpolate between the geographic position and the cost-based position using <code>strength</code> (0-1).</li>
        <li>Optionally reposition connecting lines to follow the distorted points.</li>
      </ol>

      <p>
        This means geographic direction is preserved but distance is distorted —
        Paris remains northwest of London but at strength=1 it appears much
        closer than New York, even though New York is farther geographically.
        The <code>zoomable</code> prop lets users pan and zoom to explore
        dense clusters.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="DistanceCartogram" props={distanceCartogramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        Use{" "}
        <Link to="/frames/geo-frame">StreamGeoFrame</Link> with{" "}
        <code>projectionTransform</code> for full control over the cartogram
        pipeline.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { DistanceCartogram } from "semiotic/geo"

<DistanceCartogram
  points={cities}
  center="London"
  costAccessor="flightHours"
  strength={0.8}
  lines={routes}
  zoomable
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
  projection="mercator"
  points={cities}
  lines={routesWithCoords}
  lineDataAccessor="coordinates"
  xAccessor="lon"
  yAccessor="lat"
  pointIdAccessor="id"
  projectionTransform={{
    center: "London",
    centerAccessor: "id",
    costAccessor: "flightHours",
    strength: 0.8,
  }}
  pointStyle={(d) => ({
    fill: "#6366f1", r: 5,
    stroke: "#fff",
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
          <Link to="/charts/flow-map">FlowMap</Link> — geographic flows without
          distance distortion
        </li>
        <li>
          <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link> — sized
          symbols at geographic positions
        </li>
        <li>
          <Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> — abstract
          force layout (non-geographic)
        </li>
        <li>
          <Link to="/frames/geo-frame">StreamGeoFrame</Link> — the underlying
          Frame
        </li>
      </ul>
    </PageLayout>
  )
}
