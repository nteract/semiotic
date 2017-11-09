import React from "react";

import { scaleLinear } from "d3-scale";

import { axisPieces, axisLines } from "./visualizationLayerBehavior/axis";

// components

import Axis from "./Axis";
import DownloadButton from "./DownloadButton";
import Frame from "./Frame";
import {
  svgXYAnnotation,
  basicReactAnnotation,
  svgEncloseAnnotation,
  svgXAnnotation,
  svgYAnnotation,
  svgBoundsAnnotation,
  svgLineAnnotation,
  svgAreaAnnotation,
  svgHorizontalPointsAnnotation,
  svgVerticalPointsAnnotation,
  htmlTooltipAnnotation
} from "./annotationRules/xyframeRules";

import {
  createPoints,
  createLines,
  createAreas
} from "./visualizationLayerBehavior/general";

import { relativeY } from "./svg/lineDrawing";
import { AnnotationCallout } from "react-annotation";
import {
  calculateMargin,
  drawMarginPath,
  adjustedPositionSize,
  generateFrameTitle
} from "./svg/frameFunctions";
import { xyDownloadMapping } from "./downloadDataMapping";
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom
} from "./constants/coordinateNames";
import { calculateDataExtent, stringToFn } from "./data/dataFunctions";
import { filterDefs } from "./constants/jsx";
import { xyFrameChangeProps } from "./constants/frame_props";

import PropTypes from "prop-types";

let xyframeKey = "";
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (let i = 32; i > 0; --i)
  xyframeKey += chars[Math.floor(Math.random() * chars.length)];

const xyframeSettings = ["margin"];

const projectedCoordinateNames = {
  y: projectedY,
  x: projectedX,
  yMiddle: projectedYMiddle,
  yTop: projectedYTop,
  yBottom: projectedYBottom
};

function mapParentsToPoints(fullDataset) {
  return fullDataset.map(d => {
    if (d.parentLine) {
      return Object.assign({}, d, d.parentLine);
    }
    if (d.parentArea) {
      return Object.assign({}, d, d.parentArea);
    }
    return d;
  });
}

class XYFrame extends React.Component {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    size: [500, 500],
    className: "",
    lineType: "line",
    name: "xyframe"
  };

  constructor(props) {
    super(props);

    this.calculateXYFrame = this.calculateXYFrame.bind(this);

    this.renderBody = this.renderBody.bind(this);

    this.state = {
      lineData: null,
      pointData: null,
      areaData: null,
      projectedLines: null,
      projectedPoints: null,
      projectedAreas: null,
      fullDataset: null,
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axesData: null,
      axes: null,
      renderNumber: 0,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    };

    this.xAccessor = null;
    this.yAccessor = null;
    this.xScale = null;
    this.yScale = null;

    this.settingsMap = new Map();
    xyframeSettings.forEach(d => {
      this.settingsMap.set(d, new Map());
    });
  }

  componentWillMount() {
    this.calculateXYFrame(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      !this.state.fullDataset
    ) {
      this.calculateXYFrame(nextProps);
    } else if (
      this.state.size[0] !== nextProps.size[0] ||
      this.state.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        xyFrameChangeProps.find(d => {
          return this.props[d] !== nextProps[d];
        }))
    ) {
      this.calculateXYFrame(nextProps);
    }
  }

  screenScales({ xExtent, yExtent, currentProps, margin, adjustedSize }) {
    let xDomain = [margin.left, adjustedSize[0] + margin.left];
    let yDomain = [adjustedSize[1] + margin.top, margin.top];

    let xScaleType = currentProps.xScaleType || scaleLinear();
    let yScaleType = currentProps.yScaleType || scaleLinear();

    let xScale = xScaleType;
    let yScale = yScaleType;

    if (xScaleType.domain) {
      xScaleType.domain(xExtent);
    }
    if (yScaleType.domain) {
      yScaleType.domain(yExtent);
    }
    xScaleType.range(xDomain);
    yScaleType.range(yDomain);

    return { xScale, yScale };
  }

  calculateXYFrame(currentProps) {
    let margin = calculateMargin(currentProps);
    let { adjustedPosition, adjustedSize } = adjustedPositionSize(currentProps);

    let {
      xExtent,
      yExtent,
      projectedLines,
      projectedPoints,
      projectedAreas,
      fullDataset,
      lineType,
      customLineMark,
      customPointMark,
      areaStyle,
      areaRenderMode,
      lineStyle,
      lineRenderMode,
      lineClass,
      pointStyle,
      pointRenderMode,
      pointClass,
      areaClass,
      canvasLines,
      canvasPoints,
      canvasAreas,
      defined,
      size,
      renderKey
    } = currentProps;

    const xAccessor = stringToFn(currentProps.xAccessor);
    const yAccessor = stringToFn(currentProps.yAccessor);
    const lineIDAccessor = stringToFn(currentProps.lineIDAccessor, l => l.id);

    if (
      !currentProps.dataVersion ||
      (currentProps.dataVersion &&
        currentProps.dataVersion !== this.state.dataVersion)
    ) {
      if (
        !xExtent ||
        !yExtent ||
        !fullDataset ||
        (!projectedLines && !projectedPoints && !projectedAreas)
      ) {
        ({
          xExtent,
          yExtent,
          projectedLines,
          projectedPoints,
          projectedAreas,
          fullDataset
        } = calculateDataExtent(currentProps));
      }
    } else {
      ({
        xExtent,
        yExtent,
        projectedLines,
        projectedPoints,
        projectedAreas,
        fullDataset
      } = this.state);
    }

    const { xScale, yScale } = this.screenScales({
      xExtent,
      yExtent,
      currentProps,
      margin,
      adjustedSize
    });

    let canvasDrawing = [];

    const title = generateFrameTitle(currentProps);

    //TODO: blow this shit up
    this.xScale = xScale;
    this.yScale = yScale;
    this.xAccessor = xAccessor;
    this.yAccessor = yAccessor;

    let axes = null;
    let axesTickLines = null;

    if (currentProps.axes) {
      axesTickLines = [];
      axes = currentProps.axes.map((d, i) => {
        let axisScale = yScale;
        if (d.orient === "top" || d.orient === "bottom") {
          axisScale = xScale;
        }

        let tickValues;
        if (d.tickValues && Array.isArray(d.tickValues)) {
          tickValues = d.tickValues;
        } else if (d.tickValues) {
          //otherwise assume a function
          tickValues = d.tickValues(fullDataset, currentProps.size, axisScale);
        }
        let axisSize = [adjustedSize[0], adjustedSize[1]];
        let axisPosition = [margin.left, 0];

        if (d.orient === "top") {
          axisPosition = [0, 0];
        } else if (d.orient === "bottom") {
          axisPosition = [0, margin.top];
        } else if (d.orient === "right") {
          axisPosition = [0, 0];
        }
        const axisParts = axisPieces({
          padding: d.padding,
          tickValues,
          scale: axisScale,
          ticks: d.ticks,
          orient: d.orient,
          size: axisSize,
          margin,
          footer: d.footer
        });
        const axisTickLines = (
          <g key={`axes-tick-lines-${i}`} className={`axis ${d.className}`}>
            {axisLines({ axisParts, orient: d.orient })}
          </g>
        );
        axesTickLines.push(axisTickLines);
        return (
          <Axis
            label={d.label}
            axisParts={axisParts}
            key={d.key || `axis-${i}`}
            orient={d.orient}
            size={axisSize}
            position={axisPosition}
            margin={margin}
            ticks={d.ticks}
            tickSize={d.tickSize}
            tickFormat={d.tickFormat}
            tickValues={tickValues}
            format={d.format}
            scale={axisScale}
            className={d.className || ""}
            name={d.name}
            padding={d.padding}
            rotate={d.rotate}
            annotationFunction={d.axisAnnotationFunction}
            glyphFunction={d.glyphFunction}
          />
        );
      });
    }

    let marginGraphic;
    if (currentProps.matte) {
      marginGraphic = (
        <path
          fill="white"
          d={drawMarginPath({
            margin,
            size: size,
            inset: currentProps.matte.inset
          })}
          className="xyframe-matte"
        />
      );
    }

    let legendSettings;

    if (currentProps.legend) {
      legendSettings = currentProps.legend === true ? {} : currentProps.legend;
      if (currentProps.lines && !legendSettings.legendGroups) {
        const lineType = currentProps.lineType || currentProps.customLineType;
        const typeString = lineType && lineType.type ? lineType.type : lineType;
        const type =
          ["stackedarea", "stackedpercent", "bumparea"].indexOf(typeString) ===
          -1
            ? "line"
            : "fill";
        const legendGroups = [
          {
            styleFn: currentProps.lineStyle,
            type,
            items: currentProps.lines.map(d =>
              Object.assign({ label: lineIDAccessor(d) }, d)
            )
          }
        ];
        legendSettings.legendGroups = legendGroups;
      }
    }
    const areaAnnotations = [];
    const areaType = currentProps.areaType;
    if (areaType && areaType.label && projectedAreas) {
      projectedAreas.forEach((d, i) => {
        if (d.bounds) {
          const bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds];
          bounds.forEach(labelBounds => {
            const label =
              typeof areaType.label === "function"
                ? areaType.label(d)
                : areaType.label;
            if (label && label !== null) {
              const labelPosition = label.position || "center";
              const labelCenter = [
                xScale(labelBounds[labelPosition][0]),
                yScale(labelBounds[labelPosition][1])
              ] || [xScale(d._xyfCoordinates[0]), yScale(d._xyfCoordinates[1])];
              const labelContent = label.content || (p => p.value || p.id || i);

              areaAnnotations.push({
                x: labelCenter[0],
                y: labelCenter[1],
                dx: label.dx,
                dy: label.dy,
                className: label.className,
                type: label.type || AnnotationCallout,
                note: label.note || { title: labelContent(d) },
                subject: label.subject || { text: labelContent(d) },
                connector: label.connector
              });
            }
          });
        }
      });
    }

    const xyFrameRender = {
      lines: {
        data: projectedLines,
        styleFn: stringToFn(lineStyle, () => {}, true),
        classFn: stringToFn(lineClass, () => "", true),
        renderMode: stringToFn(lineRenderMode, undefined, true),
        canvasRender: stringToFn(canvasLines, undefined, true),
        customMark: customLineMark,
        type: lineType,
        defined: defined,
        renderKeyFn: stringToFn(renderKey, (d, i) => `line-${i}`, true),
        behavior: createLines
      },
      areas: {
        data: projectedAreas,
        styleFn: stringToFn(areaStyle, () => {}, true),
        classFn: stringToFn(areaClass, () => {}, true),
        renderMode: stringToFn(areaRenderMode, undefined, true),
        canvasRender: stringToFn(canvasAreas, undefined, true),
        type: areaType,
        renderKeyFn: stringToFn(renderKey, (d, i) => `area-${i}`, true),
        behavior: createAreas
      },
      points: {
        data: projectedPoints,
        styleFn: stringToFn(pointStyle, () => {}, true),
        classFn: stringToFn(pointClass, () => {}, true),
        renderMode: stringToFn(pointRenderMode, undefined, true),
        canvasRender: stringToFn(canvasPoints, undefined, true),
        customMark: stringToFn(customPointMark, undefined, true),
        renderKeyFn: stringToFn(renderKey, (d, i) => `point-${i}`, true),
        behavior: createPoints
      }
    };

    this.setState({
      lineData: currentProps.lines,
      pointData: currentProps.points,
      areaData: currentProps.areas,
      dataVersion: currentProps.dataVersion,
      projectedLines,
      projectedPoints,
      projectedAreas,
      canvasDrawing,
      fullDataset,
      adjustedPosition,
      adjustedSize,
      backgroundGraphics: currentProps.backgroundGraphics,
      foregroundGraphics: currentProps.foregroundGraphics,
      axesData: currentProps.axes,
      axes,
      axesTickLines,
      title,
      updatedFrame: undefined,
      renderNumber: this.state.renderNumber + 1,
      xScale,
      yScale,
      xExtent,
      yExtent,
      margin,
      legendSettings,
      matte: marginGraphic,
      areaAnnotations,
      xyFrameRender,
      size
    });
  }

  defaultXYSVGRule({ d, i, annotationLayer, lines, areas, points }) {
    let xAccessor = this.xAccessor;
    let yAccessor = this.yAccessor;

    let xScale = this.xScale;
    let yScale = this.yScale;

    let screenCoordinates = [];
    const idAccessor = stringToFn(this.props.lineIDAccessor, l => l.id);

    let { adjustedPosition, adjustedSize } = adjustedPositionSize(this.props);

    if (!d.coordinates) {
      const xCoord = d[projectedX] || xAccessor(d);
      screenCoordinates = [
        xScale(xCoord),
        relativeY({
          point: d,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        })
      ];
      if (
        screenCoordinates[0] === undefined ||
        screenCoordinates[1] === undefined ||
        screenCoordinates[0] === null ||
        screenCoordinates[1] === null
      ) {
        //NO ANNOTATION IF INVALID SCREEN COORDINATES
        return null;
      }
    } else if (!d.bounds) {
      screenCoordinates = d.coordinates.map(p => [
        xScale(xAccessor(p)) + adjustedPosition[0],
        relativeY({
          point: p,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        }) + adjustedPosition[1]
      ]);
    }

    const margin = calculateMargin(this.props);

    //point xy
    //y
    //area

    //TODO: Process your rules first
    if (
      this.props.svgAnnotationRules &&
      this.props.svgAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas,
        points,
        lines
      }) !== null
    ) {
      return this.props.svgAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas,
        points,
        lines
      });
    } else if (d.type === "xy" || d.type === "frame-hover") {
      return svgXYAnnotation({ d, screenCoordinates, i });
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      return basicReactAnnotation({ d, screenCoordinates, i });
    } else if (d.type === "enclose") {
      return svgEncloseAnnotation({ d, screenCoordinates, i });
    } else if (d.type === "x") {
      return svgXAnnotation({
        d,
        screenCoordinates,
        i,
        annotationLayer,
        adjustedSize,
        margin
      });
    } else if (d.type === "y") {
      return svgYAnnotation({
        d,
        screenCoordinates,
        i,
        annotationLayer,
        adjustedSize,
        adjustedPosition,
        margin
      });
    } else if (d.type === "bounds") {
      return svgBoundsAnnotation({
        screenCoordinates,
        d,
        i,
        adjustedSize,
        adjustedPosition,
        xAccessor,
        yAccessor,
        xScale,
        yScale,
        margin
      });
    } else if (d.type === "line") {
      return svgLineAnnotation({ d, i, screenCoordinates });
    } else if (d.type === "area") {
      return svgAreaAnnotation({
        d,
        i,
        screenCoordinates,
        xScale,
        xAccessor,
        yScale,
        yAccessor,
        annotationLayer
      });
    } else if (d.type === "horizontal-points") {
      return svgHorizontalPointsAnnotation({
        d,
        lines: lines.data,
        points: points.data,
        xScale,
        yScale,
        pointStyle: points.styleFn
      });
    } else if (d.type === "vertical-points") {
      return svgVerticalPointsAnnotation({
        d,
        lines: lines.data,
        points: points.data,
        xScale,
        yScale,
        pointStyle: points.styleFn
      });
    }
    return null;
  }

  defaultXYHTMLRule({ d, i, lines, areas, points }) {
    let xAccessor = this.xAccessor;
    let yAccessor = this.yAccessor;

    let xScale = this.xScale;
    let yScale = this.yScale;
    //y
    //area

    let screenCoordinates = [];

    const { size } = this.props;

    const idAccessor = stringToFn(this.props.lineIDAccessor, l => l.id);
    const xCoord = d[projectedX] || xAccessor(d);
    const yCoord = d[projectedY] || yAccessor(d);

    const xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord;
    const yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord;

    let { adjustedPosition /*, adjustedSize*/ } = adjustedPositionSize(
      this.props
    );
    if (!d.coordinates) {
      screenCoordinates = [
        xScale(xCoord),
        relativeY({
          point: d,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        })
      ];
      if (
        screenCoordinates[0] === undefined ||
        screenCoordinates[1] === undefined ||
        screenCoordinates[0] === null ||
        screenCoordinates[1] === null
      ) {
        //NO ANNOTATION IF INVALID SCREEN COORDINATES
        return null;
      }
    } else {
      screenCoordinates = d.coordinates.map(p => [
        xScale(xAccessor(p)) + adjustedPosition[0],
        relativeY({
          point: p,
          lines,
          projectedYMiddle,
          projectedY,
          projectedX,
          xAccessor,
          yAccessor,
          yScale,
          xScale,
          idAccessor
        }) + adjustedPosition[1]
      ]);
    }

    if (
      this.props.htmlAnnotationRules &&
      this.props.htmlAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas,
        points,
        lines
      }) !== null
    ) {
      return this.props.htmlAnnotationRules({
        d,
        i,
        screenCoordinates,
        xScale,
        yScale,
        xAccessor,
        yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas,
        points,
        lines
      });
    }

    if (d.type === "frame-hover") {
      let content = (
        <div className="tooltip-content">
          <p key="html-annotation-content-1">{xString}</p>
          <p key="html-annotation-content-2">{yString}</p>
        </div>
      );

      if (d.type === "frame-hover" && this.props.tooltipContent) {
        content = this.props.tooltipContent(d);
      }
      return htmlTooltipAnnotation({
        content,
        screenCoordinates,
        size,
        i,
        d
      });
    }
    return null;
  }

  render() {
    return this.renderBody({});
  }

  renderBody({ afterElements, beforeElements }) {
    const {
      downloadFields,
      xAccessor,
      yAccessor,
      lines,
      points,
      areas,
      name,
      download,
      size,
      className,
      annotationSettings,
      annotations,
      additionalDefs,
      hoverAnnotation,
      interaction,
      customClickBehavior,
      customHoverBehavior,
      customDoubleClickBehavior
    } = this.props;

    const {
      title,
      backgroundGraphics,
      foregroundGraphics,
      adjustedPosition,
      adjustedSize,
      margin,
      matte,
      axes,
      axesTickLines,
      extent,
      xScale,
      yScale,
      dataVersion,
      fullDataset,
      areaAnnotations,
      legendSettings,
      xyFrameRender
    } = this.state;

    let downloadButton;
    if (download) {
      const downloadData =
        download === "points"
          ? mapParentsToPoints(fullDataset)
          : points || lines || areas;
      downloadButton = (
        <DownloadButton
          csvName={`${name}-${new Date().toJSON()}`}
          width={parseInt(size[0])}
          data={xyDownloadMapping({
            data: downloadData,
            xAccessor:
              download === "points" || points
                ? stringToFn(xAccessor)
                : undefined,
            yAccessor:
              download === "points" || points
                ? stringToFn(yAccessor)
                : undefined,
            fields: downloadFields
          })}
        />
      );
    }

    const finalFilterDefs = filterDefs({
      matte: matte,
      key: xyframeKey,
      additionalDefs: additionalDefs
    });

    // foreground and background graphics should handle either JSX or a function that passes size & margin and returns JSX
    return (
      <Frame
        name="xyframe"
        renderPipeline={xyFrameRender}
        adjustedPosition={adjustedPosition}
        size={size}
        extent={extent}
        projectedCoordinateNames={projectedCoordinateNames}
        xScale={xScale}
        yScale={yScale}
        axes={axes}
        axesTickLines={axesTickLines}
        title={title}
        dataVersion={dataVersion}
        matte={matte}
        className={className}
        adjustedSize={adjustedSize}
        finalFilterDefs={finalFilterDefs}
        frameKey={xyframeKey}
        hoverAnnotation={hoverAnnotation}
        defaultSVGRule={this.defaultXYSVGRule.bind(this)}
        defaultHTMLRule={this.defaultXYHTMLRule.bind(this)}
        annotations={
          areaAnnotations.length > 0 ? (
            [...annotations, ...areaAnnotations]
          ) : (
            annotations
          )
        }
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        projectedYMiddle={projectedYMiddle}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={fullDataset}
        margin={margin}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={foregroundGraphics}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        disableContext={this.props.disableContext}
      />
    );
  }
}

XYFrame.propTypes = {
  name: PropTypes.string,
  lines: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  points: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  areas: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  dataVersion: PropTypes.string,
  axes: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  matte: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  size: PropTypes.array,
  position: PropTypes.array,
  xScaleType: PropTypes.func,
  yScaleType: PropTypes.func,
  xExtent: PropTypes.array,
  yExtent: PropTypes.array,
  invertX: PropTypes.bool,
  invertY: PropTypes.bool,
  xAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  yAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  lineDataAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  areaDataAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  backgroundGraphics: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  foregroundGraphics: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  additionalDefs: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleclickBehavior: PropTypes.func,
  lineType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  showLinePoints: PropTypes.bool,
  defined: PropTypes.func,
  lineStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  pointStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  areaStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  lineClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  pointClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  areaClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  canvasPoints: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  customPointMark: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  hoverAnnotation: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.func,
    PropTypes.bool
  ]),
  customLineMark: PropTypes.func,
  lineIDAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  svgAnnotationRules: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  tooltipContent: PropTypes.func,
  annotations: PropTypes.array,
  interaction: PropTypes.object,
  download: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]), //add a download button for graphs data as csv
  downloadFields: PropTypes.array //additional fields aside from x,y to add to the csv
};

export default XYFrame;
