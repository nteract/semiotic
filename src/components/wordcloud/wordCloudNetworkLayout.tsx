import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkRectNode,
  NetworkSceneNode,
  NetworkSceneEdge
} from "../stream/networkTypes"
import type { SceneRenderBackend } from "../stream/types"
import {
  renderCanvasText,
  textSceneNodeToSVG,
  type TextSceneNode
} from "../stream/textScene"
import { wordCloudGroupHulls } from "./wordCloudGroupHulls"
import type { WordCloudLayoutResult, WordCloudPlacedWord } from "./types"

interface WordCloudNetworkConfig {
  layout?: WordCloudLayoutResult
  data: readonly Datum[]
  colorBy?: WordCloudProps["colorBy"]
  colorScale?: (key: string) => string
  selection?: WordCloudProps["selection"]
  annotations?: WordCloudProps["annotations"]
  groupHulls?: WordCloudProps["groupHulls"]
  forcedColors?: boolean
  clickable?: boolean
}
interface WordNode extends NetworkRectNode {
  word: WordCloudPlacedWord
}

/** Portable placements become ordinary network bounds; the frame owns interaction. */
export const wordCloudNetworkLayout: NetworkCustomLayout = ({
  config: rawConfig,
  dimensions,
  theme
}) => {
  const config = rawConfig as unknown as WordCloudNetworkConfig
  const { layout, data, colorBy, colorScale, selection, forcedColors } = config
  const sceneNodes: WordNode[] = (layout?.words ?? []).map((word) => {
    const datum = data[word.sourceIndex]
    const category =
      typeof colorBy === "function"
        ? colorBy(datum)
        : String(datum[colorBy ?? ""] ?? "")
    return {
      type: "rect",
      id: word.id,
      word,
      x: word.x + dimensions.width / 2 + word.x0,
      y: word.y + dimensions.height / 2 + word.y0,
      w: word.x1 - word.x0,
      h: word.y1 - word.y0,
      datum,
      label: `${word.text}: ${word.value}`,
      accessibility: {
        label: word.text,
        tableFields: {
          ...datum,
          term: word.text,
          value: word.value,
          placement: "placed"
        }
      },
      style: {
        fill: forcedColors
          ? "CanvasText"
          : (colorScale?.(category) ?? theme.semantic.text ?? "#333"),
        cursor: config.clickable ? "pointer" : undefined
      }
    }
  })
  return {
    sceneNodes,
    backgrounds: wordCloudGroupHulls(sceneNodes, config.groupHulls, forcedColors),
    restyle: (node, active) => {
      const selected = !active?.isActive || active.predicate(node.datum!)
      return {
        opacity: selected
          ? 1
          : (selection?.unselectedOpacity ?? theme.selectionOpacity ?? 0.25),
        ...(selected ? selection?.selectedStyle : selection?.unselectedStyle),
        ...(forcedColors ? { fill: "CanvasText" } : {})
      }
    },
    overlays: (config.annotations ?? []).map((annotation, index) => {
      const node = sceneNodes.find(
        (candidate) => candidate.id === annotation.id
      )
      if (!node) return null
      const anchorX = node.x - node.word.x0,
        anchorY = node.y - node.word.y0
      const x = anchorX + (annotation.dx ?? 24),
        y = anchorY + (annotation.dy ?? -30)
      return (
        <g key={index} role="note">
          <line
            x1={anchorX}
            y1={anchorY}
            x2={x}
            y2={y}
            stroke={theme.semantic.text ?? "#333"}
          />
          <text x={x} y={y} fill={theme.semantic.text ?? "#333"} fontSize={12}>
            {annotation.label}
          </text>
        </g>
      )
    })
  }
}

function textMark(
  node: NetworkSceneNode | NetworkSceneEdge
): TextSceneNode | undefined {
  if (node.type !== "rect" || !("word" in node)) return
  const { word } = node as WordNode
  return {
    ...word,
    type: "text",
    x: node.x - word.x0,
    y: node.y - word.y0,
    style: node.style,
    datum: node.datum
  }
}

/** The shared network backend paints the text inside each retained hit bound. */
export const wordCloudRenderBackend: SceneRenderBackend<
  NetworkSceneNode | NetworkSceneEdge
> = {
  id: "wordcloud-text",
  cacheKey: (node, style) => JSON.stringify([node, style]),
  drawCanvas: ({ context, node }) => {
    const mark = textMark(node)
    if (!mark) return false
    renderCanvasText(context, [mark])
    return true
  },
  renderStaticSVG: ({ node, key }) => {
    const mark = textMark(node)
    return mark ? textSceneNodeToSVG(mark, key) : null
  }
}
