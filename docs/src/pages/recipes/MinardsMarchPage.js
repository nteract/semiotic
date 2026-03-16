import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import MinardsMarch from "../../examples/recipes/MinardsMarch"

const fullSourceCode = `import React from "react"
import {
  LinkedCharts,
  CategoryColorProvider,
  ConnectedScatterplot
} from "semiotic"
import { FlowMap } from "semiotic/geo"

// ── Data (see full source for complete dataset) ──────────────────────

const marchNodes = [
  { id: "Kowno", lon: 23.9, lat: 54.9 },
  { id: "Wilna", lon: 25.3, lat: 54.7 },
  // ... 16 nodes total
  { id: "Moscow", lon: 37.6, lat: 55.8 }
]

const allFlows = [
  // Main advance (422k → 100k), southern detachment (60k via Minsk),
  // Polotsk reinforcement (33k north, 22k rejoin), and 9 retreat edges
  { source: "Kowno", target: "Wilna", survivors: 422, direction: "advance" },
  // ... + detachment/reinforcement flows
  { source: "Wilna", target: "Kowno", survivors: 4, direction: "retreat" }
]

const temperatureData = [
  { city: "Moscow", survivors: 100, temperature: 0, order: 0 },
  // ... retreat cities with falling temperature
  { city: "Kowno", survivors: 4, temperature: -28, order: 9 }
]

// ── Viridis gradient legend ──────────────────────────────────────────

function ViridisLegend({ width }) {
  const legendWidth = Math.min(180, width * 0.25)
  return (
    <g transform={\`translate(\${width - legendWidth - 50}, -14)\`}>
      <defs>
        <linearGradient id="viridis-legend-grad">
          <stop offset="0%" stopColor="#440154" />
          <stop offset="25%" stopColor="#31688e" />
          <stop offset="50%" stopColor="#35b779" />
          <stop offset="75%" stopColor="#90d743" />
          <stop offset="100%" stopColor="#fde725" />
        </linearGradient>
      </defs>
      <text x={0} y={0} fontSize={10} fill="#666" fontWeight={600}>Retreat stage</text>
      <rect x={0} y={4} width={legendWidth} height={8} rx={2} fill="url(#viridis-legend-grad)" />
      <text x={0} y={22} fontSize={9} fill="#888">Moscow</text>
      <text x={legendWidth} y={22} fontSize={9} fill="#888" textAnchor="end">Kowno</text>
    </g>
  )
}

// ── Component ────────────────────────────────────────────────────────

export default function MinardsMarch({ width = 900 }) {
  const mapHeight = Math.round(width * 0.5)
  const chartHeight = Math.round(width * 0.22)

  return (
    <CategoryColorProvider
      categories={["advance", "retreat"]}
      colors={{ advance: "#deb887", retreat: "#333" }}
    >
      <LinkedCharts
        selections={[{ name: "city-hl", resolution: "union" }]}
        showLegend={false}
      >
        <div>
          <FlowMap
            flows={allFlows}
            nodes={marchNodes}
            xAccessor="lon" yAccessor="lat"
            valueAccessor="survivors"
            projection="mercator"
            lineType="line"
            edgeColorBy="direction"
            edgeOpacity={0.85}
            edgeWidthRange={[1, 36]}
            showParticles
            particleStyle={{
              radius: 2.5, color: (d) => d?.direction === "advance" ? "#8b5e3c" : "#888",
              opacity: 0.85, speedMultiplier: 0.6,
              maxPerLine: 20, spawnRate: 0.1
            }}
            tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            tileAttribution="© OpenStreetMap contributors"
            fitPadding={0.1}
            width={width} height={mapHeight}
            linkedHover={{ name: "city-hl", fields: ["source", "target"] }}
            selection={{ name: "city-hl" }}
          />

          <ConnectedScatterplot
            data={temperatureData}
            xAccessor="temperature" yAccessor="survivors"
            xLabel="Temperature (°C)" yLabel="Survivors (thousands)"
            orderAccessor="order" orderLabel="Retreat stage"
            pointRadius={5}
            width={width} height={chartHeight}
            margin={{ top: 30, right: 40, bottom: 50, left: 70 }}
            showGrid
            linkedHover={{ name: "city-hl", fields: ["source", "target"] }}
            selection={{ name: "city-hl" }}
            frameProps={{
              background: "transparent",
              foregroundGraphics: <ViridisLegend width={width - 70 - 40} />
            }}
          />
        </div>
      </LinkedCharts>
    </CategoryColorProvider>
  )
}`

export default function MinardsMarchPage() {
  return (
    <RecipeLayout
      title="Minard's March"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Minard's March", path: "/recipes/minards-march" },
      ]}
      prevPage={{ title: "Benchmark Dashboard", path: "/recipes/benchmark-dashboard" }}
      dependencies={["semiotic", "semiotic/geo", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A modern recreation of Charles Joseph Minard's 1869 flow map of
        Napoleon's disastrous Russian campaign of 1812. Combines a <code>FlowMap</code> with
        tile basemap and animated particles over a <code>ConnectedScatterplot</code> of
        temperature vs. casualties. The two charts are cross-linked via <code>LinkedCharts</code>.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "var(--surface-1)",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--surface-3)",
      }}>
        <MinardsMarch />
      </div>

      <h2 id="anatomy">Anatomy</h2>
      <p>
        The recipe layers four Semiotic features:
      </p>
      <ol>
        <li>
          <strong>FlowMap + tiles</strong> — flow edges with <code>strokeWidth</code> proportional
          to troop survivors (Minard's signature encoding), rendered over OpenStreetMap tiles
          via <code>tileURL</code>.
        </li>
        <li>
          <strong>Particles</strong> — <code>showParticles</code> animates dots
          flowing along each route segment, giving the static map a sense of movement
          and direction.
        </li>
        <li>
          <strong>ConnectedScatterplot</strong> — the retreat temperature/casualty
          relationship rendered as a connected scatterplot (viridis-colored by order).
          The 4:1 aspect ratio echoes Minard's original strip chart below the map.
        </li>
        <li>
          <strong>LinkedCharts</strong> — hovering a flow segment on the map highlights
          the corresponding city in the scatterplot, and vice versa.
        </li>
      </ol>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Flow thickness</td>
            <td><code>edgeWidthRange</code></td>
            <td>Set <code>[min, max]</code> pixel width (default: <code>[1, 8]</code>)</td>
          </tr>
          <tr>
            <td>Advance/retreat colors</td>
            <td><code>CategoryColorProvider</code></td>
            <td>Change the <code>colors</code> map (default: tan + black)</td>
          </tr>
          <tr>
            <td>Particle speed</td>
            <td><code>particleStyle.speedMultiplier</code></td>
            <td>Higher = faster flow animation</td>
          </tr>
          <tr>
            <td>Tile provider</td>
            <td><code>tileURL</code></td>
            <td>Replace with Stadia, CartoDB, or custom tile server</td>
          </tr>
          <tr>
            <td>Scatterplot height</td>
            <td><code>chartHeight</code></td>
            <td>Change the ratio (default: <code>width * 0.22</code>)</td>
          </tr>
          <tr>
            <td>Cross-highlight fields</td>
            <td><code>linkedHover.fields</code></td>
            <td>Change which fields link the two charts</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        <code>FlowMap</code> converts node coordinates + flow edges into
        projected line segments on a Mercator tile basemap. The <code>lineStyle</code> function
        in <code>frameProps</code> maps <code>survivors</code> to <code>strokeWidth</code>,
        reproducing Minard's proportional-width encoding.
      </p>
      <p>
        <code>showParticles</code> enables the geo particle system, which spawns
        dots that travel along each polyline path. Particle color inherits from
        the line stroke when set to <code>"source"</code>.
      </p>
      <p>
        The <code>ConnectedScatterplot</code> below plots retreat cities ordered by
        stage, with temperature on the x-axis and surviving troops on the y-axis.
        Viridis coloring encodes the progression from Moscow (purple) to Kowno (yellow).
      </p>
      <p>
        Both charts share the <code>"city-hl"</code> selection
        via <code>LinkedCharts</code>. Hovering either chart highlights matching
        data in the other.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/flow-map">Flow Map</Link> — geographic flow visualization</li>
        <li><Link to="/charts/tile-map">Tile Maps</Link> — raster basemap tiles</li>
        <li><Link to="/charts/connected-scatterplot">Connected Scatterplot</Link> — ordered point sequences</li>
        <li><Link to="/features/linked-charts">Linked Charts</Link> — coordinated views</li>
      </ul>
    </RecipeLayout>
  )
}
