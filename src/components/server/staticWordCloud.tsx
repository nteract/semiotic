import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import { createColorScale } from "../charts/shared/colorUtils"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { normalizePartialMargin } from "../types/marginType"
import { validateWordCloudLayout } from "../wordcloud/validateWordCloudLayout"
import { WordCloudLayoutError } from "../wordcloud/types"
import {
  wordCloudNetworkLayout,
  wordCloudRenderBackend
} from "../wordcloud/wordCloudNetworkLayout"
import { resolveTheme, type ThemeInput } from "./themeResolver"
import type { EvidenceSink } from "./renderEvidence"
import type { ChartConfig } from "./serverChartConfigShared"
import { renderNetworkFrame } from "./staticNetwork"
import { WORD_CLOUD_SIZE } from "../charts/shared/chartSizeDefaultsWordCloud"

export type StaticWordCloudProps = WordCloudProps & {
  theme?: ThemeInput
  background?: string
}

/** Adapt prepared terms to the same custom network layout and renderer as React. */
export function renderWordCloud(
  props: StaticWordCloudProps,
  sink?: EvidenceSink
): string {
  const { layout } = props
  if (!layout)
    throw new WordCloudLayoutError(
      "STALE_LAYOUT",
      "WordCloud server rendering requires a prepared layout. Call prepareWordCloudLayout with browser Canvas or an injected raster environment, then pass layout with the matching data and options."
    )
  const width = props.width ?? layout.width,
    height = props.height ?? layout.height
  const margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...normalizePartialMargin(props.margin)
  }
  validateWordCloudLayout(
    {
      ...props,
      width: Math.floor(width - margin.left - margin.right),
      height: Math.floor(height - margin.top - margin.bottom)
    },
    layout
  )
  const theme = resolveTheme(props.theme)
  const colorScale = props.colorBy
    ? createColorScale(
        filterSparseArray([...props.data]).map((row) => ({
          category:
            typeof props.colorBy === "function"
              ? props.colorBy(row)
              : row[props.colorBy!]
        })),
        "category",
        props.colorScheme ?? theme.colors.categorical
      )
    : undefined
  const svg = renderNetworkFrame(
    {
      chartType: "force",
      nodes: layout.words.map((word) => ({ id: word.id })),
      size: [width, height],
      margin,
      customNetworkLayout: wordCloudNetworkLayout,
      layoutConfig: {
        layout,
        data: props.data,
        colorBy: props.colorBy,
        colorScale,
        annotations: props.annotations,
        groupHulls: props.groupHulls
      },
      renderMode: wordCloudRenderBackend,
      showLabels: false,
      description: [
        props.title,
        props.description,
        props.summary,
        `${layout.words.length} terms placed; ${layout.omitted.length} omitted.`
      ]
        .filter(Boolean)
        .join(" "),
      theme: props.theme,
      background: props.background,
      className: props.className
    },
    sink
  )
  if (sink?.evidence) {
    sink.evidence.component = "WordCloud"
    sink.evidence.annotationInputCount = props.annotations?.length ?? 0
    sink.evidence.annotationCount =
      props.annotations?.filter((annotation) =>
        layout.words.some((word) => word.id === annotation.id)
      ).length ?? 0
    sink.evidence.unrenderedAnnotationCount =
      sink.evidence.annotationInputCount - sink.evidence.annotationCount
    if (layout.omitted.length) sink.evidence.warnings.push("OMITTED_TERMS")
    sink.evidence.wordCloud = {
      inputCount: layout.inputCount,
      placedCount: layout.words.length,
      omitted: layout.omitted,
      seed: layout.seed,
      fontFingerprint: layout.fontFingerprint,
      maskFingerprint: layout.maskFingerprint,
      maskResolution: layout.maskResolution,
      bounds: layout.bounds
    }
  }
  return svg
}

export const wordCloud: ChartConfig = {
  frameType: "network",
  layout: {
    primarySize: WORD_CLOUD_SIZE,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    ...rest,
    ...common,
    data,
    colorBy,
    colorScheme,
    width: rest.width ?? rest.layout?.width ?? common.size[0],
    height: rest.height ?? rest.layout?.height ?? common.size[1]
  }),
  renderStatic: (props, sink) =>
    renderWordCloud(props as StaticWordCloudProps, sink)
}
