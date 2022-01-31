import * as React from "react"
import { useEffect, useState, useRef } from "react"
import AnnotationLayer from "./AnnotationLayer"
import InteractionLayer from "./InteractionLayer"
import VisualizationLayer from "./VisualizationLayer"
import { generateFrameTitle } from "./svg/frameFunctions"
import { generateFinalDefs } from "./constants/jsx"

import { HOCSpanOrDiv } from "./SpanOrDiv"
import { MarginType, RoughType } from "./types/generalTypes"
import { AnnotationHandling, CustomHoverType } from "./types/annotationTypes"
import { LegendProps } from "./types/legendTypes"
import { ScaleLinear } from "d3-scale"
import { AdvancedInteractionSettings } from "./types/interactionTypes"

import { ContextType } from "./types/canvasTypes"

type VizDataLayerKeys =
  | "pieces"
  | "summaries"
  | "connectors"
  | "edges"
  | "nodes"
  | "lines"
  | "points"

type Props = {
  name?: string
  title: string | Element | { title?: string | Element }
  margin: MarginType
  size: Array<number>
  annotationSettings: AnnotationHandling
  annotations?: Array<object>
  customHoverBehavior?: Function
  customClickBehavior?: Function
  customDoubleClickBehavior?: Function
  htmlAnnotationRules?: Function
  tooltipContent?: Function
  className?: string
  interaction?: object
  renderFn?: string | Function
  hoverAnnotation?: CustomHoverType
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  interactionOverflow?: object
  disableContext?: boolean
  canvasRendering?: boolean
  useSpans: boolean
  baseMarkProps?: object
  canvasPostProcess?: Function
  projection?: string
  rScale?: ScaleLinear<number, number>
  columns?: object
  overlay?: Array<object>
  legendSettings?: LegendProps
  adjustedPosition: Array<number>
  defaultHTMLRule: Function
  defaultSVGRule: Function
  beforeElements?: React.ReactNode
  afterElements?: React.ReactNode
  points?: Array<object>
  projectedYMiddle?: string
  dataVersion?: string
  frameKey?: string
  additionalDefs?: React.ReactNode
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  adjustedSize?: Array<number>
  renderPipeline: { [key in VizDataLayerKeys]?: object }
  projectedCoordinateNames: { x: string; y: string }
  matte?: boolean | object | Element | Function
  axes?: Array<React.ReactNode>
  axesTickLines?: React.ReactNode
  disableCanvasInteraction?: boolean
  showLinePoints?: string
  renderOrder: ReadonlyArray<VizDataLayerKeys>
  sketchyRenderingEngine: RoughType
  frameRenderOrder: Array<string>
  additionalVizElements?: object
  interactionSettings?: AdvancedInteractionSettings
  disableProgressiveRendering: boolean
}

type State = {
  canvasContext?: ContextType
  voronoiHover?: object
  finalDefs: object
  props: Props
  matte: React.ReactNode
  SpanOrDiv: Function
}

const blankArray = []

const blankObject = {}

const defaultPosition = [0, 0]
const defaultCoordinateNames = { x: "x", y: "y" }

const defaultFrameRenderOrder = [
  "axes-tick-lines",
  "viz-layer",
  "matte",
  "axes-labels",
  "labels"
]

const defaultZeroMargin = { top: 0, bottom: 0, left: 0, right: 0 }

export default function Frame(props) {
  const {
    axes,
    axesTickLines,
    className = "",
    name = "",
    frameKey,
    projectedCoordinateNames = defaultCoordinateNames,
    renderPipeline,
    size,
    adjustedSize = size,
    title,
    xScale,
    yScale,
    dataVersion,
    annotations,
    projectedYMiddle,
    interaction,
    customClickBehavior,
    customHoverBehavior,
    customDoubleClickBehavior,
    points,
    margin = defaultZeroMargin,
    backgroundGraphics,
    foregroundGraphics,
    beforeElements,
    afterElements,
    defaultSVGRule,
    defaultHTMLRule,
    adjustedPosition = defaultPosition,
    legendSettings,
    annotationSettings = blankObject,
    overlay,
    columns,
    rScale,
    projection,
    interactionOverflow,
    canvasPostProcess,
    baseMarkProps,
    useSpans,
    canvasRendering,
    renderOrder = blankArray,
    showLinePoints,
    disableCanvasInteraction = false,
    sketchyRenderingEngine,
    disableContext,
    frameRenderOrder = defaultFrameRenderOrder,
    additionalVizElements = blankObject,
    interactionSettings,
    disableProgressiveRendering,
    additionalDefs
  } = props

  let { hoverAnnotation } = props

  const canvasContext = useRef(null)

  const [voronoiHover, setVoronoi] = useState(undefined)
  const [finalDefs, changeFinalDefs] = useState(null)
  const [matte, changeMatte] = useState(null)
  const [SpanOrDiv] = useState(() => HOCSpanOrDiv(props.useSpans))

  useEffect(() => {
    const generatedDefs = generateFinalDefs({
      matte,
      size,
      margin,
      frameKey,
      additionalDefs,
      name
    })

    changeFinalDefs(generatedDefs.defs)
    changeMatte(generatedDefs.matte)
  }, [
    size[0],
    size[1],
    margin.top,
    margin.bottom,
    margin.right,
    margin.left,
    margin.top,
    matte,
    additionalDefs
  ])

  if (
    !hoverAnnotation &&
    (customClickBehavior || customHoverBehavior || customDoubleClickBehavior)
  ) {
    hoverAnnotation = blankArray
  }

  const areaAnnotations = []

  const totalAnnotations = annotations
    ? [...annotations, ...areaAnnotations]
    : areaAnnotations

  if (voronoiHover) {
    if (Array.isArray(voronoiHover)) {
      totalAnnotations.push(...voronoiHover)
    } else {
      totalAnnotations.push(voronoiHover)
    }
  }

  const annotationLayer = ((totalAnnotations && totalAnnotations.length > 0) ||
    legendSettings) && (
    <AnnotationLayer
      legendSettings={legendSettings}
      margin={margin}
      axes={axes}
      voronoiHover={setVoronoi}
      annotationHandling={annotationSettings}
      pointSizeFunction={
        annotationSettings.layout && annotationSettings.layout.pointSizeFunction
      }
      labelSizeFunction={
        annotationSettings.layout && annotationSettings.layout.labelSizeFunction
      }
      annotations={totalAnnotations}
      svgAnnotationRule={(d, i, thisALayer) =>
        defaultSVGRule({
          d,
          i,
          annotationLayer: thisALayer,
          ...renderPipeline
        })
      }
      htmlAnnotationRule={(d, i, thisALayer) =>
        defaultHTMLRule({
          d,
          i,
          annotationLayer: thisALayer,
          ...renderPipeline
        })
      }
      useSpans={useSpans}
      size={adjustedSize}
      position={[
        adjustedPosition[0] + margin.left,
        adjustedPosition[1] + margin.top
      ]}
    />
  )

  const generatedTitle = generateFrameTitle({
    title: title,
    size: size
  })

  const finalBackgroundGraphics =
    typeof backgroundGraphics === "function"
      ? backgroundGraphics({ size, margin })
      : backgroundGraphics

  const finalForegroundGraphics =
    typeof foregroundGraphics === "function"
      ? foregroundGraphics({ size, margin })
      : foregroundGraphics

  return (
    <SpanOrDiv
      span={useSpans}
      className={`${className} frame ${name}`}
      style={{
        background: "none"
      }}
    >
      {beforeElements && (
        <SpanOrDiv span={useSpans} className={`${name} frame-before-elements`}>
          {beforeElements}
        </SpanOrDiv>
      )}
      <SpanOrDiv
        span={useSpans}
        className="frame-elements"
        style={{ height: `${size[1]}px`, width: `${size[0]}px` }}
      >
        <SpanOrDiv
          span={useSpans}
          className="visualization-layer"
          style={{ position: "absolute" }}
        >
          {backgroundGraphics && (
            <svg
              className="background-graphics"
              style={{ position: "absolute" }}
              width={size[0]}
              height={size[1]}
            >
              {backgroundGraphics && (
                <g aria-hidden={true} className="background-graphics">
                  {finalBackgroundGraphics}
                </g>
              )}
            </svg>
          )}
          {canvasRendering && (
            <canvas
              className="frame-canvas"
              ref={canvasContext}
              style={{
                position: "absolute",
                left: `0px`,
                top: `0px`
              }}
              width={size[0]}
              height={size[1]}
            />
          )}
          <svg
            className="visualization-layer"
            style={{ position: "absolute" }}
            width={size[0]}
            height={size[1]}
          >
            {finalDefs}
            <VisualizationLayer
              disableContext={disableContext}
              renderPipeline={renderPipeline}
              position={adjustedPosition}
              width={adjustedSize[0]}
              height={adjustedSize[1]}
              projectedCoordinateNames={projectedCoordinateNames}
              xScale={xScale}
              yScale={yScale}
              axes={axes}
              title={generatedTitle}
              frameKey={frameKey}
              canvasContext={canvasContext}
              dataVersion={dataVersion}
              matte={matte}
              margin={margin}
              canvasPostProcess={canvasPostProcess}
              baseMarkProps={baseMarkProps}
              voronoiHover={setVoronoi}
              renderOrder={renderOrder}
              sketchyRenderingEngine={sketchyRenderingEngine}
              axesTickLines={axesTickLines}
              additionalVizElements={additionalVizElements}
              frameRenderOrder={frameRenderOrder}
              disableProgressiveRendering={disableProgressiveRendering}
            />
            {generatedTitle && <g className="frame-title">{generatedTitle}</g>}
            {foregroundGraphics && (
              <g aria-hidden={true} className="foreground-graphics">
                {finalForegroundGraphics}
              </g>
            )}
          </svg>
        </SpanOrDiv>
        <InteractionLayer
          useSpans={useSpans}
          hoverAnnotation={hoverAnnotation}
          projectedX={projectedCoordinateNames.x}
          projectedY={projectedCoordinateNames.y}
          projectedYMiddle={projectedYMiddle}
          interaction={interaction}
          voronoiHover={setVoronoi}
          customClickBehavior={customClickBehavior}
          customHoverBehavior={customHoverBehavior}
          customDoubleClickBehavior={customDoubleClickBehavior}
          points={points}
          showLinePoints={showLinePoints}
          canvasRendering={canvasRendering}
          position={adjustedPosition}
          margin={margin}
          size={adjustedSize}
          svgSize={size}
          xScale={xScale}
          yScale={yScale}
          enabled={true}
          overlay={overlay}
          oColumns={columns}
          rScale={rScale}
          projection={projection}
          interactionOverflow={interactionOverflow}
          disableCanvasInteraction={disableCanvasInteraction}
          renderPipeline={renderPipeline}
          advancedSettings={interactionSettings}
        />
        {annotationLayer}
      </SpanOrDiv>
      {afterElements && (
        <SpanOrDiv span={useSpans} className={`${name} frame-after-elements`}>
          {afterElements}
        </SpanOrDiv>
      )}
    </SpanOrDiv>
  )
}
