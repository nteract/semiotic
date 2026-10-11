import type { SemioticTheme } from "./themeCore"

/** Theme fields are records, arrays, and primitive values. Clone every nested field. */
export function cloneTheme(theme: SemioticTheme): SemioticTheme {
  function copy<Value>(value: Value): Value {
    if (Array.isArray(value)) return value.map(copy) as Value
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, field]) => [key, copy(field)])
      ) as Value
    }
    return value
  }
  return copy(theme)
}
