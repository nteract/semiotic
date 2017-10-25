import React from "react";

import { nest } from "d3-collection";

import uniq from "lodash.uniq";

import { scaleBand, scaleOrdinal, scaleLinear, scaleIdentity } from "d3-scale";

import { sum, max, min, extent } from "d3-array";

import { arc } from "d3-shape";

import { filterDefs } from "./constants/jsx";
import Annotation from "./Annotation";
import { orFrameChangeProps } from "./constants/frame_props";

import { packEnclose } from "d3-hierarchy";
import {
  AnnotationXYThreshold,
  AnnotationCalloutCircle
} from "react-annotation";

import Frame from "./Frame";
import Mark from "./Mark";
import DownloadButton from "./DownloadButton";

import { orDownloadMapping } from "./downloadDataMapping";

import {
  calculateMargin,
  objectifyType,
  keyAndObjectifyBarData,
  generateORFrameEventListeners,
  adjustedPositionSize,
  generateFrameTitle,
  orFrameConnectionRenderer,
  orFrameAxisGenerator
} from "./svg/frameFunctions";
import { pointOnArcAtAngle, renderLaidOutPieces } from "./svg/pieceDrawing";
import {
  clusterBarLayout,
  barLayout,
  pointLayout,
  swarmLayout
} from "./svg/pieceLayouts";

import { drawSummaries, renderLaidOutSummaries } from "./svg/summaryLayouts";
import { stringToFn } from "./data/dataFunctions";

import PropTypes from "prop-types";

const xScale = scaleIdentity();
const yScale = scaleIdentity();

const midMod = d => (d.middle ? d.middle : 0);
const zeroFunction = () => 0;

const projectedCoordinatesObject = { y: "y", x: "x" };

const defaultOverflow = { top: 0, bottom: 0, left: 0, right: 0 };

const layoutHash = {
  clusterbar: clusterBarLayout,
  bar: barLayout,
  point: pointLayout,
  swarm: swarmLayout
};

const emptyObject = {};

class ORFrame extends React.Component {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    projection: "vertical",
    size: [500, 500],
    className: ""
  };

  constructor(props) {
    super(props);

    this.calculateORFrame = this.calculateORFrame.bind(this);
    this.defaultORHTMLRule = this.defaultORHTMLRule.bind(this);
    this.defaultORSVGRule = this.defaultORSVGRule.bind(this);

    this.renderBody = this.renderBody.bind(this);

    this.state = {
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axisData: null,
      axis: null,
      renderNumber: 0,
      oLabels: []
    };

    this.oAccessor = null;
    this.rAccessor = null;
    this.oScale = null;
    this.rScale = null;
  }

  calculateORFrame(currentProps) {
    let oLabels;
    const projectedColumns = {};

    const padding = currentProps.oPadding ? currentProps.oPadding : 0;

    const summaryType = objectifyType(currentProps.summaryType);
    const pieceType = objectifyType(currentProps.type);
    const connectorType = objectifyType(currentProps.connectorType);

    const {
      projection,
      customHoverBehavior,
      customClickBehavior,
      size
    } = currentProps;
    const eventListenersGenerator = generateORFrameEventListeners(
      customHoverBehavior,
      customClickBehavior
    );

    const barData = keyAndObjectifyBarData(currentProps);

    const oAccessor = stringToFn(currentProps.oAccessor, d => d.renderKey);
    const rAccessor = stringToFn(currentProps.rAccessor, d => d.value || 1);

    const connectorStyle = stringToFn(
      currentProps.connectorStyle,
      () => ({}),
      true
    );
    const summaryStyle = stringToFn(
      currentProps.summaryStyle,
      () => ({}),
      true
    );
    const pieceStyle = stringToFn(currentProps.style, () => ({}), true);
    const pieceClass = stringToFn(currentProps.pieceClass, () => "", true);
    const summaryClass = stringToFn(currentProps.summaryClass, () => "", true);
    const summaryPosition =
      currentProps.summaryPosition || (position => position);

    let allData = [...barData];

    //      const dataAccessor = currentProps.dataAccessor || function (d) {return d}
    const margin = calculateMargin(currentProps);
    const { adjustedPosition, adjustedSize } = adjustedPositionSize(
      currentProps
    );
    const title = generateFrameTitle(currentProps);

    let oExtent =
      currentProps.oExtent || uniq(allData.map((d, i) => oAccessor(d, i)));

    let rExtent;
    let subZeroRExtent = [0, 0];

    if (
      pieceType.type === "bar" &&
      summaryType.type &&
      summaryType.type !== "none"
    ) {
      pieceType.type = undefined;
    }

    if (
      currentProps.rExtent &&
      currentProps.rExtent[0] !== undefined &&
      currentProps.rExtent[1] !== undefined
    ) {
      rExtent = currentProps.rExtent;
    } else if (pieceType.type !== "bar") {
      rExtent = extent(allData, rAccessor);
    } else {
      const positiveData = allData.filter(d => rAccessor(d) >= 0);
      const negativeData = allData.filter(d => rAccessor(d) <= 0);

      const nestedPositiveData = nest()
        .key(oAccessor)
        .rollup(leaves => sum(leaves.map(rAccessor)))
        .entries(positiveData);

      const nestedNegativeData = nest()
        .key(oAccessor)
        .rollup(leaves => sum(leaves.map(rAccessor)))
        .entries(negativeData);

      let topR = currentProps.rExtent && currentProps.rExtent[1];

      rExtent =
        currentProps.rExtent && topR
          ? [0, topR]
          : [
              0,
              nestedPositiveData.length === 0
                ? 0
                : Math.max(max(nestedPositiveData, d => d.value), 0)
            ];

      let bottomR = currentProps.rExtent && currentProps.rExtent[0];

      if (
        currentProps.rExtent &&
        topR &&
        bottomR &&
        currentProps.rExtent[0] > currentProps.rExtent[1]
      ) {
        //Assume a flipped rExtent
        bottomR = currentProps.rExtent && currentProps.rExtent[1];
        topR = currentProps.rExtent && currentProps.rExtent[0];
      }
      subZeroRExtent = bottomR
        ? [0, bottomR]
        : [
            0,
            nestedNegativeData.length === 0
              ? 0
              : Math.min(min(nestedNegativeData, d => d.value), 0)
          ];
      rExtent = [subZeroRExtent[1], rExtent[1]];
      if (pieceType.type === "clusterbar") {
        rExtent[0] = 0;
      }
    }

    if (
      currentProps.rExtent &&
      currentProps.rExtent[1] !== undefined &&
      currentProps.rExtent[0] === undefined
    ) {
      rExtent[1] = currentProps.rExtent[1];
    }

    if (
      currentProps.rExtent &&
      currentProps.rExtent[0] !== undefined &&
      currentProps.rExtent[1] === undefined
    ) {
      rExtent[0] = currentProps.rExtent[0];
    }

    if (currentProps.sortO) {
      oExtent = oExtent.sort(currentProps.sortO);
    }
    if (
      currentProps.invertR ||
      (currentProps.rExtent &&
        currentProps.rExtent[0] > currentProps.rExtent[1])
    ) {
      rExtent = [rExtent[1], rExtent[0]];
    }

    let rDomain = [margin.left, adjustedSize[0] + margin.left];
    let oDomain = [margin.top, adjustedSize[1] + margin.top];

    if (projection === "vertical") {
      oDomain = [margin.left, adjustedSize[0] + margin.left];
      rDomain = [margin.top, adjustedSize[1]];
    }

    const oScaleType = currentProps.oScaleType || scaleBand;
    const rScaleType = currentProps.rScaleType || scaleLinear;

    let cwHash;

    let oScale;

    if (currentProps.dynamicColumnWidth) {
      let columnValueCreator;
      if (typeof currentProps.dynamicColumnWidth === "string") {
        columnValueCreator = d =>
          sum(d.map(p => p[currentProps.dynamicColumnWidth]));
      } else {
        columnValueCreator = currentProps.dynamicColumnWidth;
      }
      const thresholdDomain =
        projection === "vertical" ? [margin.left] : [margin.top];
      let maxColumnValues = 0;
      const columnValues = [];

      oExtent.forEach((d, i) => {
        const oValue = columnValueCreator(
          barData.filter((p, q) => oAccessor(p, q) === d)
        );
        columnValues.push(oValue);
        maxColumnValues += oValue;
      });

      cwHash = { total: 0 };
      oExtent.forEach((d, i) => {
        const oValue = columnValues[i];
        const stepValue = oValue / maxColumnValues * (oDomain[1] - oDomain[0]);
        cwHash[d] = stepValue;
        cwHash.total += stepValue;
        if (i !== oExtent.length - 1) {
          thresholdDomain.push(stepValue + thresholdDomain[i]);
        }
      });

      oScale = scaleOrdinal()
        .domain(oExtent)
        .range(thresholdDomain);
    } else {
      oScale = oScaleType()
        .domain(oExtent)
        .range(oDomain);
    }

    const rScale = rScaleType()
      .domain(rExtent)
      .range(rDomain);

    const rScaleReverse = rScaleType()
      .domain(rDomain)
      .range(rDomain.reverse());

    this.oScale = oScale;
    this.rScale = rScale;

    this.oAccessor = oAccessor;
    this.rAccessor = rAccessor;

    let columnWidth = cwHash ? 0 : oScale.bandwidth();

    let pieceData = [],
      mappedMiddles;

    let mappedMiddleSize = adjustedSize[1] + margin.top;
    if (projection === "vertical") {
      mappedMiddleSize = adjustedSize[0] + margin.left;
    }
    mappedMiddles = this.mappedMiddles(oScale, mappedMiddleSize, padding);

    const nestedPieces = {};
    nest()
      .key(oAccessor)
      .entries(barData)
      .forEach(d => {
        nestedPieces[d.key] = d.values;
      });
    pieceData = oExtent.map(d => nestedPieces[d]);

    const zeroValue =
      projection === "vertical" ? rScaleReverse(rScale(0)) : rScale(0);

    oExtent.forEach((o, i) => {
      projectedColumns[o] = { name: o, padding, pieceData: pieceData[i] };
      projectedColumns[o].x = oScale(o) + padding / 2;
      projectedColumns[o].y =
        projection === "vertical" ? margin.top : margin.left;
      projectedColumns[o].middle = mappedMiddles[o] + padding / 2;

      let negativeOffset = zeroValue;
      let positiveOffset = zeroValue;

      projectedColumns[o].pieceData.forEach(piece => {
        const pieceValue = rAccessor(piece);
        let valPosition;

        if (pieceType.type !== "bar" && pieceType.type !== "clusterbar") {
          valPosition = rScale(pieceValue);
          piece._orFR = valPosition;
        } else {
          valPosition =
            projection === "vertical"
              ? rScaleReverse(rScale(pieceValue))
              : rScale(pieceValue);
          piece._orFR = Math.abs(zeroValue - valPosition);
        }
        piece._orFV = pieceValue;
        piece._orFX = projectedColumns[o].x;
        piece._orFRZ = valPosition - zeroValue;
        if (pieceValue >= 0) {
          piece._orFRBase = zeroValue;
          piece._orFRBottom = positiveOffset;
          piece._orFRMiddle = piece._orFR / 2 + positiveOffset;
          positiveOffset =
            projection === "vertical"
              ? positiveOffset - piece._orFR
              : positiveOffset + piece._orFR;
          piece.negative = false;
        } else {
          piece._orFRBase = zeroValue;
          piece._orFRBottom = negativeOffset;
          piece._orFRMiddle = positiveOffset - piece._orFR / 2;
          negativeOffset =
            projection === "vertical"
              ? negativeOffset + piece._orFR
              : negativeOffset - piece._orFR;
          piece.negative = true;
        }
      });

      if (cwHash) {
        projectedColumns[o].width = cwHash[o] - padding;
        if (currentProps.ordinalAlign === "center") {
          projectedColumns[o].x =
            projectedColumns[o].x - projectedColumns[o].width / 2;
          projectedColumns[o].middle =
            projectedColumns[o].middle - projectedColumns[o].width / 2;
        }
        projectedColumns[o].pct = cwHash[o] / cwHash.total;
        projectedColumns[o].pct_start =
          (projectedColumns[o].x - oDomain[0]) / cwHash.total;
        projectedColumns[o].pct_padding = padding / cwHash.total;
        projectedColumns[o].pct_middle =
          projectedColumns[o].middle / cwHash.total;
      } else {
        projectedColumns[o].width = columnWidth - padding;
        if (currentProps.ordinalAlign === "center") {
          projectedColumns[o].x =
            projectedColumns[o].x - projectedColumns[o].width / 2;
          projectedColumns[o].middle =
            projectedColumns[o].middle - projectedColumns[o].width / 2;
        }
        projectedColumns[o].pct = columnWidth / adjustedSize[1];
        projectedColumns[o].pct_start =
          (projectedColumns[o].x - oDomain[0]) / adjustedSize[1];
        projectedColumns[o].pct_padding = padding / adjustedSize[1];
        projectedColumns[o].pct_middle =
          projectedColumns[o].middle / adjustedSize[1];
      }
    });

    const labelArray = [];

    const pieArcs = [];

    if (currentProps.oLabel || currentProps.hoverAnnotation) {
      oExtent.forEach((d, i) => {
        const arcGenerator = arc()
          .innerRadius(0)
          .outerRadius(rScale.range()[1] / 2);
        let angle = 1 / oExtent.length;
        let startAngle = angle * i;
        let twoPI = Math.PI * 2;
        angle = projectedColumns[d].pct;
        startAngle = projectedColumns[d].pct_start;

        let endAngle = startAngle + angle;
        let midAngle = startAngle + angle / 2;

        const markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        const translate = [
          adjustedSize[0] / 2 + margin.left,
          adjustedSize[1] / 2 + margin.top
        ];
        const centroid = arcGenerator.centroid({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        pieArcs.push({
          startAngle,
          endAngle,
          midAngle,
          markD,
          translate,
          centroid
        });
      });
    }

    const labelSettings =
      typeof currentProps.oLabel === "object"
        ? Object.assign({ label: true }, currentProps.oLabel)
        : { orient: "default", label: currentProps.oLabel };

    if (currentProps.oLabel) {
      let labelingFn;
      if (labelSettings.label === true) {
        labelingFn = d => (
          <text
            style={{
              textAnchor:
                projection === "horizontal" && labelSettings.orient === "right"
                  ? "start"
                  : projection === "horizontal" ? "end" : "middle"
            }}
          >
            {d}
          </text>
        );
      } else if (typeof labelSettings.label === "function") {
        labelingFn = labelSettings.label;
      }

      oExtent.forEach((d, i) => {
        let xPosition = projectedColumns[d].middle;
        let yPosition = 0;

        if (projection === "horizontal") {
          yPosition = projectedColumns[d].middle;
          if (labelSettings.orient === "right") {
            xPosition = margin.left + adjustedSize[0] + 3;
          } else {
            xPosition = margin.left - 3;
          }
        } else if (projection === "radial") {
          xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0];
          yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1];
        }
        const label = labelingFn(
          d,
          currentProps.data
            ? currentProps.data.filter((p, q) => oAccessor(p, q) === d)
            : undefined
        );
        labelArray.push(
          <g
            key={"olabel-" + i}
            transform={"translate(" + xPosition + "," + yPosition + ")"}
          >
            {label}
          </g>
        );
      });

      if (projection === "vertical") {
        let labelY;
        if (labelSettings.orient === "top") {
          labelY = margin.top - 15;
        } else {
          labelY = 15 + rScale.range()[1];
        }
        oLabels = (
          <g
            key="orframe-labels-container"
            transform={`translate(0,${labelY})`}
          >
            {labelArray}
          </g>
        );
      } else if (projection === "horizontal") {
        oLabels = (
          <g key="orframe-labels-container" transform={"translate(0,0)"}>
            {labelArray}
          </g>
        );
      } else if (projection === "radial") {
        oLabels = (
          <g key="orframe-labels-container" transform={"translate(0,0)"}>
            {labelArray}
          </g>
        );
      }
    }

    let columnOverlays;

    if (currentProps.hoverAnnotation) {
      columnOverlays = oExtent.map((d, i) => {
        const barColumnWidth = projectedColumns[d].width;
        let xPosition = projectedColumns[d].x;
        let yPosition = margin.top;
        let height = rScale.range()[1];
        let width = barColumnWidth + padding;
        if (projection === "horizontal") {
          yPosition = projectedColumns[d].x;
          xPosition = margin.left;
          width = rScale.range()[1] - margin.left;
          height = barColumnWidth;
        }

        if (projection === "radial") {
          const { markD, centroid, translate, midAngle } = pieArcs[i];
          return {
            markType: "path",
            key: "hover" + d,
            d: markD,
            transform: "translate(" + translate + ")",
            style: { opacity: 0, fill: "pink" },
            onClick: () => ({
              type: "column-hover",
              pieces: barData.filter((p, q) => oAccessor(p, q) === d),
              summary: projectedColumns[d].pieceData,
              arcAngles: {
                centroid,
                translate,
                midAngle,
                length: rScale.range()[1] / 2
              }
            }),
            onMouseEnter: () => ({
              type: "column-hover",
              pieces: barData.filter((p, q) => oAccessor(p, q) === d),
              summary: projectedColumns[d].pieceData,
              arcAngles: {
                centroid,
                translate,
                midAngle,
                length: rScale.range()[1] / 2
              }
            }),
            onMouseLeave: () => ({})
          };
        }

        return {
          markType: "rect",
          key: "hover" + d,
          x: xPosition,
          y: yPosition,
          height: height,
          width: width,
          style: { opacity: 0, stroke: "black", fill: "pink" },
          onClick: () => ({
            type: "column-hover",
            pieces: barData.filter((p, q) => oAccessor(p, q) === d),
            summary: projectedColumns[d].pieceData
          }),
          onMouseEnter: () => ({
            type: "column-hover",
            pieces: barData.filter((p, q) => oAccessor(p, q) === d),
            summary: projectedColumns[d].pieceData
          }),
          onMouseLeave: () => ({})
        };
      });
    }

    const { axis, axesTickLines } = orFrameAxisGenerator({
      axis: currentProps.axis,
      data: currentProps.data,
      projection,
      adjustedSize,
      size,
      rScale,
      rScaleType,
      margin,
      pieceType,
      rExtent
    });

    const {
      renderMode,
      canvasSummaries,
      summaryRenderMode,
      connectorClass,
      connectorRenderMode,
      canvasConnectors
    } = currentProps;

    let pieceDataXY;
    const pieceRenderMode = stringToFn(renderMode, undefined, true);
    //    const pieceCanvasRender = stringToFn(canvasPieces, undefined, true)

    const pieceTypeForXY =
      pieceType.type && pieceType.type !== "none" ? pieceType.type : "point";
    const pieceTypeLayout =
      typeof pieceTypeForXY === "function"
        ? pieceTypeForXY
        : layoutHash[pieceTypeForXY];
    const calculatedPieceData = pieceTypeLayout({
      type: pieceType,
      data: projectedColumns,
      renderMode: pieceRenderMode,
      eventListenersGenerator,
      styleFn: pieceStyle,
      projection,
      classFn: pieceClass,
      adjustedSize,
      margin,
      rScale
    });

    const keyedData = calculatedPieceData.reduce((p, c) => {
      if (!p[c.o]) {
        p[c.o] = [];
      }
      p[c.o].push(c);
      return p;
    }, {});

    Object.keys(projectedColumns).forEach(d => {
      projectedColumns[d].xyData = keyedData[d];
    });
    let calculatedSummaries = {};

    if (summaryType.type) {
      calculatedSummaries = drawSummaries({
        data: projectedColumns,
        type: summaryType,
        renderMode: stringToFn(summaryRenderMode, undefined, true),
        styleFn: stringToFn(summaryStyle, () => {}, true),
        classFn: stringToFn(summaryClass, () => "", true),
        canvasRender: stringToFn(canvasSummaries, undefined, true),
        positionFn: summaryPosition,
        projection,
        eventListenersGenerator,
        adjustedSize,
        margin
      });
    }

    if (
      currentProps.pieceHoverAnnotation &&
      (calculatedPieceData ||
        (calculatedSummaries && calculatedSummaries.xyPoints))
    ) {
      const yMod = projection === "horizontal" ? midMod : zeroFunction;
      const xMod = projection === "vertical" ? midMod : zeroFunction;

      if (calculatedSummaries && calculatedSummaries.xyPoints) {
        pieceDataXY = calculatedSummaries.xyPoints.map(d =>
          Object.assign({}, d, {
            type: "frame-hover",
            isSummaryData: true,
            x: d.x,
            y: d.y
          })
        );
      } else {
        pieceDataXY = calculatedPieceData.map(d =>
          Object.assign({}, d.piece, {
            type: "frame-hover",
            x: d.xy.x + xMod(d.xy),
            y: d.xy.y + yMod(d.xy)
          })
        );
      }
    }

    const orFrameRender = {
      connectors: {
        projection,
        data: keyedData,
        styleFn: stringToFn(connectorStyle, () => {}, true),
        classFn: stringToFn(connectorClass, () => "", true),
        renderMode: stringToFn(connectorRenderMode, undefined, true),
        canvasRender: stringToFn(canvasConnectors, undefined, true),
        behavior: orFrameConnectionRenderer,
        type: connectorType,
        eventListenersGenerator,
        margin
      },
      summaries: {
        data: calculatedSummaries.marks,
        behavior: renderLaidOutSummaries
      },
      pieces: {
        shouldRender: pieceType.type && pieceType.type !== "none",
        data: calculatedPieceData,
        behavior: renderLaidOutPieces
      }
    };

    this.setState({
      pieceDataXY,
      adjustedPosition: adjustedPosition,
      adjustedSize: adjustedSize,
      backgroundGraphics: currentProps.backgroundGraphics,
      foregroundGraphics: currentProps.foregroundGraphics,
      axisData: currentProps.axis,
      axes: <g className="axis-labels">{axis}</g>,
      axesTickLines,
      oLabels,
      title,
      columnOverlays,
      renderNumber: this.state.renderNumber + 1,
      oAccessor: currentProps.oAccessor,
      rAccessor: currentProps.rAccessor,
      oScaleType: currentProps.oScaleType,
      rScaleType: currentProps.rScaleType,
      oExtent: currentProps.oExtent,
      rExtent: currentProps.rExtent,
      projectedColumns,
      margin,
      legendSettings: currentProps.legend,
      eventListenersGenerator,
      orFrameRender
    });
  }

  componentWillMount() {
    this.calculateORFrame(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      !this.state.projectedColumns
    ) {
      this.calculateORFrame(nextProps);
    } else if (
      this.props.size[0] !== nextProps.size[0] ||
      this.props.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        orFrameChangeProps.find(d => {
          return this.props[d] !== nextProps[d];
        }))
    ) {
      this.calculateORFrame(nextProps);
    }
  }

  clonedAppliedElement({
    tx,
    ty,
    d,
    i,
    markProps,
    styleFn,
    renderFn,
    classFn,
    baseClass
  }) {
    markProps.style = styleFn ? styleFn(d, i) : {};
    markProps.renderMode = renderFn ? renderFn(d, i) : undefined;

    if (tx || ty) {
      markProps.transform = "translate(" + tx || 0 + "," + ty || 0 + ")";
    }

    markProps.className = baseClass;

    markProps.key = baseClass + "-" + i;

    if (classFn) {
      markProps.className = baseClass + " " + classFn(d, i);
    }

    return <Mark {...markProps} />;
  }

  defaultORSVGRule({ d, i, annotationLayer }) {
    const oAccessor = this.oAccessor;
    const rAccessor = this.rAccessor;
    const oScale = this.oScale;
    const rScale = this.rScale;

    const { projection } = this.props;
    const { projectedColumns } = this.state;

    const { adjustedPosition, adjustedSize } = adjustedPositionSize(this.props);
    const margin = calculateMargin(this.props);

    const screenProject = p => {
      const oColumn = projectedColumns[oAccessor(p)];
      let o;
      if (oColumn) {
        o = oColumn.middle;
      } else {
        o = 0;
      }
      if (oColumn && projection === "radial") {
        return pointOnArcAtAngle(
          [adjustedSize[0] / 2 + margin.left, adjustedSize[1] / 2 + margin.top],
          oColumn.pct_middle,
          (rScale(rAccessor(p)) - margin.left) / 2
        );
      }
      if (projection === "horizontal") {
        return [rScale(rAccessor(p)), o];
      }
      const newScale = scaleLinear()
        .domain(rScale.domain())
        .range(rScale.range().reverse());

      return [o, newScale(rAccessor(p))];
    };

    let screenCoordinates = [0, 0];

    //TODO: Support radial??
    if (d.coordinates) {
      screenCoordinates = d.coordinates.map(p => screenProject(p));
    } else {
      screenCoordinates = screenProject(d);
    }

    //TODO: Process your rules first
    if (
      this.props.svgAnnotationRules &&
      this.props.svgAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state,
        categories: this.state.projectedColumns
      }) !== null
    ) {
      return this.props.svgAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        adjustedPosition,
        adjustedSize,
        annotationLayer,
        orFrameState: this.state,
        categories: this.state.projectedColumns
      });
    } else if (d.type === "or") {
      return (
        <Mark
          markType="text"
          key={d.label + "annotationtext" + i}
          forceUpdate={true}
          x={screenCoordinates[0] + (projection === "horizontal" ? 10 : 0)}
          y={screenCoordinates[1] + (projection === "vertical" ? 10 : 0)}
          className={`annotation annotation-or-label ${d.className || ""}`}
          textAnchor="middle"
        >
          {d.label}
        </Mark>
      );
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      const noteData = Object.assign(
        {
          dx: 0,
          dy: 0,
          x: screenCoordinates[0],
          y: screenCoordinates[1],
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        { type: typeof d.type === "function" ? d.type : undefined }
      );
      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    } else if (d.type === "enclose") {
      const circle = packEnclose(
        screenCoordinates.map(p => ({ x: p[0], y: p[1], r: 2 }))
      );
      const noteData = Object.assign(
        {
          dx: 0,
          dy: 0,
          x: circle.x,
          y: circle.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        {
          type: AnnotationCalloutCircle,
          subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          }
        }
      );

      if (noteData.rp) {
        switch (noteData.rp) {
          case "top":
            noteData.dx = 0;
            noteData.dy = -circle.r - noteData.rd;
            break;
          case "bottom":
            noteData.dx = 0;
            noteData.dy = circle.r + noteData.rd;
            break;
          case "left":
            noteData.dx = -circle.r - noteData.rd;
            noteData.dy = 0;
            break;
          case "right":
            noteData.dx = circle.r + noteData.rd;
            noteData.dy = 0;
            break;
          default:
            noteData.dx = 0;
            noteData.dy = 0;
        }
      }
      //TODO: Support .ra (setting angle)

      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    } else if (d.type === "r") {
      let x, y, xPosition, yPosition, subject, dx, dy;
      if (this.props.projection === "radial") {
        return (
          <Annotation
            key={d.key || `annotation-${i}`}
            noteData={Object.assign(
              {
                dx: 50,
                dy: 50,
                note: { label: d.label },
                connector: { end: "arrow" }
              },
              d,
              {
                type: AnnotationCalloutCircle,
                subject: {
                  radius: (rScale(rAccessor(d)) - margin.left) / 2,
                  radiusPadding: 0
                },
                x: adjustedSize[0] / 2 + margin.left,
                y: adjustedSize[1] / 2 + margin.top
              }
            )}
          />
        );
      } else if (this.props.projection === "horizontal") {
        dx = 50;
        dy = 50;
        yPosition = d.offset || margin.top + i * 25;
        x = screenCoordinates[0];
        y = yPosition;
        subject = {
          x,
          y1: margin.top,
          y2: adjustedSize[1] + adjustedPosition[1] + margin.top
        };
      } else {
        dx = 50;
        dy = -20;
        xPosition = d.offset || margin.left + i * 25;
        y = screenCoordinates[1];
        x = xPosition;
        subject = {
          y,
          x1: margin.left,
          x2: adjustedSize[0] + adjustedPosition[0] + margin.left
        };
      }

      const noteData = Object.assign(
        {
          dx,
          dy,
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        {
          type: AnnotationXYThreshold,
          x,
          y,
          subject
        }
      );
      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    }
    return null;
  }

  defaultORHTMLRule({ d, i }) {
    const oAccessor = this.oAccessor;
    const rAccessor = this.rAccessor;
    const oScale = this.oScale;
    const rScale = this.rScale;

    const { htmlAnnotationRules, tooltipContent } = this.props;

    const type =
      typeof this.props.type === "object"
        ? this.props.type
        : { type: this.props.type };
    const summaryType =
      typeof this.props.summaryType === "object"
        ? this.props.summaryType
        : { type: this.props.summaryType };

    const { adjustedPosition, adjustedSize } = adjustedPositionSize(this.props);

    const margin = calculateMargin(this.props);

    //TODO: Process your rules first
    if (
      htmlAnnotationRules &&
      htmlAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state,
        categories: this.state.projectedColumns
      }) !== null
    ) {
      return htmlAnnotationRules({
        d,
        i,
        oScale,
        rScale,
        oAccessor,
        rAccessor,
        orFrameProps: this.props,
        categories: this.state.projectedColumns
      });
    }

    if (d.type === "frame-hover") {
      //To string because React gives a DOM error if it gets a date
      let contentFill;
      if (d.isSummaryData) {
        let summaryLabel = <p key="html-annotation-content-2">{d.label}</p>;
        if (d.pieces && d.pieces.length !== 0) {
          if (d.pieces.length === 1) {
            summaryLabel = (
              <p key="html-annotation-content-2">{rAccessor(d.pieces[0])}</p>
            );
          } else {
            const pieceData = extent(d.pieces.map(rAccessor));
            summaryLabel = (
              <p key="html-annotation-content-2">
                From {pieceData[0]} to {pieceData[1]}
              </p>
            );
          }
        }
        contentFill = [
          <p key="html-annotation-content-1">{d.key}</p>,
          summaryLabel,
          <p key="html-annotation-content-3">{d.value}</p>
        ];
      } else {
        contentFill = [
          <p key="html-annotation-content-1">{oAccessor(d).toString()}</p>,
          <p key="html-annotation-content-2">{rAccessor(d).toString()}</p>
        ];
      }
      let content = <div className="tooltip-content">{contentFill}</div>;

      if (d.type === "frame-hover" && tooltipContent) {
        content = tooltipContent(d);
      }

      return (
        <div
          key={"xylabel" + i}
          className={`annotation annotation-or-label tooltip ${this.props
            .projection} ${d.className || ""}`}
          style={{
            position: "absolute",
            bottom: `${10 + this.props.size[1] - d.y}px`,
            left: d.x + "px"
          }}
        >
          {content}
        </div>
      );
    } else if (d.type === "column-hover") {
      const maxPiece = max(d.pieces.map(d => d._orFR));
      //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
      const sumPiece = sum(d.pieces.map(d => d._orFR).filter(p => p > 0));
      const positionValue =
        summaryType.type ||
        ["swarm", "point", "clusterbar"].find(d => d === type.type)
          ? maxPiece
          : sumPiece;

      let xPosition =
        this.state.projectedColumns[oAccessor(d.pieces[0])].middle +
        adjustedPosition[0];
      let yPosition = positionValue;
      yPosition += margin.bottom + margin.top + 10;

      if (this.props.projection === "horizontal") {
        yPosition =
          adjustedSize[1] -
          this.state.projectedColumns[oAccessor(d.pieces[0])].middle +
          adjustedPosition[0] +
          margin.top +
          margin.bottom;
        xPosition = positionValue + adjustedPosition[0] + margin.left;
      } else if (this.props.projection === "radial") {
        [xPosition, yPosition] = pointOnArcAtAngle(
          [
            d.arcAngles.translate[0] - margin.left,
            d.arcAngles.translate[1] - margin.top
          ],
          d.arcAngles.midAngle,
          d.arcAngles.length
        );
        yPosition = 10 + adjustedSize[1] - yPosition;
      }

      //To string because React gives a DOM error if it gets a date
      let content = (
        <div className="tooltip-content">
          <p key="or-annotation-1">{oAccessor(d.pieces[0]).toString()}</p>
          <p key="or-annotation-2">{sumPiece}</p>
        </div>
      );

      if (d.type === "column-hover" && this.props.tooltipContent) {
        content = this.props.tooltipContent(d);
      }

      if (d.type === "xy") {
        content = d.label;
      }

      return (
        <div
          key={"orlabel" + i}
          className={`annotation annotation-or-label tooltip ${this.props
            .projection} ${d.className || ""}`}
          style={{
            position: "absolute",
            bottom: yPosition + "px",
            left: xPosition + "px"
          }}
        >
          {content}
        </div>
      );
    }
    return null;
  }

  mappedMiddles(oScale, middleMax, padding) {
    const oScaleDomainValues = oScale.domain();

    const mappedMiddles = {};
    oScaleDomainValues.forEach((p, q) => {
      const base = oScale(p) - padding;
      const next = oScaleDomainValues[q + 1]
        ? oScale(oScaleDomainValues[q + 1])
        : middleMax;
      const diff = (next - base) / 2;
      mappedMiddles[p] = base + diff;
    });

    return mappedMiddles;
  }

  render() {
    return this.renderBody({ afterElements: this.props.afterElements });
  }

  renderBody({ afterElements }) {
    const {
      className,
      annotationSettings,
      size,
      downloadFields,
      rAccessor,
      oAccessor,
      name,
      download,
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
      beforeElements,
      disableContext,
      summaryType
    } = this.props;

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
    } = this.state;

    let downloadButton;

    if (download) {
      downloadButton = (
        <DownloadButton
          csvName={`${name || "orframe"}-${new Date().toJSON()}`}
          width={size[0]}
          data={orDownloadMapping({
            data: projectedColumns,
            rAccessor: stringToFn(rAccessor),
            oAccessor: stringToFn(oAccessor),
            fields: downloadFields
          })}
        />
      );
    }

    const finalFilterDefs = filterDefs({
      key: "orframe",
      additionalDefs: this.props.additionalDefs
    });

    let interactionOverflow;

    if (summaryType && summaryType.amplitude) {
      if (projection === "horizontal") {
        interactionOverflow = {
          top: summaryType.amplitude,
          bottom: 0,
          left: 0,
          right: 0
        };
      } else if (projection === "radial") {
        interactionOverflow = defaultOverflow;
      } else {
        interactionOverflow = {
          top: 0,
          bottom: 0,
          left: summaryType.amplitude,
          right: 0
        };
      }
    }

    return (
      <Frame
        name="orframe"
        renderPipeline={orFrameRender}
        adjustedPosition={adjustedPosition}
        adjustedSize={adjustedSize}
        size={size}
        xScale={xScale}
        yScale={yScale}
        axes={axes}
        axesTickLines={axesTickLines}
        title={title}
        matte={matte}
        className={className}
        finalFilterDefs={finalFilterDefs}
        frameKey={"none"}
        renderKeyFn={renderKey}
        projectedCoordinateNames={projectedCoordinatesObject}
        defaultSVGRule={this.defaultORSVGRule.bind(this)}
        defaultHTMLRule={this.defaultORHTMLRule.bind(this)}
        hoverAnnotation={!!pieceDataXY}
        annotations={annotations}
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={pieceDataXY}
        margin={margin}
        columns={projectedColumns}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={[foregroundGraphics, oLabels]}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        overlay={columnOverlays}
        rScale={this.rScale}
        projection={projection}
        disableContext={disableContext}
        interactionOverflow={interactionOverflow}
      />
    );
  }
}

ORFrame.propTypes = {
  data: PropTypes.array,
  name: PropTypes.string,
  orient: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  format: PropTypes.string,
  size: PropTypes.array,
  position: PropTypes.array,
  oScaleType: PropTypes.func,
  rScaleType: PropTypes.func,
  oExtent: PropTypes.array,
  rExtent: PropTypes.array,
  invertO: PropTypes.bool,
  invertR: PropTypes.bool,
  oAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  rAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  svgAnnotationRules: PropTypes.func,
  oPadding: PropTypes.number,
  projection: PropTypes.string,
  htmlAnnotationRules: PropTypes.func,
  type: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  summaryType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  connectorType: PropTypes.func,
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  interaction: PropTypes.object,
  renderKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  dataAccessor: PropTypes.func,
  rBaseline: PropTypes.number,
  sortO: PropTypes.func,
  dynamicColumnWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  renderFn: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  connectorStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  summaryStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  summaryPosition: PropTypes.func,
  oLabel: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
    PropTypes.object
  ]),
  hoverAnnotation: PropTypes.bool,
  axis: PropTypes.object,
  backgroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  foregroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};

export default ORFrame;
