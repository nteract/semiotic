import OrdinalFrame from "./OrdinalFrame/OrdinalFrame"
import createSparkFrame from "./SparkFrame"
import { ordinalFrameDefaults } from "./SparkFrame"

export const SparkOrdinalFrame = createSparkFrame(
  OrdinalFrame,
  ordinalFrameDefaults,
  "SparkOrdinalFrame"
)
