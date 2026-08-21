import type { Datum } from "../../charts/shared/datumTypes"
import type { StreamChartType, StreamLayout, SceneNode } from "../types"
import type { StreamRendererFn } from "../renderers/types"
import type { XYSceneContext } from "../xySceneBuilders/types"
import type { BarSceneResult } from "../xySceneBuilders/barScene"

/**
 * Register XY scene + canvas plugins with a value import of the plugin.
 * `package.json` has `"sideEffects": false`, so a bare
 * `import "./linePlugin"` may be dropped by consumer bundlers.
 *
 * Chart HOCs register only the plugin they need. Direct StreamXYFrame
 * users should import the matching plugin or call
 * {@link registerBuiltInXYPlugins} from `semiotic/xy`.
 */
export type XYSceneBuildResult = SceneNode[] | BarSceneResult

export type XYSceneBuilder = (
  ctx: XYSceneContext,
  data: Datum[],
  layout: StreamLayout,
) => XYSceneBuildResult

export interface XYChartPlugin {
  chartType: StreamChartType
  buildScene: XYSceneBuilder
  canvasRenderers: StreamRendererFn[]
}

const registry: Partial<Record<StreamChartType, XYChartPlugin>> = Object.create(null)

export function registerXYPlugin(plugin: XYChartPlugin): void {
  registry[plugin.chartType] = plugin
}

/** Test-only: drop every plugin so HOC registration can be asserted in isolation. */
export function resetXYPluginRegistry(): void {
  for (const key of Object.keys(registry) as StreamChartType[]) {
    delete registry[key]
  }
}

export function getXYPlugin(
  chartType: StreamChartType,
): XYChartPlugin | undefined {
  return registry[chartType]
}

export function getXYSceneBuilder(
  chartType: StreamChartType,
): XYSceneBuilder | undefined {
  return registry[chartType]?.buildScene
}

export function getXYCanvasRenderers(
  chartType: StreamChartType,
  customLayout = false,
): StreamRendererFn[] {
  if (customLayout) {
    const custom = registry.custom?.canvasRenderers
    if (custom && custom.length > 0) return custom
    // Until the custom-painter chunk loads, paint whatever plugins this
    // chart already registered (e.g. LineChart's line/area/point set).
    const seen = new Set<StreamRendererFn>()
    const union: StreamRendererFn[] = []
    for (const plugin of Object.values(registry)) {
      if (!plugin) continue
      for (const renderer of plugin.canvasRenderers) {
        if (seen.has(renderer)) continue
        seen.add(renderer)
        union.push(renderer)
      }
    }
    return union
  }
  return registry[chartType]?.canvasRenderers ?? []
}

export function unwrapXYScene(result: XYSceneBuildResult): {
  nodes: SceneNode[]
  binBoundaries: number[]
} {
  if (Array.isArray(result)) return { nodes: result, binBoundaries: [] }
  return { nodes: result.nodes, binBoundaries: result.binBoundaries }
}
