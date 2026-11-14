/** Dates travel as ISO strings with explicit paths, never inferred from user strings. */
export function encodeDates(value: unknown): {
  value: unknown
  datePaths: string[][]
} {
  const datePaths: string[][] = []
  const ancestors = new Set<object>()
  const visit = (current: unknown, path: string[]): unknown => {
    if (!current || typeof current !== "object") return current
    const prototype = Object.getPrototypeOf(current)
    if (prototype === Date.prototype && Reflect.ownKeys(current).length === 0) {
      const time = Date.prototype.getTime.call(current)
      if (!Number.isFinite(time)) return current
      datePaths.push(path)
      return new Date(time).toISOString()
    }
    const array = Array.isArray(current)
    if (
      prototype !== (array ? Array.prototype : Object.prototype) &&
      prototype !== null
    )
      return current
    // Leave cycles for the strict JSON validator to report; do not invoke getters.
    if (ancestors.has(current)) return current
    ancestors.add(current)
    const result = array ? [] : Object.create(prototype)
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)!
      if (typeof key === "string" && "value" in descriptor) {
        descriptor.value = visit(descriptor.value, [...path, key])
      }
      Object.defineProperty(result, key, descriptor)
    }
    ancestors.delete(current)
    return result
  }
  return { value: visit(value, []), datePaths }
}

export const cloneConfigValue: <T>(value: T) => T =
  typeof structuredClone === "function"
    ? structuredClone
    : <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Restore only declared own-property paths, rejecting stale or malformed metadata. */
export function restoreDates<T>(value: T, datePaths?: string[][]): T {
  const result = cloneConfigValue(value)
  if (datePaths === undefined) return result
  if (!Array.isArray(datePaths)) throw new TypeError("Invalid config datePaths")
  for (const path of datePaths) {
    if (
      !Array.isArray(path) ||
      !path.length ||
      path.some((key) => typeof key !== "string")
    ) {
      throw new TypeError("Invalid config datePaths")
    }
    let parent: unknown = result
    for (const key of path.slice(0, -1)) {
      if (
        !parent ||
        typeof parent !== "object" ||
        !Object.prototype.hasOwnProperty.call(parent, key)
      ) {
        throw new TypeError("Invalid config date path")
      }
      parent = (parent as Record<string, unknown>)[key]
    }
    const key = path[path.length - 1]
    if (
      !parent ||
      typeof parent !== "object" ||
      !Object.prototype.hasOwnProperty.call(parent, key)
    ) {
      throw new TypeError("Invalid config date path")
    }
    const text = (parent as Record<string, unknown>)[key]
    const date = typeof text === "string" ? new Date(text) : new Date(NaN)
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== text) {
      throw new TypeError("Invalid config date value")
    }
    Object.defineProperty(parent, key, {
      value: date,
      enumerable: true,
      writable: true,
      configurable: true
    })
  }
  return result
}

/** JSX for a prop containing revived Dates; ordinary JSON props keep their usual formatting. */
export function datePropToJSX(value: unknown): string {
  if (value instanceof Date)
    return `new Date(${JSON.stringify(value.toISOString())})`
  if (Array.isArray(value)) return `[${value.map(datePropToJSX).join(", ")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .map(
        ([key, item]) =>
          `${key === "__proto__" ? '["__proto__"]' : JSON.stringify(key)}: ${datePropToJSX(item)}`
      )
      .join(", ")}}`
  }
  return JSON.stringify(value)
}
