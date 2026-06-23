import type { ScaleLinear } from "d3-scale"
import type {
  OrdinalScales,
  OrdinalColumn,
  OrdinalPipelineConfig,
  OrdinalSceneNode,
  OrdinalLayout
} from "../ordinalTypes"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"

export interface OrdinalSceneContext {
  scales: OrdinalScales
  columns: Record<string, OrdinalColumn>
  config: OrdinalPipelineConfig
  getR: (d: Datum) => number
  getStack?: (d: Datum) => string
  getGroup?: (d: Datum) => string
  getColor?: (d: Datum) => string
  /** Categorical accessor → glyph shape (swarm/dot symbolBy). */
  getSymbol?: (d: Datum) => string
  getConnector?: (d: Datum) => string
  getO: (d: Datum) => string
  multiScales: ScaleLinear<number, number>[]
  rAccessors: ((d: Datum) => number)[]
  resolvePieceStyle: (d: any, category?: string) => Style
  resolveSummaryStyle: (d: any, category?: string) => Style
  /** For timeline: resolve rAccessor as [start, end] */
  getRawRange: (d: Datum) => [number, number] | null
}

export type SceneBuilderFn = (ctx: OrdinalSceneContext, layout: OrdinalLayout) => OrdinalSceneNode[]
