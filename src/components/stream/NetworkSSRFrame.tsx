import * as React from "react"
import type { StreamNetworkFrameProps } from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { ScreenReaderSummary } from "./AccessibleDataTable"
import {
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG
} from "./SceneToSVG"
import { renderSceneWithBackend } from "./renderBackend"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { filterSparseArray } from "../charts/shared/sparseArray"

interface NetworkSSRFrameProps {
  props: StreamNetworkFrameProps
  store: NetworkPipelineStore | null
  responsiveRef: React.Ref<HTMLDivElement>
  size: [number, number]
  margin: React.ComponentProps<typeof NetworkSVGOverlay>["margin"]
  adjustedWidth: number
  adjustedHeight: number
  resolvedBackground: React.ReactNode
  resolvedForeground: React.ReactNode
}

export function NetworkSSRFrame({
  props,
  store,
  responsiveRef,
  size,
  margin,
  adjustedWidth,
  adjustedHeight,
  resolvedBackground,
  resolvedForeground
}: NetworkSSRFrameProps) {
  const {
    chartType,
    nodes,
    edges,
    data,
    className,
    description,
    title,
    responsiveWidth,
    responsiveHeight,
    summary,
    background,
    renderMode,
    legend,
    legendPosition,
    legendLayout,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    foregroundGraphics,
    layoutSelection,
    annotations,
    onAnnotationActivate,
    annotationObservationCallback,
    onObservation,
    chartId,
    autoPlaceAnnotations,
    svgAnnotationRules
  } = props

  if (store) {
    const isHierarchical = [
      "tree",
      "cluster",
      "treemap",
      "circlepack",
      "partition",
      "orbit"
    ].includes(chartType)
    const hierarchyRoot = isHierarchical
      ? data || (!Array.isArray(edges) ? edges : undefined)
      : undefined

    if (isHierarchical && hierarchyRoot) {
      store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight])
      store.buildScene([adjustedWidth, adjustedHeight])
    } else {
      const rawNodes = filterSparseArray(nodes)
      const rawEdges = Array.isArray(edges) ? filterSparseArray(edges) : []
      if (rawNodes.length > 0 || rawEdges.length > 0) {
        store.ingestBounded(rawNodes, rawEdges, [adjustedWidth, adjustedHeight])
        store.buildScene([adjustedWidth, adjustedHeight])
      }
    }
  }

  const sceneNodes = store?.sceneNodes ?? []
  const sceneEdges = store?.sceneEdges ?? []
  const labels = store?.labels ?? []

  return (
    <div
      ref={responsiveRef}
      className={`stream-network-frame${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={
        description || (typeof title === "string" ? title : "Network chart")
      }
      style={{
        position: "relative",
        width: responsiveWidth ? "100%" : size[0],
        height: responsiveHeight ? "100%" : size[1]
      }}
    >
      <ScreenReaderSummary summary={summary} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size[0]}
        height={size[1]}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {resolvedBackground && (
          <g transform={`translate(${margin.left},${margin.top})`}>
            {resolvedBackground}
          </g>
        )}
        <g transform={`translate(${margin.left},${margin.top})`}>
          {background && (
            <rect
              x={0}
              y={0}
              width={adjustedWidth}
              height={adjustedHeight}
              fill={background}
            />
          )}
          {sceneEdges
            .map((edge, index) => renderSceneWithBackend({
              node: edge,
              index,
              renderMode,
              fallback: () => networkSceneEdgeToSVG(edge, index)
            }))
            .filter(Boolean)}
          {sceneNodes
            .map((node, index) => renderSceneWithBackend({
              node,
              index,
              renderMode,
              fallback: () => networkSceneNodeToSVG(node, index)
            }))
            .filter(Boolean)}
          {labels
            .map((label, index) => networkLabelToSVG(label, index))
            .filter(Boolean)}
        </g>
      </svg>
      <NetworkSVGOverlay
        width={adjustedWidth}
        height={adjustedHeight}
        totalWidth={size[0]}
        totalHeight={size[1]}
        margin={margin}
        labels={labels}
        sceneNodes={sceneNodes}
        title={title}
        legend={legend}
        legendPosition={legendPosition}
        legendLayout={legendLayout}
        legendHoverBehavior={legendHoverBehavior}
        legendClickBehavior={legendClickBehavior}
        legendHighlightedCategory={legendHighlightedCategory}
        legendIsolatedCategories={legendIsolatedCategories}
        foregroundGraphics={composeOverlays(
          resolvedForeground,
          wrapWithCustomLayoutSelection(
            store?.customLayoutOverlays,
            layoutSelection ?? null
          )
        )}
        annotations={annotations}
        onAnnotationActivate={onAnnotationActivate}
        onObservation={annotationObservationCallback ?? onObservation}
        chartId={chartId}
        chartType="StreamNetworkFrame"
        autoPlaceAnnotations={autoPlaceAnnotations}
        svgAnnotationRules={svgAnnotationRules}
        annotationFrame={0}
      />
      <NetworkHtmlMarksLayer
        marks={store?.customLayoutHtmlMarks}
        margin={margin}
        selection={layoutSelection ?? null}
      />
    </div>
  )
}
