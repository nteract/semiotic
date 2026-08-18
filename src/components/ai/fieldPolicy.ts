import type {
  ChartCapability,
  ChartDataProfile,
  ChartVariant
} from "./chartCapabilityTypes"
import { identifierFields } from "./fieldRoles"

const CONVENTIONAL_MEASURE_ACCESSOR_PROPS = [
  "xAccessor",
  "yAccessor",
  "valueAccessor",
  "sizeAccessor",
  "sizeBy",
  "weightAccessor",
  "radiusAccessor",
  "rAccessor",
  "amountAccessor",
  "measureAccessor"
] as const

/**
 * Return a diagnostic when a capability proposal treats an identifier as a
 * quantitative measure. This is shared by every AI proposal/evaluation path
 * so a variant cannot bypass the policy that ordinary suggestions enforce.
 */
export function identifierMeasureViolation(
  capability: ChartCapability,
  profile: ChartDataProfile,
  props: Readonly<Record<string, unknown>>,
  variant?: ChartVariant
): string | null {
  const identifiers = new Set([
    ...(profile.identifiers ?? []),
    ...identifierFields(profile.fieldRoles ?? {})
  ])
  if (
    identifiers.size === 0 ||
    capability.fieldPolicy?.allowIdentifierMeasures === true
  ) {
    return null
  }

  const accessorProps = new Set<string>([
    ...CONVENTIONAL_MEASURE_ACCESSOR_PROPS,
    ...(capability.fieldPolicy?.measureAccessorProps ?? [])
  ])
  for (const propName of accessorProps) {
    const field = props[propName]
    if (typeof field === "string" && identifiers.has(field)) {
      return `${capability.component} cannot use identifier field "${field}" as the measure in "${propName}".`
    }
  }

  const resolvedFields =
    capability.fieldPolicy?.measureFields?.(profile, props, variant) ?? []
  const identifier = resolvedFields.find((field) => identifiers.has(field))
  return identifier
    ? `${capability.component} cannot use identifier field "${identifier}" as a measure.`
    : null
}
