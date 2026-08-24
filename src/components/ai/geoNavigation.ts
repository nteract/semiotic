import type { Datum } from "../charts/shared/datumTypes"
import type { NavTreeNode } from "./navigationTree"

interface GeoRow {
  datum: Datum
  index: number
  label: string
  value?: number
}

function readProp(datum: Datum, accessor: unknown, fallback: string): unknown {
  if (typeof accessor === "function") return accessor(datum)
  const key = typeof accessor === "string" && accessor ? accessor : fallback
  return datum[key]
}

function stringValue(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback
  if (typeof value === "object") {
    const record = value as Datum
    return stringValue(record.id ?? record.name ?? record.label, fallback)
  }
  return String(value)
}

function finiteValue(value: unknown): number | undefined {
  if (value == null || value === "") return undefined
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : undefined
}

function slug(value: unknown): string {
  const normalized = stringValue(value, "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "unknown"
}

function interactionCue(props: Datum): string {
  const cues: string[] = []
  if (props.linkedHover || props.selection || props.linkedBrush) {
    cues.push("Use linked highlighting to compare related locations.")
  }
  if (props.enableHover || props.tooltip) {
    cues.push("Hover or focus a mark for its details.")
  }
  return cues.length > 0 ? ` ${cues.join(" ")}` : ""
}

function geoFeatures(value: unknown): Datum[] {
  if (Array.isArray(value)) return value as Datum[]
  if (!value || typeof value !== "object") return []
  const object = value as Datum
  if (Array.isArray(object.features)) return object.features as Datum[]
  return object.type === "Feature" ? [object] : []
}

function geoValue(datum: Datum, accessor: unknown, fallback: string): unknown {
  const direct = readProp(datum, accessor, fallback)
  if (direct !== undefined) return direct
  const properties = datum.properties
  return properties && typeof properties === "object"
    ? readProp(properties as Datum, accessor, fallback)
    : undefined
}

function geoLabel(datum: Datum, accessor: unknown, fallback: string): string {
  return stringValue(
    geoValue(datum, accessor, "id") ??
      geoValue(datum, "name", "name") ??
      geoValue(datum, "NAME", "NAME") ??
      geoValue(datum, "label", "label"),
    fallback
  )
}

function metricStats(rows: GeoRow[]): {
  count: number
  min: number
  max: number
  total: number
  average: number
} | null {
  let count = 0
  let min = Infinity
  let max = -Infinity
  let total = 0
  for (const row of rows) {
    if (row.value == null) continue
    count += 1
    min = Math.min(min, row.value)
    max = Math.max(max, row.value)
    total += row.value
  }
  return count === 0 ? null : { count, min, max, total, average: total / count }
}

function metricSummary(
  rows: GeoRow[],
  fmtNum: (number: number) => string
): string {
  const stats = metricStats(rows)
  if (!stats) return "no numeric values"
  return `range ${fmtNum(stats.min)} to ${fmtNum(
    stats.max
  )}, average ${fmtNum(stats.average)}, total ${fmtNum(stats.total)}`
}

function choroplethGroups(rows: GeoRow[]): Array<{
  id: string
  label: string
  rows: GeoRow[]
}> {
  // Equal-width thirds of the observed numeric range mirror the sequential
  // color reading without claiming equal population (quantiles). Empty thirds
  // are omitted; an all-equal metric receives one explicit branch.
  const numeric = rows.filter((row) => row.value != null)
  const missing = rows.filter((row) => row.value == null)
  const groups: Array<{ id: string; label: string; rows: GeoRow[] }> = []
  const stats = metricStats(numeric)
  if (stats) {
    if (stats.min === stats.max) {
      groups.push({ id: "equal", label: "Equal values", rows: numeric })
    } else {
      const lowThreshold = stats.min + (stats.max - stats.min) / 3
      const highThreshold = stats.min + ((stats.max - stats.min) * 2) / 3
      const high = numeric.filter((row) => row.value! >= highThreshold)
      const middle = numeric.filter(
        (row) => row.value! >= lowThreshold && row.value! < highThreshold
      )
      const low = numeric.filter((row) => row.value! < lowThreshold)
      if (high.length > 0)
        groups.push({ id: "highest", label: "Highest values", rows: high })
      if (middle.length > 0)
        groups.push({ id: "middle", label: "Middle values", rows: middle })
      if (low.length > 0)
        groups.push({ id: "lowest", label: "Lowest values", rows: low })
    }
  }
  if (missing.length > 0) {
    groups.push({ id: "missing", label: "No numeric value", rows: missing })
  }
  return groups
}

function buildChoroplethBranches(
  rows: GeoRow[],
  maxLeaves: number,
  fmtNum: (number: number) => string
): NavTreeNode[] {
  const sortedNumeric = rows
    .filter((row) => row.value != null)
    .sort((a, b) => b.value! - a.value! || a.index - b.index)
  const ranks = new Map<number, number>()
  let lastValue: number | undefined
  let lastRank = 0
  for (const [index, row] of sortedNumeric.entries()) {
    if (lastValue !== row.value) {
      lastRank = index + 1
      lastValue = row.value
    }
    ranks.set(row.index, lastRank)
  }

  let emitted = 0
  return choroplethGroups(rows).map((group) => {
    const available = Math.max(0, maxLeaves - emitted)
    const visibleRows = group.rows.slice(0, available)
    emitted += visibleRows.length
    const children: NavTreeNode[] = visibleRows.map((row) => {
      const rank = ranks.get(row.index)
      const rankPhrase =
        rank == null || sortedNumeric.length < 2
          ? ""
          : `, rank ${rank} of ${sortedNumeric.length}`
      return {
        id: `geo-${slug(row.label)}-${row.index}`,
        role: "datum",
        level: 3,
        label:
          row.value == null
            ? `${row.label}: no numeric value.`
            : `${row.label}: ${fmtNum(row.value)}${rankPhrase}.`,
        ...(row.value == null ? {} : { value: row.value }),
        datum: row.datum
      }
    })
    const omitted = group.rows.length - visibleRows.length
    if (omitted > 0) {
      children.push({
        id: `geo-${group.id}-more`,
        role: "datum",
        level: 3,
        label: `${omitted} more ${omitted === 1 ? "region" : "regions"} in ${group.label.toLowerCase()} not shown; navigation is capped at ${maxLeaves}.`
      })
    }
    return {
      id: `regions-${group.id}`,
      role: "series",
      level: 2,
      label: `${group.label}: ${group.rows.length} ${
        group.rows.length === 1 ? "region" : "regions"
      }, ${metricSummary(group.rows, fmtNum)}.`,
      children
    }
  })
}

/** Build region/value and route/location readings for geographic charts. */
export function buildGeoNavigationTree(
  component: string,
  props: Datum,
  maxLeaves: number,
  fmtNum: (number: number) => string
): NavTreeNode {
  const areaData = geoFeatures(props.areas)
  const points =
    component === "FlowMap" && Array.isArray(props.nodes)
      ? (props.nodes as Datum[])
      : Array.isArray(props.points)
        ? (props.points as Datum[])
        : []
  const flows = Array.isArray(props.flows) ? (props.flows as Datum[]) : []
  const lines = Array.isArray(props.lines) ? (props.lines as Datum[]) : []
  const valueAccessor =
    props.valueAccessor ?? props.sizeBy ?? props.costAccessor ?? "value"
  const pointId = props.pointIdAccessor ?? props.nodeIdAccessor ?? "id"
  const rows = component === "ChoroplethMap" ? areaData : points
  const geoRows = rows.map<GeoRow>((datum, index) => ({
    datum,
    index,
    label: geoLabel(
      datum,
      component === "ChoroplethMap" ? props.idAccessor : pointId,
      `${component === "ChoroplethMap" ? "region" : "location"} ${index + 1}`
    ),
    value: finiteValue(geoValue(datum, valueAccessor, "value"))
  }))
  const numericRows = geoRows.filter((row) => row.value != null)

  const title =
    component === "ChoroplethMap"
      ? `A choropleth map with ${areaData.length} regions.${
          numericRows.length > 0
            ? ` Values are available for ${numericRows.length} of ${areaData.length} regions; ${metricSummary(numericRows, fmtNum)}.`
            : " No regions have numeric values."
        }`
      : component === "FlowMap"
        ? `A flow map with ${flows.length} flows and ${points.length} locations.`
        : component === "DistanceCartogram"
          ? `A distance cartogram with ${points.length} locations and ${lines.length} routes.`
          : `A proportional-symbol map with ${points.length} locations.`
  const root: NavTreeNode = {
    id: "root",
    role: "chart",
    level: 1,
    label: `${title}${interactionCue(props)}`,
    children: []
  }

  if (component === "ChoroplethMap") {
    root.children = buildChoroplethBranches(geoRows, maxLeaves, fmtNum)
  } else if (geoRows.length > 0) {
    const marks = geoRows.slice(0, maxLeaves).map<NavTreeNode>((row) => ({
      id: `geo-${slug(row.label)}-${row.index}`,
      role: "datum",
      level: 3,
      label: `${row.label}${
        row.value == null ? "" : `: ${fmtNum(row.value)}`
      }.`,
      ...(row.value == null ? {} : { value: row.value }),
      datum: row.datum
    }))
    if (geoRows.length > maxLeaves) {
      marks.push({
        id: "geo-more",
        role: "datum",
        level: 3,
        label: `…and ${geoRows.length - maxLeaves} more locations.`
      })
    }
    root.children?.push({
      id: "locations",
      role: "series",
      level: 2,
      label: `Locations: ${geoRows.length} marks.`,
      children: marks
    })
  }

  const routeData = component === "FlowMap" ? flows : lines
  if (routeData.length > 0) {
    const routeChildren = routeData
      .slice(0, maxLeaves)
      .map<NavTreeNode>((route, index) => {
        const source = stringValue(route.source, "unknown")
        const target = stringValue(route.target, "unknown")
        const value = finiteValue(readProp(route, valueAccessor, "value"))
        return {
          id: `route-${slug(source)}-${slug(target)}-${index}`,
          role: "datum",
          level: 3,
          label: `${source} to ${target}${
            value == null ? "" : `: ${fmtNum(value)}`
          }.`,
          ...(value == null ? {} : { value }),
          datum: route
        }
      })
    root.children?.push({
      id: "routes",
      role: "series",
      level: 2,
      label: `Routes: ${routeData.length} ${
        routeData.length === 1 ? "route" : "routes"
      }.`,
      children: routeChildren
    })
  }
  return root
}
