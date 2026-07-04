/** Structural scene node accepted from any frame family. */
export type AccessibleSceneNode = {
  type?: unknown
  datum?: unknown
  accessibleDatum?: unknown
  accessibility?: unknown
  group?: unknown
  value?: unknown
  category?: unknown
  label?: unknown
  name?: unknown
  properties?: unknown
  tableFields?: unknown
  x?: unknown
  y?: unknown
  w?: unknown
  h?: unknown
  path?: unknown
  topPath?: unknown
  openY?: unknown
  closeY?: unknown
  highY?: unknown
  lowY?: unknown
}

export interface DataRow {
  label: string
  values: Record<string, string | number>
}

/** Pull primitive, user-facing fields from a raw datum into a display row. */
function datumToValues(datum: unknown): Record<string, string | number> {
  const values: Record<string, string | number> = {}
  if (datum == null || typeof datum !== "object") return values
  for (const [key, value] of Object.entries(datum as Record<string, unknown>)) {
    if (key.startsWith("_")) continue
    if (value == null || value === "") continue
    if (typeof value === "number") {
      if (Number.isFinite(value)) values[key] = value
    } else if (typeof value === "string") {
      values[key] = value
    } else if (typeof value === "boolean") {
      values[key] = String(value)
    } else if (value instanceof Date) {
      values[key] = value.toISOString().slice(0, 10)
    }
  }
  return values
}

function nodeRecord(value: unknown): AccessibleSceneNode {
  return value && typeof value === "object"
    ? (value as AccessibleSceneNode)
    : {}
}

function accessibleDatumFor(node: AccessibleSceneNode): unknown {
  const accessibility = nodeRecord(node.accessibility)
  return accessibility.tableFields ?? node.accessibleDatum ?? node.datum
}

/**
 * Extract user-facing table rows from scene nodes. Geometry is ignored; rich
 * accessibleDatum/tableFields metadata takes precedence over the render datum.
 */
export function extractAllRows(scene: AccessibleSceneNode[]): DataRow[] {
  const rows: DataRow[] = []
  if (!Array.isArray(scene)) return rows

  const hasSeriesNodes = scene.some(
    (node) => node && (node.type === "line" || node.type === "area"),
  )

  for (const node of scene) {
    if (!node || typeof node !== "object") continue
    if (node.datum === null) continue
    try {
      switch (node.type) {
        case "point": {
          if (hasSeriesNodes) break
          rows.push({ label: "Point", values: datumToValues(accessibleDatumFor(node)) })
          break
        }
        case "line":
        case "area": {
          const accessible = accessibleDatumFor(node)
          const data = Array.isArray(accessible) ? accessible : []
          const label = node.type === "line" ? "Line point" : "Area point"
          for (const datum of data) {
            rows.push({ label, values: datumToValues(datum) })
          }
          break
        }
        case "rect": {
          const accessible = accessibleDatumFor(node)
          const datum =
            accessible != null && typeof accessible === "object"
              ? (accessible as Record<string, unknown>)
              : {}
          const category = datum.category ?? node.group ?? ""
          const rawValue = datum.value ?? datum.__aggregateValue ?? datum.total
          const values = datumToValues(datum)
          if (values.category == null && category !== "") values.category = String(category)
          if (values.value == null && rawValue != null) {
            values.value =
              typeof rawValue === "number" || typeof rawValue === "string"
                ? rawValue
                : String(rawValue)
          }
          rows.push({ label: "Bar", values })
          break
        }
        case "heatcell": {
          const values = datumToValues(accessibleDatumFor(node))
          if (
            values.value == null &&
            typeof node.value === "number" &&
            Number.isFinite(node.value)
          ) {
            values.value = node.value
          }
          rows.push({ label: "Cell", values })
          break
        }
        case "wedge": {
          const datum = accessibleDatumFor(node)
          const values = datumToValues(datum)
          if (values.category == null) {
            const record = nodeRecord(datum)
            const category = record.category ?? record.label
            if (category != null) values.category = String(category)
          }
          rows.push({ label: "Wedge", values })
          break
        }
        case "circle":
          rows.push({ label: "Node", values: datumToValues(accessibleDatumFor(node)) })
          break
        case "arc":
          rows.push({ label: "Arc", values: datumToValues(accessibleDatumFor(node)) })
          break
        case "candlestick":
          rows.push({ label: "Candlestick", values: datumToValues(accessibleDatumFor(node)) })
          break
        case "geoarea": {
          const datum = nodeRecord(accessibleDatumFor(node))
          const values = datumToValues(datum)
          if (values.name == null) {
            const properties = nodeRecord(datum.properties)
            const name = properties.name ?? datum.name
            if (name != null) values.name = String(name)
          }
          rows.push({ label: "Region", values })
          break
        }
      }
    } catch {
      // Malformed node — skip rather than crash the accessibility surface.
    }
  }
  return rows
}
