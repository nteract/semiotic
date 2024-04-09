import OrdinalFrame from "./OrdinalFrame"
import createSparkFrame from "./SparkFrame"
import { ordinalFrameDefaults } from "./SparkFrame"

export const SparkOrdinalFrame = /*#__PURE__*/ createSparkFrame(
  OrdinalFrame,
  ordinalFrameDefaults,
  "SparkOrdinalFrame"
)
