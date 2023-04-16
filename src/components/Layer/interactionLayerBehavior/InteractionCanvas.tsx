import * as React from "react"
import { useRef, useLayoutEffect } from "react"

import { canvasEvent } from "../../svg/frameFunctions"

import { MarginType } from "../../types/generalTypes"

type InteractionCanvasProps = {
  height: number
  width: number
  overlayRegions: Array<{
    props: { d?: string; children: Array<{ props: { d?: string } }> }
  }>
  margin: MarginType
  voronoiHover: Function
}

export default React.memo(function InteractionCanvas({
  width,
  height,
  overlayRegions,
  margin,
  voronoiHover
}: InteractionCanvasProps) {
  let canvasRef = useRef<HTMLCanvasElement>()

  useLayoutEffect(() => {
    renderInteractionCanvas(
      canvasRef.current,
      voronoiHover,
      height,
      width,
      overlayRegions,
      margin
    )
  }, [width, height, overlayRegions])

  return (
    <canvas
      className="frame-canvas-interaction"
      ref={(canvas: HTMLCanvasElement) => {
        if (canvas != null && canvasRef.current !== canvas) {
          canvasRef.current = canvas
          renderInteractionCanvas(
            canvas,
            voronoiHover,
            height,
            width,
            overlayRegions,
            margin
          )
        }
      }}
      style={{
        position: "absolute",
        left: `0px`,
        top: `0px`,
        imageRendering: "pixelated",
        pointerEvents: "all",
        opacity: 0
      }}
      width={width}
      height={height}
    />
  )
})

function renderInteractionCanvas(
  interactionContext: HTMLCanvasElement,
  voronoiHover: Function,
  height: number,
  width: number,
  overlayRegions: Array<{
    props: { d?: string; children: Array<{ props: { d?: string } }> }
  }>,
  margin: MarginType
) {
  const canvasMap: Map<string, number> = new Map()
  if (interactionContext === null || !overlayRegions) return

  const boundCanvasEvent = canvasEvent.bind(
    null,
    interactionContext,
    overlayRegions,
    canvasMap
  )
  interactionContext.onmousemove = (e) => {
    const overlay = boundCanvasEvent(e)

    if (overlay?.props?.onMouseEnter) {
      overlay?.props?.onMouseEnter()
    } else if (overlay?.props?.children?.[0]) {
      overlay.props.children[0].props.onMouseEnter()
    } else {
      voronoiHover(null)
    }
  }
  interactionContext.onmouseout = () => {
    voronoiHover(null)
  }

  interactionContext.onclick = (e) => {
    const overlay = boundCanvasEvent(e)
    if (overlay?.props?.onClick) {
      overlay?.props?.onClick()
    } else if (overlay?.props?.children?.[0]) {
      overlay.props.children[0].props.onClick(e)
    }
  }
  interactionContext.ondblclick = (e) => {
    const overlay = boundCanvasEvent(e)
    if (overlay?.props?.onDoubleClick) {
      overlay?.props?.onDoubleClick()
    } else if (overlay?.props?.children?.[0]) {
      overlay.props.children[0].props.onDoubleClick(e)
    }
  }

  const interactionContext2D = interactionContext.getContext("2d")

  interactionContext2D.imageSmoothingEnabled = false
  interactionContext2D.setTransform(1, 0, 0, 1, margin.left, margin.top)
  interactionContext2D.clearRect(-margin.left, -margin.top, width, height)

  interactionContext2D.lineWidth = 1

  overlayRegions.forEach((overlay, oi) => {
    const interactionRGBA = `rgba(${Math.floor(
      Math.random() * 255
    )},${Math.floor(Math.random() * 255)},${Math.floor(
      Math.random() * 255
    )},255)`
    canvasMap.set(interactionRGBA, oi)

    const props: any = overlay.props

    interactionContext2D.fillStyle = interactionRGBA
    interactionContext2D.strokeStyle = interactionRGBA

    if (props.d || props.children?.[0]?.props?.d) {
      const overlayD = props.d || props.children[0].props.d
      const transform =
        props.transform ||
        props.children?.[0]?.props?.transform ||
        "translate(0,0)"
      const [x, y] = transform
        .replace("translate(", "")
        .replace(")", "")
        .split(",")

      interactionContext2D.translate(x, y)
      const p = new Path2D(overlayD)
      interactionContext2D.stroke(p)
      interactionContext2D.fill(p)
      interactionContext2D.translate(-x, -y)
    } else if (props.markType === "rect") {
      interactionContext2D.fillRect(props.x, props.y, props.width, props.height)
      interactionContext2D.strokeRect(
        props.x,
        props.y,
        props.width,
        props.height
      )
    }
  })
}
