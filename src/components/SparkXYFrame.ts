"use client"
import XYFrame from "./XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"
import { XYFrameProps } from "./types/xyTypes"

export const SparkXYFrame = /*#__PURE__*/ createSparkFrame(
	XYFrame,
	xyFrameDefaults,
	"SparkXYFrame"
) as <TDatum = Record<string, any>>(props: XYFrameProps<TDatum> & { sparkStyle?: object; size?: number | number[] }) => JSX.Element
