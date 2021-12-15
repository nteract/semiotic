import NetworkFrame from "./NetworkFrame"
import createSparkFrame from "./SparkFrame"
import { networkFrameDefaults } from "./SparkFrame"

export const SparkNetworkFrame = createSparkFrame(
  NetworkFrame,
  networkFrameDefaults,
  "SparkNetworkFrame"
)
