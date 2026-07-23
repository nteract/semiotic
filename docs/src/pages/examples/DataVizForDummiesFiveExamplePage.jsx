import React, { useEffect, useState } from "react"
import { ThemeProvider } from "semiotic"
import {
  ChoroplethMap,
  DistanceCartogram,
  FlowMap,
  GeoCustomChart,
  ProportionalSymbolMap,
} from "semiotic/geo"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import sfNeighborhoods from "./data/sfAnalysisNeighborhoods.json"
import "./DataVizForDummiesExamplePage.css"
import "./DataVizForDummiesFiveExamplePage.css"

const INK = "#18211b"
const GOLD = "#ffd166"
const CYAN = "#63d8ff"
const CORAL = "#ff6f61"
const BLUE = "#5b8def"
const VIOLET = "#a77bea"
const MINT = "#76e5c2"
const PALETTE = [GOLD, CYAN, CORAL, BLUE, VIOLET, MINT]

const SECTIONS = [
  { id: "map-room", short: "Map", label: "The map room" },
  { id: "regional-value", short: "Region", label: "Regional value" },
  { id: "located-magnitude", short: "Point", label: "Located magnitude" },
  { id: "geographic-flow", short: "Flow", label: "Geographic flow" },
  { id: "felt-distance", short: "Cost", label: "Felt distance" },
  { id: "street-context", short: "Tile", label: "Street context" },
  { id: "custom-geography", short: "Custom", label: "Custom geography" },
  { id: "atlas-review", short: "Review", label: "Decision rules" },
]

const MAP_ROSTER = [
  {
    chart: "Choropleth",
    data: "regions + one rate",
    job: "compare values attached to areas",
    danger: "large land areas dominate attention",
  },
  {
    chart: "Proportional symbol",
    data: "coordinates + magnitude",
    job: "compare located totals",
    danger: "overlap hides small neighbors",
  },
  {
    chart: "Flow map",
    data: "places + directed connections",
    job: "show movement between locations",
    danger: "routes become spaghetti",
  },
  {
    chart: "Distance cartogram",
    data: "places + cost from an origin",
    job: "replace miles with experienced distance",
    danger: "geographic position is deliberately broken",
  },
  {
    chart: "Tiled map",
    data: "precise coordinates + local context",
    job: "support street-level orientation",
    danger: "basemap detail can overpower the data",
  },
  {
    chart: "Geo custom",
    data: "projected data + a bespoke layout",
    job: "invent geography-aware geometry",
    danger: "the metaphor must remain navigable",
  },
]

// Simplified from San Francisco's official Analysis Neighborhood boundaries.
// The values are illustrative, but every polygon and place below is real.
const SF_NEIGHBORHOODS = sfNeighborhoods.features.map((feature, index) => ({
  ...feature,
  geometry: {
    ...feature.geometry,
    // The source follows the common shapefile winding convention. d3-geo
    // uses RFC 7946 spherical winding, so reverse every ring before fitting.
    coordinates:
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates.map((ring) => [...ring].reverse())
        : feature.geometry.coordinates.map((polygon) =>
            polygon.map((ring) => [...ring].reverse()),
          ),
  },
  properties: {
    ...feature.properties,
    attendance: 38 + ((index * 17) % 61),
    youthShare: 12 + ((index * 11) % 32),
  },
}))

const SCOUTING_CITIES = [
  { id: "Rookie City", lon: -122.42, lat: 37.77, prospects: 14, games: 41, region: "Home" },
  { id: "Toronto", lon: -79.38, lat: 43.65, prospects: 8, games: 6, region: "Americas" },
  { id: "Mexico City", lon: -99.13, lat: 19.43, prospects: 11, games: 4, region: "Americas" },
  { id: "São Paulo", lon: -46.63, lat: -23.55, prospects: 13, games: 5, region: "Americas" },
  { id: "Paris", lon: 2.35, lat: 48.86, prospects: 7, games: 3, region: "Europe" },
  { id: "Lagos", lon: 3.38, lat: 6.52, prospects: 16, games: 2, region: "Africa" },
  { id: "Belgrade", lon: 20.46, lat: 44.81, prospects: 12, games: 4, region: "Europe" },
  { id: "Manila", lon: 120.98, lat: 14.6, prospects: 18, games: 3, region: "Asia-Pacific" },
  { id: "Melbourne", lon: 144.96, lat: -37.81, prospects: 9, games: 5, region: "Asia-Pacific" },
]

const TEAM_FLOWS = [
  { id: "tor-home", source: "Toronto", target: "Rookie City", value: 8, trip: "Recruiting" },
  { id: "mex-home", source: "Mexico City", target: "Rookie City", value: 11, trip: "Recruiting" },
  { id: "sao-home", source: "São Paulo", target: "Rookie City", value: 13, trip: "Recruiting" },
  { id: "par-home", source: "Paris", target: "Rookie City", value: 7, trip: "Recruiting" },
  { id: "lag-home", source: "Lagos", target: "Rookie City", value: 16, trip: "Recruiting" },
  { id: "bel-home", source: "Belgrade", target: "Rookie City", value: 12, trip: "Recruiting" },
  { id: "man-home", source: "Manila", target: "Rookie City", value: 18, trip: "Recruiting" },
  { id: "mel-home", source: "Melbourne", target: "Rookie City", value: 9, trip: "Recruiting" },
]

const TRAVEL_CITIES = [
  { id: "Rookie City", lon: -122.42, lat: 37.77, hours: 0, conference: "Home" },
  { id: "Los Angeles", lon: -118.24, lat: 34.05, hours: 1.4, conference: "West" },
  { id: "Seattle", lon: -122.33, lat: 47.61, hours: 2.3, conference: "West" },
  { id: "Denver", lon: -104.99, lat: 39.74, hours: 3, conference: "West" },
  { id: "Dallas", lon: -96.8, lat: 32.78, hours: 3.8, conference: "Central" },
  { id: "Chicago", lon: -87.63, lat: 41.88, hours: 4.5, conference: "Central" },
  { id: "Miami", lon: -80.19, lat: 25.76, hours: 6.5, conference: "East" },
  { id: "New York", lon: -74, lat: 40.71, hours: 7, conference: "East" },
]
const TRAVEL_ROUTES = TRAVEL_CITIES.slice(1).map((city) => ({
  source: "Rookie City",
  target: city.id,
}))

const LOCAL_EVENTS = [
  { id: "Chase Center", lon: -122.3875, lat: 37.768, visits: 96, kind: "Game" },
  { id: "Kezar Pavilion", lon: -122.456, lat: 37.7678, visits: 43, kind: "Watch party" },
  { id: "Hamilton Rec Center", lon: -122.435, lat: 37.7849, visits: 35, kind: "Clinic" },
  { id: "Moscone Center", lon: -122.401, lat: 37.784, visits: 58, kind: "Retail" },
  { id: "Betty Ann Ong Rec Center", lon: -122.4104, lat: 37.7943, visits: 49, kind: "Clinic" },
  { id: "Palega Rec Center", lon: -122.4092, lat: 37.7277, visits: 27, kind: "Watch party" },
  { id: "Minnie & Lovie Ward Rec Center", lon: -122.4265, lat: 37.7169, visits: 31, kind: "Retail" },
]

const COURT_SITES = [
  { id: "Chase Center", lon: -122.3875, lat: 37.768, family: "Team", value: 100 },
  { id: "Kezar Pavilion", lon: -122.456, lat: 37.7678, family: "Community", value: 74 },
  { id: "Hamilton", lon: -122.435, lat: 37.7849, family: "Community", value: 61 },
  { id: "Betty Ann Ong", lon: -122.4104, lat: 37.7943, family: "Community", value: 68 },
  { id: "Palega", lon: -122.4092, lat: 37.7277, family: "School", value: 52 },
  { id: "Minnie & Lovie Ward", lon: -122.4265, lat: 37.7169, family: "School", value: 47 },
]

function sanFranciscoCourtLayout(ctx) {
  const nodes = []
  const labels = []
  for (const feature of ctx.areas) {
    const pathData = ctx.scales.geoPath(feature)
    if (!pathData) continue
    const bounds = ctx.scales.geoPath.bounds(feature)
    const centroid = ctx.scales.geoPath.centroid(feature)
    nodes.push({
      type: "geoarea",
      pathData,
      centroid,
      bounds,
      screenArea: Math.abs((bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1])),
      style: {
        fill: "var(--semiotic-bg-secondary, #e7e4d8)",
        stroke: "var(--semiotic-border, #a9a89f)",
        strokeWidth: 0.75,
      },
      datum: feature.properties,
      group: "San Francisco neighborhood",
    })
  }
  for (const site of ctx.points) {
    const point = ctx.scales.projectedPoint(site.lon, site.lat)
    if (!point) continue
    const color = ctx.resolveColor(site.family)
    nodes.push({
      type: "point",
      x: point[0],
      y: point[1],
      r: 11,
      style: { fill: color, stroke: INK, strokeWidth: 1.4, opacity: 0.92 },
      datum: site,
      pointId: site.id,
    })
    labels.push(
      <g key={site.id} transform={`translate(${point[0]} ${point[1]})`} pointerEvents="none">
        <rect x="-10" y="-7" width="20" height="14" rx="2" fill={color} stroke={INK} strokeWidth="1.2" />
        <path d="M0-7V7M-10 0H10" stroke={INK} strokeWidth=".7" opacity=".72" />
        <circle r="2.4" fill="none" stroke={INK} strokeWidth=".7" />
        <text
          x="0"
          y="-13"
          textAnchor="middle"
          fill="var(--semiotic-text)"
          fontSize="8"
          fontWeight="800"
        >
          {site.id}
        </text>
      </g>,
    )
  }
  return { nodes, overlays: <g>{labels}</g> }
}

const CHAPTER_STATS = {
  "map-room": { scan: 86, exact: 54, change: 62, shape: 97, story: 99 },
  "regional-value": { scan: 96, exact: 47, change: 42, shape: 88, story: 91 },
  "located-magnitude": { scan: 88, exact: 62, change: 35, shape: 94, story: 87 },
  "geographic-flow": { scan: 72, exact: 53, change: 92, shape: 100, story: 98 },
  "felt-distance": { scan: 78, exact: 58, change: 97, shape: 100, story: 99 },
  "street-context": { scan: 94, exact: 71, change: 56, shape: 86, story: 90 },
  "custom-geography": { scan: 68, exact: 61, change: 73, shape: 100, story: 96 },
}

export default function DataVizForDummiesFiveExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [regionMetric, setRegionMetric] = useState("attendance")
  const [symbolMetric, setSymbolMetric] = useState("prospects")
  const [flowMotion, setFlowMotion] = useState(false)
  const [cartogramStrength, setCartogramStrength] = useState(1)
  const [tileContext, setTileContext] = useState(true)
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)
  const compact = pageWidth < 780

  useEffect(() => {
    const elements = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean)
    if (!elements.length || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: "-22% 0px -58%", threshold: [0, 0.15, 0.4, 0.7] },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <ExamplePageLayout title="Data Viz for Dummies V">
      <div className="dvd dvd--fifth" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">The road season · geography joins the scouting report</p>
            <h2>A map is a chart only when location changes the answer.</h2>
            <p className="dvd-hero__lede">
              Parts I through IV completed the core roster. Part V leaves the arena and asks what
              happens when adjacency, distance, direction, or street context becomes data. Six geo
              formations show when the map earns its minutes—and when geography is just expensive
              wallpaper.
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>6 geo formations</span>
              <span>6 location contracts</span>
              <span>0 decorative maps</span>
            </div>
          </div>
          <div className="dvd-card dvd-card--hero" aria-label="Fifth chart selection scouting card">
            <div className="dvd-card__topline">
              <span>GEO 501</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">05</strong>
            <div className="dvd-card__name">THE ROAD MAP</div>
            <div className="dvd-card__position">Where · how far · which way</div>
            <div className="dvd-card__stats">
              <MiniStat label="Place" value="100" />
              <MiniStat label="Route" value="98" />
              <MiniStat label="Scale" value="95" />
              <MiniStat label="Globe" value="00" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Fifth data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">THE ATLAS</span>
          <div className="dvd-nav__links">
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={activeSection === section.id ? "is-active" : ""}
                aria-current={activeSection === section.id ? "location" : undefined}
              >
                <i>{String(index).padStart(2, "0")}</i>
                <span className="dvd-nav__long">{section.label}</span>
                <span className="dvd-nav__short">{section.short}</span>
              </a>
            ))}
          </div>
        </nav>

        <ThemeProvider theme={chartTheme}>
          <div className="dvd-guide">
            <GuideChapter
              id="map-room"
              number="00"
              eyebrow="Map room · location must do analytical work"
              title="Before choosing a map, name the geographic relationship the reader needs."
              lead="Geo charts encode more than coordinates. Regions imply adjacency, symbols preserve exact locations, flows add direction, cartograms redefine distance, tiles provide navigational context, and custom layouts preserve projection while changing the visible grammar."
              avoid="If the conclusion would survive after replacing every place name with A, B, and C, geography may not be carrying the argument. Try a bar chart before reaching for an atlas."
              stats={CHAPTER_STATS["map-room"]}
            >
              <ChartPanel
                eyebrow="Six-map travel roster"
                title="Every formation answers a different version of ‘where?’"
                note="Read the data contract before the chart name. Area, point, edge, cost, street, and custom geometry are not interchangeable geographic ingredients."
                feature="Import geography from its dedicated entry point"
                featureCopy="Geo charts live in semiotic/geo, keeping projections and bundled reference geography out of applications that never draw a map."
              >
                <div className="dvd5-roster" role="list">
                  {MAP_ROSTER.map((row, index) => (
                    <article key={row.chart} role="listitem">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>{row.data}</small>
                        <h4>{row.chart}</h4>
                      </div>
                      <p>{row.job}</p>
                      <em>{row.danger}</em>
                    </article>
                  ))}
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="regional-value"
              number="01"
              eyebrow="Choropleth · regional scouting"
              title="Color the area only when the value belongs to the area."
              lead="Choropleths bind one numeric measure to each geographic feature. They excel at rates, shares, and normalized measures whose meaning is regional. Adjacency and broad spatial clusters become visible immediately."
              avoid="Raw totals reward populous or large regions twice: once in the number and again in visual area. Normalize when exposure differs, and never let missing data masquerade as zero."
              stats={CHAPTER_STATS["regional-value"]}
            >
              <ChartPanel
                eyebrow="San Francisco neighborhoods · two legitimate regional measures"
                title={regionMetric === "attendance" ? "Attendance rate follows the actual city fabric" : "Youth-program share shifts across the same neighborhoods"}
                note={regionMetric === "attendance" ? "Every fill represents an illustrative attendance rate, so the metric belongs to a real neighborhood rather than a made-up rectangle." : "The polygons stay fixed while the illustrative youth-program share changes, keeping geography and measurement separate."}
                feature="Switch the accessor without changing geography"
                featureCopy="ChoroplethMap keeps the geographic features stable while valueAccessor changes the analytical layer, making honest metric comparison straightforward."
              >
                <ChartToggle
                  label="Choose a regional measure"
                  value={regionMetric}
                  onChange={setRegionMetric}
                  options={[["attendance", "Attendance rate"], ["youthShare", "Youth share"]]}
                />
                <ChoroplethMap
                  key={regionMetric}
                  areas={SF_NEIGHBORHOODS}
                  valueAccessor={(feature) => feature.properties[regionMetric]}
                  colorScheme={regionMetric === "attendance" ? "viridis" : "oranges"}
                  projection="mercator"
                  fitPadding={0.08}
                  stroke="#f5f0df"
                  strokeWidth={2}
                  width={chartWidth}
                  height={430}
                  margin={{ top: 28, right: compact ? 28 : 112, bottom: 30, left: 28 }}
                  showLegend={!compact}
                  title={`San Francisco neighborhood ${regionMetric === "attendance" ? "attendance rate" : "youth share"}`}
                  description={`A choropleth colors real San Francisco Analysis Neighborhood boundaries by an illustrative ${regionMetric === "attendance" ? "attendance rate" : "youth-program share"}.`}
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="located-magnitude"
              number="02"
              eyebrow="Proportional symbol · the scouting circuit"
              title="Keep the place fixed and let magnitude change the mark."
              lead="Proportional symbols place a circle at each coordinate and scale its radius from a measure. Unlike a choropleth, the value belongs to a site rather than the surrounding land. Color can add a categorical region without repainting the world."
              avoid="Area is compared imprecisely, and large circles can cover smaller neighbors. Use restrained size ranges, transparency, and tooltips—and cluster or zoom when locations become dense."
              stats={CHAPTER_STATS["located-magnitude"]}
            >
              <ChartPanel
                eyebrow="Global scouting stops · talent + games"
                title={symbolMetric === "prospects" ? "Lagos and Manila hold the deepest prospect pools" : "The home schedule dwarfs every road stop"}
                note="The points do not claim anything about the countries beneath them. Their positions identify scouting markets; circle area carries the chosen total."
                feature="Separate geographic position from symbol magnitude"
                featureCopy="ProportionalSymbolMap accepts independent coordinate, size, and color accessors, so every visual channel has one declared job."
              >
                <ChartToggle
                  label="Choose a symbol measure"
                  value={symbolMetric}
                  onChange={setSymbolMetric}
                  options={[["prospects", "Prospects"], ["games", "Games watched"]]}
                />
                <ProportionalSymbolMap
                  key={symbolMetric}
                  points={SCOUTING_CITIES}
                  xAccessor="lon"
                  yAccessor="lat"
                  sizeBy={symbolMetric}
                  sizeRange={[5, symbolMetric === "prospects" ? 25 : 32]}
                  colorBy="region"
                  colorScheme={PALETTE}
                  areas="world-110m"
                  areaStyle={{ fill: "#d8d5c9", stroke: "#ffffff", strokeWidth: 0.5, opacity: 0.72 }}
                  projection="equalEarth"
                  graticule={{ stroke: "#aaa", strokeWidth: 0.35, opacity: 0.35 }}
                  fitPadding={0.03}
                  width={chartWidth}
                  height={440}
                  margin={{ top: 26, right: compact ? 28 : 118, bottom: 28, left: 28 }}
                  showLegend={!compact}
                  title={`Global scouting ${symbolMetric}`}
                  description={`A proportional symbol map sizes nine scouting cities by ${symbolMetric === "prospects" ? "prospects evaluated" : "games watched"}.`}
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="geographic-flow"
              number="03"
              eyebrow="Flow map · talent has a direction"
              title="Two places become a geographic story when an edge explains movement."
              lead="Flow maps connect known locations and encode volume with line width. Great-circle paths respect the globe; arc and offset styles separate overlapping or reciprocal routes. Direction, not mere connection, is the sentence."
              avoid="A bright animated particle can imply live movement even when the data is a historical total. Motion should describe motion; otherwise a static line is more honest and easier to read."
              stats={CHAPTER_STATS["geographic-flow"]}
            >
              <ChartPanel
                eyebrow="Prospect network · eight markets to Rookie City"
                title={flowMotion ? "Particles turn recruitment totals into a motion claim" : "Static arcs keep volume and origin in the foreground"}
                note="Every route ends at Rookie City; line width reflects prospects evaluated. Toggle motion to see why animation changes the perceived tense of the data."
                feature="Use particles only for an active-flow claim"
                featureCopy="FlowMap shares one geometry between static edges and particle animation, making the narrative cost of motion easy to inspect."
              >
                <ChartToggle
                  label="Choose flow treatment"
                  value={flowMotion ? "motion" : "static"}
                  onChange={(value) => setFlowMotion(value === "motion")}
                  options={[["static", "Static volume"], ["motion", "Moving flow"]]}
                />
                <FlowMap
                  nodes={SCOUTING_CITIES}
                  flows={TEAM_FLOWS}
                  nodeIdAccessor="id"
                  valueAccessor="value"
                  lineIdAccessor="id"
                  edgeColorBy="trip"
                  colorScheme={[CYAN]}
                  edgeWidthRange={[1.5, 8]}
                  edgeOpacity={0.7}
                  lineType="geo"
                  flowStyle="arc"
                  showParticles={flowMotion}
                  particleStyle={{ radius: 2.5, color: CYAN, speedMultiplier: 0.8, opacity: 0.8 }}
                  pointRadius={5}
                  areas="world-110m"
                  areaStyle={{ fill: "#d8d5c9", stroke: "#ffffff", strokeWidth: 0.5, opacity: 0.68 }}
                  projection="equalEarth"
                  fitPadding={0.03}
                  width={chartWidth}
                  height={450}
                  margin={{ top: 26, right: 28, bottom: 28, left: 28 }}
                  title="Global prospect flow to Rookie City"
                  description="A flow map connects eight international scouting markets to fictional Rookie City, with line width representing prospects evaluated."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="felt-distance"
              number="04"
              eyebrow="Distance cartogram · the schedule as experienced"
              title="A flight hour can move a city farther than a thousand miles."
              lead="Distance cartograms distort location so radial distance from one origin represents travel time, fare, or another cost. The familiar map becomes a before-image; the cartogram shows the geography the team actually experiences."
              avoid="Once strength rises, compass direction may survive but literal position does not. Label the cost, show reference rings, and give readers a geographic comparison when orientation matters."
              stats={CHAPTER_STATS["felt-distance"]}
            >
              <ChartPanel
                eyebrow="Road schedule · hours from Rookie City"
                title={
                  cartogramStrength === 0
                    ? "Geography: cities stay where the atlas put them"
                    : cartogramStrength === 0.5
                      ? "Halfway: map position and travel cost share the floor"
                      : "Travel time: the coast-to-coast schedule stretches into cost"
                }
                note="Toggle between the geographic baseline and full distortion. New York and Miami move to seven- and six-and-a-half-hour rings regardless of their map distance."
                feature="Use strength to disclose the distortion"
                featureCopy="DistanceCartogram interpolates from geographic placement to cost placement, so the reader can inspect exactly what the alternative geography changes."
              >
                <ChartToggle
                  label="Choose cartogram strength"
                  value={String(cartogramStrength)}
                  onChange={(value) => setCartogramStrength(Number(value))}
                  options={[["0", "Geography"], ["0.5", "Halfway"], ["1", "Travel time"]]}
                />
                <DistanceCartogram
                  points={TRAVEL_CITIES}
                  lines={TRAVEL_ROUTES}
                  xAccessor="lon"
                  yAccessor="lat"
                  nodeIdAccessor="id"
                  center="Rookie City"
                  costAccessor="hours"
                  costLabel="hrs"
                  strength={cartogramStrength}
                  lineMode="fractional"
                  transition={500}
                  projection="mercator"
                  colorBy="conference"
                  colorScheme={{ Home: GOLD, West: CYAN, Central: VIOLET, East: CORAL }}
                  pointRadius={7}
                  showRings={[2, 4, 6]}
                  showRingLabels
                  width={chartWidth}
                  height={460}
                  margin={{ top: 28, right: compact ? 26 : 98, bottom: 34, left: 28 }}
                  showLegend={!compact}
                  title="Road travel time from Rookie City"
                  description="A distance cartogram repositions seven opponent cities by flight hours from Rookie City."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
                <div className="dvd5-sparkline">
                  <div>
                    <strong>Sparkline mode is the intentional strip</strong>
                    <span>Geographic bearing disappears; cost runs left to right.</span>
                  </div>
                  <DistanceCartogram
                    points={TRAVEL_CITIES}
                    xAccessor="lon"
                    yAccessor="lat"
                    nodeIdAccessor="id"
                    center="Rookie City"
                    costAccessor="hours"
                    costLabel="hrs"
                    mode="sparkline"
                    colorBy="conference"
                    colorScheme={{ Home: GOLD, West: CYAN, Central: VIOLET, East: CORAL }}
                    width={Math.min(chartWidth - 24, 560)}
                    height={48}
                    showRings={3}
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="street-context"
              number="05"
              eyebrow="Tiled map · context has a zoom level"
              title="Add streets when the reader must navigate, not merely locate."
              lead="Raster tiles turn a projected chart into a familiar pan-and-zoom map. They are useful when block, corridor, coast, or neighborhood context helps the task. The analytical marks must remain legible above the basemap."
              avoid="Tiles bring visual noise, network requests, attribution duties, and a strong claim of locational precision. If districts alone answer the question, the street grid is overhead."
              stats={CHAPTER_STATS["street-context"]}
            >
              <ChartPanel
                eyebrow="Local activations · atlas versus street context"
                title={tileContext ? "Street context supports the route to each activation" : "Data-only geography keeps attention on turnout"}
                note="The symbols sit at real San Francisco venues over real OpenStreetMap streets. Turn the tiles off to see exactly how much navigational context the basemap contributes."
                feature="Treat the basemap as an optional layer"
                featureCopy="Geo HOCs expose tileURL, zoomable, and attribution without changing the point or area accessors. Toggle context without rebuilding the chart."
              >
                <ChartToggle
                  label="Choose map context"
                  value={tileContext ? "tiles" : "data"}
                  onChange={(value) => setTileContext(value === "tiles")}
                  options={[["data", "Data only"], ["tiles", "Street context"]]}
                />
                <ProportionalSymbolMap
                  key={tileContext ? "tiles" : "data"}
                  points={LOCAL_EVENTS}
                  xAccessor="lon"
                  yAccessor="lat"
                  sizeBy="visits"
                  sizeRange={[7, 24]}
                  colorBy="kind"
                  colorScheme={{ Game: GOLD, "Watch party": CYAN, Clinic: VIOLET, Retail: CORAL }}
                  areas={SF_NEIGHBORHOODS}
                  areaStyle={{
                    fill: tileContext ? "rgba(255,255,255,0.15)" : "#d8d5c9",
                    stroke: tileContext ? "rgba(24,33,27,0.35)" : "#ffffff",
                    strokeWidth: 0.7,
                  }}
                  projection="mercator"
                  tileURL={tileContext ? "https://tile.openstreetmap.org/{z}/{x}/{y}.png" : undefined}
                  tileAttribution={tileContext ? "© OpenStreetMap contributors" : undefined}
                  zoomable={tileContext}
                  zoomExtent={[1, 6]}
                  fitPadding={0.07}
                  width={chartWidth}
                  height={450}
                  margin={{ top: 26, right: compact ? 28 : 112, bottom: 30, left: 28 }}
                  showLegend={!compact}
                  title="San Francisco local activations"
                  description="A local proportional-symbol map places seven illustrative events at real San Francisco venues over official neighborhood boundaries and optional OpenStreetMap tiles."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="custom-geography"
              number="06"
              eyebrow="Geo custom · projection without a preset grammar"
              title="Keep the geographic contract while inventing the mark."
              lead="GeoCustomChart resolves projection, dimensions, theme, hit testing, accessibility, and tooltips before handing geometry to a layout function. The layout can emit geographic areas, lines, points, and SVG overlays without rebuilding the frame."
              avoid="Custom geometry raises the explanation burden. Preserve recognizable coordinates, make hit targets accessible, and state which parts are measured versus illustrative."
              stats={CHAPTER_STATS["custom-geography"]}
            >
              <ChartPanel
                eyebrow="Court access board · district + venue geometry"
                title="A custom court glyph stands on the same projected city"
                note="Official San Francisco neighborhood polygons remain geographic. Each real venue becomes an interactive point plus a court glyph and label—the bespoke layer owns appearance, not projection."
                feature="Let custom layouts own geometry, not infrastructure"
                featureCopy="GeoCustomChart passes fitted projection helpers and theme colors into the layout while the frame retains rendering, tooltips, keyboard navigation, and accessible data."
              >
                <GeoCustomChart
                  areas={SF_NEIGHBORHOODS}
                  points={COURT_SITES}
                  projection="mercator"
                  layout={sanFranciscoCourtLayout}
                  colorBy="family"
                  colorScheme={{ Community: CYAN, School: VIOLET, Team: GOLD }}
                  width={chartWidth}
                  height={460}
                  margin={{ top: 30, right: 30, bottom: 34, left: 30 }}
                  title="San Francisco court access board"
                  description="A custom geographic chart draws official San Francisco Analysis Neighborhoods and six labeled real-world basketball venues using a fitted Mercator projection."
                  summary="Community, school, and team court glyphs remain anchored to real San Francisco coordinates."
                  tooltip
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="atlas-review" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Atlas review · location earns its ink</p>
            <h2>Choose the map from the geographic relationship, not the backdrop.</h2>
            <p>
              A map should reveal adjacency, location, movement, experienced distance, navigation,
              or projected custom geometry. If none of those changes the answer, bench the map.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision verb="Compare regional rates" chart="Choropleth" note="Values belong to areas; normalize exposure." />
            <Decision verb="Compare located totals" chart="Proportional symbol" note="Coordinates stay fixed; area carries magnitude." />
            <Decision verb="Show movement between places" chart="Flow map" note="Direction and volume must both matter." />
            <Decision verb="Replace miles with cost" chart="Distance cartogram" note="Disclose exactly how geography is distorted." />
            <Decision verb="Support local navigation" chart="Tiled map" note="Add only the context the task requires." />
            <Decision verb="Invent a geographic mark" chart="Geo custom" note="Keep projection and accessibility in the frame." />
            <Decision verb="Location changes nothing" chart="Skip the map" note="A ranked chart will usually read faster." />
            <Decision verb="The geography is uncertain" chart="Show that uncertainty" note="Precision is part of the claim." />
          </div>
          <blockquote>
            The map is not the territory—and it is not automatically the chart, either.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE FIFTH RULE</span>
            <strong>Name what location contributes before drawing the map.</strong>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function ChartToggle({ label, value, onChange, options }) {
  return (
    <div className="dvd-segmented dvd5-toggle" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className={value === id ? "is-active" : ""}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function GuideChapter({ id, number, eyebrow, title, lead, avoid, stats, children }) {
  return (
    <section id={id} className="dvd-chapter">
      <div className="dvd-chapter__copy">
        <div className="dvd-chapter__number">{number}</div>
        <p className="dvd-chapter__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="dvd-chapter__lead">{lead}</p>
        <div className="dvd-coach">
          <span>COACH’S CHALLENGE</span>
          <p>{avoid}</p>
        </div>
        <ScoutingStats stats={stats} />
      </div>
      <div className="dvd-chapter__stage">{children}</div>
    </section>
  )
}

function ChartPanel({ eyebrow, title, note, feature, featureCopy, children }) {
  return (
    <article className="dvd-chart-panel">
      <header>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
        <span>{note}</span>
      </header>
      <div className="dvd-chart-panel__plot">{children}</div>
      <aside className="dvd-feature-note">
        <div className="dvd-feature-note__flag">
          <i aria-hidden="true">✦</i> You should think about using this feature
        </div>
        <strong>{feature}</strong>
        <p>{featureCopy}</p>
      </aside>
    </article>
  )
}

function ScoutingStats({ stats }) {
  return (
    <div className="dvd-scout" aria-label="Chart scouting ratings out of 100">
      <div className="dvd-scout__head">
        <span>SCOUTING</span>
        <small>
          OVR{" "}
          {Math.round(
            Object.values(stats).reduce((sum, value) => sum + value, 0) /
              Object.keys(stats).length,
          )}
        </small>
      </div>
      {Object.entries(stats).map(([label, value]) => (
        <div className="dvd-scout__row" key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${value}%` }} /></div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Decision({ verb, chart, note }) {
  return (
    <article>
      <span>I need to…</span>
      <h3>{verb}</h3>
      <strong>{chart}</strong>
      <p>{note}</p>
    </article>
  )
}
