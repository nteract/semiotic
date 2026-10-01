import type { NetworkChartType } from "../networkTypes"
import { getLayoutPlugin } from "./registry"
import { isBuiltInNetworkLayout } from "./builtInLayoutTypes"
import { isServerEnvironment } from "../isServerEnvironment"

let warned = false

/**
 * Direct StreamNetworkFrame usage no longer loads every layout. Warn once in
 * development when a chartType has no registered plugin so the empty scene is
 * not silent. Client frames restore built-in layouts from a split chunk
 * (`useEnsureNetworkLayouts`), so only SSR, which cannot wait, needs a warning
 * for them.
 */
export function warnIfLayoutPluginMissing(chartType: NetworkChartType): void {
  if (getLayoutPlugin(chartType)) return
  if (!isServerEnvironment && isBuiltInNetworkLayout(chartType)) return
  if (process.env.NODE_ENV === "production" || warned) return
  warned = true
  console.warn(
    `[semiotic] StreamNetworkFrame: no layout plugin registered for "${chartType}". ` +
      `Import the matching chart HOC (which registers its plugin), or call ` +
      `registerBuiltInNetworkLayouts() from "semiotic/network".`
  )
}
