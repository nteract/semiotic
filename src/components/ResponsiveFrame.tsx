import * as React from "react"
import { useState, useLayoutEffect, useRef } from "react"

import { OrdinalFrameProps } from "./types/ordinalTypes"
import { XYFrameProps } from "./types/xyTypes"
import { NetworkFrameProps } from "./types/networkTypes"

import { useBoundingRect } from "./useBoundingRect"

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

    const actualSize = [...size]

    let returnEmpty = false

    let sceneRef = useRef()
    let rect = useBoundingRect(sceneRef)

    if (responsiveWidth) {
      if (rect == null) returnEmpty = true
      else actualSize[0] = rect.width
    }

    if (responsiveHeight) {
      if (rect == null) returnEmpty = true
      else actualSize[1] = rect.height
    }

    const dataVersionWithSize = dataVersion + actualSize.toString() + debounce

    return (
      <div
        data-testid="responsive-container"
        className="responsive-container"
        style={
          gridDisplay
            ? { minWidth: "0px", minHeight: "0px" }
            : { height: "100%", width: "100%" }
        }
        ref={sceneRef}
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
