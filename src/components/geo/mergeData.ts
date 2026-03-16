/**
 * Merge external data into GeoJSON features by joining on a key field.
 *
 * @example
 * ```ts
 * const enriched = mergeData(worldCountries, myCSV, {
 *   featureKey: "properties.iso_a3",
 *   dataKey: "country_code"
 * })
 * ```
 *
 * Cross-pollination: This pattern (key-based data join) could be extracted
 * to a shared utility for any data merge operation in Semiotic.
 */
export function mergeData<T extends Record<string, any>>(
  features: GeoJSON.Feature[],
  data: T[],
  options: {
    featureKey: string
    dataKey: string
  }
): GeoJSON.Feature[] {
  const { featureKey, dataKey } = options

  // Build lookup from data
  const lookup = new Map<string, T>()
  for (const row of data) {
    const key = String(row[dataKey])
    lookup.set(key, row)
  }

  // Resolve nested key accessor (e.g., "properties.iso_a3")
  const getFeatureKey = (feature: GeoJSON.Feature): string => {
    const parts = featureKey.split(".")
    let val: any = feature
    for (const part of parts) {
      val = val?.[part]
    }
    return String(val ?? "")
  }

  return features.map(feature => {
    const key = getFeatureKey(feature)
    const match = lookup.get(key)
    if (!match) return feature

    return {
      ...feature,
      properties: {
        ...feature.properties,
        ...match
      }
    }
  })
}
