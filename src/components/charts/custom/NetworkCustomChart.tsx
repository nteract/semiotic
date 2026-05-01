"use client"
import * as React from "react"
import { forwardRef, useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
} from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"
import { SafeRender } from "../shared/withChartWrapper"
import { useCustomChartScaffold } from "../shared/useCustomChartSetup"
import { filterSparseArray } from "../shared/sparseArray"

export interface NetworkCustomChartProps<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends BaseChartProps {
  /** Node objects with at least an `id` field. Positions are typically pre-computed by the user (e.g. from dagre / d3-flextree) and read by the layout. */
  nodes?: TNode[]
  /** Edge objects referencing node ids via `source`/`target`. */
  edges?: TEdge[]
  /** The layout function. Receives NetworkLayoutContext, returns scene primitives. */
  layout: NetworkCustomLayout<TConfig>
  /** Config blob threaded through to NetworkLayoutContext.config. */
  layoutConfig?: TConfig
  /** Field name (or function) for the node id. @default "id" */
  nodeIDAccessor?: StreamNetworkFrameProps["nodeIDAccessor"]
  /** Field name for the edge source id. @default "source" */
  sourceAccessor?: StreamNetworkFrameProps["sourceAccessor"]
  /** Field name for the edge target id. @default "target" */
  targetAccessor?: StreamNetworkFrameProps["targetAccessor"]
  /** Color scheme threaded into the layout's `resolveColor` helper. */
  colorScheme?: string | string[]
  enableHover?: boolean
  /**
   * Custom layouts own their own color resolution (the layout function
   * decides what each node looks like), so the auto-legend infrastructure
   * the built-in network HOCs use can't run. To render a legend, build a
   * `legendGroups` array yourself and pass it through `frameProps.legend`.
   */
  /** Additional StreamNetworkFrame props for advanced customization. */
  frameProps?: Partial<Omit<StreamNetworkFrameProps,
    "nodes" | "edges" | "chartType" | "size" | "customNetworkLayout" | "layoutConfig"
  >>
}

/**
 * NetworkCustomChart — escape hatch for bespoke network geometry.
 *
 * Wraps StreamNetworkFrame and threads a user-supplied layout function
 * into the scene-building pipeline. The layout receives raw nodes/edges,
 * dimensions, theme, and a `resolveColor` helper, and returns positioned
 * scene primitives + optional overlays.
 *
 * Pair with `flextreeLayout`, `dagreLayout`, or your own. Built-in chart
 * types (force, sankey, chord, tree, ...) should still be preferred when
 * they fit; reach for this HOC when none does.
 *
 * @example
 * ```tsx
 * import { NetworkCustomChart } from "semiotic/network"
 * import { dagreLayout } from "semiotic/recipes"
 *
 * <NetworkCustomChart
 *   nodes={positionedNodes}
 *   edges={positionedEdges}
 *   layout={dagreLayout}
 *   layoutConfig={{ edgeStyle: "smooth" }}
 *   width={800}
 *   height={500}
 * />
 * ```
 */
export const NetworkCustomChart = forwardRef(function NetworkCustomChart<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(props: NetworkCustomChartProps<TNode, TEdge, TConfig>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    nodes,
    edges,
    layout,
    layoutConfig,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    margin: userMargin,
    className,
    colorScheme,
    frameProps = {},
  } = props

  const { frameRef, resolved, normalizedMargin } = useCustomChartScaffold<StreamNetworkFrameHandle>({
    imperativeRef: ref,
    imperativeVariant: "network",
    margin: userMargin,
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    title: props.title,
    mode: props.mode,
  })

  const safeNodes = useMemo(() => filterSparseArray(nodes ?? []), [nodes])
  const safeEdges = useMemo(() => filterSparseArray(edges ?? []), [edges])

  const { width, height, enableHover, title, description, summary, accessibleTable } = resolved

  const streamProps: StreamNetworkFrameProps = {
    chartType: "force",
    ...(nodes != null && { nodes: safeNodes }),
    ...(edges != null && { edges: safeEdges }),
    customNetworkLayout: layout as NetworkCustomLayout,
    layoutConfig,
    nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: normalizedMargin,
    className,
    title,
    description,
    summary,
    accessibleTable,
    enableHover,
    // No `showLegend` pass-through: custom layouts own color resolution,
    // so the auto-legend infrastructure can't run. Pass a real legend
    // through `frameProps.legend` if you want one.
    ...frameProps,
  }

  return (
    <SafeRender componentName="NetworkCustomChart" width={width} height={height}>
      <StreamNetworkFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <
    TNode extends Datum = Datum,
    TEdge extends Datum = Datum,
    TConfig extends object = Record<string, unknown>
  >(
    props: NetworkCustomChartProps<TNode, TEdge, TConfig> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(NetworkCustomChart as { displayName?: string }).displayName = "NetworkCustomChart"
