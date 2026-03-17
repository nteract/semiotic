import type { NetworkLayoutPlugin, NetworkChartType } from "../networkTypes"
import { sankeyLayoutPlugin } from "./sankeyLayoutPlugin"
import { forceLayoutPlugin } from "./forceLayoutPlugin"
import { chordLayoutPlugin } from "./chordLayoutPlugin"
import { hierarchyLayoutPlugin } from "./hierarchyLayoutPlugin"
import { orbitLayoutPlugin } from "./orbitLayoutPlugin"

/**
 * Registry mapping network chart types to their layout plugins.
 */
export const networkLayoutRegistry: Record<string, NetworkLayoutPlugin> = {
  sankey: sankeyLayoutPlugin,
  force: forceLayoutPlugin,
  chord: chordLayoutPlugin,
  tree: hierarchyLayoutPlugin,
  cluster: hierarchyLayoutPlugin,
  treemap: hierarchyLayoutPlugin,
  circlepack: hierarchyLayoutPlugin,
  partition: hierarchyLayoutPlugin,
  orbit: orbitLayoutPlugin
}

export function getLayoutPlugin(
  chartType: NetworkChartType
): NetworkLayoutPlugin | undefined {
  return networkLayoutRegistry[chartType]
}

export { sankeyLayoutPlugin, forceLayoutPlugin, chordLayoutPlugin, hierarchyLayoutPlugin, orbitLayoutPlugin }
