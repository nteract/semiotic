import type * as React from "react"
import type { ProcessSankeyOrientation } from "./processSankey/orientation"
import type { ProcessSankeyLayoutExecution } from "./processSankey/processSankeyLayoutWorkerClient"
import type { ProcessSankeyTimeLike } from "./processSankey/time"
import type { StyleRule } from "../shared/styleRules"
import type { Datum } from "../shared/datumTypes"
import type {
  BaseChartProps,
  ChartAccessor,
  LinkedHoverProp,
  SelectionConfig
} from "../shared/types"
import type {
  ParticleStyle,
  StreamNetworkFrameProps
} from "../../stream/networkTypes"
import type { TooltipProp } from "../../Tooltip/Tooltip"

type TimeLike = ProcessSankeyTimeLike

export interface ProcessSankeyTick {
  date: TimeLike
  label: string
}

export interface ProcessSankeyProps<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
> extends BaseChartProps {
  nodes?: TNode[]
  edges?: TEdge[]
  /** [tStart, tEnd] of the chart's time axis. Required. */
  domain: [TimeLike, TimeLike]
  /** Optional axis ticks. Each tick: { date, label }. */
  axisTicks?: ProcessSankeyTick[]

  // Accessors
  nodeIdAccessor?: ChartAccessor<TNode, string>
  nodeLabel?: ChartAccessor<TNode, string> // visible lane label; defaults to nodeIdAccessor
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  startTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  endTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /** Optional source-side inventory arrival time (before ribbon departs). */
  systemInTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /** Optional target-side inventory departure time (after ribbon arrives). */
  systemOutTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /**
   * Accessor for a node's explicit lifetime extent — a `[start, end]`
   * tuple of time-likes. Lane spans
   * `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`.
   */
  xExtentAccessor?: ChartAccessor<TNode, [TimeLike, TimeLike]>
  /** Optional node accessor that bonds equal, non-empty values into one
   * contiguous stream-like lane block. Use `"category"` to bond an existing
   * categorical field without coupling grouping to color. */
  groupBy?: ChartAccessor<TNode, string | number>
  edgeIdAccessor?: ChartAccessor<TEdge, string>

  // Coloring
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[] | Record<string, string>
  /** Show a swatch + label legend. Defaults to `true` when `colorBy` is set. */
  showLegend?: boolean
  /** Legend position. Default `"right"`. */
  legendPosition?: "right" | "left" | "top" | "bottom"

  // Formatting
  /**
   * Format function for time values — applied to axis tick labels and
   * to time fields in the default tooltip. Same convention as
   * `xFormat` on XY charts.
   */
  timeFormat?: (d: number | Date) => string | React.ReactNode
  /** Format function for the `value` field. Mirrors `yFormat` on XY charts. */
  valueFormat?: (d: number) => string | React.ReactNode

  // Layout config
  /** Direction of time. Horizontal (default) reads left-to-right;
   * vertical reads top-to-bottom while lanes occupy the x-axis. */
  orientation?: ProcessSankeyOrientation
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?:
    "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  /** Maximum pixels per value unit. Set this to keep sparse lanes from
   * inflating until they fill the plot. Unset preserves legacy scaling. */
  maxValueScale?: number
  /** Vertical coordinate assignment. `"hug"` uses any scale-cap slack to
   * pull connected lane attachments together while preserving order/gaps. */
  lanePlacement?: "stack" | "hug"
  /** How explicit node `xExtent`s size visible bands. `"max"` holds a
   * node's largest instantaneous mass across its extent, for staged Sankeys. */
  nodeSizing?: "temporal" | "max"
  /** Pixel gutter inside a bonded node group. Defaults to `0`, so adjacent
   * band silhouettes touch without overlapping. */
  groupPadding?: number
  ribbonLane?: "source" | "target" | "both"
  /**
   * Minimum rendered run along the time axis for **source-only feeder**
   * ribbons (not a general minimum ribbon length). A number is a pixel
   * minimum; `"auto"` adapts to lateral lane distance. Only source-only
   * feeders with proven xExtent/systemInTime runway are affected.
   * Authored event times and mass accounting remain unchanged.
   * Default `0` preserves exact temporal endpoints.
   */
  ribbonMinRun?: number | "auto"
  lifetimeMode?: "full" | "half"
  showLaneRails?: boolean
  showQualityReadout?: boolean
  /** Render the per-band node id label at the band's opening edge.
   *  Default `true`. Set `false` for dense layouts, or `"auto"` for a
   *  density-budgeted subset shared by CSR/SSR. */
  showLabels?: boolean | "auto"
  /**
   * Author priority for `showLabels="auto"`. Higher values survive density
   * shedding first. Field name or function over the raw node datum.
   * Shed labels reappear under selection without a layout recompute.
   */
  labelPriorityAccessor?: string | ((d: TNode) => number)
  /** Optional hard cap on visible auto labels (after the area budget). */
  maxLabels?: number
  /**
   * Which datum shape selection / linkedHover predicates receive.
   * `"raw"` (default) unwraps author records from the scene payload so field
   * matchers work without knowing ProcessSankey's `{ __kind, data, id }` shape.
   * `"scene"` keeps the full payload for tooling that needs `__kind`.
   */
  selectionDatum?: "raw" | "scene"
  /** A shared opacity, or a per-edge opacity resolver for confidence-aware flows. */
  edgeOpacity?: number | ((edge: TEdge) => number)
  /** Declarative threshold-aware styling for node bands (raw node datum). */
  styleRules?: StyleRule[]
  /** Layout execution: auto (cost threshold), worker, or sync. SSR always sync. */
  layoutExecution?: ProcessSankeyLayoutExecution
  /** Override auto worker cost threshold (see estimateProcessSankeyLayoutCost). */
  layoutWorkerThreshold?: number
  /** Content while worker layout is pending. `false` suppresses. */
  layoutLoadingContent?: React.ReactNode | false
  /** Called when worker/async layout changes state. */
  onLayoutStateChange?: (state: "pending" | "ready" | "error") => void

  // Interaction
  /** Tooltip content. `false` disables, `true` uses the default,
   *  or pass a `Tooltip(...)` / custom function for full control. */
  tooltip?: TooltipProp
  enableHover?: boolean
  onClick?: (datum: Datum, position?: { x: number; y: number }) => void
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp

  // Particles — same canvas + ParticlePool surface SankeyDiagram
  // uses. The HOC writes bezier control points onto each ribbon
  // edge before push so the frame's particle pipeline (spawnRate
  // proportional to value, pool-recycled, continuous flow) drives
  // them through unchanged.
  showParticles?: boolean
  /** Style config for the particle overlay — same shape
   *  StreamNetworkFrame consumes from SankeyDiagram. Defaults
   *  (radius 3, opacity 0.7, spawnRate 0.1, maxPerEdge 50) live in
   *  `DEFAULT_PARTICLE_STYLE`. */
  particleStyle?: ParticleStyle

  /** Pass-through to the underlying StreamNetworkFrame. */
  frameProps?: Partial<
    Omit<
      StreamNetworkFrameProps,
      | "nodes"
      | "edges"
      | "chartType"
      | "size"
      | "customNetworkLayout"
      | "layoutConfig"
    >
  >
}
