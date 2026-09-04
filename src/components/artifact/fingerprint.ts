import type { JsonValue } from "./types"
import { sha256Text } from "../evidence/stableJsonHash"

export interface CanonicalJsonResult {
  value: JsonValue
  text: string
  excludedPaths: string[]
}

export interface ValueFingerprint extends CanonicalJsonResult {
  algorithm: "sha256"
  digest: string
  fingerprint: string
}

interface CanonicalizeState {
  excluded: string[]
  ancestors: Set<object>
}

function symbolPath(parent: string, key: symbol): string {
  return `${parent}[Symbol(${key.description ?? ""})]`
}

function isArrayIndexKey(key: string, length: number): boolean {
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return false
  const index = Number(key)
  return Number.isSafeInteger(index) && index >= 0 && index < length
}

function childPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`
  return parent ? `${parent}.${key}` : key
}

function sortEncoded(values: JsonValue[]): JsonValue[] {
  return values.sort((left, right) => {
    const leftKey = JSON.stringify(left)
    const rightKey = JSON.stringify(right)
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}

function canonicalValue(
  input: unknown,
  path: string,
  state: CanonicalizeState
): JsonValue | undefined {
  if (input === null) return null
  if (input instanceof Date) {
    const timestamp = input.getTime()
    if (!Number.isFinite(timestamp)) {
      state.excluded.push(path)
      return undefined
    }
    return { $type: "date", value: input.toISOString() }
  }

  switch (typeof input) {
    case "string":
    case "boolean":
      return input
    case "number":
      if (Number.isNaN(input)) return { $type: "number", value: "NaN" }
      if (input === Infinity) return { $type: "number", value: "Infinity" }
      if (input === -Infinity) return { $type: "number", value: "-Infinity" }
      if (Object.is(input, -0)) return { $type: "number", value: "-0" }
      return input
    case "bigint":
      return { $type: "bigint", value: input.toString() }
    case "undefined":
    case "function":
    case "symbol":
      state.excluded.push(path)
      return undefined
    case "object": {
      const object = input as object
      if (state.ancestors.has(object)) {
        state.excluded.push(path)
        return undefined
      }
      state.ancestors.add(object)
      try {
        if (Array.isArray(input)) {
          for (const key of Reflect.ownKeys(input)) {
            if (
              key === "length" ||
              (typeof key === "string" && isArrayIndexKey(key, input.length))
            ) {
              continue
            }
            state.excluded.push(
              typeof key === "symbol"
                ? symbolPath(path, key)
                : childPath(path, key)
            )
          }
          return Array.from({ length: input.length }, (_, index) => {
            const entryPath = childPath(path, index)
            const descriptor = Object.getOwnPropertyDescriptor(
              input,
              String(index)
            )
            if (
              !descriptor ||
              !("value" in descriptor) ||
              !descriptor.enumerable
            ) {
              state.excluded.push(entryPath)
              return null
            }
            const value = canonicalValue(descriptor.value, entryPath, state)
            return value === undefined ? null : value
          })
        }

        const output: Record<string, JsonValue> = {}
        const prototype = Object.getPrototypeOf(input)
        if (prototype !== Object.prototype && prototype !== null) {
          state.excluded.push(path)
          return undefined
        }
        const keys: string[] = []
        for (const key of Reflect.ownKeys(input)) {
          if (typeof key === "symbol") {
            state.excluded.push(symbolPath(path, key))
            continue
          }
          const descriptor = Object.getOwnPropertyDescriptor(input, key)
          if (
            !descriptor ||
            !("value" in descriptor) ||
            !descriptor.enumerable
          ) {
            state.excluded.push(childPath(path, key))
            continue
          }
          keys.push(key)
        }
        for (const key of keys.sort()) {
          const descriptor = Object.getOwnPropertyDescriptor(input, key)
          const value = canonicalValue(
            descriptor && "value" in descriptor ? descriptor.value : undefined,
            childPath(path, key),
            state
          )
          if (value !== undefined) {
            Object.defineProperty(output, key, {
              value,
              enumerable: true,
              configurable: true,
              writable: true
            })
          }
        }
        return output
      } finally {
        state.ancestors.delete(object)
      }
    }
    default:
      state.excluded.push(path)
      return undefined
  }
}

/**
 * Encode every runtime type before hashing so native values cannot collide
 * with ordinary JSON objects that happen to resemble an internal tag.
 */
function fingerprintEncoding(
  input: unknown,
  ancestors = new Set<object>()
): JsonValue {
  if (input === null) return ["null"]
  if (input instanceof Date) {
    return Number.isFinite(input.getTime())
      ? ["date", input.toISOString()]
      : ["excluded"]
  }
  switch (typeof input) {
    case "string":
      return ["string", input]
    case "boolean":
      return ["boolean", input]
    case "number":
      return [
        "number",
        Number.isNaN(input)
          ? "NaN"
          : input === Infinity
            ? "Infinity"
            : input === -Infinity
              ? "-Infinity"
              : Object.is(input, -0)
                ? "-0"
                : String(input)
      ]
    case "bigint":
      return ["bigint", input.toString()]
    case "undefined":
    case "function":
    case "symbol":
      return ["excluded"]
    case "object": {
      if (ancestors.has(input)) return ["excluded"]
      ancestors.add(input)
      try {
        const descriptorEncoding = (key: string | symbol): JsonValue => {
          const keyEncoding: JsonValue =
            typeof key === "symbol"
              ? ["symbol-key", key.description ?? ""]
              : ["string-key", key]
          const descriptor = Object.getOwnPropertyDescriptor(input, key)
          if (!descriptor) return [keyEncoding, "missing"]
          if (!("value" in descriptor)) {
            return [
              keyEncoding,
              "accessor",
              Boolean(descriptor.enumerable),
              Boolean(descriptor.get),
              Boolean(descriptor.set)
            ]
          }
          return [
            keyEncoding,
            "data",
            Boolean(descriptor.enumerable),
            fingerprintEncoding(descriptor.value, ancestors)
          ]
        }
        if (Array.isArray(input)) {
          const elements = Array.from({ length: input.length }, (_, index) => {
            const key = String(index)
            return Object.prototype.hasOwnProperty.call(input, key)
              ? descriptorEncoding(key)
              : (["hole"] as JsonValue)
          })
          const extras = sortEncoded(
            Reflect.ownKeys(input)
              .filter(
                (key) =>
                  key !== "length" &&
                  !(
                    typeof key === "string" &&
                    isArrayIndexKey(key, input.length)
                  )
              )
              .map(descriptorEncoding)
          )
          return ["array", elements, extras]
        }
        const prototype = Object.getPrototypeOf(input)
        return [
          prototype !== Object.prototype && prototype !== null
            ? "non-json-object"
            : "object",
          sortEncoded(Reflect.ownKeys(input).map(descriptorEncoding))
        ]
      } finally {
        ancestors.delete(input)
      }
    }
    default:
      return ["excluded"]
  }
}

/**
 * Convert a value to deterministic JSON by sorting object keys and recording
 * values that cannot be represented. Array positions are retained as null so
 * removal cannot silently shift later evidence.
 */
export function canonicalJson(input: unknown): CanonicalJsonResult {
  const state: CanonicalizeState = {
    excluded: [],
    ancestors: new Set()
  }
  const value = canonicalValue(input, "$", state) ?? null
  return {
    value,
    text: JSON.stringify(value),
    excludedPaths: state.excluded
  }
}

/**
 * Produce a stable SHA-256 content identity. The digest is suitable for cache
 * keys, revision comparisons, and evidence binding; without a trusted signing
 * process it does not prove authorship or tamper resistance.
 */
export function fingerprintValue(input: unknown): ValueFingerprint {
  const canonical = canonicalJson(input)
  const digest = sha256Text(
    JSON.stringify([
      "semiotic-value-fingerprint",
      "v2",
      fingerprintEncoding(input)
    ])
  )
  return {
    ...canonical,
    algorithm: "sha256",
    digest,
    fingerprint: `sha256:${digest}`
  }
}

/** Build a bounded, privacy-conscious evidence sample from row data. */
export function boundedEvidenceSample(
  rows: ReadonlyArray<unknown>,
  options: {
    maxRows?: number
    maxFields?: number
    maxFieldLength?: number
    maxCharacters?: number
    fields?: ReadonlyArray<string>
  } = {}
): {
  rowCount: number
  fields: string[]
  values: JsonValue[]
  truncated: boolean
} {
  const maxRows = Math.max(0, Math.floor(options.maxRows ?? 5))
  const maxFields = Math.max(0, Math.floor(options.maxFields ?? 24))
  const maxFieldLength = Math.max(1, Math.floor(options.maxFieldLength ?? 120))
  const maxCharacters = Math.max(2, Math.floor(options.maxCharacters ?? 12_000))
  const inferredFields = new Set<string>()
  for (const row of rows.slice(0, maxRows)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue
    for (const key of Object.keys(row as Record<string, unknown>)) {
      inferredFields.add(key)
    }
  }
  const requestedFields = [...(options.fields ?? inferredFields)].sort()
  const fields = requestedFields
    .filter((field) => field.length <= maxFieldLength)
    .slice(0, maxFields)
  const values: JsonValue[] = []
  let characterLimited = false
  for (const row of rows.slice(0, maxRows)) {
    let next: JsonValue
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      next = canonicalJson(row).value
    } else {
      const selected: Record<string, unknown> = {}
      for (const field of fields) {
        const value = (row as Record<string, unknown>)[field]
        if (value !== undefined) selected[field] = value
      }
      next = canonicalJson(selected).value
    }
    if (JSON.stringify([...values, next]).length > maxCharacters) {
      characterLimited = true
      break
    }
    values.push(next)
  }
  return {
    rowCount: rows.length,
    fields,
    values,
    truncated:
      rows.length > maxRows ||
      fields.length < requestedFields.length ||
      characterLimited
  }
}
