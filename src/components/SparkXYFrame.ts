import XYFrame from "./XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"

export const SparkXYFrame = createSparkFrame(XYFrame, xyFrameDefaults, "SparkXYFrame")
