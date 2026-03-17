import React from "react"
import { DistanceCartogram } from "semiotic/geo"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const controls = [
  { name: "strength", type: "number", label: "Strength", group: "Cartogram",
    default: 1, min: 0, max: 1, step: 0.05 },
  { name: "pointRadius", type: "number", label: "Point Radius", group: "Points",
    default: 5, min: 2, max: 15, step: 1 },
  { name: "projection", type: "select", label: "Projection", group: "Map",
    default: "mercator", options: ["mercator", "equalEarth", "naturalEarth", "equirectangular"] },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: false },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "title", type: "string", label: "Title", group: "Layout",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const romanCities = [
  { id: "Rome", lon: 12.5, lat: 41.9, travelDays: 0 },
  { id: "Athens", lon: 23.7, lat: 37.9, travelDays: 7 },
  { id: "Alexandria", lon: 29.9, lat: 31.2, travelDays: 10 },
  { id: "Carthage", lon: 10.2, lat: 36.8, travelDays: 3 },
  { id: "Londinium", lon: -0.1, lat: 51.5, travelDays: 30 },
  { id: "Byzantium", lon: 28.9, lat: 41.0, travelDays: 12 },
  { id: "Antioch", lon: 36.2, lat: 36.2, travelDays: 15 },
  { id: "Massilia", lon: 5.4, lat: 43.3, travelDays: 5 },
  { id: "Hispalis", lon: -6.0, lat: 37.4, travelDays: 14 },
  { id: "Corinth", lon: 22.9, lat: 37.9, travelDays: 8 },
]

const romanRoutes = [
  { source: "Rome", target: "Carthage" },
  { source: "Rome", target: "Massilia" },
  { source: "Rome", target: "Athens" },
  { source: "Athens", target: "Byzantium" },
  { source: "Byzantium", target: "Antioch" },
  { source: "Athens", target: "Alexandria" },
  { source: "Massilia", target: "Hispalis" },
  { source: "Massilia", target: "Londinium" },
  { source: "Athens", target: "Corinth" },
]

const deliveryNetwork = [
  { id: "NYC", lon: -74.0, lat: 40.7, deliveryHours: 0 },
  { id: "Chicago", lon: -87.6, lat: 41.9, deliveryHours: 18 },
  { id: "LA", lon: -118.2, lat: 34.1, deliveryHours: 48 },
  { id: "Atlanta", lon: -84.4, lat: 33.8, deliveryHours: 12 },
  { id: "Dallas", lon: -96.8, lat: 32.8, deliveryHours: 24 },
  { id: "Seattle", lon: -122.3, lat: 47.6, deliveryHours: 52 },
  { id: "Miami", lon: -80.2, lat: 25.8, deliveryHours: 20 },
  { id: "Denver", lon: -104.9, lat: 39.7, deliveryHours: 30 },
]

const deliveryRoutes = [
  { source: "NYC", target: "Chicago" },
  { source: "NYC", target: "Atlanta" },
  { source: "NYC", target: "Miami" },
  { source: "Chicago", target: "Dallas" },
  { source: "Chicago", target: "Denver" },
  { source: "Dallas", target: "LA" },
  { source: "Denver", target: "Seattle" },
  { source: "Denver", target: "LA" },
]

const datasets = [
  {
    label: "Roman Empire Travel Times (10 cities)",
    data: romanCities,
    lines: romanRoutes,
    center: "Rome",
    costAccessor: "travelDays",
    codeString: `[
  { id: "Rome", lon: 12.5, lat: 41.9, travelDays: 0 },
  { id: "Athens", lon: 23.7, lat: 37.9, travelDays: 7 },
  { id: "Londinium", lon: -0.1, lat: 51.5, travelDays: 30 },
  // ...10 cities with travel days from Rome
]`,
  },
  {
    label: "US Delivery Network (8 warehouses)",
    data: deliveryNetwork,
    lines: deliveryRoutes,
    center: "NYC",
    costAccessor: "deliveryHours",
    codeString: `[
  { id: "NYC", lon: -74.0, lat: 40.7, deliveryHours: 0 },
  { id: "Chicago", lon: -87.6, lat: 41.9, deliveryHours: 18 },
  { id: "LA", lon: -118.2, lat: 34.1, deliveryHours: 48 },
  // ...8 warehouses with delivery hours from NYC
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DistanceCartogramPlayground() {
  return (
    <PlaygroundLayout
      title="Distance Cartogram Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Distance Cartogram", path: "/playground/distance-cartogram" },
      ]}
      prevPage={{ title: "Choropleth Map", path: "/playground/choropleth-map" }}
      nextPage={null}
      chartComponent={DistanceCartogram}
      componentName="DistanceCartogram"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => ({
        points: ds.data,
        center: ds.center,
        costAccessor: ds.costAccessor,
        lines: ds.lines,
        height: 400,
        tooltip: true,
      })}
      mapProps={(name, value) => {
        if (name === "title" && value === "") return undefined
        return value
      }}
    >
      <p>
        Experiment with DistanceCartogram props in real time. Distance
        cartograms distort a map so that distance reflects cost (travel time,
        shipping cost, network latency) rather than physical distance. Drag the
        strength slider between 0 (geographic) and 1 (full distortion) to see
        the transformation. Try both datasets and different projections.
      </p>
    </PlaygroundLayout>
  )
}
