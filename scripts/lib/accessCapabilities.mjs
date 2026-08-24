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
  const rows = Object.entries(capabilities).map(([name, capability]) => {
    const flags =
      (capability.supportsSSR ? 1 : 0) |
      (capability.realtime ? 2 : 0) |
      (capability.supportsAccessibleTable ? 4 : 0) |
      (capability.supportsLegend ? 8 : 0) |
      (capability.recipeNavigation ? 16 : 0)
    return capability.markNavigation === "unsupported"
      ? [name, flags]
      : [name, flags, capability.markNavigation]
  })
  const renderedRows = rows
    .map((row) => `  [${row.map((value) => JSON.stringify(value)).join(", ")}]`)
    .join(",\n")
  return `/**
 * Generated from chartSpecs capability metadata by
 * scripts/generate-capabilities-json.mjs. Do not edit by hand.
 */
export type GeneratedMarkNavigation =
  "built-in" | "delegated" | "not-applicable" | "unsupported"

export interface GeneratedChartAccessCapabilities {
  readonly supportsSSR: boolean
  readonly realtime: boolean
  readonly supportsAccessibleTable: boolean
  readonly supportsLegend: boolean
  readonly recipeNavigation?: true
  readonly markNavigation: GeneratedMarkNavigation
}

type GeneratedChartAccessCapabilityRow = readonly [
  name: string,
  flags: number,
  markNavigation?: GeneratedMarkNavigation
]

// Boolean capabilities are packed into flags so this public tooling registry
// does not repeat the same property names for every chart in consumer bundles.
const CAPABILITY_ROWS: readonly GeneratedChartAccessCapabilityRow[] = [
${renderedRows}
]

export const CHART_ACCESS_CAPABILITIES: Readonly<
  Record<string, GeneratedChartAccessCapabilities>
> = Object.freeze(
  Object.fromEntries(
    CAPABILITY_ROWS.map(([name, flags, markNavigation = "unsupported"]) => [
      name,
      {
        supportsSSR: Boolean(flags & 1),
        realtime: Boolean(flags & 2),
        supportsAccessibleTable: Boolean(flags & 4),
        supportsLegend: Boolean(flags & 8),
        ...(flags & 16 ? { recipeNavigation: true as const } : {}),
        markNavigation
      }
    ])
  )
)
`
}
