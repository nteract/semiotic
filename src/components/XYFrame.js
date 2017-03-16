'use strict';

import React from 'react'

import { voronoi } from 'd3-voronoi'
import { clone } from 'lodash'
import { max, min, extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'

// components
import Mark from './Mark'
import Annotation from './Annotation'
import AnnotationLayer from './AnnotationLayer'
import InteractionLayer from './InteractionLayer'
import Axis from './Axis'
import VisualizationLayer from './VisualizationLayer'

import { line } from 'd3-shape'
import { projectLineData, differenceLine, stackedArea, bumpChart, lineChart } from '../svg/lineDrawing'

import { annotationXYThreshold, annotationCalloutCircle } from 'd3-svg-annotation'

import { calculateMargin } from '../svg/frameFunctions'

import { packEnclose } from 'd3-hierarchy'

let PropTypes = React.PropTypes;

/*
Use symbols for x/y/offset to avoid conflicts when projecting the dataset
But how to expose those for custom hover rules?
*/

/*
const projectedX = Symbol("x");
const projectedY = Symbol("y");
const projectedYMiddle = Symbol("y-middle");
const projectedYAdjusted = Symbol("yAdjusted");
const projectedOffset = Symbol("offset");
*/
const projectedX = "_xyfX"
const projectedY = "_xyfY"
const projectedYMiddle = "_xyfYMiddle"
const projectedYAdjusted = "_xyfYAdjusted"
const projectedOffset = "_xyfYOffset"
const projectedYTop = "_xyfYTop"
const projectedYBottom = "_xyfYBottom"

let xyframeKey = '';
const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
for (let i = 32; i > 0; --i) xyframeKey += chars[Math.floor(Math.random() * chars.length)];

const builtInTransformations = {
  stackedarea: stackedArea,
  "stackedarea-invert": stackedArea,
  stackedpercent: stackedArea,
  "stackedpercent-invert": stackedArea,
  difference: differenceLine,
  bumparea: bumpChart,
  bumpline: bumpChart,
  "bumparea-invert": bumpChart,
  line: lineChart

}

function drawMarginPath(margin, size) {
    const interiorRing = drawRing([ [ margin.left, margin.top ],[ size[0] - margin.right, size[1] - margin.bottom ] ])
    return interiorRing
    function drawRing(bbox) {
        return "M" + bbox[0][0] + "," + bbox[0][1] + "L" + bbox[1][0] + "," + bbox[0][1] + "L" + bbox[1][0] + "," + bbox[1][1] + "L" + bbox[0][0] + "," + bbox[1][1] + "Z"
    }
}

function linetypeChange(oldProps, newProps) {
  if (!oldProps.customLineType && !newProps.customLineType) {
    return false
  }
  else if (typeof oldProps.customLineType === "string" && oldProps.customLineType === newProps.customLineType) {
    return false
  }
  else if (oldProps.customLineType && newProps.customLineType && oldProps.customLineType.type && newProps.customLineType.type && oldProps.customLineType.type === newProps.customLineType.type) {
    return false
  }
  return true
}

class XYFrame extends React.Component {
    constructor(props){
        super(props);

        this.calculateXYFrame = this.calculateXYFrame.bind(this)

        this.defaultXYHTMLRule = this.defaultXYHTMLRule.bind(this)
        this.defaultXYSVGRule = this.defaultXYSVGRule.bind(this)

        this.setCanvasContext = this.setCanvasContext.bind(this)

        this.changeVoronoi = this.changeVoronoi.bind(this)
        this.doubleclickVoronoi = this.doubleclickVoronoi.bind(this)
        this.clickVoronoi = this.clickVoronoi.bind(this)

        this.changeZoom = this.changeZoom.bind(this)

        this.adjustedPositionSize = this.adjustedPositionSize.bind(this)

        this.renderBody = this.renderBody.bind(this)

        this.state = {
          voronoiHover: null,
          lineData: null,
          pointData: null,
          areaData: null,
          projectedLines: null,
          projectedPoints: null,
          projectedAreas: null,
          fullDataset: null,
          adjustedPosition: null,
          adjustedSize: null,
          voronoiPolygons: null,
          backgroundGraphics: null,
          foregroundGraphics: null,
          axesData: null,
          axes: null,
          renderNumber: 0,
          canvasContext: null,
          symbols: { projectedX, projectedY, projectedYMiddle, projectedYAdjusted, projectedOffset },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          zoomExtent: null
        }

        this.xAccessor = null;
        this.yAccessor = null;
        this.xScale = null;
        this.yScale = null;

    }

    setCanvasContext(actualContext) {
      this.setState({ canvasContext: actualContext })
    }

    changeZoom(previousZoom, nextZoom) {
      if (this.props.onZoomChange) {
        this.props.onZoomChange(previousZoom, nextZoom)
      }
    }

    calculateDataExtent(currentProps, zoomExtent, state) {
      zoomExtent = zoomExtent === 0 ? null : zoomExtent || state.zoomExtent
      let fullDataset = [];
      let lineDataAccessor = currentProps.lineDataAccessor || function (d) {return d.coordinates}
      let xAccessor = currentProps.xAccessor || function (d) {return d[0]}
      let yAccessor = currentProps.yAccessor || function (d) {return d[1]}
      let initialProjectedLines = []

      let projectedPoints = [], projectedLines = []

      if (currentProps.points) {
        projectedPoints = currentProps.points.map((d, i) => {
        const x = xAccessor(d,i)
        const y = yAccessor(d,i)
        return Object.assign({ [projectedX]: x, [projectedY]: y }, d)
      })
        fullDataset = projectedPoints
      }
      else if (currentProps.lines) {
        let lines = currentProps.lines;

        initialProjectedLines = projectLineData({ data: lines, lineDataAccessor, xProp: projectedX, yProp: projectedY, yPropTop: projectedYTop, yPropBottom: projectedYBottom, xAccessor: xAccessor, yAccessor: yAccessor })

        const optionsObject = { xProp: projectedX, yProp: projectedY, offsetProp: projectedOffset, yPropAdjusted: projectedYAdjusted, yPropMiddle: projectedYMiddle, yPropTop: projectedYTop, yPropBottom: projectedYBottom }

        projectedLines = lineTransformation(currentProps.customLineType, optionsObject)(initialProjectedLines)

        projectedLines.forEach(d => {
          fullDataset = [ ...fullDataset, ...d.data.map(p => Object.assign({ parentLine: d }, p)) ]
        })

//Handle "expose points on lines" option now that sending points and lines simultaneously is no longer allowed
        if (currentProps.showLinePoints) {
          projectedPoints = fullDataset
        }
      }


      function lineTransformation(lineType = { type: "line" }, options) {
        const differenceCatch = (olineType, data) => lineType === "difference" && data.length !== 2 ? "line" : olineType
        if (builtInTransformations[lineType]) {
          return data => builtInTransformations[differenceCatch(lineType, data)]({ type: lineType, ...options, data })
        }

        if (builtInTransformations[lineType.type]) {
          return data => builtInTransformations[differenceCatch(lineType.type, data)]({ ...lineType, ...options, data })
        }

        //otherwise assume a function
        return data => lineType({ ...options, data })
      }

      let xExtent = currentProps.xExtent || zoomExtent && zoomExtent[0] || extent(fullDataset, d => d[projectedX])
//      let yMin = currentProps.yExtent ? currentProps.yExtent[0] : zoomExtent && zoomExtent[1] || min(fullDataset, d => d[projectedY])
//      let yMax = currentProps.yExtent ? currentProps.yExtent[1] : zoomExtent && zoomExtent[1] || max(fullDataset, d => d[projectedYAdjusted] && d[projectedOffset] ? d[projectedYAdjusted] + d[projectedOffset] : d[projectedY])
      let yMin = currentProps.yExtent ? currentProps.yExtent[0] : zoomExtent && zoomExtent[0] || min(fullDataset.map(d => d[projectedYBottom] === undefined ? d[projectedY] : d[projectedYBottom]))
      let yMax = currentProps.yExtent ? currentProps.yExtent[1] : zoomExtent && zoomExtent[1] || max(fullDataset.map(d => d[projectedYTop] === undefined ? d[projectedY] : d[projectedYTop]))

      let yExtent = [ yMin, yMax ]

      if (currentProps.invertX) {
        xExtent = [ xExtent[1],xExtent[0] ]
      }
      if (currentProps.invertY) {
        yExtent = [ yExtent[1],yExtent[0] ]
      }

      return { xExtent, yExtent, projectedLines, projectedPoints, fullDataset }

    }

    screenScales({ xExtent, yExtent, currentProps, margin, adjustedSize }) {
      let xDomain = [ margin.left, adjustedSize[0] + margin.left ]
      let yDomain = [ adjustedSize[1] + margin.top, margin.top ]

      let xScaleType = currentProps.xScaleType || scaleLinear();
      let yScaleType = currentProps.yScaleType || scaleLinear();

      let xScale = xScaleType.domain(xExtent).range(xDomain)
      let yScale = yScaleType.domain(yExtent).range(yDomain)

      return { xScale, yScale }

    }

    calculateXYFrame(currentProps, zoomExtent) {
      let margin = calculateMargin(currentProps)
      let { adjustedPosition, adjustedSize } = this.adjustedPositionSize()

      let xExtent, yExtent, projectedLines, projectedPoints, fullDataset

      if (!currentProps.dataVersion || currentProps.dataVersion && currentProps.dataVersion !== this.state.dataVersion) {
        ({ xExtent, yExtent, projectedLines, projectedPoints, fullDataset } = this.calculateDataExtent(currentProps, zoomExtent, this.state))
      }
      else {
        ({ xExtent, yExtent, projectedLines, projectedPoints, fullDataset } = this.state)
      }

      const { xScale, yScale } = this.screenScales({ xExtent, yExtent, currentProps, margin, adjustedSize })

      let canvasDrawing = []

      let title = null
      if (typeof currentProps.title === "string" && currentProps.title.length > 0) {
        title = <text x={currentProps.size[0] / 2} y={25} className={"frame-title"} style={{ textAnchor: "middle", pointerEvents: "none" }}>{currentProps.title}</text>
      }
      //assume if defined then its an svg mark of some sort
      else if (currentProps.title) {
        title = currentProps.title
      }

      //TODO: blow this shit up
      this.xScale = xScale
      this.yScale = yScale
      this.xAccessor = currentProps.xAccessor
      this.yAccessor = currentProps.yAccessor

      let voronoiPaths = [];
      const ignoredVoronoiPoints = []

      if (currentProps.hoverAnnotation) {
        let voronoiDiagram = voronoi()
          .extent([ [ margin.left, margin.top ], [ adjustedSize[0] + margin.left, adjustedSize[1] + margin.top ] ])
          .x((d) => xScale(d[projectedX]))
          .y((d) => yScale(d[projectedYMiddle] || d[projectedY]))

        const voronoiDataset = []
        const voronoiUniqueHash = {}

        fullDataset.forEach(d => {
          const pointKey = parseInt(xScale(d[projectedX])) + "," + parseInt(yScale(d[projectedYMiddle] || d[projectedY]))
          if (!voronoiUniqueHash[pointKey]) {
            voronoiDataset.push(d)
            voronoiUniqueHash[pointKey] = [ d ]
          }
          else {
            //replace with real error
            voronoiUniqueHash[pointKey].push(d)
          }
        })


        const voronoiData = voronoiDiagram.polygons(voronoiDataset)

        voronoiPaths = voronoiData.map((d, i) => {
          return <path
            onClick={() => {this.clickVoronoi(voronoiDataset[i])}}
            onDoubleClick={() => {this.doubleclickVoronoi(voronoiDataset[i], xExtent, yExtent)}}
            onMouseEnter={() => {this.changeVoronoi(voronoiDataset[i])}}
            onMouseLeave={() => {this.changeVoronoi()}}
            key={"interactionVoronoi" + i}
            d={"M" + d.join("L") + "Z"}
            style={{ opacity: 0 }} />
        }, this)
      }

      let axes = null;

      if (currentProps.axes) {
        axes = currentProps.axes.map(d => {
          let axisScale = yScale;
          if (d.orient === "top" || d.orient === "bottom") {
            axisScale = xScale;
          }

          let tickValues;
          if (d.tickValues && Array.isArray(d.tickValues)) {
            tickValues = d.tickValues
          }
          //otherwise assume a function
          else if (d.tickValues) {
            tickValues = d.tickValues(fullDataset, currentProps.size, axisScale)
          }
          let axisSize = [ adjustedSize[0], adjustedSize[1] ]
          let axisPosition = [ margin.left, 0 ]

          if (d.orient === "top") {
            axisPosition = [ 0, 0 ]
          }
          else if (d.orient === "bottom") {
            axisPosition = [ 0, margin.top ]
          }
          else if (d.orient === "right") {
            axisPosition = [ 0, 0 ]
          }

          return <Axis
            key={d.key}
            orient={d.orient}
            size={axisSize}
            position={axisPosition}
            ticks={d.ticks}
            tickSize={d.tickSize}
            tickFormat={d.tickFormat}
            tickValues={tickValues}
            format={d.format}
            scale={axisScale}
            className={d.className}
            name={d.name} />
        })
      }

      let marginGraphic
      if (currentProps.zoomable) {
        marginGraphic = <path style={{ fill: "blue", opacity: 0.25 }} d={drawMarginPath(margin, currentProps.size)} className="xyframe-matte" />
      }

      this.setState({
          voronoiHover: null,
          lineData: currentProps.lines,
          pointData: currentProps.points,
          areaData: currentProps.areas,
          dataVersion: currentProps.dataVersion,
          projectedLines,
          projectedPoints,
          projectedAreas: null,
          canvasDrawing,
          fullDataset,
          adjustedPosition,
          adjustedSize,
          voronoiPolygons: voronoiPaths,
          ignoredVoronoiPoints,
          backgroundGraphics: currentProps.backgroundGraphics,
          foregroundGraphics: currentProps.foregroundGraphics,
          axesData: currentProps.axes,
          axes,
          title,
          updatedFrame: undefined,
          renderNumber: this.state.renderNumber + 1,
          xScale,
          yScale,
          xExtent,
          yExtent,
          margin,
          matte: marginGraphic,
          zoomExtent: zoomExtent

        })

    }

    componentWillMount() {
      this.calculateXYFrame(this.props)
    }

    componentWillReceiveProps(nextProps) {
      if (!this.state.dataVersion || !this.state.fullDataset) {
        this.calculateXYFrame(nextProps)
      }
      else if (linetypeChange(this.props, nextProps) ||
        this.state.dataVersion !== nextProps.dataVersion ||
        this.props.xExtent && !nextProps.xExtent ||
        this.props.yExtent && !nextProps.yExtent ||
        !this.props.xExtent && nextProps.xExtent ||
        !this.props.yExtent && nextProps.yExtent ||
        this.props.xExtent && nextProps.xExtent &&
        (this.props.xExtent[0] !== nextProps.xExtent[0] ||
          this.props.xExtent[1] !== nextProps.xExtent[1]) ||
        this.props.yExtent && nextProps.yExtent &&
        (this.props.yExtent[0] !== nextProps.yExtent[0] ||
          this.props.yExtent[1] !== nextProps.yExtent[1]) ||
        this.props.name !== nextProps.name ||
        this.props.size[0] !== nextProps.size[0] ||
        this.props.size[1] !== nextProps.size[1]
        ) {
        this.calculateXYFrame(nextProps)
      }
    }

    componentDidMount() {
      this.setState({ canvasContext: this.canvasContext })
    }

    changeVoronoi(d) {
      if (this.props.customHoverBehavior) {
        this.props.customHoverBehavior(d)
      }
      if (!d) {
        this.setState({ voronoiHover: null })
      }
      else {
        let vorD = clone(d);
        vorD.type = "frame-hover";
        this.setState({ voronoiHover: vorD })
      }
    }


    clickVoronoi(d) {
      if (this.props.customClickBehavior) {
        this.props.customClickBehavior(d)
      }
    }
    doubleclickVoronoi(d, xExtent, yExtent, direction) {
      if (this.props.zoomable) {
        let zoomAmount = .25
        if (this.props.zoomable === "number") {
          zoomAmount = this.props.zoomable / 2
        }
          if (xExtent && yExtent) {
          const mod = 0.5 + (direction === "out" ? zoomAmount : -zoomAmount)
          const yDiff = (yExtent[1] - yExtent[0]) * mod
          const xDiff = (xExtent[1] - xExtent[0]) * mod
          const dX = d ? this.props.xAccessor(d) : (xExtent[1] - xExtent[0]) / 2 + xExtent[0]
          const dY = d ? this.props.yAccessor(d) : (yExtent[1] - yExtent[0]) / 2 + yExtent[0]
          this.changeZoom(this.state.zoomExtent, [ [ dX - xDiff, dX + xDiff ], [ dY - yDiff, dY + yDiff ] ])
          this.calculateXYFrame(this.props, [ [ dX - xDiff, dX + xDiff ], [ dY - yDiff, dY + yDiff ] ])
        }
        else {
          this.changeZoom(this.state.zoomExtent, undefined)
          this.calculateXYFrame(this.props, 0)
        }
      }
    }

    defaultXYSVGRule({ d,i,annotationLayer,lines,areas,points }) {
      let xAccessor = this.xAccessor
      let yAccessor = this.yAccessor

      let xScale = this.xScale
      let yScale = this.yScale

      let screenCoordinates = []

      let { adjustedPosition, adjustedSize } = this.adjustedPositionSize()
      if (!d.coordinates) {
        const xCoord = d[projectedX] || xAccessor(d)
        const yCoord = d[projectedYMiddle] || d[projectedY] || yAccessor(d)
        screenCoordinates = [ xScale(xCoord) + adjustedPosition[0], yScale(yCoord) + adjustedPosition[1] ]
      }
      else {
        screenCoordinates = d.coordinates.map(p => [ xScale(xAccessor(p)) + adjustedPosition[0], yScale(yAccessor(p)) + adjustedPosition[1] ])
      }

      const margin = calculateMargin(this.props)

      //point xy
      //y
      //area

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas, points, lines }) !== null) {
        return this.props.svgAnnotationRules({ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas, points, lines })
      }
      else if (d.type === "xy" || d.type === "frame-hover") {
        const laLine = <Mark
            className={"annotation " + d.type}
            key={"annotationpoint" + i}
            markType="circle"
            cx={screenCoordinates[0]}
            cy={screenCoordinates[1]}
            forceUpdate={true}
            r={5}
            />
        let laLabel
        if (d.type === "xy") {
            laLabel = <Mark
            markType="text"
            key={d.label + "annotationtext" + i}
            forceUpdate={true}
            x={screenCoordinates[0]}
            y={10 + screenCoordinates[1]}
            className="annotation annotation-xy-label"
            >{d.label}</Mark>
        }

        return [ laLine, laLabel ]
      }
      
      else if (d.type === "d3-annotation" || typeof d.type === "function") {
        const noteData = Object.assign({
          dx: 0,
          dy: 0,
          x: screenCoordinates[0],
          y: screenCoordinates[1],
          note: { "label": d.label },
          connector: { end: "arrow" }
        }, d, { type: typeof d.type === "function" ? d.type : undefined })
            return <Annotation
              noteData={noteData}
            />
      }
      else if (d.type === "enclose") {
        const circle = packEnclose(screenCoordinates.map(p => ({ x: p[0], y: p[1], r: 2 })))
        const noteData = Object.assign({
            dx: 0,
            dy: 0,
            x: circle.x,
            y: circle.y,
            note: { "label": d.label },
            connector: { end: "arrow" }
          }, d, { type: annotationCalloutCircle, subject: {
                radius: circle.r,
                radiusPadding: 5 || d.radiusPadding
              } })
            
            if (noteData.rp) {
              switch (noteData.rp) {
                case "top":
                  noteData.dx = 0;
                  noteData.dy = -circle.r - noteData.rd
                break;
                case "bottom":
                  noteData.dx = 0;
                  noteData.dy = circle.r + noteData.rd
                break;
                case "left":
                  noteData.dx = -circle.r - noteData.rd
                  noteData.dy = 0
                break;
                case "right":
                  noteData.dx = circle.r + noteData.rd
                  noteData.dy = 0
                break;
              }
            }
            //TODO: Support .ra (setting angle)

            return <Annotation
              noteData={noteData}
            />
      }
      else if (d.type === "x") {
        
        const yPosition = margin.top + annotationLayer.position[1];

        const noteData = Object.assign({
            dx: 50,
            dy: 20,
            y: yPosition,
            note: { "label": d.label },
            connector: { end: "arrow" }
          }, d, { type: annotationXYThreshold,
            x: screenCoordinates[0],
            "subject": {
              "x": screenCoordinates[0],
              "y1": yPosition, "y2": adjustedSize[1] + margin.top
            }
         })
            return <Annotation
              noteData={noteData}
            />
      }
      else if (d.type === "y") {
        const xPosition = margin.left + i * 25;

        const noteData = Object.assign({
            dx: 50,
            dy: -20,
            x: xPosition,
            note: { "label": d.label },
            connector: { end: "arrow" }
          }, d, { type: annotationXYThreshold,
            y: screenCoordinates[1],
            "subject": {
              "y": screenCoordinates[1],
              "x1": margin.left, "x2": adjustedSize[0] + adjustedPosition[0]
            }
         })
            return <Annotation
              noteData={noteData}
            />
      }
      else if (d.type === "bounds") {
        const x0Position = xScale(xAccessor(d.bounds[0])) + annotationLayer.position[0];
        const y0Position = yScale(yAccessor(d.bounds[0])) + annotationLayer.position[1];
        const x1Position = xScale(xAccessor(d.bounds[1])) + annotationLayer.position[0];
        const y1Position = yScale(yAccessor(d.bounds[1])) + annotationLayer.position[1];

        const laLine = <Mark
            key={d.label + "annotationbounds" + i}
            markType="path"
            d={"M" + x0Position + "," + y0Position + "L" + x1Position + "," + y0Position + "L" + x1Position + "," + y1Position + "L" + x0Position + "," + y1Position + "Z"}
            className="annotation annotation-bounds"
            />

        const laLabel = <Mark
            markType="text"
            key={d.label + "annotationtext" + i}
            forceUpdate={true}
            x={5 + x0Position}
            y={-5 + y0Position}
            className="annotation annotation annotation-bounds-label"
            >{d.label}</Mark>

            return [ laLine, laLabel ]
      }
      else if (d.type === "line") {
        const lineGenerator = line().x(p => p[0]).y(p => p[1])
        const lineD = lineGenerator(screenCoordinates)
        const laLine = <Mark
            key={d.label + "annotationline" + i}
            markType="path"
            d={lineD}
            className="annotation annotation-line"
            />

        const laLabel = <Mark
            markType="text"
            key={d.label + "annotationlinetext" + i}
            x={(screenCoordinates[0][0] + screenCoordinates[1][0]) / 2}
            y={(screenCoordinates[0][1] + screenCoordinates[1][1]) / 2}
            className="annotation annotation-line-label"
            >{d.label}</Mark>

            return [ laLine, laLabel ]
      }

      else if (d.type === "area") {

        const mappedCoordinates = "M" + d.coordinates.map(p => [ xScale(xAccessor(p)), yScale(yAccessor(p)) ]).join("L") + "Z"
        const xBounds = extent(d.coordinates.map(p => xScale(xAccessor(p))))
        const yBounds = extent(d.coordinates.map(p => yScale(yAccessor(p))))
        const xCenter = (xBounds[0] + xBounds[1]) / 2
        const yCenter = (yBounds[0] + yBounds[1]) / 2

        const laLine = <Mark
            key={d.label + "annotationarea" + i}
            markType="path"
            transform={"translate(" + annotationLayer.position + ")"}
            d={mappedCoordinates}
            className="annotation annotation-area"
            />

        const laLabel = <Mark
            markType="text"
            key={d.label + "annotationtext" + i}
            forceUpdate={true}
            x={xCenter}
            y={yCenter}
            transform={"translate(" + annotationLayer.position + ")"}
            className="annotation annotation-area-label"
            style={{ textAnchor: "middle" }}
            >{d.label}</Mark>

            return [ laLine, laLabel ]
      }
      return null

    }

    defaultXYHTMLRule({ d, i, lines, areas, points }) {

      let xAccessor = this.xAccessor
      let yAccessor = this.yAccessor

      let xScale = this.xScale
      let yScale = this.yScale
      //y
      //area

      let screenCoordinates = []

      let { adjustedPosition/*, adjustedSize*/ } = this.adjustedPositionSize()
      if (!d.coordinates) {
        const xCoord = d[projectedX] || xAccessor(d)
        const yCoord = d[projectedYMiddle] || d[projectedY] || yAccessor(d)
        screenCoordinates = [ xScale(xCoord) + adjustedPosition[0], yScale(yCoord) + adjustedPosition[1] ]
      }
      else {
        screenCoordinates = d.coordinates.map(p => [ xScale(xAccessor(p)) + adjustedPosition[0], yScale(yAccessor(p)) + adjustedPosition[1] ])
      }

//      const margin = calculateMargin(this.props)

      if (this.props.htmlAnnotationRules && this.props.htmlAnnotationRules({ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas, points, lines }) !== null) {
        return this.props.htmlAnnotationRules({ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas, points, lines })
      }

      if (d.type === "frame-hover") {

        //To string because React gives a DOM error if it gets a date
        let content = [ <p key="html-annotation-content-1">{xAccessor(d).toString()}</p>,
          <p key="html-annotation-content-2">{yAccessor(d).toString()}</p> ]

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d)
        }

        return <div
          key={"xylabel" + i}
          className="annotation annotation-xy-label"
          style={{ position: "absolute",
            bottom: this.props.size[1] - screenCoordinates[1] + 20 + "px",
            left: screenCoordinates[0] - 75 + "px",
            width: "150px" }} >
          {content}
          </div>
      }
      return null

    }

    adjustedPositionSize() {
      let margin = calculateMargin(this.props)

      let position = this.props.position || [ 0, 0 ];
      let heightAdjust = margin.top + margin.bottom;
      let widthAdjust = margin.left + margin.right;

      let adjustedPosition = [ position[0], position[1] ]
      let adjustedSize = [ this.props.size[0] - widthAdjust, this.props.size[1] - heightAdjust ]

      return { adjustedPosition, adjustedSize }

    }

    render() {
      return this.renderBody({})
    }

    renderBody({ afterElements, beforeElements }) {

      let annotationLayer = null;

      let totalAnnotations = clone(this.props.annotations);

      if (this.state.voronoiHover) {
        if (totalAnnotations) {
          totalAnnotations.push(this.state.voronoiHover)
        }
        else {
          totalAnnotations = [ this.state.voronoiHover ]
        }
      }

      if (totalAnnotations) {
        annotationLayer = <AnnotationLayer
          annotations={totalAnnotations}
          svgAnnotationRule={(d,i,thisALayer) => this.defaultXYSVGRule({ d, i, annotationLayer: thisALayer, lines: this.state.projectedLines, areas: this.state.projectedAreas, points: this.state.projectedPoints })}
          htmlAnnotationRule={(d,i,thisALayer) => this.defaultXYHTMLRule({ d, i, annotationLayer: thisALayer, lines: this.state.projectedLines, areas: this.state.projectedAreas, points: this.state.projectedPoints })}
          size={this.props.size}
          position={[ this.state.adjustedPosition[0] + this.state.margin.left, this.state.adjustedPosition[1] + this.state.margin.top ]}
        />
      }

      let zoomButtons

      if (this.props.zoomable) {
        zoomButtons = <div className="xyframe-zoom-controls">
          <button onClick={() => {this.doubleclickVoronoi(undefined, this.state.xExtent, this.state.yExtent)}} className="xyframe-zoom-button">+</button>
          <button onClick={() => {this.doubleclickVoronoi(undefined, this.state.xExtent, this.state.yExtent, "out")}} className="xyframe-zoom-button">-</button>
          <button onClick={() => {this.doubleclickVoronoi()}} className="xyframe-zoom-button">100%</button>
          </div>
      }

      return <div className={this.props.className + " frame"} style={{ background: "none" }}>
        {/*<DebugComponent>{this.state.ignoredVoronoiPoints.length > 0 ? this.state.ignoredVoronoiPoints.length + " ignored voronoi points" : null }</DebugComponent> */}
        <div className="xyframe-before-elements">
        {beforeElements}
        </div>
        <div className="frame-elements" style={{ height: this.props.size[1] + "px" }}>
        <canvas ref={(canvasContext) => this.canvasContext = canvasContext} style={{ position: "absolute" }} width={this.props.size[0]} height={this.props.size[1]} />
        <svg style={{ position: "absolute" }} width={this.props.size[0]} height={this.props.size[1]}>
        <defs>
          <filter id="paintyFilterHeavy">
            <feGaussianBlur id="gaussblurrer" in="SourceGraphic"
              stdDeviation={4}
              colorInterpolationFilters="sRGB"
              result="blur"
            />
            <feColorMatrix in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
              result="gooey"
            />
          </filter>
          <filter id="paintyFilterLight">
            <feGaussianBlur id="gaussblurrer" in="SourceGraphic"
              stdDeviation={2}
              colorInterpolationFilters="sRGB"
              result="blur"
            />
            <feColorMatrix in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
              result="gooey"
            />
          </filter>
          <clipPath id={"matte-clip" + xyframeKey}>
            {this.state.matte}
          </clipPath>
          {this.props.additionalDefs}
        </defs>
        <g>
          {this.state.title}
          {this.state.backgroundGraphics}
        </g>
        <VisualizationLayer
          customLineType={this.props.customLineType}
          customLineMark={this.props.customLineMark}
          customPointMark={this.props.customPointMark}
          lineStyle={this.props.lineStyle}
          lineRenderMode={this.props.lineRenderMode}
          lineClass={this.props.lineClass}
          canvasLines={this.props.canvasLines}
          pointStyle={this.props.pointStyle}
          pointRenderMode={this.props.pointRenderMode}
          pointClass={this.props.pointClass}
          canvasPoints={this.props.canvasPoints}
          defined={this.props.defined}
          zoomable={this.props.zoomable}
          position={this.state.adjustedPosition}
          size={this.state.adjustedSize}
          extent={this.state.extent}
          projectedCoordinateNames={ { y: projectedY, x: projectedX, yMiddle: projectedYMiddle, yTop: projectedYTop, yBottom: projectedYBottom } }
          xScale={this.state.xScale}
          yScale={this.state.yScale}
          lineData={this.state.projectedLines}
          pointData={this.state.projectedPoints}
          areaData={this.state.projectedAreas}
          axes={this.state.axes}
          title={this.state.title}
          xyframeKey={this.state.xyframeKey}
          canvasContext={this.state.canvasContext}
          dataVersion={this.state.dataVersion}
        />
        <g>
          {this.state.foregroundGraphics}
        </g>
        </svg>
        <InteractionLayer
          interaction={this.props.interaction}
          position={this.state.adjustedPosition}
          margin={this.state.margin}
          size={this.state.adjustedSize}
          svgSize={this.props.size}
          xScale={this.xScale}
          yScale={this.yScale}
          overlay={<g className="voronoi-click">{this.state.voronoiPolygons}</g>}
          enabled={true}
        />
        {annotationLayer}
        </div>
        <div className="xyframe-after-elements">
        {zoomButtons}
        {afterElements}
        </div>
      </div>

    }
}

XYFrame.propTypes = {
    name: PropTypes.string,
    orient: PropTypes.string,
    title: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    margin: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object
    ]),
    dataVersion: PropTypes.string,
    format: PropTypes.string,
    properties: PropTypes.object,
    size: PropTypes.array.isRequired,
    position: PropTypes.array,
    xScaleType: PropTypes.func,
    yScaleType: PropTypes.func,
    xExtent: PropTypes.array,
    yExtent: PropTypes.array,
    invertX: PropTypes.bool,
    invertY: PropTypes.bool,
    xAccessor: PropTypes.func.isRequired,
    x1Accessor: PropTypes.func,
    yAccessor: PropTypes.func.isRequired,
    y1Accessor: PropTypes.func,
    lineDataAccessor: PropTypes.func,
    areaDataAccessor: PropTypes.func,
    annotations: PropTypes.array
  };

module.exports = XYFrame;
