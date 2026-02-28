"use client"
import XYFrame from "./XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"

export const SparkXYFrame = /*#__PURE__*/ createSparkFrame(
	XYFrame,
	xyFrameDefaults,
	"SparkXYFrame"
)
