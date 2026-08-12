import { describe, expect, it } from "vitest"
import { resolveThemePreset } from "./themePresets"
import type {
  KnownThemePresetName,
  ThemePresetName
} from "./themePresets"

const knownPreset: KnownThemePresetName = "tufte-dark"
// @ts-expect-error — strict preset names reject misspelled built-in slugs.
const misspelledKnownPreset: KnownThemePresetName = "tuffte-dark"

const dynamicPreset: string = "customer-brand-theme"
const compatiblePreset: ThemePresetName = dynamicPreset

void knownPreset
void misspelledKnownPreset
void compatiblePreset

describe("theme preset names", () => {
  it("resolves own built-in keys and rejects inherited keys", () => {
    expect(resolveThemePreset("tufte-dark")?.mode).toBe("dark")
    expect(resolveThemePreset("toString")).toBeUndefined()
  })
})
