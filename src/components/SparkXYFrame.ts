import XYFrame from "./XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"

export default createSparkFrame(XYFrame, xyFrameDefaults, "SparkXYFrame")
