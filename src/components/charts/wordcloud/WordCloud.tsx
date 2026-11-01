"use client"
import * as React from "react"
import { useMemo, useId } from "react"
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
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import { useResponsiveSize } from "../../stream/useResponsiveSize"
import { useHighContrast } from "../../stream/useMediaPreferences"
import { useWordCloudLayout } from "../../wordcloud/useWordCloudLayout"
import {
  wordCloudNetworkLayout,
  wordCloudRenderBackend
} from "../../wordcloud/wordCloudNetworkLayout"
import { wordCloudTableScene } from "../../wordcloud/wordCloudTable"
import { AccessibleDataTableSlot } from "../../stream/AccessibleDataTable"
import { normalizePartialMargin } from "../../types/marginType"
import type { AccessibleTableProp } from "../../stream/accessibleTableTypes"

export interface WordCloudAnnotation {
  id: string
  label: string
  dx?: number
  dy?: number
}

/** A rounded enclosure around placed terms, painted by the network background layer. */
export interface WordCloudGroupHull {
  id: string
  label?: string
  /** Stable term IDs. Missing or omitted terms are ignored; groups may overlap. */
  ids: string[]
  color?: string
  /** Extra space around the occupied word bounds, in pixels. Defaults to 8. */
  padding?: number
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
  /** Story or category enclosures; changing them never repacks the words. */
  groupHulls?: WordCloudGroupHull[]
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
  const [containerRef, size] = useResponsiveSize(
    [
      props.width ?? props.layout?.width ?? 640,
      props.height ?? props.layout?.height ?? 400
    ],
    props.responsiveWidth,
    props.responsiveHeight
  )
  const margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...normalizePartialMargin(props.margin)
  }
  const { layout, error, pending } = useWordCloudLayout(
    props,
    Math.floor(size[0] - margin.left - margin.right),
    Math.floor(size[1] - margin.top - margin.bottom)
  )
  const forcedColors = useHighContrast()
  const nodes = useMemo(
    () => layout?.words.map((word) => ({ id: word.id })) ?? [],
    [layout]
  )
  const layoutConfig = useMemo(
    () => ({
      layout,
      data: props.data,
      colorBy: props.colorBy,
      colorScale,
      selection: props.selection,
      annotations: props.annotations,
      groupHulls: props.groupHulls,
      forcedColors,
      clickable: Boolean(props.onClick || props.selection)
    }),
    [
      layout,
      props.data,
      props.colorBy,
      colorScale,
      props.selection,
      props.annotations,
      props.groupHulls,
      forcedColors,
      props.onClick
    ]
  )
  const { activeSelectionHook, hoverSelectionHook } = interaction
  const layoutSelection = useMemo(() => {
    const active = [activeSelectionHook, hoverSelectionHook].filter(
      (hook) => hook?.isActive
    )
    return active.length
      ? {
          isActive: true,
          predicate: (datum: Datum) =>
            active.every((hook) => hook!.predicate(datum))
        }
      : null
  }, [activeSelectionHook, hoverSelectionHook])
  const tableScene = useMemo(
    () =>
      wordCloudTableScene(
        {
          data: props.data,
          textAccessor: props.textAccessor,
          valueAccessor: props.valueAccessor
        },
        layout
      ),
    [props.data, props.textAccessor, props.valueAccessor, layout]
  )
  const tableId = `wordcloud-table-${useId()}`
  const tooltipContent = useMemo(
    () => (hover: Datum) => {
      const word = layout?.words.find(
        (candidate) => props.data[candidate.sourceIndex] === hover.data
      )
      return tooltip.tooltipContent({
        ...hover,
        text: word?.text,
        value: word?.value
      })
    },
    [layout, props.data, tooltip]
  )
  return (
    <div
      className={`semiotic-wordcloud ${props.className ?? ""}`}
      role="group"
      aria-label={props.title ?? "Word cloud"}
    >
      <div
        ref={containerRef}
        aria-busy={pending}
        data-wordcloud-state={error ? "error" : pending ? "preparing" : "ready"}
        data-placed-count={layout?.words.length ?? 0}
        data-omitted-count={layout?.omitted.length ?? 0}
        style={{
          position: "relative",
          width: props.responsiveWidth ? "100%" : size[0],
          height: props.responsiveHeight ? "100%" : size[1]
        }}
      >
        <StreamNetworkFrame
          chartType="force"
          nodes={nodes}
          size={size}
          margin={margin}
          customNetworkLayout={wordCloudNetworkLayout}
          layoutConfig={layoutConfig}
          layoutSelection={layoutSelection}
          renderMode={wordCloudRenderBackend}
          renderAs={forcedColors ? "svg" : props.renderAs}
          keyboardNavigation="spatial"
          animate={false}
          showLabels={false}
          enableHover={props.enableHover}
          tooltipContent={tooltipContent}
          customHoverBehavior={interaction.customHoverBehavior}
          customClickBehavior={interaction.customClickBehavior}
          description={
            [props.title, props.description].filter(Boolean).join(". ") ||
            "Word cloud"
          }
          summary={props.summary}
          accessibleTable={false}
          maxDevicePixelRatio={props.maxDevicePixelRatio}
        />
        {pending && (
          <div role="status" style={{ position: "absolute", inset: 16 }}>
            Preparing words…
          </div>
        )}
        {error && (
          <div role="alert" style={{ position: "absolute", inset: 16 }}>
            {error.message}
          </div>
        )}
        {!pending && !error && !layout?.words.length && (
          <div role="status" style={{ position: "absolute", inset: 16 }}>
            No terms could be placed. See the data summary for omitted terms.
          </div>
        )}
      </div>
      <AccessibleDataTableSlot
        accessibleTable={props.accessibleTable ?? true}
        scene={tableScene}
        chartType="word cloud"
        chartTitle={props.title}
        tableId={tableId}
      />
    </div>
  )
}
