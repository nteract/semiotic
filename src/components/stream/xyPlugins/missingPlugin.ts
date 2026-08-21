import type { StreamChartType } from "../types"
import { getXYPlugin } from "./registry"

let warned = false

/**
 * Direct StreamXYFrame usage no longer loads every XY mark plugin. Warn once
 * in development when a chartType has no registered plugin so the empty
 * scene is not silent.
 */
export function warnIfXYPluginMissing(chartType: StreamChartType): void {
  if (getXYPlugin(chartType)) return
  if (process.env.NODE_ENV === "production" || warned) return
  warned = true
  console.warn(
    `[semiotic] StreamXYFrame: no XY plugin registered for "${chartType}". ` +
      `Import the matching chart HOC (which registers its plugin), or call ` +
      `registerBuiltInXYPlugins() from "semiotic/xy".`
  )
}
