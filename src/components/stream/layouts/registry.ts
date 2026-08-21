import type { NetworkChartType, NetworkLayoutPlugin } from "../networkTypes"

const registry: Partial<Record<NetworkChartType, NetworkLayoutPlugin>> = Object.create(null)

/**
 * Register a network layout plugin. Call this with a value import of the
 * plugin — `package.json` has `"sideEffects": false`, so a bare
 * `import "./sankeyLayoutPlugin"` may be dropped by consumer bundlers.
 *
 * Chart HOCs register only the plugin they need. Direct StreamNetworkFrame
 * users should import the matching plugin or call
 * {@link registerBuiltInNetworkLayouts} from `semiotic/network`.
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
