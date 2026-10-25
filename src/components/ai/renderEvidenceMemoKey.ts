/** Bound key construction as well as the number of retained configurations. */
const MAX_KEY_CHARACTERS = 65_536
const MAX_KEY_NODES = 4_096
const MAX_KEY_DEPTH = 24

/**
 * Structural keys for ordinary chart data and props. Unsupported values,
 * accessors, cycles and oversized inputs bypass memoization rather than risk
 * stale evidence or unbounded serialization work. Enumeration order and
 * enumerability are significant; functions retain identity.
 */
export function renderEvidenceMemoKey(
  component: string,
  props: Record<string, unknown>,
  functionIds: WeakMap<object, number>,
  nextFunctionId: { value: number }
): string | undefined {
  let nodes = 0
  let characters = 0
  const ancestors = new Set<object>()
  function spend(value: string): string {
    // JSON escapes can expand each input character to six output characters.
    characters += value.length * 6 + 16
    if (characters > MAX_KEY_CHARACTERS) throw new Error("key budget")
    return value
  }
  function visit(value: unknown, depth: number): unknown {
    if (++nodes > MAX_KEY_NODES || depth > MAX_KEY_DEPTH)
      throw new Error("key budget")
    spend("")
    if (value === null) return ["null"]
    switch (typeof value) {
      case "undefined":
        return ["undefined"]
      case "string":
        return ["string", spend(value)]
      case "boolean":
        return ["boolean", value]
      case "number":
        return ["number", Object.is(value, -0) ? "-0" : String(value)]
      case "bigint":
        return ["bigint", spend(String(value))]
      case "function": {
        let id = functionIds.get(value)
        if (id === undefined) {
          id = nextFunctionId.value++
          functionIds.set(value, id)
        }
        return ["function", id]
      }
      case "object": {
        if (ancestors.has(value) || Object.getOwnPropertySymbols(value).length)
          throw new Error("unsupported key")
        const prototype = Object.getPrototypeOf(value)
        const names = Object.getOwnPropertyNames(value)
        if (names.length > MAX_KEY_NODES - nodes) throw new Error("key budget")
        if (prototype === Date.prototype && names.length === 0) {
          return ["date", String(Date.prototype.getTime.call(value))]
        }
        const array = Array.isArray(value)
        if (!array && prototype !== Object.prototype && prototype !== null)
          throw new Error("unsupported key")
        ancestors.add(value)
        // Palette selection, inferred fields and custom renderers can observe
        // Object.keys/values order, including changes made to existing inputs.
        const entries = names.map((name) => {
          const descriptor = Object.getOwnPropertyDescriptor(value, name)!
          if (!("value" in descriptor)) throw new Error("accessor key")
          return [
            spend(name),
            descriptor.enumerable,
            visit(descriptor.value, depth + 1)
          ]
        })
        ancestors.delete(value)
        return [
          array ? "array" : prototype === null ? "record" : "object",
          entries
        ]
      }
      default:
        throw new Error("unsupported key")
    }
  }
  try {
    return JSON.stringify([spend(component), visit(props, 0)])
  } catch {
    return undefined
  }
}
