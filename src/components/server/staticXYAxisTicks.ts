import { isTimeLandmark } from "../stream/hitTestUtils"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import type { AxisTick } from "../stream/xyAxisTicks"

export function isStaticAxisLandmark(
  landmarkTicks: XYFrameAxisConfig["landmarkTicks"],
  tick: AxisTick,
  index: number,
  ticks: AxisTick[],
): boolean {
  if (!landmarkTicks) return false
  if (typeof landmarkTicks === "function") {
    return landmarkTicks(tick.value, index)
  }
  return isTimeLandmark(tick.value, index > 0 ? ticks[index - 1].value : undefined)
}
