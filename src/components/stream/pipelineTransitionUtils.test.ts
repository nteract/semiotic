import { afterEach, describe, expect, it, vi } from "vitest"
import {
  computeEasing,
  now,
  resolveAnimateConfig
} from "./pipelineTransitionUtils"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("transition utility runtime contracts", () => {
  it.each([undefined, "ease-out", "ease-out-cubic"] as const)(
    "uses cubic progress for %s easing",
    (easing) => {
      expect(computeEasing(0, easing)).toBe(0)
      expect(computeEasing(0.5, easing)).toBe(0.875)
      expect(computeEasing(1, easing)).toBe(1)
      expect(computeEasing(0.5, "linear")).toBe(0.5)
    }
  )

  it("prefers the host's monotonic clock", () => {
    vi.stubGlobal("performance", { now: () => 125.5 })
    vi.spyOn(Date, "now").mockReturnValue(1000)
    expect(now()).toBe(125.5)
  })

  it("supports hosts without a performance clock", () => {
    vi.stubGlobal("performance", undefined)
    vi.spyOn(Date, "now").mockReturnValue(1000)
    expect(now()).toBe(1000)
  })

  it("explicit false overrides legacy transitions without querying media", () => {
    const matchMedia = vi.fn()
    vi.stubGlobal("window", { matchMedia })
    expect(resolveAnimateConfig(false, { duration: 100 })).toEqual({
      transition: undefined,
      introEnabled: false
    })
    expect(matchMedia).not.toHaveBeenCalled()
  })

  it("retains legacy transitions without enabling intro", () => {
    const transition = { duration: 100 }
    const resolved = resolveAnimateConfig(undefined, transition)
    expect(resolved.transition).toBe(transition)
    expect(resolved.introEnabled).toBe(false)
  })

  it("supports default animation in hosts without a window", () => {
    vi.stubGlobal("window", undefined)
    expect(resolveAnimateConfig(true, undefined)).toEqual({
      transition: { duration: 300 },
      introEnabled: true
    })
  })

  it.each(["linear", "ease-out"] as const)(
    "preserves %s options and the intro opt-out",
    (easing) => {
      vi.stubGlobal("window", undefined)
      expect(
        resolveAnimateConfig({ duration: 120, easing, intro: false }, undefined)
      ).toEqual({
        transition: { duration: 120, easing },
        introEnabled: false
      })
    }
  )

  it("respects the host's reduced-motion preference", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) })
    expect(resolveAnimateConfig(true, undefined)).toEqual({
      transition: { duration: 300 },
      introEnabled: false
    })
  })
})
