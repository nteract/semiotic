import assert from "node:assert/strict"
import { describe, expect, it } from "vitest"
import * as lineEntry from "../components/semiotic-line"
import * as themesEntry from "../components/semiotic-themes-react"

describe("mixed-subpath module identity", () => {
  it("keeps LineChart in the canonical client identity graph", () => {
    expect(typeof lineEntry.LineChart).toBe("function")
    expect(themesEntry.ThemeProvider).toBeDefined()
  })
})
