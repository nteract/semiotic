"use client"
import XYFrame from "./XYFrame"
import createResponsiveFrame from "./ResponsiveFrame"
import { ResponsiveFrameProps } from "./ResponsiveFrame"
import { XYFrameProps } from "./types/xyTypes"

export const ResponsiveXYFrame = /*#__PURE__*/ createResponsiveFrame(XYFrame) as
  <TDatum = Record<string, any>>(props: ResponsiveFrameProps & XYFrameProps<TDatum>) => JSX.Element
