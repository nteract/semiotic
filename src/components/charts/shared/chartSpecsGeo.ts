import type { ChartSpec } from "./chartSpecCore"

export const GEO_CHART_SPECS: Record<string, ChartSpec> = {
  ChoroplethMap: {
    name: "ChoroplethMap",
    category: "geo",
    description: "Geographic choropleth map with colored regions based on data values.",
    required: ["areas"],
    dataShape: "array",
    dataAccessors: ["valueAccessor"],
    propBags: ["common"],
    ownProps: {
      areas: { type: ["array", "string"], description: "GeoJSON features or reference geography name" },
      valueAccessor: { type: ["string", "function"] },
      colorScheme: { type: ["string", "array"] },
      projection: { type: "string", default: "equalEarth" },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Values live on `feature.properties` — streaming is per-region
      // value updates (`mergeData(features, liveRows, { featureKey })`)
      // re-passed through the `areas` prop. The shared array-append
      // push API doesn't fit this property-keyed update pattern; the
      // controlled-prop pattern is the natural realtime API. See the
      // docs streaming demo on `/charts/choropleth-map`.
      supportsPush: false, supportsSSR: true,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: ["controlled-prop-streaming"],
    },
  },

  ProportionalSymbolMap: {
    name: "ProportionalSymbolMap",
    category: "geo",
    description: "Geographic map with sized symbols at point locations.",
    required: ["points"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common"],
    ownProps: {
      points: { type: "array" },
      xAccessor: { type: ["string", "function"], default: "lon" },
      yAccessor: { type: ["string", "function"], default: "lat" },
      sizeBy: { type: ["string", "function"] },
      areas: { type: ["array", "string"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Points are array-shaped — push appends to the displayed
      // points list via `useFrameImperativeHandle({ variant: "geo-points" })`.
      supportsPush: true, supportsSSR: true,
      colorModel: "sequential", layoutMode: "plugin",
      specialFeatures: [],
    },
  },

  FlowMap: {
    name: "FlowMap",
    category: "geo",
    description: "Geographic flow map showing movement between locations with animated particles.",
    required: ["flows"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      flows: { type: "array" },
      nodes: { type: "array" },
      valueAccessor: { type: ["string", "function"] },
      lineIdAccessor: { type: ["string", "function"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Push API translates flow → resolved-line through nodeLookup HOC-side,
      // then forwards to the frame's `pushLine`/`pushManyLines` via the
      // `geo-lines` variant in `useFrameImperativeHandle`.
      supportsPush: true, supportsSSR: true,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["particles"],
    },
  },

  DistanceCartogram: {
    name: "DistanceCartogram",
    category: "geo",
    description: "Cartogram distorting geographic positions based on travel time or cost from a center point.",
    required: ["points"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      points: { type: "array" },
      center: { type: "array" },
      costAccessor: { type: ["string", "function"] },
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: true, supportsSelection: true, supportsLinkedHover: true,
      // Points are array-shaped — push appends to the displayed
      // points list. Cost-driven distortion re-runs on each push.
      supportsPush: true, supportsSSR: false,
      colorModel: "categorical", layoutMode: "plugin",
      specialFeatures: ["distortion", "hoc-ssr-only"],
    },
  },

  // ─── Realtime family ────────────────────────────────────────────────
  // Push-only HOCs: data arrives via the ref API, not props. dataShape is
  // "realtime" and `required` is empty since the schema describes the
  // initial config, not a static dataset.

}
