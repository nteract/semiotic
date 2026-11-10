import type {
  ServerPropContract,
  ServerPropExclusion
} from "../../consumer-contracts/server-props"

export interface PropSurface {
  runtimeTypes: readonly string[]
  wire: boolean
}
export interface ComponentSurface {
  supported: boolean
  props: Record<string, PropSurface>
}
export type ServerPropInventory = Record<string, ComponentSurface>
export type LegacyServerProps = Record<string, string[]>
export interface CoverageRow {
  component: string
  prop: string
  status:
    "server-behavior-tested" | ServerPropExclusion["status"] | "unclassified"
  contracts?: string[]
  reason?: string
  wire: boolean
}

/** No renderer imports: metadata proves declared coverage, never behavior. */
export function reviewServerPropCoverage({
  inventory,
  contracts,
  exclusions,
  unsupportedCharts,
  legacy,
  fixtures,
  assertions
}: {
  inventory: ServerPropInventory
  contracts: readonly ServerPropContract[]
  exclusions: readonly ServerPropExclusion[]
  unsupportedCharts: Readonly<Record<string, string>>
  legacy: LegacyServerProps
  fixtures: ReadonlySet<string>
  assertions: ReadonlySet<string>
}) {
  const errors: string[] = []
  const rows = new Map<string, CoverageRow>()
  const key = (component: string, prop: string) => `${component}.${prop}`
  for (const [component, surface] of Object.entries(inventory)) {
    if (!surface.supported) {
      if (!unsupportedCharts[component]?.trim())
        errors.push(
          `${component}: unsupported chart needs a chart-level reason`
        )
      continue
    }
    if (Object.hasOwn(unsupportedCharts, component))
      errors.push(
        `${component}: supported chart cannot be excluded as unsupported`
      )
    for (const [prop, shape] of Object.entries(surface.props))
      rows.set(key(component, prop), {
        component,
        prop,
        wire: shape.wire,
        status: "unclassified"
      })
  }
  for (const component of Object.keys(unsupportedCharts)) {
    if (!inventory[component])
      errors.push(`${component}: stale unsupported chart`)
  }
  const ids = new Set<string>()
  for (const contract of contracts) {
    const label = `contract ${contract.id}`
    if (!contract.id.trim() || ids.has(contract.id))
      errors.push(`${label}: duplicate/empty ID`)
    ids.add(contract.id)
    if (!contract.observable.trim())
      errors.push(`${label}: observable result is required`)
    if (!assertions.has(contract.id))
      errors.push(`${label}: missing executable assertion`)
    if (contract.fixture && !fixtures.has(contract.fixture))
      errors.push(`${label}: unknown consumer fixture ${contract.fixture}`)
    if (!contract.props.length) errors.push(`${label}: no covered props`)
    const paths = new Set<string>()
    for (const prop of contract.props) {
      if (paths.has(prop)) errors.push(`${label}: duplicate prop ${prop}`)
      paths.add(prop)
      const row = rows.get(key(contract.component, prop))
      if (!row) {
        errors.push(
          `${label}: unknown/unsupported path ${key(contract.component, prop)}`
        )
        continue
      }
      row.status = "server-behavior-tested"
      row.contracts = [...(row.contracts ?? []), contract.id]
    }
  }
  for (const id of assertions) {
    if (!ids.has(id)) errors.push(`${id}: assertion lacks coverage metadata`)
  }
  for (const exclusion of exclusions) {
    const label = key(exclusion.component, exclusion.prop)
    const row = rows.get(label)
    if (!row) {
      errors.push(`${label}: unknown/unsupported exclusion`)
      continue
    }
    if (row.status !== "unclassified")
      errors.push(`${label}: conflicting coverage classifications`)
    if (!exclusion.reason.trim())
      errors.push(`${label}: exclusion needs a reason`)
    if (
      !["intentionally-client-only", "runtime-callback-only"].includes(
        exclusion.status
      )
    )
      errors.push(`${label}: invalid exclusion classification`)
    if (exclusion.status === "runtime-callback-only") {
      const types =
        inventory[exclusion.component].props[exclusion.prop].runtimeTypes
      if (types.length !== 1 || types[0] !== "function")
        errors.push(
          `${label}: callback-only exclusion requires a function-only prop; mixed/server values need their own review`
        )
    }
    row.status = exclusion.status
    row.reason = exclusion.reason
  }
  const legacyKeys = new Set<string>()
  for (const [component, props] of Object.entries(legacy)) {
    if (!inventory[component]?.supported || !Array.isArray(props)) {
      errors.push(`${component}: invalid legacy component inventory`)
      continue
    }
    for (const prop of props) {
      const label = key(component, prop)
      if (legacyKeys.has(label)) errors.push(`${label}: duplicate legacy path`)
      legacyKeys.add(label)
      const row = rows.get(label)
      if (!row) errors.push(`${label}: stale legacy path; remove it`)
      else if (row.status !== "unclassified")
        errors.push(`${label}: classified path must leave the legacy inventory`)
    }
  }
  for (const [label, row] of rows) {
    if (row.status === "unclassified" && !legacyKeys.has(label))
      errors.push(
        `${label}: new supported prop needs explicit coverage classification`
      )
  }
  const charts = Object.entries(inventory).map(([component, surface]) => ({
    component,
    supported: surface.supported,
    ...(surface.supported ? {} : { reason: unsupportedCharts[component] })
  }))
  return { charts, rows: [...rows.values()], errors }
}

/** Walk declared nested wire fields, including arrays and schema alternatives.
 * Open dictionaries do not imply that arbitrary keys are covered. */
export function schemaPropPaths(
  schema: Record<string, unknown>,
  prefix = ""
): Set<string> {
  const paths = new Set<string>()
  const visit = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return
    const value = node as Record<string, unknown>
    if (value.$ref)
      throw new Error(`Unresolved schema reference at ${path}: ${value.$ref}`)
    for (const [name, child] of Object.entries(value.properties ?? {})) {
      const next = path ? `${path}.${name}` : name
      paths.add(next)
      visit(child, next)
    }
    if (value.items) visit(value.items, `${path}[]`)
    for (const alternative of ["oneOf", "anyOf", "allOf"]) {
      if (Array.isArray(value[alternative]))
        for (const child of value[alternative]) visit(child, path)
    }
  }
  visit(schema, prefix)
  return paths
}
