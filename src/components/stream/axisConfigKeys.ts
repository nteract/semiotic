import { closestMatch } from "../charts/shared/stringDistance"
import type { XYFrameAxisConfig } from "./xyFrameAxisTypes"

const AXIS_CONFIG_KEYS = [
  "orient",
  "visible",
  "label",
  "ticks",
  "tickCount",
  "extent",
  "tickFormat",
  "baseline",
  "jaggedBase",
  "tickValues",
  "gridStyle",
  "axisStyle",
  "grid",
  "includeMax",
  "autoRotate",
  "landmarkTicks",
  "tickAnchor",
] as const satisfies ReadonlyArray<keyof XYFrameAxisConfig>

// Fails to compile when XYFrameAxisConfig gains a key this list lacks.
type MissingAxisKey = Exclude<keyof XYFrameAxisConfig, (typeof AXIS_CONFIG_KEYS)[number]>
const axisKeysComplete: [MissingAxisKey] extends [never] ? true : false = true
void axisKeysComplete

const isAxisConfigKey = (key: string): boolean =>
  (AXIS_CONFIG_KEYS as ReadonlyArray<string>).includes(key)

export interface UnknownAxisKey {
  /** Position in the axes array. */
  index: number
  orient?: string
  key: string
  suggestion?: string
}

/** Keys on XY axis config objects that no renderer reads. */
export function findUnknownAxisConfigKeys(axes: unknown): UnknownAxisKey[] {
  if (!Array.isArray(axes)) return []
  const unknown: UnknownAxisKey[] = []
  axes.forEach((axis, index) => {
    if (!axis || typeof axis !== "object" || Array.isArray(axis)) return
    for (const key of Object.keys(axis)) {
      if (isAxisConfigKey(key)) continue
      const orient = (axis as { orient?: unknown }).orient
      unknown.push({
        index,
        ...(typeof orient === "string" && { orient }),
        key,
        suggestion: closestMatch(key, AXIS_CONFIG_KEYS as unknown as string[]),
      })
    }
  })
  return unknown
}
