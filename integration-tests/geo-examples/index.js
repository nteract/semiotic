import * as SemioticGeo from "../../dist/geo.module.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  ChoroplethMap,
  ProportionalSymbolMap,
  StreamGeoFrame,
} = SemioticGeo

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

// Simple GeoJSON features for testing (no external data needed)
const simpleAreas = [
  {
    type: "Feature",
    properties: { name: "Region A", value: 100 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region B", value: 200 },
    geometry: {
      type: "Polygon",
      coordinates: [[[10, 40], [30, 40], [30, 50], [10, 50], [10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region C", value: 150 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 50], [10, 50], [10, 60], [-10, 60], [-10, 50]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region D", value: 75 },
    geometry: {
      type: "Polygon",
      coordinates: [[[10, 50], [30, 50], [30, 60], [10, 60], [10, 50]]],
    },
  },
]

// Simple point data for proportional symbol map
const pointData = [
  { lon: 0, lat: 45, magnitude: 30, city: "Alpha" },
  { lon: 20, lat: 55, magnitude: 60, city: "Beta" },
  { lon: -5, lat: 50, magnitude: 45, city: "Gamma" },
  { lon: 15, lat: 42, magnitude: 20, city: "Delta" },
  { lon: 25, lat: 48, magnitude: 80, city: "Epsilon" },
]

const examples = [
  // 1. ChoroplethMap with simple polygons
  TestCase({
    title: "ChoroplethMap",
    testId: "geo-choropleth",
    children: React.createElement(ChoroplethMap, {
      areas: simpleAreas,
      valueAccessor: (d) => d.properties.value,
      colorScheme: "blues",
      title: "Regional Values",
      width: 500,
      height: 350,
      tooltip: true,
    }),
  }),

  // 2. ProportionalSymbolMap with points
  TestCase({
    title: "ProportionalSymbolMap",
    testId: "geo-proportional",
    children: React.createElement(ProportionalSymbolMap, {
      points: pointData,
      xAccessor: "lon",
      yAccessor: "lat",
      sizeBy: "magnitude",
      sizeRange: [5, 25],
      areas: simpleAreas,
      title: "City Magnitudes",
      width: 500,
      height: 350,
      tooltip: true,
    }),
  }),

  // 3. ChoroplethMap with legend
  TestCase({
    title: "ChoroplethMap with Legend",
    testId: "geo-choropleth-legend",
    children: React.createElement(ChoroplethMap, {
      areas: simpleAreas,
      valueAccessor: (d) => d.properties.value,
      colorScheme: "viridis",
      showLegend: true,
      title: "Values with Legend",
      width: 500,
      height: 350,
    }),
  }),

  // 4. StreamGeoFrame (low-level)
  TestCase({
    title: "StreamGeoFrame",
    testId: "geo-stream-frame",
    children: React.createElement(StreamGeoFrame, {
      areas: simpleAreas,
      areaStyle: (d) => ({
        fill: d.properties.value > 100 ? "#4682b4" : "#b0c4de",
        stroke: "#333",
        strokeWidth: 1,
      }),
      title: "Stream Geo Frame",
      width: 500,
      height: 350,
    }),
  }),

  // 5. ChoroplethMap with graticule
  TestCase({
    title: "ChoroplethMap with Graticule",
    testId: "geo-graticule",
    children: React.createElement(ChoroplethMap, {
      areas: simpleAreas,
      valueAccessor: (d) => d.properties.value,
      colorScheme: "greens",
      graticule: true,
      title: "Map with Graticule",
      width: 500,
      height: 350,
    }),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement("div", { className: "test-grid" }, examples))
