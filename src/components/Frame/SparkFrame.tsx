import * as React from "react"
import { useCallback, useState } from "react"
import { OrdinalFrameProps } from "./types/ordinalTypes"
import { XYFrameProps } from "./types/xyTypes"
import { NetworkFrameProps } from "./types/networkTypes"

type ActualFrameProps = OrdinalFrameProps | XYFrameProps | NetworkFrameProps

const allFrameDefaults = {
  margin: 0
}

function sparkNetworkSettings(originalSettings = "force") {
  let finalSettings = {}
  if (originalSettings) {
    finalSettings = originalSettings
    if (originalSettings === "force") finalSettings = { type: "force" }

    return {
      edgeStrength: 2,
      edgeDistance: 5,
      nodePadding: 1,
      nodeWidth: 5,
      groupWidth: 4,
      ...finalSettings
    }
  }
  return originalSettings
}

type SparkFrameProps = {
  sparkStyle?: object
  size?: number | number[]
}

type SparkFrameState = {
  containerHeight: number
  containerWidth: number
}

export const axisDefaults = {
  tickFormat: () => "",
  baseline: false
}

export const xyFrameDefaults = (props) => ({
  ...allFrameDefaults,
  ...props,
  hoverAnnotation: props.hoverAnnotation,
  axes: props.axes
    ? props.axes.map((a) => ({ ...axisDefaults, ...a }))
    : props.axes
})

export const ordinalFrameDefaults = (props) => ({
  ...allFrameDefaults,
  ...props,
  hoverAnnotation: props.hoverAnnotation,
  axes: props.axes
    ? props.axes.map((a) => ({ ...axisDefaults, ...a }))
    : props.axes
})

export const networkFrameDefaults = (props) => ({
  ...allFrameDefaults,
  nodeSizeAccessor: 2,
  ...props,
  networkType: sparkNetworkSettings(props.networkType)
})

export default function createSparkFrame(Frame, defaults, frameName) {
  return (props: SparkFrameProps) => {
    const { size = [], sparkStyle = {} } = props

    const [containerHeight, changeContainerHeight] = useState(30)

    const actualSize = []

    actualSize[0] =
      typeof size === "number" ? size : size[0] ? size[0] : containerHeight
    actualSize[1] = containerHeight

    const sparkNodeRef = useCallback((node) => {
      if (node) { 
        const lineHeight =
          +window.getComputedStyle(node).lineHeight.split("px")[0] - 5
        changeContainerHeight(isNaN(lineHeight) ? node.offsetHeight : lineHeight)
      }
    }, [])

    return (
      <span
        style={Object.assign(
          {
            width: `${actualSize[0]}px`,
            height: `${actualSize[1]}px`,
            display: "inline-block",
            marginLeft: "5px",
            marginRight: "5px"
          },
          sparkStyle
        )}
        ref={sparkNodeRef}
      >
        <Frame {...defaults(props)} size={actualSize} useSpans={true} />
      </span>
    )
  }
}
