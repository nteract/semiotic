import * as React from "react"
import type { StreamNetworkFrameProps } from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkViewGroup } from "./networkViewTransform"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { networkFrameAccessibility } from "./networkFrameAccessibility"
import { NetworkSceneMarks } from "./NetworkSceneSVG"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { withNetworkPerspective } from "./networkPerspectiveContext"
import { networkFrameContainerProps } from "./networkFrameContainerProps"

interface NetworkSSRFrameProps {
  hydrationMarkup?: string | null
  layoutPending?: boolean
  tableId: string
  props: StreamNetworkFrameProps
  store: NetworkPipelineStore
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
  hydrationMarkup = null,
  layoutPending,
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
    description,
    title,
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

  const sceneNodes = store.sceneNodes
  const labels = store.labels
  const perspectiveFrame = store.perspective.frame
  const perspectiveMode = store.lastCustomLayoutResult?.perspective
  const containerProps = networkFrameContainerProps(props, `${tableId}-frame`, size, layoutPending)

  return (
    <div
      {...containerProps}
      ref={responsiveRef}
      dangerouslySetInnerHTML={
        hydrationMarkup === null ? undefined : { __html: hydrationMarkup }
      }
    >
      {hydrationMarkup === null ? (
        <>
          {networkFrameAccessibility(props, store, tableId)}
          <div
            role={store.customLayoutHtmlMarks?.length ? "group" : "img"}
            aria-label={containerProps["aria-label"]}
          >
            <svg
              role="presentation"
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
                <NetworkViewGroup
                  view={props.viewTransform}
                  width={adjustedWidth}
                  height={adjustedHeight}
                >
                  {composeOverlays(
                    resolvedBackground,
                    withNetworkPerspective(
                      store.customLayoutBackgrounds,
                      perspectiveFrame,
                      perspectiveMode
                    )
                  )}
                </NetworkViewGroup>
              </g>
              <g transform={`translate(${margin.left},${margin.top})`}>
                <NetworkViewGroup
                  view={props.viewTransform}
                  width={adjustedWidth}
                  height={adjustedHeight}
                >
                  <NetworkSceneMarks store={store} renderMode={renderMode} />
                </NetworkViewGroup>
              </g>
            </svg>
            <NetworkSVGOverlay
              decorative
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
              foregroundGraphics={withNetworkPerspective(
                composeOverlays(
                  resolvedForeground,
                  withNetworkPerspective(
                    wrapWithCustomLayoutSelection(
                      store.customLayoutOverlays,
                      layoutSelection ?? null
                    ),
                    perspectiveFrame,
                    perspectiveMode
                  )
                ),
                perspectiveFrame
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
              marks={store.customLayoutHtmlMarks}
              margin={margin}
              selection={layoutSelection ?? null}
              width={adjustedWidth}
              height={adjustedHeight}
              viewport={props.viewport}
              htmlMarkCulling={props.htmlMarkCulling}
              onViewportChange={props.onViewportChange}
            />
          </div>
        </>
      ) : undefined}
    </div>
  )
}
