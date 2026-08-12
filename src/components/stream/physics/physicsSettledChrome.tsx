import * as React from "react"
import type { FrameMargin } from "../useFrame"
import {
  PhysicsSVGOverlay,
  bodiesToAnnotationAnchors
} from "./PhysicsSVGOverlay"
import type { PhysicsSettledScene } from "./PhysicsSettledScene"
import type { StreamPhysicsFrameProps } from "./StreamPhysicsTypes"

export type PhysicsSettledChromeProps = Pick<
  StreamPhysicsFrameProps,
  | "annotations"
  | "autoPlaceAnnotations"
  | "chartId"
  | "legend"
  | "legendClickBehavior"
  | "legendHighlightedCategory"
  | "legendHoverBehavior"
  | "legendIsolatedCategories"
  | "legendLayout"
  | "legendPosition"
  | "onAnnotationActivate"
  | "onObservation"
  | "svgAnnotationRules"
  | "title"
>

/** Shared visible chrome for settled React SSR and standalone physics SVGs. */
export function renderPhysicsSettledChrome(
  scene: PhysicsSettledScene,
  props: PhysicsSettledChromeProps,
  size: readonly [number, number],
  margin: FrameMargin,
  chartType = "StreamPhysicsFrame"
): React.ReactNode {
  const width = Math.max(1, size[0] - margin.left - margin.right)
  const height = Math.max(1, size[1] - margin.top - margin.bottom)
  return (
    <PhysicsSVGOverlay
      width={width}
      height={height}
      totalWidth={size[0]}
      totalHeight={size[1]}
      margin={margin}
      title={props.title}
      legend={props.legend}
      legendPosition={props.legendPosition}
      legendLayout={props.legendLayout}
      legendHoverBehavior={props.legendHoverBehavior}
      legendClickBehavior={props.legendClickBehavior}
      legendHighlightedCategory={props.legendHighlightedCategory}
      legendIsolatedCategories={props.legendIsolatedCategories}
      pointNodes={bodiesToAnnotationAnchors(scene.bodies)}
      annotations={props.annotations}
      onAnnotationActivate={props.onAnnotationActivate}
      onObservation={props.onObservation}
      chartId={props.chartId}
      chartType={chartType}
      autoPlaceAnnotations={props.autoPlaceAnnotations}
      svgAnnotationRules={props.svgAnnotationRules}
    />
  )
}
