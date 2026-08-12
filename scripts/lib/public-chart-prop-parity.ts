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
 * Find serializable public props that have neither a chart-spec declaration
 * nor a chart-scoped, classified exclusion. Keeping the exception set scoped
 * to one chart prevents an exemption for (say) a React-only `style` prop from
 * masking a later `style` omission on an unrelated chart.
 */
export function findUnclassifiedPublicProps({
  publicProps,
  composedPropNames,
  exceptionPropNames
}: {
  publicProps: ReadonlyMap<string, PublicPropRuntimeShape>
  composedPropNames: ReadonlySet<string>
  exceptionPropNames: ReadonlySet<string>
}): string[] {
  const missing: string[] = []
  for (const [propName, publicProp] of publicProps) {
    if (composedPropNames.has(propName)) continue
    if (serializableRuntimeTypes(publicProp).length === 0) continue
    if (!exceptionPropNames.has(propName)) missing.push(propName)
  }
  return missing
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
