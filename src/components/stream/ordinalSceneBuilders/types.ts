import type { ScaleLinear } from "d3-scale"
import type {
  OrdinalScales,
  OrdinalColumn,
  OrdinalPipelineConfig,
  OrdinalSceneNode,
  OrdinalLayout
} from "../ordinalTypes"
import type { Style } from "../types"

export interface OrdinalSceneContext {
  scales: OrdinalScales
  columns: Record<string, OrdinalColumn>
  config: OrdinalPipelineConfig
  getR: (d: any) => number
  getStack?: (d: any) => string
  getGroup?: (d: any) => string
  getColor?: (d: any) => string
  getConnector?: (d: any) => string
  getO: (d: any) => string
  multiScales: ScaleLinear<number, number>[]
  rAccessors: ((d: any) => number)[]
  resolvePieceStyle: (d: any, category?: string) => Style
  resolveSummaryStyle: (d: any, category?: string) => Style
  /** For timeline: resolve rAccessor as [start, end] */
  getRawRange: (d: any) => [number, number] | null
}

export type SceneBuilderFn = (ctx: OrdinalSceneContext, layout: OrdinalLayout) => OrdinalSceneNode[]
