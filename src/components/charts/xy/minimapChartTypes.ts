import type { ReactNode } from "react"
import type { Datum } from "../shared/datumTypes"
import type { StreamXYFrameProps } from "../../stream/types"
import type { LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import type { TooltipProp } from "../../Tooltip/Tooltip"
import type { StyleRule } from "../shared/styleRules"
import type { LinearBrushChangeSource, LinearBrushHandleRenderContext } from "../../controls/linearBrushTypes"
import type { OnObservationCallback } from "../../store/ObservationStore"

/** Overview brush colors. Unset colors follow the theme's selection color. */
export interface MinimapBrushStyle {
  fill?: string
  /** @default 0.2 */
  fillOpacity?: number
  stroke?: string
  /** @default 1 */
  strokeWidth?: number
  /** Stroke while dragging. */
  activeStroke?: string
  /** Dim the overview outside the selection; `true` uses the theme surface at 0.6. */
  mask?: boolean | { fill?: string; opacity?: number }
}

export interface MinimapHandleOptions {
  /** @default 12 */
  size?: number
  /** Corner radius in px. @default 3 */
  radius?: number
  fill?: string
  /** Fill while dragging. */
  activeFill?: string
  stroke?: string
  /** A center handle that moves the selection. */
  move?: boolean
}

export interface MinimapBrushEndMeta {
  source: LinearBrushChangeSource
  /** The selection reaches the overview's start, or was cleared. */
  atDomainStart: boolean
  /** The selection reaches the overview's end, or was cleared. */
  atDomainEnd: boolean
}

export interface MinimapConfig {
  /** Height of the minimap overview (default: 60) */
  height?: number
  /** Margin for the minimap chart */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Line style override for the minimap */
  lineStyle?: (d: Datum) => Datum
  /** Show axes in minimap (default: false) */
  showAxes?: boolean
  /** Background color for minimap */
  background?: string
  /** Brush direction: "x" (default) or "y" */
  brushDirection?: "x" | "y"
  /** Selection, stroke, and mask colors for the overview brush. */
  brushStyle?: MinimapBrushStyle
  /**
   * Draw handles on the selection's ends (and a move handle with `move`).
   * With handles, an empty brush shows them at the overview's ends.
   */
  handles?: boolean | MinimapHandleOptions
  /**
   * Custom handle content, placed on a zero-width anchor at each end (the top
   * center for the move handle). Static rendering draws the built-in handles.
   */
  renderHandle?: (context: LinearBrushHandleRenderContext) => ReactNode
  /** Label the selection's ends below the overview. */
  showExtentLabels?: boolean
  /** Formats extent labels; defaults to `xFormat` (`yFormat` for "y") when it returns a string. */
  extentLabelFormat?: (value: number) => string
  /** Double-click the overview to clear the brush. */
  resetOnDoubleClick?: boolean
  /** Smallest selection in data units. The brush is always at least 1px wide. */
  minSpan?: number
  /** Accessible name for the brush. @default "Overview range" */
  brushLabel?: string
}

export interface MinimapChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "onClick" | "onObservation" | "selection" | "linkedHover">,
    AxisConfig {
  /** Array of data points or line objects with coordinates */
  data: TDatum[]

  /** X accessor (default: "x") */
  xAccessor?: ChartAccessor<TDatum, number>

  /** Y accessor (default: "y") */
  yAccessor?: ChartAccessor<TDatum, number>

  /** Group data into multiple lines */
  lineBy?: ChartAccessor<TDatum, string>

  /** Field containing coordinate arrays in line objects (default: "coordinates") */
  lineDataAccessor?: string

  /** Color-by field or function */
  colorBy?: ChartAccessor<TDatum, string>

  /** Color scheme (default: "category10") */
  colorScheme?: string | string[] | Record<string, string>

  /** Curve type (default: "linear") */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /** Line stroke width (default: 2) */
  lineWidth?: number
  /**
   * Declarative, threshold-aware line styling. Applied to the detail view
   * and the default overview. Per-series against the first point, same as
   * LineChart. `minimap.lineStyle` still wins on the overview.
   */
  styleRules?: StyleRule[]

  /** Fill area under lines */
  fillArea?: boolean

  /** Area opacity when fillArea is true (default: 0.3) */
  areaOpacity?: number

  /** Show points on lines */
  showPoints?: boolean

  /** Point radius (default: 3) */
  pointRadius?: number

  /** Enable hover (default: true) */
  enableHover?: boolean

  /** Show grid (default: false) */
  showGrid?: boolean

  /** Show legend */
  showLegend?: boolean

  /** Legend position */
  legendPosition?: LegendPosition

  /** Tooltip config */
  tooltip?: TooltipProp

  /** Minimap configuration */
  minimap?: MinimapConfig

  /** Show minimap above the main chart (default: false — below) */
  renderBefore?: boolean

  /** Callback when brush extent changes, with the extent in data units, ascending */
  onBrush?: (extent: [number, number] | null) => void

  /**
   * Called once when a brush gesture, keyboard step, or reset ends with a
   * changed extent (`null` when cleared). Use it to commit on release.
   */
  onBrushEnd?: (extent: [number, number] | null, meta: MinimapBrushEndMeta) => void

  /** Controlled brush extent in data units on the brushed axis */
  brushExtent?: [number, number]

  /**
   * Brush observations: `brush` on every change (the other axis spans the
   * overview), `brush-end` when cleared, and `control-start` / `control-end`
   * around each gesture. Include `chartId` to tell charts apart.
   */
  onObservation?: OnObservationCallback

  /**
   * Fixed y domain `[min, max]` (either bound may be undefined to leave
   * that side data-derived). xExtent is reserved for brush selection on
   * MinimapChart — pass `frameProps.xExtent` if you need to override the
   * brushed x range from advanced consumers. With `minimap.brushDirection:
   * "y"` the brushed range replaces this on the detail chart; the overview
   * keeps it.
   */
  yExtent?: [number | undefined, number | undefined] | [number]

  /** Additional StreamXYFrame props */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}
