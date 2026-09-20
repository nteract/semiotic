/**
 * Chart-specific prop mapping for renderChart().
 *
 * Family implementations live in serverChartConfigs{XY,Ordinal,Network,Geo,Custom,Physics,Realtime}.ts.
 */
import { XY_CHART_CONFIGS } from "./serverChartConfigsXY.generated"
import type { ChartConfig } from "./serverChartConfigShared"
import { sparkline } from "./serverChartConfigsXY"
import { REALTIME_CHART_CONFIGS } from "./serverChartConfigsRealtime.generated"
import { ORDINAL_CHART_CONFIGS } from "./serverChartConfigsOrdinal.generated"
import { NETWORK_CHART_CONFIGS } from "./serverChartConfigsNetwork.generated"
import {
  choroplethMap,
  proportionalSymbolMap,
  flowMap,
  distanceCartogram
} from "./serverChartConfigsGeo"
import {
  xyCustomChart,
  ordinalCustomChart,
  networkCustomChart,
  geoCustomChart,
  parallelCoordinatesRecipe,
  calendarHeatmapRecipe
} from "./serverChartConfigsCustom"
import { physicsCustomChart } from "./serverChartConfigsPhysics"
import { PHYSICS_CHART_CONFIGS } from "./serverChartConfigsPhysics.generated"

// ── Registry ───────────────────────────────────────────────────────────

// `satisfies` (not `: Record<string, ChartConfig>`) so TypeScript preserves
// the literal key union. Downstream code derives `ChartName` via
// `keyof typeof CHART_CONFIGS` and stays in lockstep automatically — adding
// a chart here makes it available to renderChart() without a second edit.
// Catalog assembly only copies plain config objects. Keep the call pure so
// consumers of animation helpers can discard the unused static chart registry.
export const CHART_CONFIGS = /* @__PURE__ */ Object.assign(
  {
    Sparkline: sparkline,
    XYCustomChart: xyCustomChart,
    OrdinalCustomChart: ordinalCustomChart,
    ParallelCoordinatesRecipe: parallelCoordinatesRecipe,
    CalendarHeatmapRecipe: calendarHeatmapRecipe,
    NetworkCustomChart: networkCustomChart,
    ChoroplethMap: choroplethMap,
    ProportionalSymbolMap: proportionalSymbolMap,
    FlowMap: flowMap,
    DistanceCartogram: distanceCartogram,
    GeoCustomChart: geoCustomChart,
    PhysicsCustomChart: physicsCustomChart
  },
  /* @__PURE__ */ Object.assign(
    {},
    XY_CHART_CONFIGS,
    REALTIME_CHART_CONFIGS,
    ORDINAL_CHART_CONFIGS
  ),
  /* @__PURE__ */ Object.assign(
    {},
    NETWORK_CHART_CONFIGS,
    PHYSICS_CHART_CONFIGS
  )
) satisfies Record<string, ChartConfig>
