// @flow

import React from "react"
import { brushX, brushY, brush } from "d3-brush"
import { extent as d3Extent } from "d3-array"
import { select, event } from "d3-selection"
import { voronoi } from "d3-voronoi"
import { Mark } from "semiotic-mark"

// components
import Brush from "./Brush"

import PropTypes from "prop-types"
import SpanOrDiv from "./SpanOrDiv"

import type { Node } from "react"

//import type { CustomHoverType } from "./types/annotationTypes"

type CustomHoverType = boolean | Object | Array<Object | Function> | Function

type Props = {
  name?: string,
  interaction?: Object,
  overlay?: Array<Object>,
  oColumns?: Object,
  xScale: Function,
  yScale: Function,
  rScale?: Function,
  svgSize: Array<number>,
  hoverAnnotation?: CustomHoverType,
  interactionOverflow?: Object,
  size: Array<number>,
  projectedYMiddle?: string,
  projectedX: string,
  projectedY: string,
  points?: Array<Object>,
  enabled?: boolean,
  useSpans?: boolean,
  margin: Object,
  projection?: string,
  customDoubleClickBehavior?: Function,
  customClickBehavior?: Function,
  customHoverBehavior?: Function,
  voronoiHover: Function
}

type State = {
  overlayRegions: Node
}

class InteractionLayer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      overlayRegions: this.calculateOverlay(props)
    }
  }

  changeVoronoi = (d?: Object, customHoverTypes?: CustomHoverType) => {
    //Until semiotic 2
    const dataObject = d && d.data ? { ...d.data, ...d } : d
    if (this.props.customHoverBehavior)
      this.props.customHoverBehavior(dataObject)

    if (!d) this.props.voronoiHover(null)
    else if (customHoverTypes === true) {
      const vorD = Object.assign({}, dataObject)
      vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover"
      this.props.voronoiHover(vorD)
    } else if (customHoverTypes) {
      const arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
        ? customHoverTypes
        : [customHoverTypes]
      const mappedHoverTypes = arrayWrappedHoverTypes
        .map(c => {
          const finalC = typeof c === "function" ? c(dataObject) : c
          if (!finalC) return undefined
          return Object.assign({}, dataObject, finalC)
        })
        .filter(d => d)

      this.props.voronoiHover(mappedHoverTypes)
    }
  }

  clickVoronoi = (d: Object) => {
    //Until semiotic 2
    const dataObject = d.data ? { ...d.data, ...d } : d

    if (this.props.customClickBehavior)
      this.props.customClickBehavior(dataObject)
  }
  doubleclickVoronoi = (d: Object) => {
    //Until semiotic 2
    const dataObject = d.data ? { ...d.data, ...d } : d

    if (this.props.customDoubleClickBehavior)
      this.props.customDoubleClickBehavior(dataObject)
  }

  brushStart = (e: ?Array<number> | Array<Array<number>>, column?: string) => {
    if (this.props.interaction && this.props.interaction.start)
      this.props.interaction.start(e, column)
  }

  brush = (e: ?Array<number> | Array<Array<number>>, column?: string) => {
    if (this.props.interaction && this.props.interaction.during)
      this.props.interaction.during(e, column)
  }

  brushEnd = (e: ?Array<number> | Array<Array<number>>, column?: string) => {
    if (this.props.interaction && this.props.interaction.end)
      this.props.interaction.end(e, column)
  }

  createBrush = (interaction: Object) => {
    let semioticBrush, mappingFn, selectedExtent, endMappingFn

    const { xScale, yScale, size } = this.props

    const { projection, projectedColumns } = interaction

    const actualBrush =
      interaction.brush === "oBrush"
        ? projection === "horizontal"
          ? "yBrush"
          : "xBrush"
        : interaction.brush

    const {
      extent = actualBrush === "xyBrush"
        ? [
            [xScale.invert(0), yScale.invert(0)],
            [xScale.invert(size[0]), yScale.invert(size[1])]
          ]
        : actualBrush === "xBrush"
          ? [xScale.invert(0), xScale.invert(size[0])]
          : [yScale.invert(0), yScale.invert(size[1])]
    } = interaction

    if (extent.indexOf && extent.indexOf(undefined) !== -1) {
      return <g />
    }

    if (actualBrush === "xBrush") {
      mappingFn = (d): null | Array<number> =>
        !d ? null : [xScale.invert(d[0]), xScale.invert(d[1])]
      semioticBrush = brushX()
      selectedExtent = extent.map(d => xScale(d))
      endMappingFn = mappingFn
    } else if (actualBrush === "yBrush") {
      mappingFn = (d): null | Array<number> =>
        !d ? null : [yScale.invert(d[0]), yScale.invert(d[1])]
      semioticBrush = brushY()
      selectedExtent = extent.map(d => yScale(d))
      endMappingFn = mappingFn
    } else {
      if (
        extent.indexOf(undefined) !== -1 ||
        extent[0].indexOf(undefined) !== -1 ||
        extent[1].indexOf(undefined) !== -1
      ) {
        return <g />
      }

      semioticBrush = brush()
      mappingFn = (d): null | Array<Array<number>> =>
        !d
          ? null
          : [
              [xScale.invert(d[0][0]), yScale.invert(d[0][1])],
              [xScale.invert(d[1][0]), yScale.invert(d[1][1])]
            ]
      selectedExtent = extent.map(d => [xScale(d[0]), yScale(d[1])])
      endMappingFn = mappingFn
    }

    if (interaction.brush === "oBrush") {
      selectedExtent = interaction.extent
        ? [
            projectedColumns[interaction.extent[0]].x,
            projectedColumns[interaction.extent[1]].x +
              projectedColumns[interaction.extent[1]].width
          ]
        : null

      function oMappingFn(d): null | any {
        if (d) {
          // $FlowFixMe
          const columnValues = Object.values(projectedColumns)

          const foundColumns = columnValues.filter(c => {
            // $FlowFixMe
            return d[1] >= c.x && d[0] <= c.x + c.width
          })
          return foundColumns
        }
        return null
      }
      function oEndMappingFn(d): null | Array<any> {
        if (
          d &&
          event.sourceEvent &&
          event.sourceEvent.path &&
          event.sourceEvent.path[1] &&
          event.sourceEvent.path[1].classList.contains("xybrush") &&
          event.target.move
        ) {
          const foundColumns = Object.values(projectedColumns).filter(
            // $FlowFixMe
            c => d[1] >= c.x && d[0] <= c.x + c.width
          )

          // $FlowFixMe
          const firstColumn: { x: number, width: number } = foundColumns[0] || {
            x: 0
          }
          // $FlowFixMe
          const lastColumn: { x: number, width: number } = foundColumns[
            foundColumns.length - 1
          ] || {
            x: 0,
            width: 0
          }

          const columnPosition = [
            firstColumn.x + Math.min(5, firstColumn.width / 10),
            lastColumn.x + lastColumn.width - Math.min(5, lastColumn.width / 10)
          ]

          select(event.sourceEvent.path[1])
            .transition(750)
            .call(event.target.move, columnPosition)

          return foundColumns
        }
        return null
      }

      mappingFn = oMappingFn
      endMappingFn = oEndMappingFn
    }

    semioticBrush
      .extent([[0, 0], [this.props.size[0], this.props.size[1]]])
      .on("start", () => {
        this.brushStart(mappingFn(event.selection))
      })
      .on("brush", () => {
        this.brush(mappingFn(event.selection))
      })
      .on("end", () => {
        this.brushEnd(endMappingFn(event.selection))
      })

    return (
      <g className="brush">
        <Brush
          type={interaction.brush}
          selectedExtent={selectedExtent}
          extent={extent}
          svgBrush={semioticBrush}
          size={size}
        />
      </g>
    )
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      this.props.overlay !== nextProps.overlay ||
      nextProps.points !== this.props.points ||
      this.props.xScale !== nextProps.xScale ||
      this.props.yScale !== nextProps.yScale
    ) {
      this.setState({ overlayRegions: this.calculateOverlay(nextProps) })
    }
  }

  calculateOverlay = (props: Props) => {
    let voronoiPaths = []
    const {
      xScale,
      yScale,
      points,
      projectedX,
      projectedY,
      projectedYMiddle,
      size,
      overlay,
      interactionOverflow = { top: 0, bottom: 0, left: 0, right: 0 }
    } = props

    if (points && props.hoverAnnotation && !overlay) {
      const voronoiDataset = []
      const voronoiUniqueHash = {}

      points.forEach((d: Object) => {
        const xValue = parseInt(xScale(d[projectedX]), 10)
        const yValue = parseInt(
          yScale(d[projectedYMiddle] || d[projectedY]),
          10
        )
        if (
          xValue >= 0 &&
          xValue <= size[0] &&
          yValue >= 0 &&
          yValue <= size[1] &&
          xValue !== undefined &&
          yValue !== undefined &&
          isNaN(xValue) === false &&
          isNaN(yValue) === false
        ) {
          const pointKey = `${xValue},${yValue}`
          if (!voronoiUniqueHash[pointKey]) {
            const voronoiPoint = {
              ...d,
              coincidentPoints: [d],
              voronoiX: xValue,
              voronoiY: yValue
            }
            voronoiDataset.push(voronoiPoint)
            voronoiUniqueHash[pointKey] = voronoiPoint
          } else voronoiUniqueHash[pointKey].coincidentPoints.push(d)
        }
      })

      const voronoiXExtent = d3Extent(voronoiDataset.map(d => d.voronoiX))
      const voronoiYExtent = d3Extent(voronoiDataset.map(d => d.voronoiY))

      const voronoiExtent = [
        [
          Math.min(voronoiXExtent[0], -interactionOverflow.left),
          Math.min(voronoiYExtent[0], -interactionOverflow.top)
        ],
        [
          Math.max(voronoiXExtent[1], size[0] + interactionOverflow.right),
          Math.max(voronoiYExtent[1], size[1] + interactionOverflow.bottom)
        ]
      ]

      const voronoiDiagram = voronoi()
        .extent(voronoiExtent)
        .x((d: Object) => d.voronoiX)
        .y((d: Object) => d.voronoiY)

      const voronoiData = voronoiDiagram.polygons(voronoiDataset)
      const voronoiLinks = voronoiDiagram.links(voronoiDataset)

      //create neighbors
      voronoiLinks.forEach((v: Object) => {
        if (!v.source.neighbors) v.source.neighbors = []

        v.source.neighbors.push(v.target)
      })

      voronoiPaths = voronoiData.map((d: Array<number>, i: number) => {
        return (
          <path
            onClick={() => {
              this.clickVoronoi(voronoiDataset[i])
            }}
            onDoubleClick={() => {
              this.doubleclickVoronoi(voronoiDataset[i])
            }}
            onMouseEnter={() => {
              this.changeVoronoi(voronoiDataset[i], props.hoverAnnotation)
            }}
            onMouseLeave={() => {
              this.changeVoronoi()
            }}
            key={`interactionVoronoi${i}`}
            d={`M${d.join("L")}Z`}
            style={{ fillOpacity: 0 }}
          />
        )
      }, this)
      return voronoiPaths
    } else if (overlay) {
      const renderedOverlay: Array<Node> = overlay.map(
        (overlayRegion: Object, i: number) => {
          const { overlayData, ...rest } = overlayRegion
          return (
            <Mark
              forceUpdate={true}
              {...rest}
              key={`overlay-${i}`}
              onMouseEnter={() => {
                this.changeVoronoi(overlayData, props.hoverAnnotation)
              }}
              onMouseLeave={() => {
                this.changeVoronoi()
              }}
              onClick={() => {
                this.clickVoronoi(overlayData)
              }}
              onDoubleClick={() => {
                this.doubleclickVoronoi(overlayData)
              }}
            />
          )
        }
      )

      return renderedOverlay
    }
  }

  createColumnsBrush = (interaction: Object) => {
    const { projection, rScale, size, oColumns } = this.props

    if (!projection || !rScale || !oColumns) return

    let semioticBrush, mappingFn

    const max = rScale.domain()[1]

    let type = "yBrush"

    if (projection && projection === "horizontal") {
      type = "xBrush"
      mappingFn = (d): null | Array<number> =>
        !d ? null : [rScale.invert(d[0]), rScale.invert(d[1])]
    } else
      mappingFn = (d): null | Array<number> =>
        !d
          ? null
          : [
              Math.abs(rScale.invert(d[1]) - max),
              Math.abs(rScale.invert(d[0]) - max)
            ]

    const rRange = rScale.range()

    const columnHash = oColumns
    let brushPosition, selectedExtent
    const brushes: Array<Node> = Object.keys(columnHash).map(c => {
      if (projection && projection === "horizontal") {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rScale(d))
          : rRange
        brushPosition = [0, columnHash[c].x]
        semioticBrush = brushX()
        semioticBrush
          .extent([[rRange[0], 0], [rRange[1], columnHash[c].width]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c)
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c)
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c)
          })
      } else {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rRange[1] - rScale(d)).reverse()
          : rRange
        brushPosition = [columnHash[c].x, 0]
        semioticBrush = brushY()
        semioticBrush
          .extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c)
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c)
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c)
          })
      }

      return (
        <g key={`column-brush-${c}`} className="brush">
          <Brush
            type={type}
            position={brushPosition}
            key={`orbrush${c}`}
            selectedExtent={selectedExtent}
            svgBrush={semioticBrush}
            size={size}
          />
        </g>
      )
    })
    return brushes
  }

  render() {
    let semioticBrush = null
    const { interaction, svgSize, margin, useSpans = false } = this.props
    const { overlayRegions } = this.state
    let { enabled } = this.props

    if (interaction && interaction.brush) {
      enabled = true
      semioticBrush = this.createBrush(interaction)
    }
    if (interaction && interaction.columnsBrush) {
      enabled = true
      semioticBrush = this.createColumnsBrush(interaction)
    }

    if (!overlayRegions && !semioticBrush) {
      return null
    }

    return (
      <SpanOrDiv
        span={useSpans}
        className="interaction-layer"
        style={{
          position: "absolute",
          background: "none",
          pointerEvents: "none"
        }}
      >
        <svg
          height={svgSize[1]}
          width={svgSize[0]}
          style={{ background: "none", pointerEvents: "none" }}
        >
          <g
            className="interaction-overlay"
            transform={`translate(${margin.left},${margin.top})`}
            style={{ pointerEvents: enabled ? "all" : "none" }}
          >
            <g className="interaction-regions">{overlayRegions}</g>
            {semioticBrush}
          </g>
        </svg>
      </SpanOrDiv>
    )
  }
}

InteractionLayer.propTypes = {
  name: PropTypes.string,
  interaction: PropTypes.object,
  overlay: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
    PropTypes.bool
  ]),
  oColumns: PropTypes.object,
  xScale: PropTypes.func,
  yScale: PropTypes.func,
  rScale: PropTypes.func,
  svgSize: PropTypes.array
}

export default InteractionLayer
