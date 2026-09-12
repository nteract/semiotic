/** Prototype-safe dictionaries so author ids such as `__proto__` stay data. */

export function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

export function ownValue<T>(
  record: Record<string, T>,
  key: string
): T | undefined {
  return hasOwn(record, key) ? record[key] : undefined
}

export function setOwnValue<T>(
  record: Record<string, T>,
  key: string,
  value: T
): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  })
}

export function idDictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}
