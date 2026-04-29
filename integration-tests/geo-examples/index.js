import * as SemioticGeo from "../../dist/geo.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  ChoroplethMap,
  ProportionalSymbolMap,
  FlowMap,
  DistanceCartogram,
  StreamGeoFrame,
} = SemioticGeo

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
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

  // ── Default-theme HOC coverage backfill ─────────────────────────────
  // FlowMap and DistanceCartogram — the two geo HOCs that didn't
  // already have a default-theme snapshot. Mirrors the XY/ordinal
  // backfill pattern.

  TestCase({
    title: "FlowMap",
    testId: "geo-flowmap",
    children: React.createElement(FlowMap, {
      nodes: pointData,
      flows: [
        { source: "Alpha", target: "Beta", value: 50 },
        { source: "Alpha", target: "Gamma", value: 30 },
        { source: "Beta", target: "Epsilon", value: 75 },
        { source: "Gamma", target: "Delta", value: 25 },
        { source: "Delta", target: "Epsilon", value: 40 },
      ],
      nodeIdAccessor: "city",
      xAccessor: "lon",
      yAccessor: "lat",
      areas: simpleAreas,
      title: "Flow between cities",
      width: 500,
      height: 350,
    }),
  }),

  TestCase({
    title: "DistanceCartogram",
    testId: "geo-distance-cartogram",
    children: React.createElement(DistanceCartogram, {
      points: [
        { id: "Hub",   lon: 0,   lat: 50, cost: 0 },
        { id: "North", lon: 5,   lat: 60, cost: 30 },
        { id: "East",  lon: 20,  lat: 50, cost: 60 },
        { id: "South", lon: 0,   lat: 40, cost: 90 },
        { id: "West",  lon: -15, lat: 50, cost: 45 },
      ],
      nodeIdAccessor: "id",
      xAccessor: "lon",
      yAccessor: "lat",
      center: "Hub",
      costAccessor: "cost",
      strength: 1,
      width: 500,
      height: 350,
    }),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement("div", { className: "test-grid" }, examples))
