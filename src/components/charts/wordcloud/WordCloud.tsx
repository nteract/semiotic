"use client"
import * as React from "react"
import { useMemo } from "react"
import type {
  WordCloudLayoutOptions,
  WordCloudLayoutResult,
  WordCloudCanvasEnvironment,
  WordCloudLayoutError
} from "../../wordcloud/types"
import type { Datum } from "../shared/datumTypes"
import type { SelectionConfig, LinkedHoverProp } from "../shared/types"
import type { PartialMargin } from "../../types/marginType"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { TooltipProp } from "../../Tooltip/Tooltip"
import { resolveMultiCapableTooltip } from "../../Tooltip/Tooltip"
import { useChartSelection, useColorScale } from "../shared/hooks"
import { filterSparseArray } from "../shared/sparseArray"
import { StreamWordCloudFrame } from "../../stream/StreamWordCloudFrame"
import { normalizePartialMargin } from "../../types/marginType"
import type { AccessibleTableProp } from "../../stream/accessibleTableTypes"

export interface WordCloudAnnotation {
  id: string
  label: string
  dx?: number
  dy?: number
}

export interface WordCloudProps extends WordCloudLayoutOptions {
  /** Prepared, portable placements; stale geometry is rejected. */
  layout?: WordCloudLayoutResult
  onLayout?: (layout: WordCloudLayoutResult) => void
  onLayoutError?: (error: WordCloudLayoutError) => void
  /** Optional Canvas/Path2D adapters for placement, never serialized. */
  canvasEnvironment?: WordCloudCanvasEnvironment
  margin?: PartialMargin
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  /** Accessible chart title. */
  title?: string
  description?: string
  summary?: string
  accessibleTable?: AccessibleTableProp
  colorBy?: string | ((datum: Datum) => string)
  colorScheme?: string | string[] | Record<string, string>
  tooltip?: TooltipProp
  enableHover?: boolean
  onClick?: (datum: Datum, point: { x: number; y: number }) => void
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  onObservation?: OnObservationCallback
  chartId?: string
  /** Canvas is primary; SVG paints the same retained text geometry. */
  renderAs?: "canvas" | "svg"
  annotations?: WordCloudAnnotation[]
  className?: string
  maxDevicePixelRatio?: number
}

/**
 * A shaped cloud of already aggregated terms, with native text marks and
 * ranked, accessible source values. Preparation runs after fonts load;
 * server rendering requires a matching precomputed layout.
 *
 * @example
 * ```tsx
 * import { WordCloud } from "semiotic/wordcloud"
 * <WordCloud data={[{ text: "care", value: 12 }]} seed={42} />
 * ```
 *
 * @example
 * ```tsx
 * const layout = await prepareWordCloudLayout({ data, width: 640, height: 400, seed: 42 })
 * <WordCloud data={data} width={640} height={400} seed={42} layout={layout} renderAs="svg" />
 * ```
 */
export function WordCloud(props: WordCloudProps): React.ReactElement {
  const safeData = useMemo(
    () => filterSparseArray(props.data as Datum[]),
    [props.data]
  )
  const colorScale = useColorScale(safeData, props.colorBy, props.colorScheme)
  const fields = useMemo(
    () => [
      typeof props.idAccessor === "string"
        ? props.idAccessor
        : typeof props.textAccessor === "string"
          ? props.textAccessor
          : "text"
    ],
    [props.idAccessor, props.textAccessor]
  )
  const interaction = useChartSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    fallbackFields: fields,
    chartType: "WordCloud",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick
  })
  const tooltip = useMemo(
    () =>
      resolveMultiCapableTooltip({
        tooltip: props.tooltip,
        defaultTooltipContent: (hover: Datum) => (
          <>
            <strong>{String(hover.text)}</strong>
            <div>{String(hover.value)}</div>
          </>
        )
      }),
    [props.tooltip]
  )
  return (
    <StreamWordCloudFrame
      {...props}
      margin={normalizePartialMargin(props.margin)}
      colorScale={colorScale}
      interaction={interaction}
      tooltipContent={tooltip.tooltipContent}
    />
  )
}
