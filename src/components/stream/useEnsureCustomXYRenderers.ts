import { useEffect, type MutableRefObject, type RefObject } from "react"
import type { StreamChartType } from "./types"
import { getXYPlugin, registerXYPlugin } from "./xyPlugins/registry"
import { loadFrameModule } from "./loadFrameModule"

/**
 * Keep LineChart's static graph free of candlestick/heatmap/bar, while
 * restoring two Frame contracts that cannot live on that graph:
 *
 * - `customLayout` can emit any node type — load the full painter set
 *   in a split chunk when a custom layout is actually present.
 * - Direct `<StreamXYFrame chartType="line" />` used to work with no
 *   prior register call. If this chartType has no plugin yet, load
 *   every built-in in a split chunk (HOCs that already registered skip
 *   this path).
 *
 * The paint loop only redraws when `dirtyRef` is set (or a
 * transition/restyle/pulse/resolution change). `scheduleRender` alone
 * after the first frame is not enough.
 */
export function useEnsureXYPlugins(
  chartType: StreamChartType,
  customLayout: unknown,
  dirtyRef: MutableRefObject<boolean>,
  scheduleRender: () => void,
  storeRef: RefObject<{ markStylePaintPending(): void } | null>,
): void {
  useEffect(() => {
    const type = customLayout ? "custom" : chartType
    if (getXYPlugin(type)?.canvasRenderers.length || (!customLayout && type === "custom")) return
    const load = customLayout
      ? () => import("./xyPlugins/customPlugin").then((mod) => {
          registerXYPlugin(mod.customXYPlugin)
        })
      : () => import("./xyPlugins/registerBuiltIn").then((mod) => {
          mod.registerBuiltInXYPlugins()
        })
    return loadFrameModule(load, () => {
      // Custom geometry was already produced before its painters loaded.
      // Repaint that retained scene; only a missing built-in builder needs
      // another geometry pass after registration.
      if (customLayout) storeRef.current?.markStylePaintPending()
      else dirtyRef.current = true
      scheduleRender()
    }, `StreamXYFrame painters for "${chartType}"`)
  }, [chartType, customLayout, dirtyRef, scheduleRender, storeRef])
}
