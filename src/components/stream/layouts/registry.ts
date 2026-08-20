import type { NetworkChartType, NetworkLayoutPlugin } from "../networkTypes"

const registry: Partial<Record<NetworkChartType, NetworkLayoutPlugin>> = Object.create(null)

/**
 * Register a network layout plugin. Each plugin module calls this on import
 * so a Sankey-only consumer does not load force/chord/orbit/hierarchy.
 */
export function registerLayoutPlugin(
  chartType: NetworkChartType,
  plugin: NetworkLayoutPlugin
): void {
  registry[chartType] = plugin
}

export function getLayoutPlugin(
  chartType: NetworkChartType
): NetworkLayoutPlugin | undefined {
  return registry[chartType]
}
