export interface PublicPropRuntimeShape {
  runtimeTypes: ReadonlySet<string>
  stringLiterals: ReadonlySet<string>
  broadString: boolean
}

/**
 * Runtime categories that can cross the JSON/chart-config boundary. Callback,
 * nullish, and checker-unknown branches do not make a public React prop part of
 * that boundary by themselves.
 */
export function serializableRuntimeTypes(
  prop: PublicPropRuntimeShape
): string[] {
  return [...prop.runtimeTypes].filter(
    (typeName) =>
      typeName !== "function" && typeName !== "null" && typeName !== "unknown"
  )
}

/**
 * Find public props the chart spec does not declare at all.
 *
 * `validateProps` only knows the props a spec composes, so an undeclared
 * public prop — a callback as much as a serializable option — is reported to
 * callers as "Unknown prop". Every member of the chart's public TypeScript
 * type therefore needs a declaration; one that must stay out of the serialized
 * schema is declared with `omitFromSchema` (plus a `runtimeOnly` reason when
 * its type looks serializable).
 */
export function findUndeclaredPublicProps({
  publicProps,
  composedPropNames
}: {
  publicProps: ReadonlyMap<string, PublicPropRuntimeShape>
  composedPropNames: ReadonlySet<string>
}): string[] {
  const missing: string[] = []
  for (const propName of publicProps.keys()) {
    if (!composedPropNames.has(propName)) missing.push(propName)
  }
  return missing
}

/**
 * Public runtime types a spec declaration would reject. Checker-unknown and
 * nullish branches are ignored: `validateProps` skips null/undefined values,
 * and an `any`/generic member has no runtime category to compare.
 */
export function publicTypesRejectedBySpec(
  prop: PublicPropRuntimeShape,
  specTypes: ReadonlySet<string>
): string[] {
  return [...prop.runtimeTypes].filter(
    (typeName) =>
      typeName !== "null" && typeName !== "unknown" && !specTypes.has(typeName)
  )
}

/** Public string literals that a schema enum would reject. */
export function unsupportedPublicEnumValues(
  prop: PublicPropRuntimeShape,
  schemaEnum: readonly string[] | undefined,
  publicCompatibilityValues: readonly string[] = []
): string[] {
  if (!schemaEnum || prop.broadString || prop.stringLiterals.size === 0)
    return []
  const allowed = new Set([...schemaEnum, ...publicCompatibilityValues])
  return [...prop.stringLiterals].filter((value) => !allowed.has(value))
}
