import NetworkFrame from "./NetworkFrame/NetworkFrame"
import createSparkFrame from "./SparkFrame"
import { networkFrameDefaults } from "./SparkFrame"

export const SparkNetworkFrame = createSparkFrame(
  NetworkFrame,
  networkFrameDefaults,
  "SparkNetworkFrame"
)
