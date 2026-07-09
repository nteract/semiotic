import { type ChartConfig } from "./serverChartConfigShared"

// ── Custom Chart HOCs ──────────────────────────────────────────────────

export const xyCustomChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "custom",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    colorScheme,
    customLayout: rest.layout || rest.customLayout,
    layoutConfig: rest.layoutConfig,
    ...common,
    showAxes: common.showAxes ?? false,
  }),
}

export const ordinalCustomChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "custom",
    data,
    oAccessor: rest.categoryAccessor || rest.oAccessor || "category",
    rAccessor: rest.valueAccessor || rest.rAccessor || "value",
    projection: rest.projection || "vertical",
    colorAccessor: colorBy,
    colorScheme,
    customLayout: rest.layout || rest.customLayout,
    layoutConfig: rest.layoutConfig,
    ...common,
    showAxes: common.showAxes ?? false,
  }),
}

export const networkCustomChart: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "force",
    nodes: rest.nodes || data || [],
    edges: rest.edges || [],
    nodeIDAccessor: rest.nodeIdAccessor || rest.nodeIDAccessor || "id",
    sourceAccessor: rest.sourceAccessor || "source",
    targetAccessor: rest.targetAccessor || "target",
    valueAccessor: rest.valueAccessor || "value",
    colorBy,
    colorScheme,
    customNetworkLayout: rest.layout || rest.customNetworkLayout,
    layoutConfig: rest.layoutConfig,
    ...common,
  }),
}

export const geoCustomChart: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    points: rest.points || data || [],
    areas: rest.areas || [],
    lines: rest.lines || [],
    projection: rest.projection || "equirectangular",
    xAccessor: rest.xAccessor || "lon",
    yAccessor: rest.yAccessor || "lat",
    lineDataAccessor: rest.lineDataAccessor,
    colorBy,
    colorScheme,
    customLayout: rest.layout || rest.customLayout,
    layoutConfig: rest.layoutConfig,
    ...common,
  }),
}

