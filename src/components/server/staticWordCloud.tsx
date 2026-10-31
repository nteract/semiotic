import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server.browser"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import type { Datum } from "../charts/shared/datumTypes"
import { createColorScale } from "../charts/shared/colorUtils"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { normalizePartialMargin } from "../types/marginType"
import { validateWordCloudLayout } from "../wordcloud/validateWordCloudLayout"
import { WordCloudLayoutError } from "../wordcloud/types"
import { textSceneNodeToSVG } from "../stream/textScene"
import type { TextSceneNode } from "../stream/textScene"
import { resolveTheme, type ThemeInput } from "./themeResolver"
import type { EvidenceSink } from "./renderEvidence"
import type { ChartConfig } from "./serverChartConfigShared"

export type StaticWordCloudProps = WordCloudProps & {
  theme?: ThemeInput
  background?: string
}

/** Static rendering consumes prepared geometry; it never depends on a Canvas installation. */
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
  const plotWidth = Math.floor(width - margin.left - margin.right)
  const plotHeight = Math.floor(height - margin.top - margin.bottom)
  validateWordCloudLayout(
    { ...props, width: plotWidth, height: plotHeight },
    layout
  )
  const theme = resolveTheme(props.theme)
  const category = (row: Datum) =>
    typeof props.colorBy === "function"
      ? props.colorBy(row)
      : String(row[props.colorBy ?? ""] ?? "")
  const colorScale = props.colorBy
    ? createColorScale(
        filterSparseArray(props.data as Datum[]).map((row) => ({
          category: category(row)
        })),
        "category",
        props.colorScheme ?? theme.colors.categorical
      )
    : undefined
  const scene: TextSceneNode[] = layout.words.map((word) => ({
    ...word,
    type: "text",
    x: word.x + plotWidth / 2,
    y: word.y + plotHeight / 2,
    datum: props.data[word.sourceIndex],
    style: {
      fill:
        colorScale?.(category(props.data[word.sourceIndex])) ??
        theme.colors.text
    }
  }))
  const annotations = (props.annotations ?? []).flatMap((annotation, index) => {
    const word = scene.find((node) => node.id === annotation.id)
    if (!word) return []
    const x = word.x + (annotation.dx ?? 24),
      y = word.y + (annotation.dy ?? -30)
    return [
      <g key={index} role="note">
        <line
          x1={word.x}
          y1={word.y}
          x2={x}
          y2={y}
          stroke={theme.colors.text}
        />
        <text x={x} y={y} fill={theme.colors.text} fontSize={12}>
          {annotation.label}
        </text>
      </g>
    ]
  })
  const ariaLabel =
    props.description ??
    props.title ??
    `Word cloud, ${scene.length} terms placed, ${layout.omitted.length} omitted`
  if (sink)
    sink.evidence = {
      component: "WordCloud",
      frameType: "wordcloud",
      status: scene.length ? "ok" : "empty",
      empty: !scene.length,
      width,
      height,
      markCount: scene.length,
      markCountByType: { text: scene.length },
      margin,
      plot: {
        x: margin.left,
        y: margin.top,
        width: plotWidth,
        height: plotHeight
      },
      annotationCount: annotations.length,
      annotationInputCount: props.annotations?.length ?? 0,
      unrenderedAnnotationCount:
        (props.annotations?.length ?? 0) - annotations.length,
      ariaLabel,
      warnings: [
        ...(!scene.length ? ["EMPTY_SCENE"] : []),
        ...(layout.omitted.length ? ["OMITTED_TERMS"] : [])
      ],
      wordCloud: {
        inputCount: layout.inputCount,
        placedCount: scene.length,
        omitted: layout.omitted,
        seed: layout.seed,
        fontFingerprint: layout.fontFingerprint,
        maskFingerprint: layout.maskFingerprint,
        maskResolution: layout.maskResolution,
        bounds: layout.bounds
      }
    }
  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "stream-wordcloud-frame"}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
    >
      {props.title && <title>{props.title}</title>}
      <desc>
        {[
          props.description,
          props.summary,
          `${scene.length} terms placed; ${layout.omitted.length} omitted.`
        ]
          .filter(Boolean)
          .join(" ")}
      </desc>
      <rect
        width={width}
        height={height}
        fill={props.background ?? theme.colors.background}
      />
      <g transform={`translate(${margin.left},${margin.top})`}>
        {scene.map((node) => textSceneNodeToSVG(node))}
        {annotations}
      </g>
    </svg>
  )
}

export const wordCloud: ChartConfig = {
  frameType: "wordcloud",
  layout: {
    primarySize: { width: 640, height: 400 },
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
