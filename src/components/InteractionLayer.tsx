import * as React from "react"
import { brushX, brushY, brush } from "d3-brush"
import { select, event } from "d3-selection"

// components
import Brush from "./Brush"

import { HOCSpanOrDiv } from "./SpanOrDiv"

import { Interactivity, InteractionLayerProps, BaseColumnType, InteractionLayerState } from "./types/interactionTypes"

import { brushing, brushEnd, brushStart, calculateOverlay } from "./processing/InteractionItems"
import InteractionCanvas from "./interactionLayerBehavior/InteractionCanvas";

const generateOMappingFn = projectedColumns => (d): null | any => {
  if (d) {
    const columnValues = Object.values(projectedColumns)

    const foundColumns = columnValues.filter(
      (c: { x: number; width: number }) => {
        return d[1] >= c.x && d[0] <= c.x + c.width
      }
    )
    return foundColumns
  }
  return null
}

const generateOEndMappingFn = projectedColumns => (d): null | Array<any> => {
  if (
    d &&
    event.sourceEvent &&
    event.sourceEvent.path &&
    event.sourceEvent.path[1] &&
    event.sourceEvent.path[1].classList.contains("xybrush") &&
    event.target.move
  ) {
    const columnValues: BaseColumnType[] = Object.values(projectedColumns)
    const foundColumns: BaseColumnType[] = columnValues.filter(
      (c: BaseColumnType) => d[1] >= c.x && d[0] <= c.x + c.width
    )

    const firstColumn: { x: number; width: number } = foundColumns[0] || {
      x: 0,
      width: 0
    }

    const lastColumn: { x: number; width: number } = foundColumns[
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

class InteractionLayer extends React.PureComponent<InteractionLayerProps, InteractionLayerState> {
  constructor(props: InteractionLayerProps) {
    super(props)

    const initialOverlayRegions = calculateOverlay(props)

    const canvasMap: Map<string, number> = new Map()

    this.state = {
      overlayRegions: initialOverlayRegions,
      canvasMap,
      interactionCanvas: null,
      props,
      SpanOrDiv: HOCSpanOrDiv(props.useSpans)
    }
  }

  static defaultProps = {
    svgSize: [500, 500]
  }

  createBrush = (interaction: Interactivity) => {
    let semioticBrush, mappingFn, selectedExtent, endMappingFn

    const { xScale, yScale, size, renderPipeline } = this.props

    const brushData = {}

    Object.entries(renderPipeline).forEach(([key, value]) => {
      if (value.data && value.data.length > 0) {
        brushData[key] = value.data
      }
    })

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
      const castExtent = extent as number[]
      mappingFn = (d): null | Array<number> =>
        !d ? null : [xScale.invert(d[0]), xScale.invert(d[1])]
      semioticBrush = brushX()
      selectedExtent = castExtent.map(d => xScale(d)) as number[]
      endMappingFn = mappingFn
    } else if (actualBrush === "yBrush") {
      const castExtent = extent as number[]

      mappingFn = (d): null | Array<number> =>
        !d
          ? null
          : [yScale.invert(d[0]), yScale.invert(d[1])].sort((a, b) => a - b)
      semioticBrush = brushY()
      selectedExtent = castExtent.map(d => yScale(d)).sort((a, b) => a - b)
      endMappingFn = mappingFn
    } else {
      const castExtent = extent as number[][]
      if (
        castExtent.indexOf(undefined) !== -1 ||
        castExtent[0].indexOf(undefined) !== -1 ||
        castExtent[1].indexOf(undefined) !== -1
      ) {
        return <g />
      }

      semioticBrush = brush()
      mappingFn = (d): null | Array<Array<number>> => {
        if (!d) return null
        const yValues = [yScale.invert(d[0][1]), yScale.invert(d[1][1])].sort(
          (a, b) => a - b
        )

        return [
          [xScale.invert(d[0][0]), yValues[0]],
          [xScale.invert(d[1][0]), yValues[1]]
        ]
      }

      const yValues = [yScale(extent[0][1]), yScale(extent[1][1])].sort(
        (a, b) => a - b
      )

      selectedExtent = castExtent.map((d, i) => [xScale(d[0]), yValues[i]])

      endMappingFn = mappingFn
    }

    if (interaction.brush === "oBrush") {
      selectedExtent = null
      if (interaction.extent) {
        const [leftExtent, rightExtent] = interaction.extent
        if (
          (typeof leftExtent === "string" || typeof leftExtent === "number") &&
          (typeof rightExtent === "string" || typeof rightExtent === "number")
        ) {
          selectedExtent = [
            projectedColumns[leftExtent].x,
            projectedColumns[rightExtent].x +
            projectedColumns[rightExtent].width
          ]
        }
      }

      mappingFn = generateOMappingFn(projectedColumns)
      endMappingFn = generateOEndMappingFn(projectedColumns)
    }

    semioticBrush
      .extent([[0, 0], [size[0], size[1]]])
      .on("start", () => {
        brushStart(mappingFn(event.selection), undefined, brushData, undefined, interaction)
      })
      .on("brush", () => {
        brushing(mappingFn(event.selection), undefined, brushData, undefined, interaction)
      })
      .on("end", () => {
        brushEnd(endMappingFn(event.selection), undefined, brushData, undefined, interaction)
      })

    return (
      <g className="brush">
        <Brush
          selectedExtent={selectedExtent}
          extent={extent}
          svgBrush={semioticBrush}
        />
      </g>
    )
  }

  static getDerivedStateFromProps(nextProps: InteractionLayerProps, prevState: InteractionLayerState) {
    const { props } = prevState

    if (
      props.overlay !== nextProps.overlay ||
      nextProps.points !== props.points ||
      props.xScale !== nextProps.xScale ||
      props.yScale !== nextProps.yScale ||
      ((!props.hoverAnnotation && nextProps.hoverAnnotation) || (props.hoverAnnotation && !nextProps.hoverAnnotation))
    ) {

      const { disableCanvasInteraction, canvasRendering, svgSize, margin, voronoiHover } = nextProps
      const { overlayRegions } = prevState
      const nextOverlay = calculateOverlay(nextProps)

      return {
        overlayRegions: nextOverlay,
        props: nextProps,
        interactionCanvas: !disableCanvasInteraction &&
          canvasRendering &&
          overlayRegions &&
          <InteractionCanvas
            height={svgSize[1]}
            width={svgSize[0]}
            overlayRegions={nextOverlay}
            margin={margin}
            voronoiHover={voronoiHover}
          />
      }
    }
    return null

  }

  createColumnsBrush = (interaction: Interactivity) => {
    const { projection, rScale, oColumns, renderPipeline } = this.props

    if (!projection || !rScale || !oColumns) return

    const brushData = {}
    Object.entries(renderPipeline).forEach(([key, value]) => {
      if (value.data && value.data.length > 0) {
        brushData[key] = value.data
      }
    })

    let semioticBrush, mappingFn

    const rScaleReverse = rScale
      .copy()
      .domain(rScale.domain())
      .range(rScale.domain().reverse())

    if (projection && projection === "horizontal") {
      mappingFn = (d): null | Array<number> =>
        !d ? null : [rScale.invert(d[0]), rScale.invert(d[1])]
    } else
      mappingFn = (d): null | Array<number> => {
        return !d
          ? null
          : [
            rScaleReverse(rScale.invert(d[1])),
            rScaleReverse(rScale.invert(d[0]))
          ]
      }

    const rRange = rScale.range()

    const columnHash = oColumns
    let brushPosition, selectedExtent
    const brushes: Array<React.ReactNode> = Object.keys(columnHash).map(c => {
      if (projection && projection === "horizontal") {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rScale(d))
          : interaction.startEmpty ? null : rRange

        brushPosition = [0, columnHash[c].x]
        semioticBrush = brushX()
        semioticBrush
          .extent([[rRange[0], 0], [rRange[1], columnHash[c].width]])
          .on("start", () => {
            brushStart(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
          .on("brush", () => {
            brushing(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
          .on("end", () => {
            brushEnd(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
      } else {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rRange[1] - rScale(d)).reverse()
          : interaction.startEmpty ? null : rRange
        brushPosition = [columnHash[c].x, 0]
        semioticBrush = brushY()
        semioticBrush
          .extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]])
          .on("start", () => {
            brushStart(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
          .on("brush", () => {
            brushing(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
          .on("end", () => {
            brushEnd(mappingFn(event.selection), c, brushData, columnHash[c], interaction)
          })
      }

      return (
        <g key={`column-brush-${c}`} className="brush">
          <Brush
            key={`orbrush${c}`}
            selectedExtent={selectedExtent}
            svgBrush={semioticBrush}
            position={brushPosition}
          />
        </g>
      )
    })
    return brushes
  }

  render() {
    let semioticBrush = null
    const {
      interaction,
      svgSize,
      margin,
      useSpans = false
    } = this.props

    const { overlayRegions, interactionCanvas, SpanOrDiv } = this.state
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
        {interactionCanvas || (
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
        )}
      </SpanOrDiv>
    )
  }
}

export default InteractionLayer
