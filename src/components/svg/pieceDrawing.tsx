import * as React from "react"

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
  renderKeyFn,
  ariaLabel,
  axis
}) => {
  const valueFormat = axis && axis[0] && axis[0].tickFormat
  if (!shouldRender) return null
  const renderedPieces = []
  data.forEach((d, i) => {
    if (canvasRender && canvasRender(d) === true) {
      const canvasPiece = {
        baseClass: "orframe-piece",
        tx: d.tx || 0,
        ty: d.ty || 0,
        d: d.piece,
        i,
        markProps: d.renderElement || d,
        styleFn: styleFn,
        renderFn: () => d.renderValue,
        classFn
      }
      canvasDrawing.push(canvasPiece)
    } else {
      if (React.isValidElement(d.renderElement || d)) {
        renderedPieces.push(d.renderElement || d)
      } else {
        /*ariaLabel.items*/
        const pieceAriaLabel = `${d.o} ${ariaLabel.items} value ${
          (valueFormat && valueFormat(d.piece.value)) || d.piece.value
        }`
        const key = renderKeyFn
          ? renderKeyFn(d.piece)
          : d.renderKey || `piece-render-${i}`

        const elementData = d.renderElement || d
        const { markType, style = {}, ...restProps } = elementData

        // Merge style into direct props
        const elementProps = { ...restProps, key, "aria-label": pieceAriaLabel }
        if (style.fill !== undefined) elementProps.fill = style.fill
        if (style.stroke !== undefined) elementProps.stroke = style.stroke
        if (style.strokeWidth !== undefined) elementProps.strokeWidth = style.strokeWidth
        if (style.opacity !== undefined) elementProps.opacity = style.opacity
        if (style.fillOpacity !== undefined) elementProps.fillOpacity = style.fillOpacity
        if (style.strokeOpacity !== undefined) elementProps.strokeOpacity = style.strokeOpacity

        const remainingStyles = { ...style }
        delete remainingStyles.fill
        delete remainingStyles.stroke
        delete remainingStyles.strokeWidth
        delete remainingStyles.opacity
        delete remainingStyles.fillOpacity
        delete remainingStyles.strokeOpacity
        if (Object.keys(remainingStyles).length > 0) {
          elementProps.style = remainingStyles
        }

        if (markType) {
          renderedPieces.push(React.createElement(markType, elementProps))
        }
      }
    }
  })

  return renderedPieces
}
