import React from "react"
import AnnotationLayer from "./AnnotationLayer"
import InteractionLayer from "./InteractionLayer"
import VisualizationLayer from "./VisualizationLayer"
import SpanOrDiv from "./SpanOrDiv"

import PropTypes from "prop-types"

const defaultZeroMargin = { top: 0, bottom: 0, left: 0, right: 0 }

class Frame extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      canvasContext: null,
      voronoiHover: undefined
    }
  }

  componentDidMount() {
    this.setState({ canvasContext: this.canvasContext })
  }

  getChildContext() {
    return { canvas: this.canvasContext }
  }

  render() {
    const {
      name,
      renderPipeline,
      /* position,*/ size,
      extent,
      projectedCoordinateNames,
      xScale,
      yScale,
      axes,
      axesTickLines,
      title,
      matte,
      className,
      adjustedSize,
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
      useSpans
    } = this.props

    const { voronoiHover } = this.state

    const areaAnnotations = []
    let annotationLayer = null

    let totalAnnotations = annotations
      ? [...annotations, ...areaAnnotations]
      : areaAnnotations

    if (voronoiHover) {
      if (Array.isArray(voronoiHover)) {
        totalAnnotations.push(...voronoiHover)
      } else {
        totalAnnotations.push(voronoiHover)
      }
    }

    if (totalAnnotations || legendSettings) {
      annotationLayer = (
        <AnnotationLayer
          legendSettings={legendSettings}
          margin={margin}
          axes={axes}
          annotationHandling={annotationSettings.layout}
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
          size={size}
          position={[
            adjustedPosition[0] + margin.left,
            adjustedPosition[1] + margin.top
          ]}
        />
      )
    }
    const interactionLayer = (
      <InteractionLayer
        useSpans={useSpans}
        hoverAnnotation={hoverAnnotation}
        projectedX={projectedCoordinateNames.x}
        projectedY={projectedCoordinateNames.y}
        projectedYMiddle={projectedYMiddle}
        interaction={interaction}
        voronoiHover={d => this.setState({ voronoiHover: d })}
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
    )

    return (
      <SpanOrDiv
        span={useSpans}
        className={className + " frame"}
        style={{
          background: "none"
        }}
      >
        <SpanOrDiv span={useSpans} className={`${name} frame-before-elements`}>
          {beforeElements}
        </SpanOrDiv>
        <SpanOrDiv
          span={useSpans}
          className="frame-elements"
          style={{ height: size[1] + "px" }}
        >
          <SpanOrDiv
            span={useSpans}
            className="visualization-layer"
            style={{ position: "absolute" }}
          >
            <canvas
              className="frame-canvas"
              ref={canvasContext => (this.canvasContext = canvasContext)}
              style={{ position: "absolute" }}
              width={size[0]}
              height={size[1]}
            />
            <svg
              className="visualization-layer"
              style={{ position: "absolute" }}
              width={size[0]}
              height={size[1]}
            >
              {finalFilterDefs}
              <g>{backgroundGraphics}</g>
              <VisualizationLayer
                disableContext={this.props.disableContext}
                renderPipeline={renderPipeline}
                position={adjustedPosition}
                size={adjustedSize}
                extent={extent}
                projectedCoordinateNames={projectedCoordinateNames}
                xScale={xScale}
                yScale={yScale}
                axes={axes}
                axesTickLines={axesTickLines}
                title={title}
                frameKey={frameKey}
                canvasContext={this.state.canvasContext}
                dataVersion={dataVersion}
                matte={matte}
                margin={margin}
                canvasPostProcess={canvasPostProcess}
                baseMarkProps={baseMarkProps}
              />
              <g>
                {title}
                {foregroundGraphics}
              </g>
            </svg>
          </SpanOrDiv>
          {interactionLayer}
          {annotationLayer}
        </SpanOrDiv>
        <SpanOrDiv span={useSpans} className={`${name} frame-after-elements`}>
          {downloadButton}
          {afterElements}
        </SpanOrDiv>
      </SpanOrDiv>
    )
  }
}

Frame.propTypes = {
  name: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
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
