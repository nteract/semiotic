const TABLE_PROP_BAGS = new Set([
  "common",
  "physics",
  "realtime",
  "realtimeStatic"
])

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
      markNavigation: valueOnly
        ? "not-applicable"
        : composite
          ? "delegated"
          : "built-in"
    }
  }
  return capabilities
}

export function renderAccessCapabilitiesModule(entries) {
  const capabilities = accessCapabilitiesFor(entries)
  return `/**
 * Generated from chartSpecs capability metadata by
 * scripts/generate-capabilities-json.mjs. Do not edit by hand.
 */
export type GeneratedMarkNavigation =
  | "built-in"
  | "delegated"
  | "not-applicable"

export interface GeneratedChartAccessCapabilities {
  readonly supportsSSR: boolean
  readonly realtime: boolean
  readonly supportsAccessibleTable: boolean
  readonly supportsLegend: boolean
  readonly markNavigation: GeneratedMarkNavigation
}

export const CHART_ACCESS_CAPABILITIES: Readonly<
  Record<string, GeneratedChartAccessCapabilities>
> = Object.freeze(${JSON.stringify(capabilities, null, 2)})
`
}
