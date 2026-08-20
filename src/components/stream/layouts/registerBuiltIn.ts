/**
 * Register every built-in network layout plugin.
 *
 * Call this from the server renderer and tests, where the chart type is
 * chosen at runtime. Client HOCs import and register only the plugin they
 * need so a SankeyDiagram consumer does not load d3-force / d3-chord /
 * d3-hierarchy.
 *
 * Must be a live function call: `package.json` has `"sideEffects": false`,
 * so a side-effect-only import is dropped from the published bundles.
 */
import { registerLayoutPlugin } from "./registry"
import { sankeyLayoutPlugin } from "./sankeyLayoutPlugin"
import { forceLayoutPlugin } from "./forceLayoutPlugin"
import { chordLayoutPlugin } from "./chordLayoutPlugin"
import { hierarchyLayoutPlugin } from "./hierarchyLayoutPlugin"
import { orbitLayoutPlugin } from "./orbitLayoutPlugin"

export function registerBuiltInNetworkLayouts(): void {
  registerLayoutPlugin("sankey", sankeyLayoutPlugin)
  registerLayoutPlugin("force", forceLayoutPlugin)
  registerLayoutPlugin("chord", chordLayoutPlugin)
  registerLayoutPlugin("tree", hierarchyLayoutPlugin)
  registerLayoutPlugin("cluster", hierarchyLayoutPlugin)
  registerLayoutPlugin("treemap", hierarchyLayoutPlugin)
  registerLayoutPlugin("circlepack", hierarchyLayoutPlugin)
  registerLayoutPlugin("partition", hierarchyLayoutPlugin)
  registerLayoutPlugin("orbit", orbitLayoutPlugin)
}
