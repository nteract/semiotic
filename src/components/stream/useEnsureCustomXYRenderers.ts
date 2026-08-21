import { useEffect } from "react"
import { getXYPlugin, registerXYPlugin } from "./xyPlugins/registry"

/**
 * customLayout can emit any node type. Chart HOCs only register their own
 * painters, so load the full self-filtering set in a separate chunk when
 * a custom layout is actually present. LineChart without customLayout
 * does not pay for heatmap/candlestick/bar painters.
 */
export function useEnsureCustomXYRenderers(
  customLayout: unknown,
  onReady: () => void,
): void {
  useEffect(() => {
    if (!customLayout || getXYPlugin("custom")) return
    let cancelled = false
    import("./xyPlugins/customPlugin").then((mod) => {
      registerXYPlugin(mod.customXYPlugin)
      if (!cancelled) onReady()
    })
    return () => {
      cancelled = true
    }
  }, [customLayout, onReady])
}
