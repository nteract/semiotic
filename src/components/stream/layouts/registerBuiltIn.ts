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
import { ensureLayoutPlugin, registerLayoutPlugin } from "./registry"
import { sankeyLayoutPlugin } from "./sankeyLayoutPlugin"
import { forceLayoutPlugin } from "./forceLayoutPlugin"
import { chordLayoutPlugin } from "./chordLayoutPlugin"
import { hierarchyLayoutPlugin } from "./hierarchyLayoutPlugin"
import { orbitLayoutPlugin } from "./orbitLayoutPlugin"

function installBuiltInNetworkLayouts(register: typeof registerLayoutPlugin): void {
  register("sankey", sankeyLayoutPlugin)
  register("force", forceLayoutPlugin)
  register("chord", chordLayoutPlugin)
  register("tree", hierarchyLayoutPlugin)
  register("cluster", hierarchyLayoutPlugin)
  register("treemap", hierarchyLayoutPlugin)
  register("circlepack", hierarchyLayoutPlugin)
  register("partition", hierarchyLayoutPlugin)
  register("orbit", orbitLayoutPlugin)
}

export function registerBuiltInNetworkLayouts(): void {
  installBuiltInNetworkLayouts(registerLayoutPlugin)
}

/** Fill missing layouts during lazy/server initialization without replacing callers. */
export function ensureBuiltInNetworkLayouts(): void {
  installBuiltInNetworkLayouts(ensureLayoutPlugin)
}
