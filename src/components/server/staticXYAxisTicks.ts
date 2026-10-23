import { isTimeLandmark } from "../stream/hitTestUtils"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import { axisTickDataValue, type AxisTick } from "../stream/xyAxisTicks"

export function isStaticAxisLandmark(
  landmarkTicks: XYFrameAxisConfig["landmarkTicks"],
  tick: AxisTick,
  index: number,
  ticks: AxisTick[],
): boolean {
  if (!landmarkTicks) return false
  const value = axisTickDataValue(tick)
  if (typeof landmarkTicks === "function") {
    return landmarkTicks(value, index)
  }
  const previous = index > 0 ? axisTickDataValue(ticks[index - 1]) : undefined
  return isTimeLandmark(value, previous)
}
