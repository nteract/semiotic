import { useEffect, useRef } from "react"
import type { NetworkChartType } from "./networkTypes"
import { getLayoutPlugin } from "./layouts/registry"
import { isBuiltInNetworkLayout } from "./layouts/builtInLayoutTypes"
import { loadFrameModule } from "./loadFrameModule"

/**
 * Chart HOCs register only the layout they render, so a published chunk no
 * longer registers every layout as an import side effect. Direct
 * `<StreamNetworkFrame chartType="force" />` usage without a prior
 * `registerBuiltInNetworkLayouts()` call restores its built-in layout on the
 * client from a split chunk, then reruns the layout. Server rendering still
 * requires the explicit registration (and warns when it is missing).
 */
export function useEnsureNetworkLayouts(
  chartType: NetworkChartType,
  hasCustomLayout: boolean,
  onReady: () => void
): void {
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (hasCustomLayout || !isBuiltInNetworkLayout(chartType) || getLayoutPlugin(chartType)) {
      return undefined
    }
    return loadFrameModule(
      () => import("./layouts/registerBuiltIn").then((mod) => {
        mod.registerBuiltInNetworkLayouts()
      }),
      () => onReadyRef.current(),
      `StreamNetworkFrame layout "${chartType}"`
    )
  }, [chartType, hasCustomLayout])
}
