import React, { useEffect, useState } from "react"
import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const controls = [
  { name: "colorScheme", type: "select", label: "Color Scheme", group: "Color",
    default: "viridis", options: ["blues", "reds", "greens", "viridis"] },
  { name: "graticule", type: "boolean", label: "Show Graticule", group: "Map",
    default: false },
  { name: "projection", type: "select", label: "Projection", group: "Map",
    default: "equalEarth", options: ["mercator", "equalEarth", "naturalEarth", "equirectangular"] },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "zoomable", type: "boolean", label: "Enable Zoom/Pan", group: "Interaction",
    default: true },
  { name: "title", type: "string", label: "Title", group: "Layout",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets — pre-enriched world maps
// ---------------------------------------------------------------------------

const gdpData = [
  { id: "840", gdpPerCapita: 63544 }, { id: "156", gdpPerCapita: 12556 },
  { id: "392", gdpPerCapita: 39313 }, { id: "276", gdpPerCapita: 51204 },
  { id: "826", gdpPerCapita: 46510 }, { id: "356", gdpPerCapita: 2277 },
  { id: "250", gdpPerCapita: 43519 }, { id: "380", gdpPerCapita: 34997 },
  { id: "076", gdpPerCapita: 8918 }, { id: "124", gdpPerCapita: 52051 },
  { id: "410", gdpPerCapita: 34801 }, { id: "643", gdpPerCapita: 12173 },
  { id: "036", gdpPerCapita: 51812 }, { id: "724", gdpPerCapita: 30104 },
  { id: "484", gdpPerCapita: 10046 }, { id: "360", gdpPerCapita: 4292 },
  { id: "528", gdpPerCapita: 57768 }, { id: "756", gdpPerCapita: 93720 },
  { id: "682", gdpPerCapita: 27680 }, { id: "792", gdpPerCapita: 9327 },
  { id: "752", gdpPerCapita: 55566 }, { id: "616", gdpPerCapita: 17840 },
  { id: "578", gdpPerCapita: 89090 }, { id: "566", gdpPerCapita: 2066 },
  { id: "032", gdpPerCapita: 10636 }, { id: "710", gdpPerCapita: 6994 },
]

const popData = [
  { id: "156", population: 1412000000 }, { id: "356", population: 1408000000 },
  { id: "840", population: 331900000 }, { id: "360", population: 273500000 },
  { id: "586", population: 220900000 }, { id: "076", population: 214300000 },
  { id: "566", population: 218500000 }, { id: "050", population: 169400000 },
  { id: "643", population: 145900000 }, { id: "484", population: 128900000 },
  { id: "392", population: 125700000 }, { id: "608", population: 110000000 },
  { id: "818", population: 102300000 }, { id: "276", population: 83200000 },
  { id: "826", population: 67400000 }, { id: "250", population: 67750000 },
  { id: "380", population: 60300000 }, { id: "710", population: 59300000 },
]

// Wrapper that loads world map, enriches with data, then renders ChoroplethMap
function WorldChoroplethWrapper({ dataset = "gdp", ...props }) {
  const [areas, setAreas] = useState(null)

  useEffect(() => {
    resolveReferenceGeography("world-110m").then(features => {
      const data = dataset === "gdp" ? gdpData : popData
      const enriched = mergeData(features, data, { featureKey: "id", dataKey: "id" })
      setAreas(enriched)
    })
  }, [dataset])

  if (!areas) return <div style={{ width: props.width || 600, height: props.height || 400, background: "var(--surface-1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>Loading world map...</div>

  return <ChoroplethMap {...props} areas={areas} />
}

const datasets = [
  {
    label: "GDP per Capita (26 countries)",
    dataset: "gdp",
    valueAccessor: "gdpPerCapita",
    codeString: `// Resolve built-in world map, join GDP data by ISO numeric ID
const world = await resolveReferenceGeography("world-110m")
const areas = mergeData(world, gdpData, { featureKey: "id", dataKey: "id" })`,
  },
  {
    label: "Population (18 countries)",
    dataset: "pop",
    valueAccessor: "population",
    codeString: `// Resolve built-in world map, join population data
const world = await resolveReferenceGeography("world-110m")
const areas = mergeData(world, popData, { featureKey: "id", dataKey: "id" })`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChoroplethMapPlayground() {
  return (
    <PlaygroundLayout
      title="Choropleth Map Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Choropleth Map", path: "/playground/choropleth-map" },
      ]}
      prevPage={{ title: "Forecast & Anomaly", path: "/playground/forecast" }}
      nextPage={{ title: "Distance Cartogram", path: "/playground/distance-cartogram" }}
      chartComponent={WorldChoroplethWrapper}
      componentName="ChoroplethMap"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => ({
        dataset: ds.dataset,
        valueAccessor: ds.valueAccessor,
        height: 450,
        tooltip: true,
      })}
      mapProps={(name, value) => {
        if (name === "title" && value === "") return undefined
        return value
      }}
    >
      <p>
        Experiment with ChoroplethMap props on a real world map. The map uses
        built-in Natural Earth 110m data from <code>world-atlas</code>, joined
        to country statistics via <code>mergeData</code>. Try different color
        schemes, projections, and datasets.
      </p>
    </PlaygroundLayout>
  )
}
