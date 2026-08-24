const TABLE_PROP_BAGS = new Set([
  "common",
  "physics",
  "realtime",
  "realtimeStatic"
])

// Schema-visible recipes are public renderChart/MCP components even though
// they are not chartSpecs entries. Keep their access/SSR contract in the same
// generated registry so evidence publication does not fail closed for a
// renderer the server actually owns.
const BUILT_IN_RECIPE_ACCESS_ENTRIES = [
  {
    name: "ParallelCoordinatesRecipe",
    category: "recipe",
    ssr: true,
    legend: false,
    features: ["chart-recipe"],
    propBags: ["common"]
  },
  {
    name: "CalendarHeatmapRecipe",
    category: "recipe",
    ssr: true,
    legend: false,
    features: ["chart-recipe"],
    propBags: ["common"]
  }
]

export function accessCapabilitiesFor(entries) {
  const capabilities = {}
  for (const entry of entries) {
    const composite = entry.features.includes("composite-delegates-interaction")
    const valueOnly = entry.category === "value"
    capabilities[entry.name] = {
      supportsSSR: entry.ssr,
      realtime: entry.features.includes("live-stream"),
      supportsAccessibleTable: entry.propBags.some((bag) =>
        TABLE_PROP_BAGS.has(bag)
      ),
      supportsLegend: entry.legend,
      ...(entry.features.includes("chart-recipe")
        ? { recipeNavigation: true }
        : {}),
      markNavigation: valueOnly
        ? "not-applicable"
        : composite
          ? "delegated"
          : "unsupported"
    }
  }
  return capabilities
}

export function renderAccessCapabilitiesModule(entries) {
  const capabilities = accessCapabilitiesFor([
    ...entries,
    ...BUILT_IN_RECIPE_ACCESS_ENTRIES
  ])
  return `/**
 * Generated from chartSpecs capability metadata by
 * scripts/generate-capabilities-json.mjs. Do not edit by hand.
 */
export type GeneratedMarkNavigation =
  | "built-in"
  | "delegated"
  | "not-applicable"
  | "unsupported"

export interface GeneratedChartAccessCapabilities {
  readonly supportsSSR: boolean
  readonly realtime: boolean
  readonly supportsAccessibleTable: boolean
  readonly supportsLegend: boolean
  readonly recipeNavigation?: true
  readonly markNavigation: GeneratedMarkNavigation
}

export const CHART_ACCESS_CAPABILITIES: Readonly<
  Record<string, GeneratedChartAccessCapabilities>
> = Object.freeze(${JSON.stringify(capabilities, null, 2)})
`
}
