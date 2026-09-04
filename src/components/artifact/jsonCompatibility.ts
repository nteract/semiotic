function childPath(parent: string, key: string | number): string {
  return typeof key === "number" ? `${parent}[${key}]` : `${parent}.${key}`
}

function symbolPath(parent: string, key: symbol): string {
  return `${parent}[Symbol(${key.description ?? ""})]`
}

function isArrayIndexKey(key: string, length: number): boolean {
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return false
  const index = Number(key)
  return Number.isSafeInteger(index) && index >= 0 && index < length
}

/** Find values that cannot survive a strict JSON round trip unchanged. */
export function nonJsonValuePaths(
  value: unknown,
  path = "$",
  ancestors = new Set<object>()
): string[] {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return []
  if (typeof value === "number") {
    return Number.isFinite(value) && !Object.is(value, -0) ? [] : [path]
  }
  if (typeof value !== "object") return [path]
  if (value instanceof Date) return [path]
  if (ancestors.has(value)) return [path]
  let prototype: object | null
  let ownKeys: Array<string | symbol>
  try {
    prototype = Object.getPrototypeOf(value)
    ownKeys = Reflect.ownKeys(value)
  } catch {
    return [path]
  }
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return [path]
  }

  ancestors.add(value)
  const paths: string[] = []
  if (Array.isArray(value)) {
    for (const key of ownKeys) {
      if (
        key === "length" ||
        (typeof key === "string" && isArrayIndexKey(key, value.length))
      ) {
        continue
      }
      paths.push(
        typeof key === "symbol" ? symbolPath(path, key) : childPath(path, key)
      )
    }
    for (let index = 0; index < value.length; index += 1) {
      const itemPath = childPath(path, index)
      if (!(index in value)) {
        paths.push(itemPath)
        continue
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        paths.push(itemPath)
        continue
      }
      paths.push(...nonJsonValuePaths(descriptor.value, itemPath, ancestors))
    }
  } else {
    for (const key of ownKeys) {
      if (typeof key === "symbol") {
        paths.push(symbolPath(path, key))
        continue
      }
      const entryPath = childPath(path, key)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        paths.push(entryPath)
        continue
      }
      paths.push(...nonJsonValuePaths(descriptor.value, entryPath, ancestors))
    }
  }
  ancestors.delete(value)
  return paths
}
