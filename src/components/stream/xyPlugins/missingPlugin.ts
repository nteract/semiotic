import type { StreamChartType } from "../types"
import { isServerEnvironment } from "../isServerEnvironment"
import { getXYPlugin } from "./registry"

const warned = new Set<string>()

/**
 * SSR cannot wait for the client built-in chunk. Warn once per chartType
 * when a plugin is still missing on the server so an empty scene is not
 * silent. Client frames load built-ins asynchronously instead.
 */
export function warnIfXYPluginMissing(chartType: StreamChartType): void {
  if (getXYPlugin(chartType)) return
  if (!isServerEnvironment) return
  if (warned.has(chartType)) return
  warned.add(chartType)
  console.warn(
    `[semiotic] StreamXYFrame: no XY plugin registered for "${chartType}" ` +
      `during SSR. Import a chart HOC, or call registerBuiltInXYPlugins() ` +
      `from "semiotic/xy" or "semiotic/realtime/core" before render.`
  )
}
