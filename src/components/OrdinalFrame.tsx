import * as React from "react"
import { useMemo } from "react"

import { scaleBand, scaleLinear, ScaleLinear } from "d3-scale"

import {
  orFrameChangeProps,
  orFrameDataAffectingProps,
  orFrameScaleAffectingProps,
  orFrameStylingProps
} from "./constants/frame_props"
import {
  svgORRule,
  svgHighlightRule,
  svgOrdinalLine,
  basicReactAnnotationRule,
  svgEncloseRule,
  svgRectEncloseRule,
  svgRRule,
  svgCategoryRule,
  htmlFrameHoverRule,
  htmlColumnHoverRule,
  screenProject,
  findIDPiece,
  getColumnScreenCoordinates
} from "./annotationRules/orframeRules"

import { desaturationLayer } from "./annotationRules/baseRules"

import { findFirstAccessorValue } from "./data/multiAccessorUtils"

import Frame from "./Frame"

import { stringToFn, stringToArrayFn } from "./data/dataFunctions"

import { calculateOrdinalFrame } from "./processing/ordinal"

import { AnnotationType } from "./types/annotationTypes"

import { UpdatedAnnotationLayerProps } from "./AnnotationLayer/AnnotationLayer"

import { OrdinalFrameProps, OrdinalFrameState } from "./types/ordinalTypes"
import { useDerivedStateFromProps } from "./useDerivedStateFromProps"
import { useLegacyUnmountCallback } from "./useLegacyUnmountCallback"

const xScale = scaleLinear()
const yScale = scaleLinear()

const projectedCoordinatesObject = { y: "y", x: "x" }

const defaultOverflow = { top: 0, bottom: 0, left: 0, right: 0 }

const defaultProps: Partial<OrdinalFrameProps> = {
  annotations: [],
  foregroundGraphics: [],
  projection: "vertical",
  size: [500, 500],
  className: "",
  data: [],
  oScaleType: scaleBand(),
  rScaleType: scaleLinear as unknown as () => ScaleLinear<number, number>,
  type: "none",
  useSpans: false,
  optimizeCustomTooltipPosition: false
}

const OrdinalFrame = React.memo(function OrdinalFrame(
  allProps: OrdinalFrameProps
) {
  const props: OrdinalFrameProps = { ...defaultProps, ...allProps }
  const baseState = {
    adjustedPosition: [],
    adjustedSize: [],
    backgroundGraphics: undefined,
    foregroundGraphics: undefined,
    axisData: undefined,
    renderNumber: 0,
    oLabels: { labels: [] },
    oAccessor: stringToArrayFn<string>("renderKey"),
    rAccessor: stringToArrayFn<number>("value"),
    oScale: scaleBand(),
    rScale: scaleLinear(),
    axes: undefined,
    calculatedOExtent: [],
    calculatedRExtent: [0, 1],
    columnOverlays: [],
    dataVersion: undefined,
    legendSettings: undefined,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    oExtent: [],
    oScaleType: scaleBand(),
    orFrameRender: {},
    pieceDataXY: [],
    pieceIDAccessor: stringToFn<string>("semioticPieceID"),
    projectedColumns: {},
    rExtent: [],
    rScaleType: scaleLinear(),
    summaryType: { type: "none" },
    title: {},
    type: { type: "none" },
    props
  }

  const initialState = useMemo(
    () => ({
      ...baseState,
      ...calculateOrdinalFrame(props, baseState)
    }),
    []
  )
  const state = useDerivedStateFromProps(
    deriveOrdinalFrameState,
    props,
    initialState
  )

  useLegacyUnmountCallback(props, state)

  const {
    className,
    annotationSettings,
    annotations,
    matte,
    renderKey,
    interaction,
    customClickBehavior,
    customHoverBehavior,
    customDoubleClickBehavior,
    projection,
    backgroundGraphics,
    foregroundGraphics,
    afterElements,
    beforeElements,
    disableContext,
    summaryType,
    summaryHoverAnnotation,
    pieceHoverAnnotation,
    hoverAnnotation,
    canvasPostProcess,
    useSpans,
    canvasPieces,
    canvasSummaries,
    canvasConnectors,
    renderOrder,
    additionalDefs,
    sketchyRenderingEngine,
    frameRenderOrder,
    disableCanvasInteraction,
    disableProgressiveRendering
  } = props

  const {
    orFrameRender,
    projectedColumns,
    adjustedPosition,
    adjustedSize,
    legendSettings,
    columnOverlays,
    axesTickLines,
    axes,
    margin,
    pieceDataXY,
    oLabels,
    title
  } = state

  const size = [
    adjustedSize[0] + margin.left + margin.right,
    adjustedSize[1] + margin.top + margin.bottom
  ]

  let interactionOverflow

  if (summaryType && summaryType.amplitude) {
    if (projection === "horizontal") {
      interactionOverflow = {
        top: summaryType.amplitude,
        bottom: 0,
        left: 0,
        right: 0
      }
    } else if (projection === "radial") {
      interactionOverflow = defaultOverflow
    } else {
      interactionOverflow = {
        top: 0,
        bottom: 0,
        left: summaryType.amplitude,
        right: 0
      }
    }
  }

  // Memoize foreground graphics calculation
  const renderedForegroundGraphics = useMemo(
    () =>
      typeof foregroundGraphics === "function"
        ? foregroundGraphics({ size, margin })
        : foregroundGraphics,
    [foregroundGraphics, size, margin]
  )

  // Memoize className concatenation
  const frameClassName = useMemo(
    () => `${className} ${projection}`,
    [className, projection]
  )

  // Memoize hoverAnnotation selection
  const selectedHoverAnnotation = useMemo(
    () => summaryHoverAnnotation || hoverAnnotation || pieceHoverAnnotation,
    [summaryHoverAnnotation, pieceHoverAnnotation, hoverAnnotation]
  )

  // Memoize interaction object
  const memoizedInteraction = useMemo(
    () =>
      interaction && {
        ...interaction,
        brush: interaction.columnsBrush !== true && "oBrush",
        projection,
        projectedColumns
      },
    [interaction, projection, projectedColumns]
  )

  // Memoize canvas rendering flag
  const canvasRendering = useMemo(
    () => !!(canvasPieces || canvasSummaries || canvasConnectors),
    [canvasPieces, canvasSummaries, canvasConnectors]
  )

  return (
    <Frame
      name="ordinalframe"
      renderPipeline={orFrameRender}
      adjustedPosition={adjustedPosition}
      adjustedSize={adjustedSize}
      size={size}
      xScale={xScale}
      yScale={yScale}
      axes={axes}
      useSpans={useSpans}
      axesTickLines={axesTickLines}
      title={title}
      matte={matte}
      additionalDefs={additionalDefs}
      className={frameClassName}
      frameKey={"none"}
      renderFn={renderKey}
      projectedCoordinateNames={projectedCoordinatesObject}
      defaultSVGRule={(args) => defaultORSVGRule(props, state, args)}
      defaultHTMLRule={(args) => defaultORHTMLRule(props, state, args)}
      hoverAnnotation={selectedHoverAnnotation}
      annotations={annotations}
      annotationSettings={annotationSettings}
      legendSettings={legendSettings}
      interaction={memoizedInteraction}
      customClickBehavior={customClickBehavior}
      customHoverBehavior={customHoverBehavior}
      customDoubleClickBehavior={customDoubleClickBehavior}
      points={pieceDataXY}
      margin={margin}
      columns={projectedColumns}
      backgroundGraphics={backgroundGraphics}
      foregroundGraphics={renderedForegroundGraphics}
      beforeElements={beforeElements}
      afterElements={afterElements}
      overlay={columnOverlays}
      rScale={state.rScale}
      projection={projection}
      disableContext={disableContext}
      interactionOverflow={interactionOverflow}
      canvasPostProcess={canvasPostProcess}
      
      canvasRendering={canvasRendering}
      renderOrder={renderOrder}
      disableCanvasInteraction={disableCanvasInteraction}
      sketchyRenderingEngine={sketchyRenderingEngine}
      frameRenderOrder={frameRenderOrder}
      additionalVizElements={oLabels}
      disableProgressiveRendering={disableProgressiveRendering}
    />
  )
})

function deriveOrdinalFrameState(
  nextProps: OrdinalFrameProps,
  prevState: OrdinalFrameState
) {
  const { props } = prevState

  // Check which category of props changed
  const dataPropsChanged = !prevState.dataVersion && orFrameDataAffectingProps.some(
    (prop) => props[prop] !== nextProps[prop]
  )

  const scalePropsChanged = !prevState.dataVersion && orFrameScaleAffectingProps.some(
    (prop) => props[prop] !== nextProps[prop]
  )

  const sizeChanged = props.size[0] !== nextProps.size[0] || props.size[1] !== nextProps.size[1]

  // Force full recalc if dataVersion changed or no projectedColumns exists
  if (
    (prevState.dataVersion && prevState.dataVersion !== nextProps.dataVersion) ||
    !prevState.projectedColumns
  ) {
    return {
      ...calculateOrdinalFrame(nextProps, prevState),
      props: nextProps
    }
  }

  // Full data recalculation needed if data-affecting props changed
  if (dataPropsChanged) {
    return {
      ...calculateOrdinalFrame(nextProps, prevState),
      props: nextProps
    }
  }

  // Scale/layout recalculation needed if size or scale-affecting props changed
  // Note: calculateOrdinalFrame doesn't have an updateData flag like XYFrame,
  // but size changes typically need full recalc due to column layout
  if (sizeChanged || scalePropsChanged) {
    return {
      ...calculateOrdinalFrame(nextProps, prevState),
      props: nextProps
    }
  }

  // Only styling changed - no recalc needed, React will re-render with existing state
  return { props: nextProps }
}

const annotationTypeStrings = new Set([
  "label", "callout", "callout-circle", "callout-rect",
  "callout-custom", "xy-threshold", "bracket"
])

function defaultORSVGRule(
  props: OrdinalFrameProps,
  state: OrdinalFrameState,
  {
    d,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: UpdatedAnnotationLayerProps
  }
) {
  const { projection, svgAnnotationRules } = props

  const {
    adjustedPosition,
    adjustedSize,
    oAccessor,
    rAccessor,
    oScale,
    rScale,
    projectedColumns,
    orFrameRender,
    pieceIDAccessor,
    rScaleType,
    summaryType,
    type
  } = state

  let screenCoordinates: number[] | number[][] = [0, 0]

  getColumnScreenCoordinates

  if (d.isColumnAnnotation) {
    const {
      coordinates: [xPosition, yPosition]
    } = getColumnScreenCoordinates({
      d,
      projectedColumns,
      oAccessor,
      summaryType,
      type,
      projection,
      adjustedPosition,
      adjustedSize
    })
    screenCoordinates = [xPosition, yPosition]
  } else if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
    screenCoordinates = (d.coordinates || d.neighbors).map(
      (p: { column?: string }) => {
        const pO = findFirstAccessorValue(oAccessor, p) || p.column
        const oColumn = projectedColumns[pO]
        const idPiece = findIDPiece(pieceIDAccessor, oColumn, p)

        return screenProject({
          p,
          adjustedSize,
          rScale,
          rAccessor,
          idPiece,
          projection,
          oColumn,
          rScaleType
        })
      }
    )
  } else {
    const pO = findFirstAccessorValue(oAccessor, d) || d.column
    const oColumn = projectedColumns[pO]
    const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

    screenCoordinates = screenProject({
      p: d,
      adjustedSize,
      rScale,
      rAccessor,
      idPiece,
      projection,
      oColumn,
      rScaleType
    })
  }

  const { voronoiHover } = annotationLayer

  //TODO: Process your rules first
  const customAnnotation =
    svgAnnotationRules &&
    svgAnnotationRules({
      d,
      i,
      oScale,
      rScale,
      oAccessor,
      rAccessor,
      orFrameProps: props,
      orFrameState: state,
      screenCoordinates,
      adjustedPosition,
      adjustedSize,
      annotationLayer,
      categories: projectedColumns,
      voronoiHover
    })
  if (svgAnnotationRules && customAnnotation !== null) {
    return customAnnotation
  } else if (d.type === "desaturation-layer") {
    return desaturationLayer({
      style: d.style instanceof Function ? d.style(d, i) : d.style,
      size: adjustedSize,
      i,
      key: d.key
    })
  } else if (d.type === "ordinal-line") {
    return svgOrdinalLine({ d, screenCoordinates, voronoiHover })
  } else if (d.type === "or") {
    return svgORRule({ d, i, screenCoordinates, projection })
  } else if (d.type === "highlight") {
    return svgHighlightRule({
      d,
      pieceIDAccessor,
      orFrameRender,
      oAccessor
    })
  } else if (typeof d.type === "function" || annotationTypeStrings.has(d.type)) {
    return basicReactAnnotationRule({ d, i, screenCoordinates })
  } else if (d.type === "enclose") {
    return svgEncloseRule({ d, i, screenCoordinates })
  } else if (d.type === "enclose-rect") {
    return svgRectEncloseRule({ d, screenCoordinates, i })
  } else if (d.type === "r") {
    return svgRRule({
      d,
      i,
      screenCoordinates,
      rScale,
      rAccessor,
      projection,
      adjustedSize,
      adjustedPosition
    })
  } else if (d.type === "category") {
    return svgCategoryRule({
      projection,
      d,
      i,
      categories: state.projectedColumns,
      adjustedSize
    })
  }
  return null
}

function defaultORHTMLRule(
  props: OrdinalFrameProps,
  state: OrdinalFrameState,
  {
    d,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: UpdatedAnnotationLayerProps
  }
) {
  const {
    adjustedPosition,
    adjustedSize,
    oAccessor,
    rAccessor,
    oScale,
    rScale,
    projectedColumns,
    summaryType,
    type,
    pieceIDAccessor,
    rScaleType
  } = state
  const {
    htmlAnnotationRules,
    tooltipContent,
    optimizeCustomTooltipPosition,
    projection,
    size,
    useSpans
  } = props
  let screenCoordinates: number[] | number[][] = [0, 0]

  const { voronoiHover } = annotationLayer

  if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
    screenCoordinates = (d.coordinates || d.neighbors).map(
      (p: { column?: string }) => {
        const pO = findFirstAccessorValue(oAccessor, p) || p.column
        const oColumn = projectedColumns[pO]
        const idPiece = findIDPiece(pieceIDAccessor, oColumn, p)

        return screenProject({
          p,
          adjustedSize,
          rScale,
          rAccessor,
          idPiece,
          projection,
          oColumn,
          rScaleType
        })
      }
    )
  } else if (d.type === "column-hover") {
    const {
      coordinates: [xPosition, yPosition]
    } = getColumnScreenCoordinates({
      d,
      projectedColumns,
      oAccessor,
      summaryType,
      type,
      projection,
      adjustedPosition,
      adjustedSize
    })
    screenCoordinates = [xPosition, yPosition]
  } else {
    const pO = findFirstAccessorValue(oAccessor, d) || d.column
    const oColumn = projectedColumns[pO]
    const idPiece = findIDPiece(pieceIDAccessor, oColumn, d)

    screenCoordinates = screenProject({
      p: d,
      adjustedSize,
      rScale,
      rAccessor,
      idPiece,
      projection,
      oColumn,
      rScaleType
    })
  }

  const flippedRScale =
    projection === "vertical"
      ? rScaleType.domain(rScale.domain()).range(rScale.range().reverse())
      : rScale
  //TODO: Process your rules first
  const customAnnotation =
    htmlAnnotationRules &&
    htmlAnnotationRules({
      d,
      i,
      oScale,
      rScale: flippedRScale,
      oAccessor,
      rAccessor,
      orFrameProps: props,
      screenCoordinates,
      adjustedPosition,
      adjustedSize,
      annotationLayer,
      orFrameState: state,
      categories: state.projectedColumns,
      voronoiHover
    })

  if (htmlAnnotationRules && customAnnotation !== null) {
    return customAnnotation
  }

  if (d.type === "frame-hover") {
    return htmlFrameHoverRule({
      d,
      i,
      rAccessor,
      oAccessor,
      projection,
      tooltipContent,
      optimizeCustomTooltipPosition,
      projectedColumns,
      useSpans,
      pieceIDAccessor,
      adjustedSize,
      rScale,
      type,
      rScaleType
    })
  } else if (d.type === "column-hover") {
    return htmlColumnHoverRule({
      d,
      i,
      summaryType,
      oAccessor,
      projectedColumns,
      type,
      adjustedPosition,
      adjustedSize,
      projection,
      tooltipContent,
      optimizeCustomTooltipPosition,
      useSpans
    })
  }
  return null
}

OrdinalFrame.displayName = "OrdinalFrame"
export default OrdinalFrame
