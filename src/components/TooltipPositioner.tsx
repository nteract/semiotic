import * as React from "react"
import { useState, useEffect, useCallback } from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

type State = {
  collision: object
  tooltipContainerInitialDimensions: object
  tooltipContentArgsCurrent: object
}

const // simple heuristics to check if the tooltip container exceeds the viewport
  // if so, capture the suggested offset
  checkPosition = ({
    tooltipRef,
    tooltipContentArgs,
    changeTooltipContentArgsCurrent,
    changeTooltipContainerInitialDimensions,
    changeCollision
  }) => {
    const tooltipContainerInitialDimensions = tooltipRef.getBoundingClientRect()

    const { right, left, top, bottom, width, height } =
      tooltipContainerInitialDimensions

    // flags to indicate whether the data point + tooltip dimension collides with the viewport
    // on each of the 4 directions/sides
    let collision = {
      left: false,
      right: false,
      top: false,
      bottom: false
    }

    if (left + width > window.innerWidth) {
      collision.right = true
    }
    if (left - width < 0) {
      collision.left = true
    }
    if (top + height > window.innerHeight) {
      collision.bottom = true
    }
    if (top - height < 0) {
      collision.top = true
    }

    changeTooltipContentArgsCurrent()
    changeTooltipContainerInitialDimensions(tooltipContainerInitialDimensions)
    changeCollision(collision)
  }

export default function TooltipPositioner(props: Props) {
  const { tooltipContent, tooltipContentArgs } = props

  const [collision, changeCollision] = useState(null)
  const [
    tooltipContainerInitialDimensions,
    changeTooltipContainerInitialDimensions
  ] = useState(null)
  const [tooltipContentArgsCurrent, changeTooltipContentArgsCurrent] =
    useState(null)
  const [tooltipNode, setTooltipNode] = useState(null)

  const tooltipNodeRef = useCallback((node) => {
    setTooltipNode(node)

    checkPosition({
      tooltipRef: node,
      tooltipContentArgs,
      changeTooltipContentArgsCurrent,
      changeTooltipContainerInitialDimensions,
      changeCollision
    })
  }, [])

  useEffect(() => {
    // if new args, reset collision state
    changeCollision(null)
    changeTooltipContainerInitialDimensions(null)
  }, [JSON.stringify(tooltipContentArgs)])

  useEffect(() => {
    if (tooltipNode && !collision) {
      checkPosition({
        tooltipRef: tooltipNode,
        tooltipContentArgs,
        changeTooltipContentArgsCurrent,
        changeTooltipContainerInitialDimensions,
        changeCollision
      })
    }
  }, [tooltipNode, collision])

  const containerStyle = {
    //to handle issue when the tooltip content has margins set by client,
    // which results in the tooltip container having smaller height,
    // which in turn causes the css transform to be inaccurate
    // (ref: https://www.w3.org/TR/css-box-3/#collapsing-margins)
    overflow: "hidden",

    opacity:
      collision && tooltipContentArgsCurrent === tooltipContentArgs ? 1 : 0
  }

  const tooltipContainerClasses = collision
    ? [
        "tooltip-container",
        "tooltip-collision-evaluated",
        collision && collision.top && "collision-top",
        collision && collision.bottom && "collision-bottom",
        collision && collision.right && "collision-right",
        collision && collision.left && "collision-left"
      ]
        .filter((el) => el)
        .join(" ")
    : "tooltip-container"

  const tooltipContainerAttributes = {
    offset: { x: 0, y: 0 },
    tooltipContainerInitialDimensions
  }

  return (
    <div
      ref={tooltipNodeRef}
      style={containerStyle}
      className={tooltipContainerClasses}
    >
      {tooltipContent({
        ...tooltipContentArgs,
        tooltipContainerAttributes
      })}
    </div>
  )
}
