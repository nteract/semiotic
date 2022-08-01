import * as React from "react"
import { useState, useEffect } from "react"
import { brushX, brushY, brush } from "d3-brush"
import { select } from "d3-selection"

// components
import Brush from "./Brush"

import { HOCSpanOrDiv } from "./SpanOrDiv"

import {
  Interactivity,
  InteractionLayerProps,
  BaseColumnType
} from "./types/interactionTypes"

import {
  brushing,
  brushEnd,
  brushStart,
  calculateOverlay
} from "./processing/InteractionItems"
import InteractionCanvas from "./interactionLayerBehavior/InteractionCanvas"
import { useTooltip } from "./store/TooltipStore"

const generateOMappingFn =
  (projectedColumns) =>
  (d): null | any => {
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

const generateOEndMappingFn =
  (projectedColumns) =>
  (d, event): null | Array<any> => {
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

const createBrush = (
  interaction: Interactivity,
  props: InteractionLayerProps
) => {
  let semioticBrush, mappingFn, selectedExtent, endMappingFn

  const { xScale, yScale, size, renderPipeline } = props

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

  let { extent } = interaction

  if (!extent) {
    extent =
      actualBrush === "xyBrush"
        ? [
            [xScale.invert(0), yScale.invert(0)],
            [xScale.invert(size[0]), yScale.invert(size[1])]
          ]
        : actualBrush === "xBrush"
        ? [xScale.invert(0), xScale.invert(size[0])]
        : [yScale.invert(0), yScale.invert(size[1])]
  }

  if (extent.indexOf && extent.indexOf(undefined) !== -1) {
    return <g />
  }

  if (actualBrush === "xBrush") {
    const castExtent = [...extent] as number[]
    mappingFn = (d): null | Array<number> =>
      !d ? null : [xScale.invert(d[0]), xScale.invert(d[1])]
    semioticBrush = brushX()
    selectedExtent = castExtent.map((d) => xScale(d)) as number[]
    endMappingFn = mappingFn
  } else if (actualBrush === "yBrush") {
    const castExtent = [...extent] as number[]

    mappingFn = (d): null | Array<number> =>
      !d
        ? null
        : [yScale.invert(d[0]), yScale.invert(d[1])].sort((a, b) => a - b)
    semioticBrush = brushY()
    selectedExtent = castExtent.map((d) => yScale(d)).sort((a, b) => a - b)
    endMappingFn = mappingFn
  } else {
    const typedExtent: any = extent
    const castExtent = [...typedExtent.map((ee) => [...ee])] as number[][]
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
          projectedColumns[rightExtent].x + projectedColumns[rightExtent].width
        ]
      }
    }

    mappingFn = generateOMappingFn(projectedColumns)
    endMappingFn = generateOEndMappingFn(projectedColumns)
  }

  semioticBrush
    .extent([
      [0, 0],
      [size[0], size[1]]
    ])
    .on("start", (event) => {
      brushStart(
        mappingFn(event.selection),
        undefined,
        brushData,
        undefined,
        interaction
      )
    })
    .on("brush", (event) => {
      brushing(
        mappingFn(event.selection),
        undefined,
        brushData,
        undefined,
        interaction
      )
    })
    .on("end", (event) => {
      brushEnd(
        endMappingFn(event.selection, event),
        undefined,
        brushData,
        undefined,
        interaction
      )
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

const createColumnsBrush = (
  interaction: Interactivity,
  props: InteractionLayerProps
) => {
  const { projection, rScale, oColumns, renderPipeline } = props

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
  const brushes: Array<React.ReactNode> = Object.keys(columnHash).map((c) => {
    if (projection && projection === "horizontal") {
      selectedExtent = interaction.extent[c]
        ? interaction.extent[c].map((d) => rScale(d))
        : interaction.startEmpty
        ? null
        : rRange

      brushPosition = [0, columnHash[c].x]
      semioticBrush = brushX()
      semioticBrush
        .extent([
          [rRange[0], 0],
          [rRange[1], columnHash[c].width]
        ])
        .on("start", (event) => {
          brushStart(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
        })
        .on("brush", (event) => {
          brushing(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
        })
        .on("end", (event) => {
          brushEnd(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
        })
    } else {
      selectedExtent = interaction.extent[c]
        ? interaction.extent[c].map((d) => rRange[1] - rScale(d)).reverse()
        : interaction.startEmpty
        ? null
        : rRange
      brushPosition = [columnHash[c].x, 0]
      semioticBrush = brushY()
      semioticBrush
        .extent([
          [0, rRange[0]],
          [columnHash[c].width, rRange[1]]
        ])
        .on("start", (event) => {
          brushStart(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
        })
        .on("brush", (event) => {
          brushing(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
        })
        .on("end", (event) => {
          brushEnd(
            mappingFn(event.selection),
            c,
            brushData,
            columnHash[c],
            interaction
          )
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

export default function InteractionLayer(props: InteractionLayerProps) {
  let semioticBrush = null
  const {
    interaction,
    svgSize = [500, 500],
    margin = { left: 0, right: 0, top: 0, bottom: 0 },
    useSpans = false,
    overlay,
    points,
    xScale,
    yScale,
    hoverAnnotation,
    customClickBehavior,
    customDoubleClickBehavior,
    customHoverBehavior,
    disableCanvasInteraction,
    canvasRendering
    //    voronoiHover
  } = props
  let { enabled } = props

  let changeTooltip = useTooltip((state) => state.changeTooltip)

  const voronoiHover = (d) => {
    changeTooltip(d)
  }

  const [overlayRegions, changeOverlayRegions] = useState([])
  const [interactionCanvas, changeInteractionCanvas] = useState(null)
  const [SpanOrDiv] = useState(() => HOCSpanOrDiv(useSpans))

  useEffect(() => {
    let nextOverlay, interactionCanvas

    if (disableCanvasInteraction || !overlayRegions) {
      nextOverlay = null
      interactionCanvas = null
    } else {
      nextOverlay = calculateOverlay(props, voronoiHover)
      if (canvasRendering) {
        interactionCanvas = (
          <InteractionCanvas
            height={svgSize[1]}
            width={svgSize[0]}
            overlayRegions={nextOverlay}
            margin={margin}
            voronoiHover={voronoiHover}
          />
        )
      }
    }

    changeOverlayRegions(nextOverlay)
    changeInteractionCanvas(interactionCanvas)
  }, [
    overlay,
    points,
    xScale,
    yScale,
    !!hoverAnnotation,
    !!customClickBehavior,
    !!customDoubleClickBehavior,
    !!customHoverBehavior
  ])

  if (interaction && interaction.brush) {
    enabled = true
    semioticBrush = createBrush(interaction, props)
  }

  if (interaction && interaction.columnsBrush) {
    enabled = true
    semioticBrush = createColumnsBrush(interaction, props)
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
        pointerEvents: "none",
        height: "100%",
        width: "100%",
        overflow: "hidden"
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
