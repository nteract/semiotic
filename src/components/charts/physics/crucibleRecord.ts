/**
 * Create a string-keyed Crucible dictionary without inherited keys.
 * Authored component, product, relation, and metric identifiers may legally
 * match names such as `constructor` or `__proto__`.
 */
export function createCrucibleRecord<T>(
  entries: Iterable<readonly [string, T]> = []
): Record<string, T> {
  const record = Object.create(null) as Record<string, T>
  for (const [key, value] of entries) record[key] = value
  return record
}

export function mergeCrucibleRecords<T>(
  ...sources: Array<Readonly<Record<string, T>> | undefined>
): Record<string, T> {
  const record = createCrucibleRecord<T>()
  for (const source of sources) {
    for (const [key, value] of Object.entries(source ?? {})) {
      record[key] = value
    }
  }
  return record
}
