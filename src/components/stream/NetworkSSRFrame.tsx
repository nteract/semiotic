import * as React from "react"
import type { StreamNetworkFrameProps } from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkViewGroup } from "./networkViewTransform"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { AccessibleTablePortal, ScreenReaderSummary } from "./AccessibleDataTable"
import { NetworkAccessibleDataTableSlot } from "./NetworkAccessibleDataTableSlot"
import {
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG
} from "./SceneToSVGNetwork"
import { renderSceneWithBackend } from "./renderBackend"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { filterSparseArray } from "../charts/shared/sparseArray"

interface NetworkSSRFrameProps {
  tableId: string
  props: StreamNetworkFrameProps
  store: NetworkPipelineStore | null
  responsiveRef: React.Ref<HTMLDivElement>
  size: [number, number]
  margin: React.ComponentProps<typeof NetworkSVGOverlay>["margin"]
  adjustedWidth: number
  adjustedHeight: number
  surfaceBackground: string | null
  resolvedBackground: React.ReactNode
  resolvedForeground: React.ReactNode
}

export function NetworkSSRFrame({
  tableId,
  props,
  store,
  responsiveRef,
  size,
  margin,
  adjustedWidth,
  adjustedHeight,
  surfaceBackground,
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
    accessibleTable = true,
    renderMode,
    legend,
    legendPosition,
    legendLayout,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
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
      role={accessibleTable || store?.customLayoutHtmlMarks?.length ? "group" : "img"}
      aria-label={
        description || (typeof title === "string" ? title : "Network chart")
      }
      style={{
        position: "relative",
        fontFamily: "var(--semiotic-font-family, sans-serif)",
        width: responsiveWidth ? "100%" : size[0],
        height: responsiveHeight ? "100%" : size[1],
        overflow: props.viewTransform ? "clip" : undefined
      }}
    >
      {accessibleTable && (
        <AccessibleTablePortal accessibleTable={accessibleTable}>
          <NetworkAccessibleDataTableSlot
            nodes={sceneNodes}
            edges={sceneEdges}
            chartType="Network chart"
            chartTitle={typeof title === "string" ? title : undefined}
            tableId={tableId}
          />
        </AccessibleTablePortal>
      )}
      <ScreenReaderSummary summary={summary} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size[0]}
        height={size[1]}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {surfaceBackground ? (
          <rect
            className="stream-frame-background__backdrop"
            x={0}
            y={0}
            width={size[0]}
            height={size[1]}
            fill={surfaceBackground}
          />
        ) : null}
        <g transform={`translate(${margin.left},${margin.top})`}>
          <NetworkViewGroup view={props.viewTransform} width={adjustedWidth} height={adjustedHeight}>
          {composeOverlays(resolvedBackground, store?.customLayoutBackgrounds)}
          </NetworkViewGroup>
        </g>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <NetworkViewGroup view={props.viewTransform} width={adjustedWidth} height={adjustedHeight}>
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
          </NetworkViewGroup>
        </g>
      </svg>
      <NetworkSVGOverlay
        viewTransform={props.viewTransform}
        width={adjustedWidth}
        height={adjustedHeight}
        totalWidth={size[0]}
        totalHeight={size[1]}
        margin={margin}
        labels={labels}
        sceneNodes={sceneNodes}
        title={title}
        description={description}
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
        viewTransform={props.viewTransform}
        marks={store?.customLayoutHtmlMarks}
        margin={margin}
        selection={layoutSelection ?? null}
        width={adjustedWidth}
        height={adjustedHeight}
        viewport={props.viewport}
        htmlMarkCulling={props.htmlMarkCulling}
        onViewportChange={props.onViewportChange}
      />
    </div>
  )
}
