import React from "react";

import { drawAreaConnector } from "../svg/SvgHelper";
import Mark from "../Mark";

import Axis from "../Axis";

import { circlePath } from "../markBehavior/drawing";

import {
  boxplotRenderFn,
  contourRenderFn,
  bucketizedRenderingFn
} from "./summaryLayouts";
import { axisPieces, axisLines } from "../visualizationLayerBehavior/axis";

export const drawMarginPath = ({ margin, size, inset = 5 }) => {
  const iSize = [size[0] - inset, size[1] - inset];
  return `M0,0 h${size[0]} v${size[1]} h-${size[0]}Z M${margin.left -
    inset},${margin.top - inset} v${size[1] +
    inset * 2 -
    margin.top -
    margin.bottom} h${iSize[0] +
    inset * 3 -
    margin.left -
    margin.right} v-${iSize[1] + inset * 3 - margin.top - margin.bottom}Z`;
};

export const trueAxis = (orient, projection) => {
  if (projection === "horizontal" && ["top", "bottom"].indexOf(orient) === -1) {
    return "bottom";
  } else if (
    (!projection || projection === "vertical") &&
    ["left", "right"].indexOf(orient) === -1
  ) {
    return "left";
  } else if (!orient && projection === "horizontal") {
    return "bottom";
  } else if (!orient) {
    return "left";
  }
  return orient;
};

export const calculateMargin = ({
  margin,
  axis,
  axes,
  title,
  oLabel,
  projection
}) => {
  if (margin) {
    let tempMargin;
    if (typeof margin !== "object") {
      tempMargin = { top: margin, bottom: margin, left: margin, right: margin };
    }
    tempMargin = Object.assign(
      { top: 0, bottom: 0, left: 0, right: 0 },
      margin
    );

    return tempMargin;
  }
  const finalMargin = { top: 0, bottom: 0, left: 0, right: 0 };
  if (title && title.length !== 0) {
    finalMargin.top = 30;
  }
  let orient = trueAxis(null, projection);
  if (axis && projection !== "radial") {
    orient = trueAxis(axis.orient, projection);
    finalMargin[orient] += 50;
  }
  if (axes) {
    axes.forEach(axisObj => {
      orient = axisObj.orient;
      finalMargin[orient] += 50;
    });
  }
  if (oLabel && projection !== "radial") {
    if (orient === "bottom" || orient === "top") {
      finalMargin.left += 50;
    } else {
      finalMargin.bottom += 50;
    }
  }
  return finalMargin;
};

export function objectifyType(type) {
  return typeof type === "object" && type !== null ? type : { type: type };
}

export function generateORFrameEventListeners(
  customHoverBehavior,
  customClickBehavior
) {
  let eventListenersGenerator = () => ({});

  if (customHoverBehavior || customClickBehavior) {
    eventListenersGenerator = (d, i) => ({
      onMouseEnter: customHoverBehavior
        ? () => customHoverBehavior(d, i)
        : undefined,
      onMouseLeave: customHoverBehavior
        ? () => customHoverBehavior(undefined)
        : undefined,
      onClick: customClickBehavior ? () => customClickBehavior(d, i) : undefined
    });
  }
  return eventListenersGenerator;
}

export function keyAndObjectifyBarData({ data, renderKey = (d, i) => i }) {
  return data
    ? data.map((d, i) => {
        const appliedKey = renderKey(d, i);
        if (typeof d !== "object") {
          return { value: d, renderKey: appliedKey };
        }
        return Object.assign(d, { renderKey: appliedKey });
      })
    : [];
}

export function adjustedPositionSize({
  size = [500, 500],
  position = [0, 0],
  margin,
  axis,
  axes,
  title,
  oLabel,
  projection
}) {
  let finalMargin = calculateMargin({
    margin,
    axis,
    axes,
    title,
    oLabel,
    projection
  });

  let heightAdjust = finalMargin.top + finalMargin.bottom;
  let widthAdjust = finalMargin.left + finalMargin.right;

  let adjustedPosition = [position[0], position[1]];
  let adjustedSize = [size[0] - widthAdjust, size[1] - heightAdjust];
  if (projection === "radial") {
    const minSize = Math.min(adjustedSize[0], adjustedSize[1]);
    adjustedSize = [minSize, minSize];
  }

  return { adjustedPosition, adjustedSize };
}

export function generateFrameTitle({ title, size }) {
  let finalTitle = null;
  if (typeof title === "string" && title.length > 0) {
    finalTitle = (
      <text
        x={size[0] / 2}
        y={25}
        className={"frame-title"}
        style={{ textAnchor: "middle", pointerEvents: "none" }}
      >
        {title}
      </text>
    );
  } else if (title) {
    //assume if defined then its an svg mark of some sort
    finalTitle = title;
  }
  return finalTitle;
}

export function orFrameConnectionRenderer({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection
}) {
  if (!type.type) {
    return null;
  }
  const renderedConnectorMarks = [];
  if (typeof type.type === "function") {
    const connectionRule = type.type;
    const keys = Object.keys(data);

    keys.forEach((key, pieceArrayI) => {
      const pieceArray = data[key];
      const nextColumn = data[keys[pieceArrayI + 1]];
      if (nextColumn) {
        const matchArray = nextColumn.map((d, i) => connectionRule(d.piece, i));
        pieceArray.forEach((piece, pieceI) => {
          const thisConnectionPiece = connectionRule(piece.piece, pieceI);
          const matchingPieceIndex = matchArray.indexOf(
            connectionRule(piece.piece, pieceI)
          );
          if (
            thisConnectionPiece !== undefined &&
            thisConnectionPiece !== null &&
            matchingPieceIndex !== -1
          ) {
            const matchingPiece = nextColumn[matchingPieceIndex];
            let markD;
            const { xy } = piece;
            const { xy: mxy } = matchingPiece;
            const { x, y, height = 1, width = 1 } = xy;
            const {
              x: mx,
              y: my,
              height: mheight = 1,
              width: mwidth = 1
            } = mxy;
            if (projection === "vertical") {
              markD = drawAreaConnector({
                x1: x + width,
                x2: mx,
                y1: y,
                y2: my,
                sizeX1: 0,
                sizeX2: 0,
                sizeY1: height,
                sizeY2: mheight
              });
            } else if (projection === "horizontal") {
              markD = drawAreaConnector({
                x1: x,
                x2: mx,
                y1: y + height,
                y2: my,
                sizeX1: width,
                sizeX2: mwidth,
                sizeY1: 0,
                sizeY2: 0
              });
            } else if (projection === "radial") {
              markD = drawAreaConnector({
                x1: x,
                x2: mx,
                y1: y + height,
                y2: my,
                sizeX1: width,
                sizeX2: mwidth,
                sizeY1: 0,
                sizeY2: 0
              });
            }
            const renderValue = renderMode && renderMode(piece.piece, pieceI);

            const calculatedStyle = styleFn({
              source: piece.piece,
              target: matchingPiece.piece
            });

            const eventListeners = eventListenersGenerator(
              { source: piece.piece, target: matchingPiece.piece },
              pieceI
            );

            renderedConnectorMarks.push(
              <Mark
                {...eventListeners}
                renderMode={renderValue}
                markType="path"
                d={markD}
                className={classFn ? classFn(piece.piece, pieceI) : ""}
                key={"connector" + piece.piece.renderKey}
                style={calculatedStyle}
              />
            );
          }
        });
      }
    });
  } else if (type.type) {
    console.error(
      `Invalid connectorType - Must be a function that takes a data point and determines if it is connected to a data point in the next column`
    );
  }
  return renderedConnectorMarks;
}

const summaryRenderHash = {
  contour: contourRenderFn,
  boxplot: boxplotRenderFn,
  violin: bucketizedRenderingFn,
  heatmap: bucketizedRenderingFn,
  joy: bucketizedRenderingFn,
  histogram: bucketizedRenderingFn
};

export function orFrameSummaryRenderer({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  positionFn,
  projection,
  adjustedSize,
  margin,
  chartSize
}) {
  let summaryRenderFn;
  if (typeof type.type === "function") {
    summaryRenderFn = type.type;
  } else if (summaryRenderHash[type.type]) {
    summaryRenderFn = summaryRenderHash[type.type];
  } else {
    console.error(
      `Invalid summary type: ${type.type} - Must be a function or one of the following strings: ${Object.keys(
        summaryRenderHash
      )}`
    );
    return;
  }
  return summaryRenderFn({
    data,
    type,
    renderMode,
    eventListenersGenerator,
    styleFn,
    classFn,
    positionFn,
    projection,
    adjustedSize,
    margin,
    chartSize
  });
}

export const orFrameAxisGenerator = ({
  projection,
  axis,
  adjustedSize,
  size,
  rScale,
  rScaleType,
  margin,
  pieceType,
  rExtent,
  data
}) => {
  let generatedAxis, axesTickLines;
  if (projection !== "radial" && axis) {
    axesTickLines = [];
    let axisPosition = [0, 0];
    const axes = Array.isArray(axis) ? axis : [axis];
    generatedAxis = axes.map((d, i) => {
      let tickValues;
      let axisScale = rScaleType().domain(rScale.domain());

      let orient = trueAxis(d.orient, projection);

      if (orient === "right") {
        axisScale.range([rScale.range()[1], rScale.range()[0]]);
      } else if (orient === "left") {
        axisPosition = [margin.left, 0];
        axisScale.range([rScale.range()[1], rScale.range()[0]]);
      } else if (orient === "top") {
        axisScale.range(rScale.range());
      } else if (orient === "bottom") {
        axisPosition = [0, margin.top];
        axisScale.range(rScale.range());
      }

      if (d.tickValues && Array.isArray(d.tickValues)) {
        tickValues = d.tickValues;
      } else if (d.tickValues) {
        //otherwise assume a function
        tickValues = d.tickValues(data, size, rScale);
      }

      const axisParts = axisPieces({
        padding: d.padding,
        tickValues,
        scale: axisScale,
        ticks: d.ticks,
        orient,
        size: adjustedSize,
        margin,
        footer: d.footer
      });
      const axisTickLines = axisLines({ axisParts, orient });
      axesTickLines.push(axisTickLines);

      return (
        <Axis
          label={d.label}
          axisParts={axisParts}
          key={d.key || `orframe-axis-${i}`}
          orient={orient}
          size={adjustedSize}
          margin={margin}
          position={axisPosition}
          ticks={d.ticks}
          tickSize={d.tickSize}
          tickFormat={d.tickFormat}
          tickValues={tickValues}
          format={d.format}
          rotate={d.rotate}
          scale={axisScale}
          className={d.className}
          name={d.name}
        />
      );
    });
  } else if (projection === "radial" && axis) {
    const { innerRadius = 0 } = pieceType;
    const {
      tickValues = rScale.ticks(
        Math.max(2, (adjustedSize[0] / 2 - innerRadius) / 50)
      ),
      label,
      tickFormat = d => d
    } = axis;

    const tickScale = rScaleType()
      .domain(rExtent)
      .range([innerRadius, adjustedSize[0] / 2]);
    const ticks = tickValues.map((t, i) => {
      const tickSize = tickScale(t);
      if (!(innerRadius === 0 && t === 0)) {
        let axisLabel;
        let ref = "";
        if (label && i === tickValues.length - 1) {
          const labelSettings =
            typeof label === "string" ? { name: label } : label;
          const { locationDistance = 15 } = labelSettings;
          ref = `${Math.random().toString()} `;
          axisLabel = (
            <g
              className="axis-label"
              transform={`translate(0,${locationDistance})`}
            >
              <text textAnchor="middle">
                <textPath
                  startOffset={tickSize * Math.PI * 0.5}
                  xlinkHref={`#${ref}`}
                >
                  {label.name}
                </textPath>
              </text>
            </g>
          );
        }
        return (
          <g
            key={`orframe-radial-axis-element-${t}`}
            className="axis axis-label axis-tick"
            transform={`translate(${margin.left},0)`}
          >
            <path
              id={ref}
              d={circlePath(0, 0, tickSize)}
              r={tickSize}
              stroke="gray"
              fill="none"
            />
            <text y={-tickSize + 5} textAnchor="middle">
              {tickFormat(t)}
            </text>
            {axisLabel}
          </g>
        );
      }
      return null;
    });
    generatedAxis = (
      <g
        key={axis.key || `orframe-radial-axis-container`}
        transform={`translate(${adjustedSize[0] / 2},${adjustedSize[1] / 2 +
          margin.top})`}
      >
        {ticks}
      </g>
    );
  }
  return { axis: generatedAxis, axesTickLines };
};
