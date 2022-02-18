import * as React from "react"
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force"
import { /*area, curveCatmullRom,*/ arc } from "d3-shape"
import pathBounds from "svg-path-bounding-box"
import { Mark } from "semiotic-mark"
import { scaleLinear } from "d3-scale"
import { arcTweener } from "./SvgHelper"

// RENAME XY to drawingProps

type PieceXYProp = {
  x?: number
  y?: number
  middle?: number
  height?: number
  width?: number
  dx?: number
  dy?: number
}

const twoPI = Math.PI * 2

const radialBarFeatureGenerator = ({
  type,
  ordset,
  adjustedSize,
  piece,
  i
}) => {
  let { innerRadius } = type
  const { offsetAngle = 0, angleRange = [0, 360] } = type
  const offsetPct = offsetAngle / 360
  const rangePct = angleRange.map((d) => d / 360)
  const rangeMod = rangePct[1] - rangePct[0]

  const adjustedPct =
    rangeMod < 1 ? scaleLinear().domain([0, 1]).range(rangePct) : (d) => d

  let innerSize =
    type.type === "clusterbar"
      ? 0
      : type.type === "timeline"
      ? piece.scaledValue / 2
      : piece.bottom / 2
  let outerSize =
    type.type === "clusterbar"
      ? piece.scaledValue / 2
      : type.type === "timeline"
      ? piece.scaledEndValue / 2
      : piece.scaledValue / 2 + piece.bottom / 2

  if (innerRadius) {
    innerRadius = parseInt(innerRadius, 10)
    const canvasRadius = adjustedSize[0] / 2
    const donutMod = (canvasRadius - innerRadius) / canvasRadius
    innerSize = innerSize * donutMod + innerRadius
    outerSize = outerSize * donutMod + innerRadius
  }

  const arcGenerator = arc().innerRadius(innerSize).outerRadius(outerSize)

  const angle =
    (type.type === "clusterbar"
      ? (ordset.pct - ordset.pct_padding) / ordset.pieceData.length
      : ordset.pct) * rangeMod

  const startAngle = adjustedPct(
    type.type === "clusterbar"
      ? ordset.pct_start +
          (i / ordset.pieceData.length) * (ordset.pct - ordset.pct_padding)
      : ordset.pct === 1
      ? 0
      : ordset.pct_start + offsetPct
  )

  const endAngle =
    ordset.pct === 1
      ? rangePct[1]
      : Math.max(startAngle, startAngle + angle - ordset.pct_padding / 2)

  const startAngleFinal = startAngle * twoPI
  const endAngleFinal = endAngle * twoPI

  const markD = arcGenerator({
    startAngle: startAngleFinal,
    endAngle: endAngleFinal
  })

  const centroid = arcGenerator.centroid({
    startAngle: startAngleFinal,
    endAngle: endAngleFinal
  })

  const xOffset = adjustedSize[0] / 2
  const yOffset = adjustedSize[1] / 2
  const xPosition = centroid[0] + xOffset
  const yPosition = centroid[1] + yOffset

  const outerPoint = pointOnArcAtAngle(
    [0, 0],
    (startAngle + endAngle) / 2,
    piece.scaledValue / 2
  )

  const xy = {
    arcGenerator: arcGenerator,
    startAngle: startAngleFinal,
    endAngle: endAngleFinal,
    dx: outerPoint[0],
    dy: outerPoint[1]
  }
  const translate = `translate(${xOffset},${yOffset})`

  return {
    xPosition,
    yPosition,
    xy,
    translate,
    markProps: {
      markType: "path",
      d: markD,
      tx: xOffset,
      ty: yOffset,
      transform: translate,
      customTween: {
        fn: arcTweener,
        props: {
          startAngle: startAngleFinal,
          endAngle: endAngleFinal,
          innerRadius: innerSize,
          outerRadius: outerSize
        }
      }
    }
  }
}

const iconBarCustomMark =
  ({
    type,
    projection,
    finalHeight,
    finalWidth,
    styleFn,
    renderValue,
    classFn
  }) =>
  (piece, i, xy) => {
    const iconD =
      typeof type.icon === "string" ? type.icon : type.icon(piece.data, i)
    const { iconPadding = 1, resize = "auto" } = type

    const iconBounds = pathBounds(iconD)
    const iconTranslate = [
      0 - iconBounds.x1 + iconPadding,
      0 - iconBounds.y1 + iconPadding
    ]
    iconBounds.height += iconPadding * 2
    iconBounds.width += iconPadding * 2

    const icons = []

    let stackedIconSize = iconBounds.height
    let stackedIconNumber = 1
    let iconScale = 1
    const spaceToUse = projection === "horizontal" ? finalHeight : finalWidth
    const sizeToFit =
      projection === "horizontal" ? iconBounds.height : iconBounds.width
    const sizeToPad =
      projection === "horizontal" ? iconBounds.width : iconBounds.height
    const spaceToFill = projection === "horizontal" ? xy.width : xy.height
    const spaceToStackFill = projection === "horizontal" ? xy.height : xy.width
    if (resize === "auto") {
      stackedIconSize = spaceToUse / sizeToFit
      if (stackedIconSize < 1) {
        iconScale = stackedIconSize
      } else {
        stackedIconNumber = Math.floor(stackedIconSize)
        iconScale =
          1 + (stackedIconSize - stackedIconNumber) / stackedIconNumber
      }
    } else if (resize === "fixed") {
      iconScale = spaceToUse / sizeToFit
    }

    //  const finalIconWidth = iconBounds.width * iconScale;
    const finalIconHeight = iconBounds.height * iconScale

    const spaceToStep = sizeToPad * iconScale
    const spaceToStackStep = sizeToFit * iconScale

    iconTranslate[0] = iconTranslate[0] * iconScale
    iconTranslate[1] = iconTranslate[1] * iconScale

    const randoClipID = `iso-clip-${i}-${Math.random()}`
    const clipPath = `url(#${randoClipID})`
    if (xy.width > 0) {
      icons.push(
        <clipPath key={randoClipID} id={randoClipID}>
          <rect x={0} y={0} width={xy.width} height={xy.height} />
        </clipPath>
      )
      const iconPieces = []
      const stepStart =
        projection === "horizontal" ? 0 : xy.height - finalIconHeight
      const stepper = projection === "horizontal" ? spaceToStep : -spaceToStep
      const stepTest =
        projection === "horizontal"
          ? (step, spaceToFillValue) => step < spaceToFillValue
          : (step, spaceToFillValue, stepperValue) => step > 0 + stepperValue

      for (
        let step = stepStart;
        stepTest(step, spaceToFill, stepper);
        step += stepper
      ) {
        for (
          let stack = 0;
          stack < spaceToStackFill;
          stack += spaceToStackStep
        ) {
          const stepX = projection === "horizontal" ? step : stack
          const stepY = projection === "horizontal" ? stack : step
          const paddedX = stepX + iconTranslate[0]
          const paddedY = stepY + iconTranslate[1]
          iconPieces.push(
            <Mark
              forceUpdate={true}
              markType="path"
              key={`icon-${step}-${stack}`}
              transform={`translate(${paddedX},${paddedY}) scale(${iconScale})`}
              vectorEffect={"non-scaling-stroke"}
              d={iconD}
              style={styleFn({ ...piece, ...piece.data }, i)}
              renderMode={renderValue}
              className={classFn({ ...piece, ...piece.data }, i)}
            />
          )
        }
      }
      icons.push(
        <g key={`clipped-region-${i}`} clipPath={clipPath}>
          {iconPieces}
        </g>
      )
    }
    return icons
  }

export function pointOnArcAtAngle(center, angle, distance) {
  const radians = Math.PI * (angle + 0.75) * 2

  const xPosition = center[0] + distance * Math.cos(radians)
  const yPosition = center[1] + distance * Math.sin(radians)

  return [xPosition, yPosition]
}

export function clusterBarLayout({
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
  baseMarkProps,
  rScale
}) {
  let allCalculatedPieces = []
  const keys = Object.keys(data)
  keys.forEach((key, ordsetI) => {
    const ordset = data[key]

    const barColumnWidth = Math.max(ordset.width, 1)
    const clusterWidth = barColumnWidth / ordset.pieceData.length

    let currentX = 0
    let currentY = 0

    const calculatedPieces = ordset.pieceData.map((piece, i) => {
      const renderValue = renderMode && renderMode(piece.data, i)

      let xPosition = piece.x
      let yPosition = piece.base
      let finalWidth = clusterWidth
      let finalHeight = piece.scaledValue
      let xy: PieceXYProp = { x: 0, y: 0 }
      if (!piece.negative) {
        yPosition -= piece.scaledValue
      }

      if (projection === "horizontal") {
        //TODO: NEGATIVE FOR HORIZONTAL
        yPosition = piece.x
        xPosition = piece.base
        finalHeight = clusterWidth
        finalWidth = piece.scaledValue
        xy.x = piece.scaledValue
        if (piece.negative) {
          xPosition -= piece.scaledValue
          xy.x = xPosition
        }
      }

      let translate,
        markProps = {}

      if (projection === "radial") {
        ;({ xPosition, yPosition, markProps, xy } = radialBarFeatureGenerator({
          type,
          ordset,
          adjustedSize,
          piece,
          i
        }))
        xy.x = xPosition
      } else {
        xPosition += currentX
        yPosition += currentY
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: Math.max(0, finalWidth),
          height: Math.max(0, finalHeight),
          rx: 0,
          ry: 0
        }
        if (projection === "vertical") {
          xy.x = xPosition
        }
      }

      const eventListeners = eventListenersGenerator(piece, i)

      xy.y = yPosition
      xy.middle = clusterWidth / 2
      xy.height = finalHeight
      xy.width = finalWidth

      if (type.icon && projection !== "radial") {
        type.customMark = iconBarCustomMark({
          type,
          projection,
          finalHeight,
          finalWidth,
          styleFn,
          renderValue,
          classFn
        })
      } else if (type.icon && projection === "radial") {
        console.error("Icons are currently unsupported on radial charts")
      }
      const renderElementObject = type.customMark ? (
        <g
          key={`piece-${piece.renderKey}`}
          transform={
            translate ? translate : `translate(${xPosition},${yPosition})`
          }
        >
          {type.customMark(
            { ...piece.data, ...piece, x: xPosition, y: yPosition },
            i,
            {
              ...xy,
              baseMarkProps,
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
          renderMode: renderValue,
          key: `piece-${piece.renderKey}`,
          transform: translate,
          style: styleFn({ ...piece, ...piece.data }, ordsetI),
          ...markProps,
          ...eventListeners
        }
      )

      const calculatedPiece = {
        o: key,
        xy,
        piece,
        renderElement: renderElementObject
      }
      if (projection === "horizontal") {
        currentY += finalHeight
      } else {
        currentX += finalWidth
      }

      //        currentOffset += pieceSize
      return calculatedPiece
    })
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces]
  })
  return allCalculatedPieces
}

export function barLayout({
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
  baseMarkProps,
  rScale
}) {
  const keys = Object.keys(data)
  let allCalculatedPieces = []
  keys.forEach((key, ordsetI) => {
    const ordset = data[key]
    const barColumnWidth = Math.max(ordset.width, 1)

    ordset.pieceData.forEach((piece, i) => {
      const pieceSize = piece.scaledValue
      const renderValue = renderMode && renderMode(piece.data, i)

      let xPosition = piece.x
      let yPosition = piece.bottom
      let finalWidth = barColumnWidth
      let finalHeight = pieceSize

      let xy = {}

      if (!piece.negative) {
        yPosition -= piece.scaledValue
      }

      if (projection === "vertical") {
        xy = {
          x: xPosition,
          y: yPosition,
          middle: barColumnWidth / 2,
          height: finalHeight,
          width: finalWidth
        }
      } else if (projection === "horizontal") {
        yPosition = piece.x
        xPosition = piece.bottom
        finalHeight = barColumnWidth
        finalWidth = pieceSize

        xy = {
          x: xPosition + piece.scaledValue,
          y: yPosition,
          middle: barColumnWidth / 2,
          height: finalHeight,
          width: finalWidth
        }
        if (piece.negative) {
          xPosition = piece.bottom - piece.scaledValue
        }
      }

      let markProps

      if (projection === "radial") {
        ;({ markProps, xPosition, yPosition } = radialBarFeatureGenerator({
          type,
          ordset,
          adjustedSize,
          piece,
          i
        }))
        finalHeight = undefined
        finalWidth = undefined

        xy = {
          x: xPosition,
          y: yPosition,
          middle: barColumnWidth / 2,
          height: finalHeight,
          width: finalWidth
        }
      } else {
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: Math.max(0, finalWidth),
          height: Math.max(0, finalHeight),
          rx: 0,
          ry: 0
        }
      }

      const eventListeners = eventListenersGenerator(piece, i)

      if (type.icon && projection !== "radial") {
        type.customMark = iconBarCustomMark({
          type,
          projection,
          finalHeight,
          finalWidth,
          styleFn,
          renderValue,
          classFn
        })
      } else if (type.icon && projection !== "horizontal") {
        console.error("Icons are currently unsupported in radial charts")
      }

      const renderElementObject = type.customMark ? (
        <g
          key={`piece-${piece.renderKey}`}
          transform={`translate(${xPosition},${yPosition})`}
          role="img"
          tabIndex={-1}
        >
          {type.customMark(
            { ...piece.data, ...piece, x: xPosition, y: yPosition },
            i,
            {
              ...xy,
              baseMarkProps,
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
          renderMode: renderValue,
          key: `piece-${piece.renderKey}`,
          style: styleFn({ ...piece, ...piece.data }, ordsetI),
          ...eventListeners,
          ...markProps
        }
      )

      allCalculatedPieces.push({
        o: key,
        xy,
        piece,
        renderElement: renderElementObject
      })
    })
  })

  return allCalculatedPieces
}

export function timelineLayout({
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
  baseMarkProps,
  rScale
}) {
  let allCalculatedPieces = []
  const keys = Object.keys(data)
  keys.forEach((key, ordsetI) => {
    const ordset = data[key]
    const calculatedPieces = []

    ordset.pieceData.forEach((piece, i) => {
      let scaledValue, scaledBottom

      const renderValue = renderMode && renderMode(piece.data, i)
      let xPosition = ordset.x
      let height = piece.scaledEndValue - piece.scaledValue
      let yPosition = piece.scaledVerticalValue - height
      let width = ordset.width
      let markProps: {
        markType: string
        height?: number
        width?: number
        x?: number
        y?: number
        d?: string
        transform?: string
        customTween?: {
          fn: (oldProps: object, newProps: object) => (t: number) => string
          props: {
            startAngle: number
            endAngle: number
            innerRadius: number
            outerRadius: number
          }
        }
      } = {
        markType: "rect",
        height: height < 0 ? -height : height,
        width,
        x: xPosition,
        y: height < 0 ? yPosition + height : yPosition
      }

      if (projection === "horizontal") {
        yPosition = ordset.x
        xPosition = piece.scaledValue
        scaledValue = piece.scaledEndValue - piece.scaledValue
        scaledBottom = piece.scaledBottom
        width = piece.scaledEndValue - piece.scaledValue
        height = ordset.width
        markProps = {
          markType: "rect",
          height,
          width: width < 0 ? -width : width,
          x: width < 0 ? xPosition + width : xPosition,
          y: yPosition
        }
      } else if (projection === "radial") {
        ;({ markProps } = radialBarFeatureGenerator({
          piece,
          type,
          ordset,
          adjustedSize,
          i
        }))
      }

      //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type

      const eventListeners = eventListenersGenerator(piece, i)
      const xy = {
        x: xPosition,
        y: yPosition,
        scaledValue,
        scaledBottom,
        height
      }

      const renderElementObject = type.customMark ? (
        <g
          key={`piece-${piece.renderKey}`}
          transform={`translate(${xPosition},${yPosition + height})`}
        >
          {type.customMark(
            { ...piece.data, ...piece, x: xPosition, y: yPosition },
            i,
            {
              ...xy,
              baseMarkProps,
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
          renderMode: renderValue,
          key: `piece-${piece.renderKey}`,
          style: styleFn({ ...piece, ...piece.data }, ordsetI),
          ...markProps,
          ...eventListeners
        }
      )

      const calculatedPiece = {
        o: key,
        xy,
        piece,
        renderElement: renderElementObject
      }

      calculatedPieces.push(calculatedPiece)
    })
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces]
  })

  return allCalculatedPieces
}

export function pointLayout({
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
  baseMarkProps,
  rScale
}) {
  const circleRadius = type.r || 3
  let allCalculatedPieces = []
  const keys = Object.keys(data)

  keys.forEach((key, ordsetI) => {
    const ordset = data[key]

    const calculatedPieces = []

    ordset.pieceData.forEach((piece, i) => {
      const renderValue = renderMode && renderMode(piece.data, i)

      let xPosition = ordset.middle
      let yPosition = piece.scaledVerticalValue

      if (projection === "horizontal") {
        yPosition = ordset.middle
        xPosition = piece.scaledValue
      } else if (projection === "radial") {
        const angle = ordset.pct_middle

        const rPosition = piece.scaledValue / 2
        const baseCentroid = pointOnArcAtAngle(
          [adjustedSize[0] / 2, adjustedSize[1] / 2],
          angle,
          rPosition
        )
        xPosition = baseCentroid[0]
        yPosition = baseCentroid[1]
      }

      //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
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
            {
              ...piece.data,
              ...piece,
              x: xPosition,
              y: yPosition,
              width: ordset.width
            },
            i,
            {
              r: circleRadius,
              x: xPosition,
              y: yPosition,
              baseMarkProps,
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
          renderMode: renderValue,
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
        renderElement: renderElementObject
      }

      calculatedPieces.push(calculatedPiece)
    })
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces]
  })

  return allCalculatedPieces
}

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
  baseMarkProps,
  rScale
}) {
  let allCalculatedPieces = []
  const iterations = type.iterations || 120

  const columnKeys = Object.keys(data)

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
              baseMarkProps,
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
          renderMode: renderValue,
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
        renderElement: renderElementObject
      }

      return calculatedPiece
    })
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces]
  })

  return allCalculatedPieces
}
