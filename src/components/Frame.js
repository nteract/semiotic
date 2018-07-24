// @flow

import React from "react"
import AnnotationLayer from "./AnnotationLayer"
import InteractionLayer from "./InteractionLayer"
import VisualizationLayer from "./VisualizationLayer"
import { generateFrameTitle } from "./svg/frameFunctions"
import PropTypes from "prop-types"

import SpanOrDiv from "./SpanOrDiv"
import type { Node } from "react"
import type { MarginType } from "./types/generalTypes"
import type { AxisType } from "./types/annotationTypes"

type Props = {
  name?: string,
  title: Object,
  margin: MarginType,
  size: Array<number>,
  annotationSettings: Object,
  annotations?: Array<Object>,
  customHoverBehavior?: Function,
  customClickBehavior?: Function,
  customDoubleClickBehavior?: Function,
  htmlAnnotationRules?: Function,
  tooltipContent?: Function,
  className?: string,
  additionalDefs?: Node,
  interaction?: Object,
  renderFn?: string | Function,
  hoverAnnotation?: boolean | Object | Array<Object | Function> | Function,
  backgroundGraphics?: Node,
  foregroundGraphics?: Node,
  interactionOverflow?: Object,
  disableContext?: boolean,
  canvasRendering?: boolean,
  useSpans: boolean,
  baseMarkProps?: Object,
  canvasPostProcess?: "chuckClose" | Function,
  projection?: string,
  rScale?: Function,
  columns?: Object,
  overlay?: Array<Object>,
  legendSettings?: Object,
  adjustedPosition: Array<number>,
  defaultHTMLRule: Function,
  defaultSVGRule: Function,
  downloadButton: Node,
  beforeElements?: Node,
  afterElements?: Node,
  points?: Array<Object>,
  projectedYMiddle?: string,
  dataVersion?: string,
  frameKey?: string,
  finalFilterDefs: Node,
  xScale: Function,
  yScale: Function,
  adjustedSize?: Array<number>,
  renderPipeline: Object,
  projectedCoordinateNames: Object,
  matte?: Node,
  axes?: Array<AxisType>,
  axesTickLines?: Node
}

type State = {
  canvasContext: ?Object,
  voronoiHover: ?Object
}

const defaultZeroMargin = { top: 0, bottom: 0, left: 0, right: 0 }

class Frame extends React.Component<Props, State> {
  static defaultProps = {
    annotationSettings: {},
    adjustedPosition: [0, 0],
    projectedCoordinateNames: { x: "x", y: "y" }
  }

  constructor(props: Props) {
    super(props)

    this.state = {
      canvasContext: null,
      voronoiHover: undefined
    }
  }

  canvasContext = null

  componentDidMount() {
    this.setState({ canvasContext: this.canvasContext })
  }

  componentDidUpdate() {
    if (this.canvasContext !== this.state.canvasContext)
      this.setState({ canvasContext: this.canvasContext })
  }

  getChildContext() {
    return { canvas: this.canvasContext }
  }

  setVoronoi = (d: Object) => {
    this.setState({ voronoiHover: d })
  }

  render() {
    const {
      axes,
      axesTickLines,
      className = "",
      matte,
      name = "",
      projectedCoordinateNames,
      renderPipeline,
      size,
      adjustedSize = size,
      title,
      xScale,
      yScale,
      finalFilterDefs,
      frameKey,
      dataVersion,
      annotations,
      hoverAnnotation,
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
      downloadButton,
      defaultSVGRule,
      defaultHTMLRule,
      adjustedPosition,
      legendSettings,
      annotationSettings,
      overlay,
      columns,
      rScale,
      projection,
      interactionOverflow,
      canvasPostProcess,
      baseMarkProps,
      useSpans,
      canvasRendering
    } = this.props

    const { voronoiHover } = this.state

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

    const annotationLayer = ((totalAnnotations &&
      totalAnnotations.length > 0) ||
      legendSettings) && (
      <AnnotationLayer
        legendSettings={legendSettings}
        margin={margin}
        axes={axes}
        annotationHandling={annotationSettings}
        pointSizeFunction={annotationSettings.pointSizeFunction}
        labelSizeFunction={annotationSettings.labelSizeFunction}
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

    return (
      <SpanOrDiv
        span={useSpans}
        className={`${className} frame ${name}`}
        style={{
          background: "none"
        }}
      >
        {beforeElements && (
          <SpanOrDiv
            span={useSpans}
            className={`${name} frame-before-elements`}
          >
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
            {(axesTickLines || backgroundGraphics) && (
              <svg
                className="background-graphics"
                style={{ position: "absolute" }}
                width={size[0]}
                height={size[1]}
              >
                {backgroundGraphics && (
                  <g aria-hidden={true} className="background-graphics">
                    {backgroundGraphics}
                  </g>
                )}
                {axesTickLines && (
                  <g
                    transform={`translate(${margin.left},${margin.top})`}
                    key="visualization-tick-lines"
                    className="axis axis-tick-lines"
                    aria-hidden={true}
                  >
                    {axesTickLines}
                  </g>
                )}
              </svg>
            )}
            {canvasRendering && (
              <canvas
                className="frame-canvas"
                ref={canvasContext => (this.canvasContext = canvasContext)}
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
              {finalFilterDefs}

              <VisualizationLayer
                disableContext={this.props.disableContext}
                renderPipeline={renderPipeline}
                position={adjustedPosition}
                size={adjustedSize}
                projectedCoordinateNames={projectedCoordinateNames}
                xScale={xScale}
                yScale={yScale}
                axes={axes}
                title={generatedTitle}
                frameKey={frameKey}
                canvasContext={this.state.canvasContext}
                dataVersion={dataVersion}
                matte={matte}
                margin={margin}
                canvasPostProcess={canvasPostProcess}
                baseMarkProps={baseMarkProps}
                voronoiHover={this.setVoronoi}
              />
              {generatedTitle && (
                <g className="frame-title">{generatedTitle}</g>
              )}
              {foregroundGraphics && (
                <g aria-hidden={true} className="foreground-graphics">
                  {foregroundGraphics}
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
            voronoiHover={this.setVoronoi}
            customClickBehavior={customClickBehavior}
            customHoverBehavior={customHoverBehavior}
            customDoubleClickBehavior={customDoubleClickBehavior}
            points={points}
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
          />
          {annotationLayer}
        </SpanOrDiv>
        {(downloadButton || afterElements) && (
          <SpanOrDiv span={useSpans} className={`${name} frame-after-elements`}>
            {downloadButton}
            {afterElements}
          </SpanOrDiv>
        )}
      </SpanOrDiv>
    )
  }
}

Frame.propTypes = {
  name: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.object,
  size: PropTypes.array.isRequired,
  annotationSettings: PropTypes.object,
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleClickBehavior: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  interaction: PropTypes.object,
  renderFn: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  hoverAnnotation: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.func,
    PropTypes.bool
  ]),
  backgroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  foregroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  interactionOverflow: PropTypes.object
}

Frame.childContextTypes = {
  canvas: PropTypes.object
}

export default Frame
