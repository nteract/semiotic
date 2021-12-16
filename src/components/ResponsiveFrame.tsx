import * as React from "react"
import { useState, useCallback, useEffect } from "react"

import elementResizeEvent from "element-resize-event"
import { OrdinalFrameProps } from "./types/ordinalTypes"
import { XYFrameProps } from "./types/xyTypes"
import { NetworkFrameProps } from "./types/networkTypes"

export interface ResponsiveFrameProps {
  debounce?: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  gridDisplay?: boolean
  elementResizeEvent?: Function
}

export interface ResponsiveFrameState {
  containerHeight?: number
  containerWidth?: number
}

type ActualFrameProps = OrdinalFrameProps | XYFrameProps | NetworkFrameProps

const onResize = (
  width,
  height,
  changeContainerHeight,
  changeContainerWidth
) => {
  changeContainerWidth(width)
  changeContainerHeight(height)
}

const createResponsiveFrame = (ParticularFrame) => {
  function ResponsiveFrame(props: ResponsiveFrameProps & ActualFrameProps) {
    const {
      responsiveWidth,
      responsiveHeight,
      size = [500, 500],
      dataVersion,
      debounce = 200,
      gridDisplay,
      ...rest
    } = props

    const [containerHeight, changeContainerHeight] = useState(undefined)
    const [containerWidth, changeContainerWidth] = useState(undefined)

    const actualSize = [...size]

    let returnEmpty = false

    const [responsiveNode, setResponsiveNode] = useState(null)

    const responsiveNodeRef = useCallback((node) => {
      setResponsiveNode(node)

      changeContainerHeight(node.offsetHeight)
      changeContainerWidth(node.offsetWidth)
    }, [])

    useEffect(() => {
      const element = responsiveNode

      const actualElementResizeEvent =
        props.elementResizeEvent || elementResizeEvent

      if (element) {
        actualElementResizeEvent(
          element,
          () => {
            window.clearTimeout(ResponsiveFrame.isResizing)
            ResponsiveFrame.isResizing = setTimeout(() => {
              ResponsiveFrame.isResizing = null

              changeContainerHeight(element.offsetHeight)
              changeContainerWidth(element.offsetWidth)
            })
          },
          debounce
        )
      }
      //      changeContainerHeight(element.offsetHeight)
      //      changeContainerWidth(element.offsetWidth)
    })

    if (responsiveWidth) {
      if (!containerWidth) returnEmpty = true
      actualSize[0] = containerWidth
    }

    if (responsiveHeight) {
      if (!containerHeight) returnEmpty = true
      actualSize[1] = containerHeight
    }

    const dataVersionWithSize = dataVersion + actualSize.toString() + debounce

    return (
      <div
        className="responsive-container"
        style={
          gridDisplay
            ? { minWidth: "0px", minHeight: "0px" }
            : { height: "100%", width: "100%" }
        }
        ref={responsiveNodeRef}
      >
        {!returnEmpty && (
          <ParticularFrame
            {...rest}
            size={actualSize}
            dataVersion={dataVersion ? dataVersionWithSize : undefined}
          />
        )}
      </div>
    )
  }
  ResponsiveFrame.isResizing = setTimeout(() => {})

  ResponsiveFrame.displayName = `Responsive${ParticularFrame.displayName}`
  return ResponsiveFrame
}

export default createResponsiveFrame
