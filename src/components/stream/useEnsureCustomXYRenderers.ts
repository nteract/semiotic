import { useEffect, type MutableRefObject } from "react"
import type { StreamChartType } from "./types"
import { getXYPlugin, registerXYPlugin } from "./xyPlugins/registry"

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
): void {
  useEffect(() => {
    let cancelled = false
    const loaders: Promise<void>[] = []

    if (customLayout && !getXYPlugin("custom")) {
      loaders.push(
        import("./xyPlugins/customPlugin").then((mod) => {
          registerXYPlugin(mod.customXYPlugin)
        }),
      )
    }

    if (chartType !== "custom" && !getXYPlugin(chartType)) {
      loaders.push(
        import("./xyPlugins/registerBuiltIn").then((mod) => {
          mod.registerBuiltInXYPlugins()
        }),
      )
    }

    if (loaders.length === 0) return undefined
    void Promise.all(loaders).then(() => {
      if (cancelled) return
      dirtyRef.current = true
      scheduleRender()
    })
    return () => {
      cancelled = true
    }
  }, [chartType, customLayout, dirtyRef, scheduleRender])
}
