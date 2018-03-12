import React from "react"
import { Mark } from "semiotic-mark"

export function pointOnArcAtAngle(center, angle, distance) {
  const radians = Math.PI * (angle + 0.75) * 2

  const xPosition = center[0] + distance * Math.cos(radians)
  const yPosition = center[1] + distance * Math.sin(radians)

  return [xPosition, yPosition]
}

export const renderLaidOutPieces = ({
  data,
  shouldRender,
  canvasRender,
  canvasDrawing,
  styleFn,
  classFn,
  baseMarkProps,
  renderKeyFn,
  ariaLabel
}) => {
  console.log("ariaLabel.items", ariaLabel.items)
  if (!shouldRender) return null
  const renderedPieces = []
  data.forEach((d, i) => {
    if (canvasRender && canvasRender(d) === true) {
      const canvasPiece = {
        baseClass: "orframe-piece",
        tx: d.renderElement.tx || 0,
        ty: d.renderElement.ty || 0,
        d: d.piece,
        i,
        markProps: d.renderElement || d,
        styleFn: styleFn,
        classFn
      }
      canvasDrawing.push(canvasPiece)
    } else {
      if (React.isValidElement(d.renderElement || d)) {
        renderedPieces.push(d.renderElement || d)
      } else {
        /*ariaLabel.items*/
        const pieceAriaLabel = `${d.o} ${ariaLabel.items} value ${
          d.piece.value
        }`
        console.log("pieceARiaLabel", pieceAriaLabel)
        renderedPieces.push(
          <Mark
            {...baseMarkProps}
            key={
              renderKeyFn
                ? renderKeyFn(d.piece)
                : d.renderKey || `piece-render-${i}`
            }
            {...d.renderElement || d}
            aria-label={pieceAriaLabel}
          />
        )
      }
    }
  })

  return renderedPieces
}
