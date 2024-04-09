import NetworkFrame from "./NetworkFrame"
import createSparkFrame from "./SparkFrame"
import { networkFrameDefaults } from "./SparkFrame"

export const SparkNetworkFrame = /*#__PURE__*/ createSparkFrame(
  NetworkFrame,
  networkFrameDefaults,
  "SparkNetworkFrame"
)
