/**
 * Single source of truth for per-chart prop specifications.
 *
 * Spec entries are split by family (`chartSpecsXY.ts`, etc.); this module
 * re-exports types/helpers and composes `CHART_SPECS`.
 *
 * See `chartSpecCore.ts` for types, prop bags, and `composeProps`.
 */
export type {
  PropType,
  DataShape,
  ChartCategory,
  ChartCapabilities,
  ChartPropSpec,
  ChartSpec,
} from "./chartSpecCore"
export {
  PROP_BAGS,
  ORIENTATION_ENUM,
  HORIZONTAL_VERTICAL_ENUM,
  LEGEND_POSITION_ENUM,
  CURVE_ENUM,
  CHART_MODE_ENUM,
  composeProps,
} from "./chartSpecCore"

import type { ChartSpec } from "./chartSpecCore"
import { ORDINAL_CHART_SPECS } from "./chartSpecsOrdinal"
import { XY_CHART_SPECS } from "./chartSpecsXY"
import { NETWORK_CHART_SPECS } from "./chartSpecsNetwork"
import { GEO_CHART_SPECS } from "./chartSpecsGeo"
import { REALTIME_CHART_SPECS } from "./chartSpecsRealtime"
import { PHYSICS_CHART_SPECS } from "./chartSpecsPhysics"
import { VALUE_CHART_SPECS } from "./chartSpecsValue"

export const CHART_SPECS: Record<string, ChartSpec> = {
  ...ORDINAL_CHART_SPECS,
  ...XY_CHART_SPECS,
  ...NETWORK_CHART_SPECS,
  ...GEO_CHART_SPECS,
  ...REALTIME_CHART_SPECS,
  ...PHYSICS_CHART_SPECS,
  ...VALUE_CHART_SPECS,
}
