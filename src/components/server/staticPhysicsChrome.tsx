import * as React from "react"
import type { SemioticTheme } from "../store/themeCore"
import { SVGChartTitle } from "../stream/SVGChartTitle"
import type { FrameMargin } from "../stream/useFrame"
import type { PhysicsSettledScene } from "../stream/physics/PhysicsSettledScene"
import type { StreamPhysicsFrameProps } from "../stream/physics/StreamPhysicsTypes"
import {
  bodiesToAnnotationAnchors,
  buildPhysicsAnnotationContext,
  normalizePhysicsAnnotations,
} from "../stream/physics/physicsAnnotationContext"
import { renderLegendConfig } from "./staticSVGChrome"
import { renderStaticRawLegend } from "./staticRawLegend"
import {
  renderStaticAnnotations,
  type StaticAnnotationRenderResult,
} from "./staticAnnotations"

export type StaticPhysicsChromeProps = Pick<
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

export interface StaticPhysicsChromeRender {
  node: React.ReactNode
  annotationRender?: StaticAnnotationRenderResult
}

/**
 * Server-only physics title, legend, and annotation chrome.
 *
 * The interactive overlay owns hooks and the live annotation factory; bringing
 * it into `semiotic/server` solely to serialize a settled scene retains that
 * client runtime. This counterpart intentionally uses the static legend and
 * annotation paths while keeping the same nested SVG shell and paint order.
 */
export function renderStaticPhysicsChrome(
  scene: PhysicsSettledScene,
  props: StaticPhysicsChromeProps,
  size: readonly [number, number],
  margin: FrameMargin,
  theme: SemioticTheme,
): StaticPhysicsChromeRender {
  const width = Math.max(1, size[0] - margin.left - margin.right)
  const height = Math.max(1, size[1] - margin.top - margin.bottom)
  const annotations = normalizePhysicsAnnotations(props.annotations)
  const annotationContext = buildPhysicsAnnotationContext({
    width,
    height,
    pointNodes: bodiesToAnnotationAnchors(scene.bodies),
  })
  const scaleX = annotationContext.scales?.x
  const scaleY = annotationContext.scales?.y
  if (!scaleX || !scaleY) throw new Error("Physics annotation context requires pixel scales")
  let annotationRender: StaticAnnotationRenderResult | undefined
  const annotationNodes = renderStaticAnnotations({
    annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    scales: {
      x: scaleX,
      y: scaleY,
    },
    layout: { width, height },
    theme,
    frameType: "network",
    xAccessor: annotationContext.xAccessor,
    yAccessor: annotationContext.yAccessor,
    pointNodes: annotationContext.pointNodes,
    svgAnnotationRules: props.svgAnnotationRules,
    onRender: (result) => { annotationRender = result },
  })
  const legend = props.legend
    ? (renderLegendConfig(props.legend, {
        theme,
        position: props.legendPosition,
        size: [size[0], size[1]],
        margin,
        hasTitle: Boolean(props.title),
        legendLayout: props.legendLayout,
      }) ?? renderStaticRawLegend(
        props.legend as React.ReactNode,
        size,
        margin,
        props.legendPosition,
        props.legendLayout,
      ))
    : null

  return {
    annotationRender,
    node: (
      <svg
        className="stream-physics-frame__overlay"
        data-testid="stream-physics-overlay"
        role="presentation"
        width={size[0]}
        height={size[1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {annotationNodes}
        </g>
        <SVGChartTitle
          title={props.title}
          totalWidth={size[0]}
          marginTop={Math.max(margin.top, 28)}
        />
        {legend}
      </svg>
    ),
  }
}
