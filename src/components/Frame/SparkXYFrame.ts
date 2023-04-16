import XYFrame from "./XYFrame/XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"

export const SparkXYFrame = createSparkFrame(
  XYFrame,
  xyFrameDefaults,
  "SparkXYFrame"
)
