import type { ChartPropSpec, ChartSpec } from "./chartSpecCore"
import { STYLE_RULES_PROP_SPEC } from "./styleRulesWireSchema"

const GEO_VIEW_PROPS: Record<string, ChartPropSpec> = {
  projection: { type: ["string", "object", "function"], description: "Named projection, serializable projection config, or React projection function." },
  graticule: { type: ["boolean", "object"], description: "Show graticule lines or configure their spacing and style." },
  fitPadding: { type: "number", description: "Projection-fit inset fraction in [0, 0.5)." },
  zoomable: { type: "boolean", description: "Enable pan/zoom interaction." },
  zoomExtent: { type: "array", default: [1, 8], description: "Minimum and maximum zoom scale." },
  onZoom: { type: "function", omitFromSchema: true },
  dragRotate: { type: "boolean", description: "Rotate the projection during drag instead of panning." },
  tileURL: { type: ["string", "function"], description: "Raster tile URL template or React URL resolver." },
  tileAttribution: { type: "string" },
  tileCacheSize: { type: "number", default: 256 },
}

export const GEO_CHART_SPECS: Record<string, ChartSpec> = {
  ChoroplethMap: {
    name: "ChoroplethMap",
    category: "geo",
    description: "Geographic choropleth map with colored regions based on data values.",
    required: ["areas", "valueAccessor"],
    dataShape: "array",
    dataAccessors: ["valueAccessor"],
    propBags: ["common"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      areas: { type: ["array", "string"], description: "GeoJSON features or reference geography name" },
      valueAccessor: { type: ["string", "function"] },
      colorScheme: { type: ["string", "array"] },
      ...GEO_VIEW_PROPS,
      projection: { ...GEO_VIEW_PROPS.projection, default: "equalEarth" },
      areaOpacity: { type: "number", default: 1, description: "Fill opacity for area polygons." },
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
    required: ["points", "sizeBy"],
    dataShape: "array",
    dataAccessors: ["xAccessor", "yAccessor"],
    propBags: ["common"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      points: { type: "array" },
      xAccessor: { type: ["string", "function"], default: "lon" },
      yAccessor: { type: ["string", "function"], default: "lat" },
      sizeBy: { type: ["string", "function"] },
      sizeRange: {
        type: "array",
        default: [3, 30],
        description: "Minimum and maximum symbol radius in pixels.",
        schema: {
          minItems: 2,
          maxItems: 2,
          items: { type: "number" },
        },
      },
      areas: { type: ["array", "string"] },
      pointIdAccessor: { type: ["string", "function"], description: "Stable symbol id used by push-mode remove() and update()." },
      areaStyle: { type: "object", description: "Style for optional background geography." },
      ...GEO_VIEW_PROPS,
      projection: { ...GEO_VIEW_PROPS.projection, default: "equalEarth" },
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
      nodeIdAccessor: { type: "string", default: "id" },
      xAccessor: { type: ["string", "function"], default: "lon" },
      yAccessor: { type: ["string", "function"], default: "lat" },
      valueAccessor: { type: ["string", "function"] },
      lineIdAccessor: { type: ["string", "function"] },
      lineType: { type: "string", enum: ["geo", "line"] as const, default: "geo" },
      flowStyle: { type: "string", enum: ["basic", "offset", "arc"] as const, default: "basic" },
      areas: { type: ["array", "string"] },
      areaStyle: { type: "object" },
      edgeColorBy: { type: ["string", "function"] },
      edgeOpacity: { type: "number", default: 0.6 },
      edgeWidthRange: { type: "array", default: [1, 8] },
      pointRadius: { type: "number", default: 5, description: "Node radius in pixels; defaults to 1.5 in sparkline mode." },
      edgeLinecap: { type: "string", enum: ["butt", "round", "square"] as const, default: "round" },
      showParticles: { type: "boolean" },
      particleStyle: { type: "object" },
      ...GEO_VIEW_PROPS,
      projection: { ...GEO_VIEW_PROPS.projection, default: "equalEarth" },
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
    required: ["points", "center", "costAccessor"],
    dataShape: "array",
    dataAccessors: [],
    propBags: ["common"],
    ownProps: {
      styleRules: STYLE_RULES_PROP_SPEC,
      points: { type: "array" },
      lines: { type: "array" },
      xAccessor: { type: ["string", "function"], default: "lon" },
      yAccessor: { type: ["string", "function"], default: "lat" },
      nodeIdAccessor: { type: "string", default: "id" },
      center: { type: "string" },
      costAccessor: { type: ["string", "function"] },
      strength: { type: "number", default: 1 },
      lineMode: { type: "string", enum: ["straight", "fractional"] as const, default: "straight" },
      transition: { type: "number", description: "Transition duration in milliseconds when center or strength changes." },
      pointRadius: { type: "number", default: 5, description: "Point radius; sparkline mode defaults to 1.5." },
      showRings: { type: ["boolean", "number", "array"], description: "Show automatic cost rings, a fixed interval, or explicit ring values." },
      showRingLabels: { type: "boolean", description: "Show numeric distance-ring labels; defaults off in context and sparkline modes." },
      ringStyle: { type: "object" },
      showNorth: { type: "boolean" },
      costLabel: { type: "string" },
      cartogramLayout: {
        type: "string",
        enum: ["radial", "strip"],
        description: "Cost encoding: radial polar cartogram (default) or strip (Langren 1D cost axis). Sparkline mode defaults to strip.",
      },
      ...GEO_VIEW_PROPS,
      projection: { ...GEO_VIEW_PROPS.projection, default: "mercator" },
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
