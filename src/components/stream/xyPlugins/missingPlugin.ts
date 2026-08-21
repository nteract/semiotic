import type { StreamChartType } from "../types"
import { getXYPlugin } from "./registry"

const warned = new Set<string>()

/**
 * Direct StreamXYFrame usage no longer loads every XY mark plugin. Warn
 * once per chartType when a plugin is missing so the empty scene is not
 * silent — including production, where sideEffects:false can drop unused
 * HOC modules.
 */
export function warnIfXYPluginMissing(chartType: StreamChartType): void {
  if (getXYPlugin(chartType)) return
  if (warned.has(chartType)) return
  warned.add(chartType)
  console.warn(
    `[semiotic] StreamXYFrame: no XY plugin registered for "${chartType}". ` +
      `Import the matching chart HOC (which registers its plugin), or call ` +
      `registerBuiltInXYPlugins() from "semiotic/xy".`
  )
}
