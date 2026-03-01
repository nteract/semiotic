"use client"
import OrdinalFrame from "./OrdinalFrame"
import createResponsiveFrame from "./ResponsiveFrame"
import { ResponsiveFrameProps } from "./ResponsiveFrame"
import { OrdinalFrameProps } from "./types/ordinalTypes"

export const ResponsiveOrdinalFrame =
	/*#__PURE__*/ createResponsiveFrame(OrdinalFrame) as
	<TDatum = Record<string, any>>(props: ResponsiveFrameProps & OrdinalFrameProps<TDatum>) => JSX.Element
