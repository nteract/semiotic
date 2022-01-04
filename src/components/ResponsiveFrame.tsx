import * as React from "react"
import { useState, useLayoutEffect, useRef } from "react"

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

/** ISC License (c) 2021 Alexey Raspopov */

function useElementSize(ref) {
  let [size, setSize] = useState([null, null])
  useLayoutEffect(() => {
    let element = ref.current
    if (element != null) {
      let rect = element.getBoundingClientRect()
      setSize([rect.width, rect.height])
      // @ts-ignore
      let observer = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          let rect = entries[0].contentRect
          setSize([rect.width, rect.height])
        }
      })
      observer.observe(element)
      return () => observer.disconnect()
    }
  }, [])
  return size
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

    const actualSize = [...size]

    let returnEmpty = false

    let sceneRef = useRef()
    let [containerWidth, containerHeight] = useElementSize(sceneRef)

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
