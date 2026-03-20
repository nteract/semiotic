import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import StreamingMigrationMap from "../../examples/recipes/StreamingMigrationMap"

const fullSourceCode = `import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CategoryColorProvider } from "semiotic"
import { FlowMap } from "semiotic/geo"

// Each species has southbound + northbound flows tagged with a peak quarter.
// A rolling 2-quarter window filters which flows are visible.

const migrationNodes = [
  { id: "iceland", lon: -20, lat: 64 },
  { id: "azores", lon: -28, lat: 38 },
  // ... 30 nodes total (see full source)
]

function makeFlows(segments, species, quarter, direction) {
  return segments.map(([source, target, value]) => ({
    source, target, value, species, quarter, direction,
  }))
}

const speciesConfig = [
  {
    name: "Arctic Tern", color: "#00e5ff",
    migrations: [
      ...makeFlows([
        ["iceland", "azores", 7], ["azores", "westAfrica", 6], ...
      ], "Arctic Tern", 3, "Southbound"),
      ...makeFlows([
        ["weddellSea", "namibiaCoast", 5], ["namibiaCoast", "gulfOfGuinea", 5], ...
      ], "Arctic Tern", 1, "Northbound"),
    ]
  },
  // ... 6 species total, each with southbound + northbound legs
]

const allFlows = speciesConfig.flatMap(s => s.migrations)
const speciesColorMap = Object.fromEntries(speciesConfig.map(s => [s.name, s.color]))

// Window positions: Q1+Q2, Q2+Q3, Q3+Q4, Q4+Q1
function getWindowQuarters(pos) {
  return [(pos % 4) + 1, (pos + 1) % 4 + 1]
}

export default function StreamingMigrationMap({ width = 900 }) {
  const height = Math.round(width * 0.55)
  const [windowPos, setWindowPos] = useState(0)
  const [playing, setPlaying] = useState(true)

  // Advance window every 3 seconds, cycling back to Q1+Q2
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setWindowPos(prev => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(timer)
  }, [playing])

  const windowQ = useMemo(() => getWindowQuarters(windowPos), [windowPos])
  const visibleFlows = useMemo(
    () => allFlows.filter(f => windowQ.includes(f.quarter)),
    [windowQ]
  )

  return (
    <CategoryColorProvider categories={speciesNames} colors={speciesColorMap}>
      {/* Quarter timeline bar showing active window */}
      <div style={{ display: "flex", gap: 2 }}>
        {quarters.map((q, i) => (
          <div key={i} style={{
            flex: 1,
            background: windowQ.includes(i + 1) ? "#1b3a5c" : "#0f1a2a",
            border: \\\`1px solid \\\${windowQ.includes(i+1) ? "#2a5a8a" : "#1a2535"}\\\`,
            borderRadius: 4, padding: "6px 8px", textAlign: "center",
            transition: "all 0.4s ease",
          }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{q.label}</div>
            <div style={{ fontSize: 10 }}>{q.months}</div>
          </div>
        ))}
      </div>

      <FlowMap
        flows={visibleFlows}
        nodes={migrationNodes}
        areas="world-110m"
        projection="equalEarth"
        lineType="geo"
        edgeColorBy="species"
        showParticles
        particleStyle={{
          radius: 2,
          color: (d) => speciesColorMap[d?.species] || "#fff",
          opacity: 0.9, speedMultiplier: 0.7,
          maxPerLine: 30, spawnRate: 0.18
        }}
        frameProps={{
          areaStyle: () => ({ fill: "#1b2838", stroke: "#2a3f55" }),
          background: "#0d1b2a"
        }}
      />
    </CategoryColorProvider>
  )
}`

export default function StreamingMigrationMapPage() {
  return (
    <RecipeLayout
      title="Streaming Migration Map"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Streaming Migration Map", path: "/recipes/streaming-migration-map" },
      ]}
      prevPage={{ title: "Minard's Map", path: "/recipes/minards-map" }}
      nextPage={{ title: "Rosling Bubble Chart", path: "/recipes/rosling-bubble-chart" }}
      dependencies={["semiotic", "semiotic/geo", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A seasonal particle flow map inspired
        by <a href="https://earth.nullschool.net/" target="_blank" rel="noopener noreferrer">earth.nullschool.net</a> and <a href="http://hint.fm/wind/" target="_blank" rel="noopener noreferrer">hint.fm/wind</a>.
        Six animal migration routes cycle through the year on a rolling 2-quarter
        window. As seasons change, particles reverse direction — Arctic Terns stream
        south while Humpback Whales head to the tropics, then everything flips.
        The underlying data distribution shifts continuously, demonstrating how
        streaming visualizations can reveal temporal patterns.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "#0d1b2a",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid #1b2838",
      }}>
        <StreamingMigrationMap />
      </div>

      <h2 id="anatomy">Anatomy</h2>
      <ol>
        <li>
          <strong>Seasonal rolling window</strong> — a 2-quarter window advances every
          3 seconds through Q1+Q2 → Q2+Q3 → Q3+Q4 → Q4+Q1, then cycles back. The
          quarter timeline bar highlights the active window. Each flow is tagged with
          its peak migration quarter; only flows matching the current window are rendered.
        </li>
        <li>
          <strong>Bidirectional migration</strong> — each species has southbound and
          northbound flows with reversed source/target. The Arctic Tern heads south in
          Q3 and north in Q1. When the window shifts, particles literally reverse
          direction on the map.
        </li>
        <li>
          <strong>FlowMap + particles</strong> — <code>showParticles</code> with
          high <code>maxPerLine</code> (30) and <code>spawnRate</code> (0.18) creates
          dense wind-map-like streams along great-circle arcs. Per-species particle
          color via a function on the flow datum.
        </li>
        <li>
          <strong>Live legend</strong> — all six species are always shown in the legend.
          Active species display their current migration direction (Southbound, Northbound,
          To tropics, To Antarctic). Inactive species dim to 35% opacity.
        </li>
        <li>
          <strong>CategoryColorProvider</strong> — ensures stable species → color
          mapping as the flow set changes each window step.
        </li>
      </ol>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Window duration</td>
            <td><code>setInterval</code> timing</td>
            <td>Change from 3000ms for faster/slower seasonal cycling</td>
          </tr>
          <tr>
            <td>Window size</td>
            <td><code>getWindowQuarters</code></td>
            <td>Return 3 quarters for a wider window, or 1 for a narrower one</td>
          </tr>
          <tr>
            <td>Particle density</td>
            <td><code>particleStyle.maxPerLine</code></td>
            <td>Increase for denser wind-map look (default 30)</td>
          </tr>
          <tr>
            <td>Particle speed</td>
            <td><code>particleStyle.speedMultiplier</code></td>
            <td>Higher = faster flow (default 0.7)</td>
          </tr>
          <tr>
            <td>Line style</td>
            <td><code>lineType</code></td>
            <td><code>"geo"</code> for great circles, <code>"line"</code> for straight projected lines</td>
          </tr>
          <tr>
            <td>Background map</td>
            <td><code>areas</code></td>
            <td>Pass GeoJSON features, or <code>"world-50m"</code> for higher resolution</td>
          </tr>
          <tr>
            <td>Projection</td>
            <td><code>projection</code></td>
            <td>Try <code>"orthographic"</code> with <code>dragRotate</code> for a globe</td>
          </tr>
          <tr>
            <td>Dark theme</td>
            <td><code>frameProps.background</code> + <code>areaStyle</code></td>
            <td>Change fill/stroke colors, or remove for light mode</td>
          </tr>
          <tr>
            <td>Species colors</td>
            <td><code>CategoryColorProvider colors</code></td>
            <td>Swap the color map for a different palette</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Each species' migration is split into two legs — southbound and northbound —
        each tagged with a peak quarter (1–4). The Humpback Whale, a southern-hemisphere
        animal, reverses the pattern: it heads to the tropics in Q2 and returns to
        Antarctic waters in Q4.
      </p>
      <p>
        A <code>windowPos</code> state (0–3) advances on a 3-second interval, cycling
        back to 0 after reaching 3. The <code>getWindowQuarters</code> helper maps each
        position to two adjacent quarters: position 0 → [Q1, Q2], position 1 → [Q2, Q3],
        etc. Position 3 wraps around to [Q4, Q1].
      </p>
      <p>
        Visible flows are filtered with <code>useMemo</code>: only flows whose
        tagged quarter falls within the current window are passed
        to <code>FlowMap</code>. When the window shifts and a flow's quarter drops out,
        it disappears; when a flow's quarter enters, it appears with fresh particles.
        The net effect is that particles reverse direction as seasons change —
        a visual representation of how the character of the data stream changes over time.
      </p>
      <p>
        Under the hood, <code>FlowMap</code> converts each flow edge into a projected
        line on <code>StreamGeoFrame</code>'s canvas. The <code>GeoParticlePool</code> spawns
        particles along each polyline path, recycling them when they
        reach <code>t=1</code>. Because <code>FlowMap</code> is a bounded HOC, swapping
        the <code>flows</code> prop is all that's needed — no imperative push API required.
      </p>

      <h2 id="realtime">Connecting to Real Data</h2>
      <p>
        Replace the timer with a real seasonal data source — for example, a WebSocket
        that pushes migration sightings as they're reported:
      </p>
      <pre style={{
        background: "#1b2838",
        color: "#aabbcc",
        padding: "12px 16px",
        borderRadius: 4,
        fontSize: 12,
        overflow: "auto"
      }}>{`// Live sighting feed — each message is a flow segment
const [flows, setFlows] = useState([])
useEffect(() => {
  const ws = new WebSocket("wss://your-api/migrations")
  ws.onmessage = (e) => {
    const sighting = JSON.parse(e.data)
    // { source: "iceland", target: "azores", species: "Arctic Tern", ... }
    setFlows(prev => [...prev, sighting])
  }
  return () => ws.close()
}, [])

<FlowMap flows={flows} nodes={nodes} showParticles ... />`}</pre>
      <p>
        For high-frequency GPS tracks, use <code>StreamGeoFrame</code> with
        the push API for better performance:
      </p>
      <pre style={{
        background: "#1b2838",
        color: "#aabbcc",
        padding: "12px 16px",
        borderRadius: 4,
        fontSize: 12,
        overflow: "auto"
      }}>{`const geoRef = useRef()
ws.onmessage = (e) => {
  geoRef.current.push(JSON.parse(e.data))
}
<StreamGeoFrame ref={geoRef} projection="equalEarth"
  xAccessor="lon" yAccessor="lat"
  decay={{ type: "linear", minOpacity: 0.1 }}
  showParticles ... />`}</pre>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/flow-map">Flow Map</Link> — geographic flow visualization</li>
        <li><Link to="/recipes/minards-map">Minard's Map</Link> — another flow map recipe with cross-linked charts</li>
        <li><Link to="/features/particles">Geo Particles</Link> — particle system reference</li>
        <li><Link to="/features/realtime">Realtime Charts</Link> — push API and streaming patterns</li>
      </ul>
    </RecipeLayout>
  )
}
