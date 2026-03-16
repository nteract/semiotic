import React, { useRef, useEffect, useState } from "react"
import { ProportionalSymbolMap, ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"
import { StreamGeoFrame } from "semiotic/geo"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — notable earthquakes with real coordinates and magnitudes
// ---------------------------------------------------------------------------

const earthquakeData = [
  { id: "tohoku", name: "Tohoku, Japan", lon: 142.4, lat: 38.3, magnitude: 9.1, depth: 29, year: 2011, region: "Pacific" },
  { id: "sumatra", name: "Sumatra, Indonesia", lon: 95.9, lat: 3.3, magnitude: 9.1, depth: 30, year: 2004, region: "Pacific" },
  { id: "chile2010", name: "Maule, Chile", lon: -72.9, lat: -35.8, magnitude: 8.8, depth: 35, year: 2010, region: "Pacific" },
  { id: "nepal", name: "Gorkha, Nepal", lon: 84.7, lat: 28.2, magnitude: 7.8, depth: 15, year: 2015, region: "Asia" },
  { id: "haiti", name: "Port-au-Prince, Haiti", lon: -72.5, lat: 18.5, magnitude: 7.0, depth: 13, year: 2010, region: "Caribbean" },
  { id: "christchurch", name: "Christchurch, NZ", lon: 172.6, lat: -43.5, magnitude: 6.2, depth: 5, year: 2011, region: "Pacific" },
  { id: "laquila", name: "L'Aquila, Italy", lon: 13.4, lat: 42.3, magnitude: 6.3, depth: 9, year: 2009, region: "Europe" },
  { id: "turkey2023", name: "Kahramanmaras, Turkey", lon: 37.2, lat: 37.2, magnitude: 7.8, depth: 18, year: 2023, region: "Europe" },
  { id: "mexico2017", name: "Puebla, Mexico", lon: -98.4, lat: 18.6, magnitude: 7.1, depth: 57, year: 2017, region: "North America" },
  { id: "alaska", name: "Anchorage, Alaska", lon: -150.1, lat: 61.3, magnitude: 7.1, depth: 47, year: 2018, region: "North America" },
  { id: "sulawesi", name: "Palu, Sulawesi", lon: 119.8, lat: -0.2, magnitude: 7.5, depth: 20, year: 2018, region: "Pacific" },
  { id: "morocco", name: "Marrakech, Morocco", lon: -8.4, lat: 31.1, magnitude: 6.8, depth: 26, year: 2023, region: "Africa" },
  { id: "japan2024", name: "Noto, Japan", lon: 137.2, lat: 37.5, magnitude: 7.5, depth: 10, year: 2024, region: "Pacific" },
  { id: "taiwan2024", name: "Hualien, Taiwan", lon: 121.6, lat: 23.8, magnitude: 7.4, depth: 35, year: 2024, region: "Pacific" },
  { id: "iran", name: "Kermanshah, Iran", lon: 45.9, lat: 34.9, magnitude: 7.3, depth: 19, year: 2017, region: "Asia" },
]

// ---------------------------------------------------------------------------
// Country GDP data for choropleth-with-tiles example
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
  { id: "036", name: "Australia", gdpPerCapita: 51812 },
  { id: "724", name: "Spain", gdpPerCapita: 30104 },
  { id: "484", name: "Mexico", gdpPerCapita: 10046 },
  { id: "643", name: "Russia", gdpPerCapita: 12173 },
  { id: "566", name: "Nigeria", gdpPerCapita: 2066 },
  { id: "710", name: "South Africa", gdpPerCapita: 6994 },
]

// ---------------------------------------------------------------------------
// Example 1: ProportionalSymbolMap with tiles — earthquake data
// ---------------------------------------------------------------------------

function EarthquakeTileMap({ width = 700, height = 450 }) {
  return (
    <ProportionalSymbolMap
      points={earthquakeData}
      xAccessor="lon"
      yAccessor="lat"
      sizeBy="magnitude"
      sizeRange={[4, 30]}
      colorBy="region"
      showLegend
      projection="mercator"
      tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      tileAttribution="&copy; OpenStreetMap contributors"
      zoomable
      tooltip={(d) => (
        <div style={{ padding: 4 }}>
          <strong>{d.name}</strong>
          <br />
          Magnitude: {d.magnitude} | Depth: {d.depth} km
          <br />
          Year: {d.year}
        </div>
      )}
      width={width}
      height={height}
    />
  )
}

// ---------------------------------------------------------------------------
// Example 2: ChoroplethMap with semi-transparent fill over tiles
// ---------------------------------------------------------------------------

function ChoroplethTileMap({ width = 700, height = 450 }) {
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
      colorScheme="viridis"
      projection="mercator"
      tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      tileAttribution="&copy; OpenStreetMap contributors"
      zoomable
      tooltip
      width={width}
      height={height}
      frameProps={{
        areaOpacity: 0.55,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Example 3: StreamGeoFrame streaming points over tiles
// ---------------------------------------------------------------------------

const streamingTileCode = `import { useRef, useEffect } from "react"
import { StreamGeoFrame } from "semiotic/geo"

function StreamingEarthquakes() {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        // Simulate a random seismic event along the Ring of Fire
        // and other tectonic boundaries
        const zones = [
          { lonRange: [130, 180], latRange: [20, 50] },   // Japan–Kamchatka
          { lonRange: [-80, -65], latRange: [-45, 5] },    // South America west coast
          { lonRange: [-130, -110], latRange: [30, 55] },  // US/Canada west coast
          { lonRange: [90, 130], latRange: [-10, 15] },    // Indonesia
          { lonRange: [25, 45], latRange: [30, 42] },      // Turkey–Iran
        ]
        const zone = zones[Math.floor(Math.random() * zones.length)]
        const lon = zone.lonRange[0] + Math.random() * (zone.lonRange[1] - zone.lonRange[0])
        const lat = zone.latRange[0] + Math.random() * (zone.latRange[1] - zone.latRange[0])
        const magnitude = 2 + Math.random() * 6

        chartRef.current.push({ lon, lat, magnitude })
      }
    }, 300)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamGeoFrame
      ref={chartRef}
      projection="mercator"
      xAccessor="lon"
      yAccessor="lat"
      runtimeMode="streaming"
      tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      tileAttribution="\\u00a9 OpenStreetMap contributors"
      zoomable
      size={[700, 400]}
      pointStyle={(d) => ({
        fill: d.magnitude > 5 ? "#ef4444" : d.magnitude > 3.5 ? "#f59e0b" : "#22c55e",
        r: Math.max(2, d.magnitude * 1.5),
        stroke: "#fff",
        strokeWidth: 0.5,
      })}
      decay={{ type: "exponential", minOpacity: 0.05 }}
      pulse={{ duration: 600, color: "rgba(239,68,68,0.5)", glowRadius: 8 }}
      enableHover
    />
  )
}`

function StreamingTileDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const zones = [
          { lonRange: [130, 180], latRange: [20, 50] },
          { lonRange: [-80, -65], latRange: [-45, 5] },
          { lonRange: [-130, -110], latRange: [30, 55] },
          { lonRange: [90, 130], latRange: [-10, 15] },
          { lonRange: [25, 45], latRange: [30, 42] },
        ]
        const zone = zones[Math.floor(Math.random() * zones.length)]
        const lon = zone.lonRange[0] + Math.random() * (zone.lonRange[1] - zone.lonRange[0])
        const lat = zone.latRange[0] + Math.random() * (zone.latRange[1] - zone.latRange[0])
        const magnitude = 2 + Math.random() * 6

        chartRef.current.push({ lon, lat, magnitude })
      }
    }, 300)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamGeoFrame
      ref={chartRef}
      projection="mercator"
      xAccessor="lon"
      yAccessor="lat"
      runtimeMode="streaming"
      tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      tileAttribution="&copy; OpenStreetMap contributors"
      zoomable
      size={[width, 400]}
      pointStyle={(d) => ({
        fill: d.magnitude > 5 ? "#ef4444" : d.magnitude > 3.5 ? "#f59e0b" : "#22c55e",
        r: Math.max(2, d.magnitude * 1.5),
        stroke: "#fff",
        strokeWidth: 0.5,
      })}
      decay={{ type: "exponential", minOpacity: 0.05 }}
      pulse={{ duration: 600, color: "rgba(239,68,68,0.5)", glowRadius: 8 }}
      enableHover
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition — tile-specific props
// ---------------------------------------------------------------------------

const tileProps = [
  { name: "tileURL", type: "string | ((z, x, y, dpr) => string)", required: true, default: null, description: 'URL template for raster tiles with {z}/{x}/{y} placeholders, or a function returning a URL. Use {r} for retina suffix (@2x). Example: "https://tile.openstreetmap.org/{z}/{x}/{y}.png".' },
  { name: "tileAttribution", type: "string", required: false, default: null, description: "Attribution text displayed in the bottom-right corner of the map. Required by most tile providers (e.g. OpenStreetMap)." },
  { name: "tileCacheSize", type: "number", required: false, default: "256", description: "Maximum number of tile images to cache in memory. LRU eviction removes least-recently-used tiles when the limit is exceeded." },
  { name: "projection", type: '"mercator"', required: true, default: null, description: 'Must be "mercator" when using tiles. Web map tiles use the Mercator (EPSG:3857) tiling scheme. A dev warning is emitted for non-Mercator projections.' },
  { name: "zoomable", type: "boolean", required: false, default: "false", description: "Enable pan and zoom. Strongly recommended with tiles so users can explore the map at different zoom levels." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TileMapPage() {
  return (
    <PageLayout
      title="Tile Maps"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Geo Charts", path: "/charts" },
        { label: "Tile Maps", path: "/charts/tile-map" },
      ]}
      prevPage={{ title: "Distance Cartogram", path: "/charts/distance-cartogram" }}
      nextPage={{ title: "StreamGeoFrame", path: "/frames/geo-frame" }}
    >
      <ComponentMeta
        componentName="Tile Maps"
        importStatement='import { ProportionalSymbolMap, ChoroplethMap } from "semiotic/geo"'
        tier="charts"
        wraps="StreamGeoFrame"
        wrapsPath="/frames/geo-frame"
        related={[
          { name: "ProportionalSymbolMap", path: "/charts/proportional-symbol-map" },
          { name: "ChoroplethMap", path: "/charts/choropleth-map" },
          { name: "StreamGeoFrame", path: "/frames/geo-frame" },
        ]}
      />

      <p>
        Any geo chart or StreamGeoFrame can overlay data on raster map tiles
        from OpenStreetMap, Mapbox, Stamen, or any provider that serves{" "}
        <code>{"{z}/{x}/{y}"}</code> tiles. Add the <code>tileURL</code> prop
        and set <code>projection="mercator"</code> (required for web map tiles)
        to get a fully interactive slippy map with your Semiotic data layers on
        top.
      </p>

      <div style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 24,
        fontSize: 14,
        color: "var(--text-secondary)",
      }}>
        <strong>Note:</strong> Tile maps require <code>projection="mercator"</code>{" "}
        because web map tiles use the Mercator (EPSG:3857) tiling scheme. Other
        projections like <code>"equalEarth"</code> or <code>"naturalEarth"</code>{" "}
        are not compatible with raster tiles.
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Example 1: Proportional Symbol Map with Tiles */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="earthquake-map">Earthquake Map with Tiles</h2>

      <p>
        A <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link>{" "}
        with OpenStreetMap tiles showing notable earthquakes. Circle size
        encodes magnitude, color encodes tectonic region. Pan and zoom to
        explore.
      </p>

      <EarthquakeTileMap width={700} height={450} />

      <CodeBlock
        code={`import { ProportionalSymbolMap } from "semiotic/geo"

const earthquakes = [
  { name: "Tohoku, Japan", lon: 142.4, lat: 38.3, magnitude: 9.1, region: "Pacific" },
  { name: "Sumatra, Indonesia", lon: 95.9, lat: 3.3, magnitude: 9.1, region: "Pacific" },
  { name: "Maule, Chile", lon: -72.9, lat: -35.8, magnitude: 8.8, region: "Pacific" },
  { name: "Gorkha, Nepal", lon: 84.7, lat: 28.2, magnitude: 7.8, region: "Asia" },
  // ...more earthquakes
]

<ProportionalSymbolMap
  points={earthquakes}
  xAccessor="lon"
  yAccessor="lat"
  sizeBy="magnitude"
  sizeRange={[4, 30]}
  colorBy="region"
  showLegend
  projection="mercator"
  tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  tileAttribution="&copy; OpenStreetMap contributors"
  zoomable
  tooltip={(d) => (
    <div>
      <strong>{d.name}</strong><br />
      Magnitude: {d.magnitude} | Depth: {d.depth} km
    </div>
  )}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Example 2: Choropleth with Tiles */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="choropleth-tiles">Semi-Transparent Choropleth over Tiles</h2>

      <p>
        Layer a <Link to="/charts/choropleth-map">ChoroplethMap</Link> on top
        of tiles by reducing the area opacity. The geographic context from the
        tile layer shows through, providing labels and terrain while the
        choropleth encodes your data. Use <code>frameProps.areaOpacity</code>{" "}
        to control transparency.
      </p>

      <ChoroplethTileMap width={700} height={450} />

      <CodeBlock
        code={`import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"

const worldFeatures = await resolveReferenceGeography("world-110m")
const areas = mergeData(worldFeatures, countryGDP, {
  featureKey: "id",
  dataKey: "id"
})

<ChoroplethMap
  areas={areas}
  valueAccessor="gdpPerCapita"
  colorScheme="viridis"
  projection="mercator"
  tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  tileAttribution="&copy; OpenStreetMap contributors"
  zoomable
  tooltip
  frameProps={{
    areaOpacity: 0.55,   // semi-transparent so tiles show through
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Example 3: Streaming points over tiles */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="streaming-tiles">Streaming Points over Tiles</h2>

      <p>
        StreamGeoFrame supports tiles directly, making it easy to stream
        real-time data onto a map. This example simulates seismic events
        appearing along tectonic plate boundaries. Points are color-coded by
        magnitude: green (&lt;3.5), amber (3.5-5), red (&gt;5). Decay and
        pulse encodings fade old events and animate new arrivals.
      </p>

      <StreamingToggle
        staticContent={
          <EarthquakeTileMap width={700} height={400} />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingTileDemo width={w} />}
            code={streamingTileCode}
          />
        }
      />

      <CodeBlock
        code={streamingTileCode}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Tile Providers */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="tile-providers">Tile Providers</h2>

      <p>
        Any provider that serves <code>{"{z}/{x}/{y}"}</code> raster tiles
        works. Here are some common options:
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Provider</th>
            <th style={{ padding: "8px 12px" }}>URL Template</th>
            <th style={{ padding: "8px 12px" }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}>OpenStreetMap</td>
            <td style={{ padding: "8px 12px" }}><code style={{ fontSize: 12 }}>https://tile.openstreetmap.org/{"{z}/{x}/{y}"}.png</code></td>
            <td style={{ padding: "8px 12px" }}>Free, requires attribution</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}>Stadia (Stamen Toner Lite)</td>
            <td style={{ padding: "8px 12px" }}><code style={{ fontSize: 12 }}>https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{"{z}/{x}/{y}"}.png</code></td>
            <td style={{ padding: "8px 12px" }}>Minimal black-and-white style</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}>Stadia (Stamen Watercolor)</td>
            <td style={{ padding: "8px 12px" }}><code style={{ fontSize: 12 }}>https://tiles.stadiamaps.com/tiles/stamen_watercolor/{"{z}/{x}/{y}"}.jpg</code></td>
            <td style={{ padding: "8px 12px" }}>Artistic watercolor style</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-2)" }}>
            <td style={{ padding: "8px 12px" }}>CartoDB (Positron)</td>
            <td style={{ padding: "8px 12px" }}><code style={{ fontSize: 12 }}>https://basemaps.cartocdn.com/light_all/{"{z}/{x}/{y}"}.png</code></td>
            <td style={{ padding: "8px 12px" }}>Clean light basemap, good for data overlays</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px" }}>CartoDB (Dark Matter)</td>
            <td style={{ padding: "8px 12px" }}><code style={{ fontSize: 12 }}>https://basemaps.cartocdn.com/dark_all/{"{z}/{x}/{y}"}.png</code></td>
            <td style={{ padding: "8px 12px" }}>Dark basemap for dashboards</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Tips */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="tips">Tips</h2>

      <h3>Projection must be Mercator</h3>
      <p>
        Web map tiles are pre-rendered in the Mercator projection (EPSG:3857).
        If you set <code>projection="equalEarth"</code> or any non-Mercator
        projection, tiles will not align with your data. Always use{" "}
        <code>projection="mercator"</code> with <code>tileURL</code>.
      </p>

      <h3>Pair with zoomable</h3>
      <p>
        Tile maps are most useful when users can pan and zoom. The{" "}
        <code>zoomable</code> prop enables scroll-wheel zoom and drag panning,
        and the tile layer automatically loads higher-resolution tiles as you
        zoom in.
      </p>

      <h3>Use subtle tile styles for data overlays</h3>
      <p>
        When overlaying a choropleth or dense point cloud, use a minimal tile
        style like CartoDB Positron or Stamen Toner Lite so tiles provide
        context without competing with your data layer. For choropleths, reduce
        area opacity via <code>frameProps</code> so tiles show through.
      </p>

      <h3>Attribution is required</h3>
      <p>
        Most tile providers require attribution. Use <code>tileAttribution</code>{" "}
        to display the required text (rendered as a small overlay in the
        bottom-right corner of the map).
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Tile Props</h2>

      <p>
        These props are available on all geo components:{" "}
        <code>ProportionalSymbolMap</code>, <code>ChoroplethMap</code>,{" "}
        <code>FlowMap</code>, <code>DistanceCartogram</code>, and{" "}
        <code>StreamGeoFrame</code>.
      </p>

      <PropTable componentName="Tile Map" props={tileProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/proportional-symbol-map">ProportionalSymbolMap</Link>{" "}
          — sized circles on a map for point data
        </li>
        <li>
          <Link to="/charts/choropleth-map">ChoroplethMap</Link> — color
          regions by value
        </li>
        <li>
          <Link to="/charts/flow-map">FlowMap</Link> — visualize flows between
          geographic locations
        </li>
        <li>
          <Link to="/frames/geo-frame">StreamGeoFrame</Link> — the underlying
          Frame with full control over tiles, areas, and points
        </li>
      </ul>
    </PageLayout>
  )
}
