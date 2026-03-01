import * as React from "react"
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force"
import { pointOnArcAtAngle } from "./pieceDrawing"

export function swarmLayout({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  projection,
  classFn,
  adjustedSize,
  chartSize,
  margin,

  rScale
}) {
  let allCalculatedPieces = []

  const columnKeys = Object.keys(data)

  // Calculate total data points for adaptive iterations
  const totalDataPoints = columnKeys.reduce((sum, key) => {
    return sum + (data[key].pieceData?.length || 0)
  }, 0)

  // Adaptive iteration count: reduce iterations for large datasets to maintain performance
  const adaptiveIterations = Math.max(
    30,
    Math.min(120, Math.floor(120 - (totalDataPoints - 100) / 20))
  )

  const iterations = type.iterations !== undefined ? type.iterations : adaptiveIterations

  columnKeys.forEach((key, ordsetI) => {
    const oColumn = data[key]
    const anglePiece = 1 / columnKeys.length
    const oData = oColumn.pieceData
    const adjustedColumnWidth = oColumn.width

    const circleRadius =
      type.r ||
      Math.max(2, Math.min(5, (4 * adjustedColumnWidth) / oData.length))

    const simulation = forceSimulation(oData)
      .force("y", forceY((d) => d.scaledValue).strength(type.strength || 2))
      .force("x", forceX(oColumn.middle))
      .force("collide", forceCollide(circleRadius))
      .stop()

    if (projection === "vertical") {
      simulation.force(
        "y",
        forceY((d) => d.scaledVerticalValue).strength(type.strength || 2)
      )
    }

    for (let i = 0; i < iterations; ++i) simulation.tick()

    const calculatedPieces = oData.map((piece, i) => {
      const renderValue = renderMode && renderMode(piece.data, i)

      let xPosition = piece.x
      let yPosition = piece.y

      if (projection === "horizontal") {
        yPosition = piece.x
        xPosition = piece.y
      } else if (projection === "radial") {
        const angle = oColumn.pct_middle
        xPosition =
          ((piece.x - oColumn.middle) / adjustedColumnWidth) * anglePiece
        const rPosition = piece.scaledValue / 2
        const xAngle = angle + xPosition
        const baseCentroid = pointOnArcAtAngle(
          [adjustedSize[0] / 2, adjustedSize[1] / 2],
          xAngle,
          rPosition
        )
        xPosition = baseCentroid[0]
        yPosition = baseCentroid[1]
      }

      const actualCircleRadius =
        typeof circleRadius === "function"
          ? circleRadius(piece, i)
          : circleRadius

      const eventListeners = eventListenersGenerator(piece, i)

      const renderElementObject = type.customMark ? (
        <g
          key={`piece-${piece.renderKey}`}
          transform={`translate(${xPosition},${yPosition})`}
        >
          {type.customMark(
            { ...piece.data, ...piece, x: xPosition, y: yPosition },
            i,
            {
              x: xPosition,
              y: yPosition,
              r: circleRadius,

              renderMode,
              styleFn,
              classFn,
              adjustedSize,
              chartSize,
              margin,
              rScale
            }
          )}
        </g>
      ) : (
        {
          className: classFn({ ...piece, ...piece.data }, i),
          markType: "rect",
          key: `piece-${piece.renderKey}`,
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          style: styleFn({ ...piece, ...piece.data }, ordsetI),
          ...eventListeners
        }
      )

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece,
        renderValue,
        renderElement: renderElementObject
      }

      return calculatedPiece
    })
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces]
  })

  return allCalculatedPieces
}
