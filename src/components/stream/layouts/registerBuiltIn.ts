/**
 * Side-effect import of every built-in network layout plugin.
 *
 * Use this from tests and the server renderer, where the chart type is
 * chosen at runtime. Client HOCs import only the plugin they need so a
 * SankeyDiagram consumer does not load d3-force / d3-chord / d3-hierarchy.
 */
import "./sankeyLayoutPlugin"
import "./forceLayoutPlugin"
import "./chordLayoutPlugin"
import "./hierarchyLayoutPlugin"
import "./orbitLayoutPlugin"
