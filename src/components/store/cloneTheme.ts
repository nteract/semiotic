import type { SemioticTheme } from "./themeCore"

/** Theme fields are records, arrays, and primitive values. Clone every nested field. */
export function cloneTheme(theme: SemioticTheme): SemioticTheme
export function cloneTheme(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneTheme)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [key, cloneTheme(field)])
    )
  }
  return value
}
