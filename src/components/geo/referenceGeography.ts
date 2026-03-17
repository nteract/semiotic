/**
 * Reference geography — built-in map data resolved by string name.
 *
 * Uses Natural Earth data from the `world-atlas` npm package (TopoJSON)
 * and converts to GeoJSON features via `topojson-client`.
 *
 * Features include standard properties:
 * - `name`: Country/region name
 * - `id`: ISO 3166-1 numeric code (countries)
 *
 * Supported references:
 * - "world-110m"  — 110m resolution world countries (~108KB TopoJSON)
 * - "world-50m"   — 50m resolution world countries (~540KB TopoJSON)
 * - "land-110m"   — 110m land mass (no country boundaries)
 * - "land-50m"    — 50m land mass
 */
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"

export type ReferenceGeography =
  | "world-110m"
  | "world-50m"
  | "land-110m"
  | "land-50m"

// Cache resolved features so we only convert once
const cache = new Map<string, GeoJSON.Feature[]>()

// Bundlers differ on JSON dynamic imports: some wrap in { default: ... }, others return the object directly.
function unwrapModule(mod: any): Topology {
  return (mod.default ?? mod) as Topology
}

async function loadTopology(name: ReferenceGeography): Promise<{ topology: Topology; objectName: string }> {
  switch (name) {
    case "world-110m": {
      const mod = await import("world-atlas/countries-110m.json")
      return { topology: unwrapModule(mod), objectName: "countries" }
    }
    case "world-50m": {
      const mod = await import("world-atlas/countries-50m.json")
      return { topology: unwrapModule(mod), objectName: "countries" }
    }
    case "land-110m": {
      const mod = await import("world-atlas/land-110m.json")
      return { topology: unwrapModule(mod), objectName: "land" }
    }
    case "land-50m": {
      const mod = await import("world-atlas/land-50m.json")
      return { topology: unwrapModule(mod), objectName: "land" }
    }
    default:
      throw new Error(
        `Unknown reference geography: "${name}". ` +
        `Supported: "world-110m", "world-50m", "land-110m", "land-50m".`
      )
  }
}

/**
 * Resolve a string reference to GeoJSON features.
 * Uses dynamic import so bundlers can tree-shake/code-split the data.
 */
export async function resolveReferenceGeography(
  name: ReferenceGeography
): Promise<GeoJSON.Feature[]> {
  const cached = cache.get(name)
  if (cached) return cached

  const { topology, objectName } = await loadTopology(name)

  if (!topology || !topology.objects) {
    throw new Error(
      `resolveReferenceGeography("${name}"): Failed to load topology. ` +
      `Got ${typeof topology} with keys: ${topology ? Object.keys(topology).join(", ") : "none"}`
    )
  }

  const geojson = feature(
    topology,
    topology.objects[objectName] as GeometryCollection
  )

  // topojson-client returns FeatureCollection or Feature
  const features: GeoJSON.Feature[] = "features" in geojson
    ? (geojson as GeoJSON.FeatureCollection).features
    : [geojson as unknown as GeoJSON.Feature]

  cache.set(name, features)
  return features
}

/**
 * Check whether a value is a known reference geography string.
 */
export function isReferenceGeography(value: unknown): value is ReferenceGeography {
  return (
    typeof value === "string" &&
    ["world-110m", "world-50m", "land-110m", "land-50m"].includes(value)
  )
}
