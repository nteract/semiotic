'use strict';

import React from 'react'

import { nest } from 'd3-collection'

import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'

import { uniq, clone } from 'lodash'

import { scaleBand, scaleOrdinal, scaleLinear } from 'd3-scale'

import { histogram, sum, max, quantile } from 'd3-array'

import { area, curveCatmullRom, arc } from 'd3-shape'

import Axis from './Axis'

import Mark from './Mark'
import MarkContext from './MarkContext'
import AnnotationLayer from './AnnotationLayer'
import InteractionLayer from './InteractionLayer'

import { trueAxis, calculateMargin } from '../svg/frameFunctions'
import { drawAreaConnector } from '../svg/SvgHelper'

const PropTypes = React.PropTypes;

/*
Use symbols for x/y/offset to avoid conflicts when projecting the dataset
But how to expose those for custom hover rules?
*/

/*
const projectedO = Symbol("o");
const projectedR = Symbol("r");
const projectedRAdjusted = Symbol("rAdjusted");
const projectedOffset = Symbol("offset");
*/

class orFrame extends React.Component {
    constructor(props){
        super(props);

        this.calculateORFrame = this.calculateORFrame.bind(this)
        this.defaultORHTMLRule = this.defaultORHTMLRule.bind(this)
        this.defaultORSVGRule = this.defaultORSVGRule.bind(this)
        this.adjustedPositionSize = this.adjustedPositionSize.bind(this)

        this.renderBody = this.renderBody.bind(this)

        this.state = {
          lineData: null,
          pointData: null,
          projectedLines: null,
          projectedPoints: null,
          fullDataset: null,
          adjustedPosition: null,
          adjustedSize: null,
          backgroundGraphics: null,
          foregroundGraphics: null,
          axisData: null,
          axis: null,
          renderNumber: 0 }

        this.oAccessor = null;
        this.rAccessor = null;
        this.oScale = null;
        this.rScale = null;

    }

    onPieceClick (d,i) {
      if (this.props.onPieceClick) {
        this.props.onPieceClick(d,i)
      }
    }

    onPieceEnter (d,i) {
      if (this.props.onPieceEnter) {
        this.props.onPieceEnter(d,i)
      }
    }

    onPieceOut (d,i) {
      if (this.props.onPieceOut) {
        this.props.onPieceOut(d,i)
      }
    }

    changeVoronoi({ pieces, summary, arcAngles, length }) {
      if (this.props.customHoverBehavior) {
        this.props.customHoverBehavior({ pieces, summary, arcAngles, length })
      }
      if (!pieces) {
        this.setState({ voronoiHover: null })
      }
      else {
        this.setState({ voronoiHover: { type: "frame-hover", pieces, summary, arcAngles } })
      }
    }

    clickVoronoi({ pieces, summary, arcAngles, length }) {
      if (this.props.customClickBehavior) {
        this.props.customClickBehavior({ pieces, summary, arcAngles, length })
      }
    }

    calculateORFrame(currentProps) {
      //needs to work without bardata
      let ordinalHover
      let oLabels
      const connectorMarks = []

      const summaryType = typeof currentProps.summaryType === 'object' && currentProps.summaryType !== null ? currentProps.summaryType : { type: currentProps.summaryType }
      const pieceType = typeof currentProps.type  === 'object' && currentProps.type !== null ? currentProps.type : { type: currentProps.type }
      const connectorType = typeof currentProps.connectorType  === 'object' && currentProps.connectorType !== null ? currentProps.connectorType : { type: currentProps.connectorType }

      const projection = !currentProps.projection || currentProps.projection === "radial" && pieceType.type !== "bar" ? "vertical" : currentProps.projection

      const barData = currentProps.data ? currentProps.data.map((d, i) => {
        if (typeof d !== "object") {
          return { value: d, renderKey: i }
        }
        return Object.assign(d, { renderKey: i })
      }) : []

      const oAccessor = currentProps.oAccessor || function (d) {return d.renderKey};
      const rAccessor = currentProps.rAccessor || function (d) {return d.value};
      const summaryValueAccessor = currentProps.summaryValueAccessor || function (d) {return d.length};

      const summaryData = summaryType.type ? nest().key(oAccessor).entries(currentProps.data) : []

      let allData = [ ...barData ]
      summaryData.forEach(d => {
        allData = [ ...allData, ...d.values ]
      })

//      const dataAccessor = currentProps.dataAccessor || function (d) {return d}
      let margin = calculateMargin(currentProps)

      let title = null
      if (typeof currentProps.title === "string") {
        title = <text x={currentProps.size[0] / 2} y={25} className={"frame-title"} style={{ textAnchor: "middle", pointerEvents: "none" }}>{currentProps.title}</text>
      }
      //assume if defined then it's an svg mark of some sort
      else if (currentProps.title) {
        title = currentProps.title
      }

      const nestedData = nest()
        .key(oAccessor)
        .rollup(leaves => sum(leaves.map(rAccessor)))
        .entries(allData)

      let oExtent = currentProps.oExtent || uniq(allData.map((d,i) => oAccessor(d,i)))

      let rExtent = currentProps.rExtent || [ 0, max(nestedData, d => d.value) ]

      const { adjustedPosition, adjustedSize } = this.adjustedPositionSize(this.props)

      let totalRExtent = currentProps.rExtent || [ 0, max(allData, rAccessor) ]
      if (summaryType.type || pieceType.type === "swarm" || pieceType.type === "point") {
        rExtent = totalRExtent
      }

      if (currentProps.yBaseline !== undefined && !currentProps.rExtent) {
        rExtent[0] = currentProps.yBaseline
      }

      if (currentProps.sortO) {
        oExtent = oExtent.sort(currentProps.sortO)
      }
      if (currentProps.invertR) {
        rExtent = [ rExtent[1],rExtent[0] ]
      }

      let oDomain = [ margin.left, adjustedSize[0] + margin.left ]
      let rDomain = [ margin.top, adjustedSize[1] + margin.top ]

      if (projection === "horizontal") {
        rDomain = [ margin.left, adjustedSize[0] + margin.left ]
        oDomain = [ margin.top, adjustedSize[1] + margin.top ]
      }

      const oScaleType = currentProps.oScaleType || scaleBand;
      const rScaleType = currentProps.rScaleType || scaleLinear;

      let cwHash

      let oScale

      if (currentProps.columnWidth) {
        const thresholdDomain = [ margin.left ]
        const maxColumnValues = sum(barData
            .map(currentProps.columnWidth))

        cwHash = { total: 0 }
        oExtent.forEach((d,i) => {
          const oValue = sum(barData
            .filter((p,q) => oAccessor(p,q) === d)
            .map(currentProps.columnWidth))
          const stepValue = oValue / maxColumnValues * (oDomain[1] - oDomain[0])
          cwHash[d] = stepValue
          cwHash.total = cwHash.total + stepValue
          if (i !== oExtent.length - 1) {
            thresholdDomain.push(stepValue + thresholdDomain[i])
          }
        })

        oScale = scaleOrdinal().domain(oExtent).range(thresholdDomain)
      }
      else {
        oScale = oScaleType().domain(oExtent).range(oDomain)
      }

      const rScale = rScaleType().domain(rExtent).range(rDomain)
      const totalRScale = rScaleType().domain(totalRExtent).range(rDomain)

      this.oScale = oScale
      this.rScale = rScale

      this.oAccessor = oAccessor
      this.rAccessor = rAccessor

      const projectedColumns = {}

      let bars = []
      let summaries = []

      const padding = currentProps.oPadding ? currentProps.oPadding : 0

      let columnWidth = cwHash ? 0 : oScale.bandwidth() - padding

      let pieceData, mappedMiddles

      const projectedPieces = []
      let mappedMiddleSize = adjustedSize[0] + margin.left
      if (projection === "horizontal") {
        mappedMiddleSize = adjustedSize[1] + margin.top
      }
      mappedMiddles = this.mappedMiddles(oScale, mappedMiddleSize, padding)

      oExtent.forEach(o => {
        projectedColumns[o] = { name: o }
        if (cwHash) {
          projectedColumns[o].width = cwHash[o]
        }
        else {
          projectedColumns[o].width = columnWidth
        }
          projectedColumns[o].x = oScale(o)
          projectedColumns[o].y = margin.top
          projectedColumns[o].middle = mappedMiddles[o]
      })

      if (pieceType.type || connectorType.type) {
        const nestedPieces = {}
        nest().key(oAccessor).entries(barData).forEach(d => {
          nestedPieces[d.key] = d.values
        })
        pieceData = oExtent.map(d => nestedPieces[d])
      }

      if (pieceType.type === "swarm") {

        const circleRadius = pieceType.r || Math.min(3, rDomain[1] * columnWidth / barData.length / oExtent.length )
        const iterations = pieceType.iterations || 120

        oExtent.forEach((ordset, ordsetI) => {
        const projectedOrd = []
        projectedPieces.push(projectedOrd)
        const simulation = forceSimulation(pieceData[ordsetI])
            .force("y", forceY((d,i) => totalRScale(rAccessor(d,i))).strength(pieceType.strength || 2))
            .force("x", forceX(projectedColumns[ordset].middle))
            .force("collide", forceCollide(circleRadius))
            .stop();

        for (let i = 0; i < iterations; ++i) simulation.tick();

          const renderedPieces = pieceData[ordsetI].map((d,i) => {
            const renderMode = currentProps.renderFn && currentProps.renderFn(d,i)

            let xPosition = d.x
            let yPosition = margin.top + rDomain[1] - d.y

            if (projection === "horizontal") {
              yPosition = d.x
              xPosition = d.y
            }
          projectedOrd.push({ data: d, x: xPosition, offset: 0, y: yPosition, size: 1 })
          const actualCircleRadius = typeof circleRadius === "function" ? circleRadius(d,i) : circleRadius

          const piece = <Mark
            markType="rect"
            renderMode={renderMode}
            key={"piece-" + d.renderKey}
            rx={actualCircleRadius}
            ry={actualCircleRadius}
            x={xPosition - actualCircleRadius/2}
            y={yPosition - actualCircleRadius/2}
            width={actualCircleRadius*2}
            height={actualCircleRadius*2}
            style={currentProps.style(d,i)}
            onClick={() => {this.onPieceClick(d,i)}}
            onMouseEnter={() => {this.onPieceEnter(d,i)}}
            onMouseOut={() => {this.onPieceOut(d,i)}}
            />

          return piece
        })
          bars = [ ...bars, ...renderedPieces ]
          })
      }
      else if (pieceType.type === "point") {
        const circleRadius = 3

        oExtent.forEach((ordset, ordsetI) => {
          const projectedOrd = []
          projectedPieces.push(projectedOrd)

          const renderedPieces = pieceData[ordsetI].map((d,i) => {
          const renderMode = currentProps.renderFn && currentProps.renderFn(d,i)

          let xPosition = projectedColumns[ordset].middle
          let yPosition = margin.top + rDomain[1] - rScale(rAccessor(d,i))

          if (projection === "horizontal") {
            yPosition = projectedColumns[ordset].middle
            xPosition = totalRScale(rAccessor(d,i))
          }

          projectedOrd.push({ data: d, x: xPosition, offset: 0, y: yPosition, size: 1 })

          const piece = <Mark
            markType="rect"
            renderMode={renderMode}
            key={"piece-" + d.renderKey}
            rx={circleRadius}
            ry={circleRadius}
            x={xPosition - circleRadius/2}
            y={yPosition - circleRadius/2}
            width={circleRadius*2}
            height={circleRadius*2}
            style={currentProps.style(d,i)}
            onClick={() => {this.onPieceClick(d,i)}}
            onMouseEnter={() => {this.onPieceEnter(d,i)}}
            onMouseOut={() => {this.onPieceOut(d,i)}}
            />

          return piece
        })
          bars = [ ...bars, ...renderedPieces ]
          })
      }
      else if (pieceType.type === "bar") {
        oExtent.forEach((ordset, ordsetI) => {
          const projectedOrd = []
          projectedPieces.push(projectedOrd)

          const barColumnWidth = projectedColumns[ordset].width

          //STACKING
          let currentOffset = 0;
          const renderedPieces = pieceData[ordsetI].map((d,i) => {

          const pieceHeight = rScale(rAccessor(d,i)) - rScale.range()[0]
          const renderMode = currentProps.renderFn && currentProps.renderFn(d,i)

          let xPosition = projectedColumns[ordset].x
          let yPosition = margin.top + rScale.range()[1] - currentOffset - rScale(rAccessor(d,i))
          let finalWidth = barColumnWidth
          let finalHeight = pieceHeight

          if (projection === "horizontal") {
            yPosition = projectedColumns[ordset].x
            xPosition = margin.left + currentOffset
            finalHeight = barColumnWidth
            finalWidth = pieceHeight

          }
          projectedOrd.push({ data: d, x: xPosition, offset: finalWidth, y: yPosition, size: finalHeight })

          let markD, translate, pieceMarkType = "rect"

          if (projection === "radial") {
            pieceMarkType = "path"
            const arcGenerator = arc()
              .innerRadius(currentOffset / 2)
              .outerRadius(pieceHeight / 2 + currentOffset / 2)
            let angle = 1 / oExtent.length
            let startAngle = angle * ordsetI
            let endAngle = startAngle + angle
            let twoPI = Math.PI * 2

            //BETTER ME
            if (cwHash) {
              angle = projectedColumns[ordset].width / cwHash.total
              startAngle = projectedColumns[ordset].x / cwHash.total
              endAngle = startAngle + angle
            }

            markD = arcGenerator({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI })
            translate = "translate(" + adjustedSize[0] / 2 + "," + adjustedSize[1] / 2 + ")"
          }

          const piece = <Mark
            markType={pieceMarkType}
            renderMode={renderMode}
            key={"piece-" + d.renderKey}
            x={xPosition}
            y={yPosition}
            width={finalWidth}
            height={finalHeight}
            rx={0}
            ry={0}
            d={markD}
            transform={translate}
            style={currentProps.style(d,ordsetI)}
            onClick={() => {this.onPieceClick(d,i)}}
            onMouseEnter={() => {this.onPieceEnter(d,i)}}
            onMouseOut={() => {this.onPieceOut(d,i)}}
            />
          currentOffset = currentOffset + pieceHeight
          return piece
        })
          bars = [ ...bars, ...renderedPieces ]
        })
      }
    if (connectorType.type) {
      //Handle Data
      //Handle Function
      if (typeof connectorType.type === "function") {
        const connectionRule = connectorType.type
        projectedPieces.forEach((pieceArray, pieceArrayI) => {
          pieceArray.forEach((piece, pieceI) => {
            const nextColumn = projectedPieces[pieceArrayI + 1]
            if (nextColumn) {
              const matchingPieceIndex = nextColumn.map((d,i) => connectionRule(d.data,i)).indexOf(connectionRule(piece.data, pieceI))
              if (matchingPieceIndex !== -1) {
                const matchingPiece = nextColumn[matchingPieceIndex]
                let markD
                if (currentProps.projection === "vertical") {
                  markD = drawAreaConnector({ x1: piece.x + piece.offset, x2: matchingPiece.x, y1: piece.y, y2: matchingPiece.y, sizeX1: 0, sizeX2: 0, sizeY1: piece.size, sizeY2: matchingPiece.size })
                }
                else if (currentProps.projection === "horizontal") {
                  markD = drawAreaConnector({ x1: piece.x, x2: matchingPiece.x, y1: piece.y + piece.size, y2: matchingPiece.y, sizeX1: piece.offset, sizeX2: matchingPiece.offset, sizeY1: 0, sizeY2: 0 })
                }
                const renderMode = currentProps.renderFn && currentProps.renderFn(piece, pieceI)

                const connectorStyle = currentProps.connectorStyle({ source: piece.data, target: matchingPiece.data })
                connectorMarks.push(<Mark renderMode={renderMode} markType="path" d={markD} key={"connector" + piece.data.renderKey} style={connectorStyle}/>)
              }
            }
          })
        })
      }
    }
    if (summaryType.type) {
      if (summaryType.type === "boxplot") {
      oExtent.forEach((summary, summaryI) => {
        const thisSummaryData = summaryData.filter(d => d.key === summary)[0].values

        const summaryStyle = currentProps.summaryStyle(thisSummaryData[0], summaryI)

        let summaryDataNest =
          thisSummaryData
          .map(p => rAccessor(p))
          .map(p => rDomain[1] - totalRScale(p))
          .sort((a,b) => b - a)

        summaryDataNest = [ quantile(summaryDataNest, 0.0), quantile(summaryDataNest, 0.25), quantile(summaryDataNest, 0.5), quantile(summaryDataNest, 0.75), quantile(summaryDataNest, 1.0) ]

        let translate = "translate(" + projectedColumns[summary].middle + "," + margin.top + ")"
        let extentlineX1 = 0
        let extentlineX2 = 0
        let extentlineY1 = summaryDataNest[0]
        let extentlineY2 = summaryDataNest[4]
        let topLineX1 = -columnWidth/2
        let topLineX2 = columnWidth/2
        let midLineX1 = -columnWidth/2
        let midLineX2 = columnWidth/2
        let bottomLineX1 = -columnWidth/2
        let bottomLineX2 = columnWidth/2
        let rectWidth = columnWidth
        let rectHeight = summaryDataNest[1] - summaryDataNest[3]
        let rectY = summaryDataNest[3]
        let rectX = -columnWidth/2
        let topLineY1 = summaryDataNest[0]
        let topLineY2 = summaryDataNest[0]
        let bottomLineY1 = summaryDataNest[4]
        let bottomLineY2 = summaryDataNest[4]
        let midLineY1 = summaryDataNest[2]
        let midLineY2 = summaryDataNest[2]

        if (currentProps.projection === "horizontal") {
          summaryDataNest =
            thisSummaryData
            .map(p => rAccessor(p))
            .map(p => totalRScale(p))
            .sort((a,b) => b - a)

          summaryDataNest = [ quantile(summaryDataNest, 0.0), quantile(summaryDataNest, 0.25), quantile(summaryDataNest, 0.5), quantile(summaryDataNest, 0.75), quantile(summaryDataNest, 1.0) ]

          translate = "translate(0," + projectedColumns[summary].middle + ")"
          extentlineY1 = 0
          extentlineY2 = 0
          extentlineX1 = summaryDataNest[0]
          extentlineX2 = summaryDataNest[4]
          topLineY1 = -columnWidth/2
          topLineY2 = columnWidth/2
          midLineY1 = -columnWidth/2
          midLineY2 = columnWidth/2
          bottomLineY1 = -columnWidth/2
          bottomLineY2 = columnWidth/2
          rectHeight = columnWidth
          rectWidth = summaryDataNest[1] - summaryDataNest[3]
          rectX = summaryDataNest[3]
          rectY = -columnWidth/2
          topLineX1 = summaryDataNest[0]
          topLineX2 = summaryDataNest[0]
          bottomLineX1 = summaryDataNest[4]
          bottomLineX2 = summaryDataNest[4]
          midLineX1 = summaryDataNest[2]
          midLineX2 = summaryDataNest[2]
        }

            const renderMode = currentProps.renderFn ? currentProps.renderFn(summary, summaryI) : undefined

            summaries.push(<g
              transform={translate}
              key={"summaryPiece-" + summaryI}>
                <Mark renderMode={renderMode} markType="line" x1={extentlineX1} x2={extentlineX2} y1={extentlineY1} y2={extentlineY2} style={Object.assign({ strokeWidth: "2px" }, summaryStyle)} />
                <Mark renderMode={renderMode} markType="line" x1={topLineX1} x2={topLineX2} y1={topLineY1} y2={topLineY2} style={Object.assign({ strokeWidth: "2px" }, summaryStyle)} />
                <Mark renderMode={renderMode} markType="line" x1={bottomLineX1} x2={bottomLineX2} y1={bottomLineY1} y2={bottomLineY2} style={Object.assign({ strokeWidth: "2px" }, summaryStyle)} />
                <Mark renderMode={renderMode} markType="line" x1={midLineX1} x2={midLineX2} y1={midLineY1} y2={midLineY2} style={Object.assign({ strokeWidth: "4px" }, summaryStyle)} />
                <Mark renderMode={renderMode} markType="rect" x={rectX} width={rectWidth} y={rectY} height={rectHeight} style={Object.assign({ strokeWidth: "1px" }, summaryStyle)} />
              </g>)

      })

    }
    else {
        oExtent.forEach((summary, summaryI) => {
          const renderMode = currentProps.renderFn ? currentProps.renderFn(summary, summaryI) : undefined
          const thisSummaryData = summaryData.filter(d => d.key === summary)[0].values

          const summaryStyle = currentProps.summaryStyle(thisSummaryData[0], summaryI)
          let summaryDataNest = thisSummaryData
            .sort((a,b) => rAccessor(b) - rAccessor(a))

          const buckets = summaryType.bins || 25
          const bucketSize = (rDomain[1] - rDomain[0]) / buckets

          const violinHist = histogram()
          const totalRScaleDomain = totalRScale.domain()
          let binDomain = totalRScaleDomain
          let binBuckets = totalRScale.ticks(buckets)
          if (totalRScaleDomain[1] < totalRScaleDomain[0]) {
            binDomain = binDomain.reverse()
            binBuckets = binBuckets.reverse()
          }

          let bins = violinHist
              .domain(binDomain)
              .thresholds(binBuckets)
              .value(p => rAccessor(p))
              (summaryDataNest)

          bins = bins.map(d => ({ y: rDomain[1] - bucketSize - totalRScale(d.x0), value: summaryValueAccessor(d) }))
            .filter(d => d.value !== 0)

            const binMax = max(bins.map(d => d.value))

            let translate = "translate(" + projectedColumns[oAccessor(thisSummaryData[0])].middle + "," + margin.top + ")"
            if (projection === "horizontal") {
              translate = "translate(" + margin.left + "," + projectedColumns[oAccessor(thisSummaryData[0])].middle + ")"
            }
      if (summaryType.type === "heatmap") {

                    const tiles = bins.map((d,i) => {
              const opacity = d.value / binMax
                let xProp = -columnWidth/2
                let yProp = d.y
                let height = bucketSize
                let width = columnWidth
              if (currentProps.projection === "horizontal") {
                yProp = -columnWidth/2
                xProp = adjustedSize[0] - d.y - bucketSize
                height = columnWidth
                width = bucketSize
              }
              return <Mark
                        markType="rect"
                        renderMode={renderMode}
                        key={"heatmap-" + summaryI +"-" + i}
                        x={xProp}
                        y={yProp}
                        height={height}
                        width={width}
                        style={{ opacity: opacity, fill: summaryStyle.fill }}
                      />})

              summaries.push(<g
                transform={translate}
                key={"summaryPiece-" + summaryI}>
                  {tiles}
                </g>)
        }
        else if (summaryType.type === "histogram") {
            const tiles = bins.map((d,i) => {
              const opacity = d.value / binMax
              let rectX = -columnWidth/2
              let y = d.y
              let height = bucketSize
              let width = columnWidth * opacity
              if (currentProps.projection === "horizontal") {
                y = columnWidth - columnWidth * opacity -columnWidth/2
                height = columnWidth * opacity
                rectX = adjustedSize[0] - d.y - bucketSize
                width = bucketSize
              }
              return <Mark
                        markType="rect"
                        renderMode={renderMode}
                        key={"heatmap-" + summaryI +"-" + i}
                        x={rectX}
                        y={y}
                        height={height}
                        width={width}
                        style={summaryStyle}
                      />})

              summaries.push(<g
                transform={translate}
                key={"summaryPiece-" + summaryI}>
                  {tiles}
                </g>)
        }
      else if (summaryType.type === "violin") {

            const violinArea = area()
              .curve(curveCatmullRom)

          if (projection === "horizontal") {
            violinArea
              .x(summaryPoint => adjustedSize[0] - summaryPoint.y - bucketSize / 2)
              .y0(summaryPoint => -summaryPoint.value / binMax * columnWidth / 2)
              .y1(summaryPoint => summaryPoint.value / binMax * columnWidth / 2)
          }
          else {
            violinArea
              .y( summaryPoint => summaryPoint.y + bucketSize / 2)
              .x0(summaryPoint => -summaryPoint.value / binMax * columnWidth / 2)
              .x1(summaryPoint => summaryPoint.value / binMax * columnWidth / 2)
          }


          summaries.push(<g
            transform={translate}
            key={"summaryPiece-" + summaryI}>
              <Mark
                renderMode={renderMode}
                markType="path"
                style={summaryStyle}
                d={violinArea(bins)}
              />
            </g>)

        }
      else if (summaryType.type === "ekg") {

            let violinD = "M"
          if (projection === "horizontal") {
            bins.forEach((summaryPoint, gpi) => {
              violinD += adjustedSize[0] - summaryPoint.y - bucketSize / 2
              violinD += ","
              violinD += -(summaryPoint.value / binMax * columnWidth) + columnWidth/2
              violinD += gpi === bins.length - 1 ? "" : " L"
            })
          }
          else {
            bins.forEach((summaryPoint, gpi) => {
              violinD += summaryPoint.value / binMax * columnWidth - columnWidth/2
              violinD += ","
              violinD += summaryPoint.y
              violinD += gpi === bins.length - 1 ? "" : " L"
            })
          }


              summaries.push(<g
                transform={translate}
                key={"summaryPiece-" + summaryI}>
                  <Mark
                    renderMode={renderMode}
                    markType="path"
                    style={summaryStyle}
                    d={violinD}
                  />
                </g>)

        }

      })
    }
  }

      const labelArray = []

      const pieArcs = []

      if (currentProps.oLabel || currentProps.hoverAnnotation) {
        ordinalHover = oExtent.map((d,i) => {
            const arcGenerator = arc()
              .innerRadius(0)
              .outerRadius(rScale.range()[1] / 2)
            let angle = 1 / oExtent.length
            let startAngle = angle * i
            let twoPI = Math.PI * 2

            if (cwHash) {
              angle = cwHash[d] / cwHash.total
              startAngle = oScale(d) / cwHash.total
            }

            let endAngle = startAngle + angle
            let midAngle = startAngle + angle / 2

            const markD = arcGenerator({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI })
            const translate = [ adjustedSize[0] / 2 , adjustedSize[1] / 2 ]
            const centroid = arcGenerator.centroid({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI })
            pieArcs.push({ startAngle, endAngle, midAngle, markD, translate, centroid })
          })
      }

      if (currentProps.oLabel) {
        let labelingFn
        if (currentProps.oLabel === true) {
          labelingFn = d => <text style={{ textAnchor: projection === "horizontal" ? "end" : "middle" }}>{d}</text>
        }
        else if (typeof currentProps.oLabel === "function") {
          labelingFn = currentProps.oLabel
        }

        oExtent.forEach((d,i) => {
          let xPosition = mappedMiddles[d]
          let yPosition = 0

          if (projection === "horizontal") {
            yPosition = mappedMiddles[d]
            xPosition = margin.left - 3
          }
          else if (projection === "radial") {
            xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0]
            yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1]
          }
          const label = labelingFn(d, currentProps.data ? currentProps.data.filter((p,q) => oAccessor(p,q) === d) : undefined)
          labelArray.push(<g key={"olabel-" + i} transform={"translate(" + xPosition + "," + yPosition + ")"}>{label}</g>)
        })

        if (projection === "vertical") {
          oLabels = <g transform={"translate(0," + (15 + margin.top + rScale.range()[1]) + ")"}>{labelArray}</g>
        }
        else if (projection === "horizontal") {
          oLabels = <g transform={"translate(0,0)"}>{labelArray}</g>
        }
        else if (projection === "radial") {
          oLabels = <g transform={"translate(0,0)"}>{labelArray}</g>
        }

      }


      if (currentProps.hoverAnnotation) {
        ordinalHover = oExtent.map((d,i) => {
          const barColumnWidth = projectedColumns[d].width
          let xPosition = projectedColumns[d].x
          let yPosition = margin.top
          let height = rScale.range()[1]
          let width = barColumnWidth + padding
          if (projection === "horizontal") {
            yPosition = oScale(d) - padding
            xPosition = margin.left
            width = rScale.range()[1]
            height = barColumnWidth + padding
          }

          if (projection === "radial") {
            const { markD, centroid, translate, midAngle } = pieArcs[i]
            return <path
                    key={"hover" + d}
                    d={markD}
                    transform={"translate(" + translate + ")"}
                    style={{ opacity: 0, fill: "pink" }}
                    onClick={() => {this.clickVoronoi({ pieces: barData.filter((p,q) => oAccessor(p,q) === d), summary: summaryData[i], arcAngles: { centroid, translate, midAngle, length: rScale.range()[1] / 2 } })}}
                    onMouseEnter={() => {this.changeVoronoi({ pieces: barData.filter((p,q) => oAccessor(p,q) === d), summary: summaryData[i], arcAngles: { centroid, translate, midAngle, length: rScale.range()[1] / 2 } })}}
                    onMouseLeave={() => {this.changeVoronoi({})}}
                  />
            }

          return <rect
                    key={"hover" + d}
                    x={xPosition}
                    y={yPosition}
                    height={height}
                    width={width}
                    style={{ opacity: 0, stroke: "black", fill: "pink" }}
                    onClick={() => {this.clickVoronoi({ pieces: barData.filter((p,q) => oAccessor(p,q) === d), summary: summaryData[i] })}}
                    onMouseEnter={() => {this.changeVoronoi({ pieces: barData.filter((p,q) => oAccessor(p,q) === d), summary: summaryData[i] })}}
                    onMouseLeave={() => {this.changeVoronoi({})}}
                  />})
      }

      let axis = null;

      if (projection !== "radial" && currentProps.axis) {
        let axisPosition = [ 0, 0 ]
        let axisSize = [ 0, 0 ]
        const axes = Array.isArray(currentProps.axis) ? currentProps.axis : [ currentProps.axis ]
        axis = axes.map(d => {
          let tickValues;

          let axisScale = rScaleType()
            .domain(rScale.domain())

          let orient = trueAxis(d.orient, currentProps)

          axisSize = adjustedSize

          if (orient === "right") {
            axisPosition = [ margin.left, 0 ]
            axisScale.range([ rScale.range()[1], rScale.range()[0] ])
          }
          else if (orient === "left") {
            axisPosition = [ margin.left, 0 ]
            axisScale.range([ rScale.range()[1], rScale.range()[0] ])
          }
          else if (orient === "top") {
            axisPosition = [ 0, margin.top ]
            axisScale.range(rScale.range())
          }
          else if (orient === "bottom") {
            axisPosition = [ 0, margin.top ]
            axisScale.range(rScale.range())
          }

          if (d.tickValues && Array.isArray(d.tickValues)) {
            tickValues = d.tickValues
          }
          //otherwise assume a function
          else if (d.tickValues) {
            tickValues = d.tickValues(currentProps.data, currentProps.size, rScale)
          }

          return <Axis
            key={d.key}
            orient={orient}
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

      this.setState({
          voronoiHover: null,
          bars,
          summaries,
          connectors: connectorMarks,
          adjustedPosition: adjustedPosition,
          adjustedSize: adjustedSize,
          backgroundGraphics: currentProps.backgroundGraphics,
          foregroundGraphics: currentProps.foregroundGraphics,
          axisData: currentProps.axis,
          axis,
          oLabels,
          title,
          ordinalHover,
          renderNumber: this.state.renderNumber + 1,
          oAccessor: currentProps.oAccessor,
          rAccessor: currentProps.rAccessor,
          oScaleType: currentProps.oScaleType,
          rScaleType: currentProps.rScaleType,
          oExtent: currentProps.oExtent,
          rExtent: currentProps.rExtent,
          projectedColumns
        })

    }

    componentWillMount() {
      this.calculateORFrame(this.props)
    }

    componentWillReceiveProps(nextProps) {
//      if (!this.props.optimizeRendering) {
        this.calculateORFrame(nextProps)
/*      }
      else if (this.props.customLineType !== nextProps.customLineType || this.props.xMetric !== nextProps.xMetric || this.props.yMetric !== nextProps.yMetric) {
        this.calculateORFrame(nextProps)
      }

      else {
        this.state.fullDataset.some((d,i) => {
          if (this.props.oAccessor(d,i) !== nextProps.oAccessor(d,i) || this.props.rAccessor(d,i) !== nextProps.rAccessor(d,i)) {
            this.calculateORFrame(nextProps)
            return true
          }
        });

      }
      */
    }

    clonedAppliedElement({ tx, ty, d, i, markProps, styleFn, renderFn, classFn, baseClass }) {

        markProps.style = styleFn ? styleFn(d, i) : {}

        markProps.renderMode = renderFn ? renderFn(d, i) : undefined

        if (tx || ty) {
          markProps.transform = "translate(" + tx || 0 + "," + ty || 0 + ")";
        }

        markProps.className = baseClass;

        markProps.key = baseClass + "-" + i

        if (classFn) {
          markProps.className = baseClass + " " + classFn(d, i);
        }

        return <Mark {...markProps} />;
    }

    defaultORSVGRule(d,i,annotationLayer) {
      const oAccessor = this.oAccessor
      const rAccessor = this.rAccessor

      const oScale = this.oScale
      const rScale = this.rScale
      const { adjustedPosition, adjustedSize } = this.adjustedPositionSize(this.props)

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({ d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps: this.props }) !== null) {
        return this.props.svgAnnotationRules({ d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps: this.props, adjustedPosition, adjustedSize, annotationLayer })
      }

      return null

    }

    pointOnArcAtAngle(center, angle, distance) {
      const radians = Math.PI * (angle + .75) * 2

      const xPosition = center[0] + distance * Math.cos(radians)
      const yPosition = center[1] + distance * Math.sin(radians)

      return [ xPosition, yPosition ]

    }

    mappedMiddles(oScale, middleMax, padding) {
      const oScaleDomainValues = oScale.domain()

      const mappedMiddles = {}
      oScaleDomainValues
        .map((p,q) => {
          const base = oScale(p) - padding
          const next = oScaleDomainValues[q + 1] ? oScale(oScaleDomainValues[q + 1]) : middleMax
          const diff = (next - base) / 2
          mappedMiddles[p] = base + diff
        })

      return mappedMiddles
    }

    defaultORHTMLRule(d,i) {

      const oAccessor = this.oAccessor
      const rAccessor = this.rAccessor
      const padding = this.props.oPadding ? this.props.oPadding : 0

      const oScale = this.oScale
      const rScale = this.rScale

      const { adjustedPosition, adjustedSize } = this.adjustedPositionSize(this.props)

      const mappedMiddles = this.mappedMiddles(oScale, adjustedSize[0] + padding, padding)

      //TODO: Process your rules first
      if (this.props.htmlAnnotationRules && this.props.htmlAnnotationRules({ d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps: this.props }) !== null) {
        return this.props.htmlAnnotationRules({ d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps: this.props })
      }

      if (d.type === "xy" || d.type === "frame-hover") {
        const maxPiece = max(d.pieces.map(rAccessor))
        const sumPiece = sum(d.pieces.map(rAccessor))
        const positionValue = [ "swarm", "point" ].indexOf(this.props.type) !== -1 ? maxPiece : sumPiece
        let xPosition = mappedMiddles[oAccessor(d.pieces[0])] + adjustedPosition[0]
        let yPosition = rScale(positionValue) + adjustedPosition[1] + 10

        if (this.props.projection === "horizontal") {
          yPosition = adjustedSize[1] - oScale(oAccessor(d.pieces[0]))
          xPosition = rScale(positionValue) + adjustedPosition[0]
        }
        else if (this.props.projection === "radial") {
          [ xPosition, yPosition ] = this.pointOnArcAtAngle(d.arcAngles.translate, d.arcAngles.midAngle, d.arcAngles.length)
          yPosition = 10 + adjustedSize[1] - yPosition
        }


        //To string because React gives a DOM error if it gets a date
        let content = [ <p key="xy-annotation-1">{oAccessor(d.pieces[0]).toString()}</p>,
          <p key="xy-annotation-2">{sumPiece}</p> ]

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d)
        }

        if (d.type === "xy") {
          content = d.label
        }

        return <div
          key={"xylabel" + i}
          className="annotation annotation-xy-label"
          style={{ position: "absolute",
            bottom: yPosition + "px",
            left: xPosition - 75 + "px",
            width: "150px" }} >
          {content}
          </div>
      }
      return null

    }

    adjustedPositionSize(props) {
      let margin = calculateMargin(props)
      let position = props.position || [ 0, 0 ];
      let xPositionAdjust = 0;
      let yPositionAdjust = 0;
      let heightAdjust = margin.top + margin.bottom;
      let widthAdjust = margin.left + margin.right;

      let adjustedPosition = [ position[0] + xPositionAdjust, position[1] + yPositionAdjust ]
      let adjustedSize = [ props.size[0] - widthAdjust, props.size[1] - heightAdjust ]

      return { adjustedPosition, adjustedSize }
    }

    render() {
      return this.renderBody({})
    }

    renderBody({ afterElements }) {

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
          svgAnnotationRule={(d,i,thisALayer) => this.defaultORSVGRule(d,i,thisALayer)}
          htmlAnnotationRule={(d,i,thisALayer) => this.defaultORHTMLRule(d,i,thisALayer)}
          size={this.props.size}
          position={this.state.adjustedPosition}
        />
      }

      return <div className={this.props.className + " frame"} style={{ background: "none" }}>
        <div className="frame-elements" style={{ height: this.props.size[1] + "px" }}>
        <svg style={{ position: "absolute" }} width={this.props.size[0]} height={this.props.size[1]}>
        <defs>
          <filter id="gooeyCodeFilter">
            <feGaussianBlur id="gaussblurrer" in="SourceGraphic"
              stdDeviation={3}
              colorInterpolationFilters="sRGB"
              result="blur"
            />
            <feColorMatrix in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
              result="gooey"
            />
          </filter>
          <filter id="gooeyCodeFilter2">
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
         {this.props.additionalDefs}
        </defs>
        <MarkContext
          position={this.state.adjustedPosition}
          size={this.state.adjustedSize}
          orFrameChildren={true}
          renderNumber={this.state.renderNumber}
        >
          {this.state.backgroundGraphics}
          {this.state.axis}
          <g className="connectors">{this.state.connectors}</g>
          <g className="pieces">{this.state.bars}</g>
          <g className="summaries">{this.state.summaries}</g>
          <g className="labels">{this.state.oLabels}</g>
          {this.state.foregroundGraphics}
          {this.state.title}
        </MarkContext>
        </svg>
        <InteractionLayer
          interaction={this.props.interaction}
          position={this.state.adjustedPosition}
          size={this.state.adjustedSize}
          svgSize={this.props.size}
          oScale={this.oScale}
          oColumns={this.state.projectedColumns}
          rScale={this.rScale}
          overlay={this.state.ordinalHover}
          enabled={true}
        />
        {annotationLayer}
        </div>
        <div className="frame-after-elements">
        {afterElements}
        </div>
      </div>

    }
}


orFrame.propTypes = {
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
    format: PropTypes.string,
    properties: PropTypes.object,
    size: PropTypes.array.isRequired,
    position: PropTypes.array,
    oScaleType: PropTypes.func,
    rScaleType: PropTypes.func,
    oExtent: PropTypes.array,
    rExtent: PropTypes.array,
    invertO: PropTypes.bool,
    invertR: PropTypes.bool,
    oAccessor: PropTypes.func,
    rAccessor: PropTypes.func,
    dataAccessor: PropTypes.func,
    annotations: PropTypes.array
  };

module.exports = orFrame;
