"use client"
import MinimapXYFrame from "./MinimapXYFrame"
import createResponsiveFrame from "./ResponsiveFrame"
import { ResponsiveFrameProps } from "./ResponsiveFrame"
import { XYFrameProps } from "./types/xyTypes"

export const ResponsiveMinimapXYFrame =
	/*#__PURE__*/ createResponsiveFrame(MinimapXYFrame) as
	<TDatum = Record<string, any>>(props: ResponsiveFrameProps & XYFrameProps<TDatum>) => JSX.Element
