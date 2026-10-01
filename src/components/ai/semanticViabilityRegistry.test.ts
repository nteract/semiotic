import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const key = Symbol.for("semiotic.semantic-viability")
const host = globalThis as unknown as Record<symbol, unknown>

describe("semantic viability registry initialization", () => {
  let original: PropertyDescriptor | undefined
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(host, key)
    delete host[key]
    vi.resetModules()
  })
  afterEach(() => {
    if (original) Object.defineProperty(host, key, original)
    else delete host[key]
    vi.resetModules()
  })

  it("does no global registration on import and shares entries across module copies", async () => {
    const first = await import("./semanticViabilityRegistry")
    expect(Object.hasOwn(host, key)).toBe(false)
    expect(first.hasRegisteredSemanticViability("TestChart")).toBe(false)
    expect(first.getRegisteredSemanticViability("TestChart")).toBeUndefined()
    first.deleteRegisteredSemanticViability("TestChart")
    expect(Object.hasOwn(host, key)).toBe(false)
    first.setRegisteredSemanticViability("TestChart", undefined)
    expect(first.hasRegisteredSemanticViability("TestChart")).toBe(true)
    expect(first.getRegisteredSemanticViability("TestChart")).toBeUndefined()

    vi.resetModules()
    const second = await import("./semanticViabilityRegistry")
    expect(second.hasRegisteredSemanticViability("TestChart")).toBe(true)
    second.deleteRegisteredSemanticViability("TestChart")
    expect(first.hasRegisteredSemanticViability("TestChart")).toBe(false)
  })
})
