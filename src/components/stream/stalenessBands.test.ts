import { resolveStaleness, DEFAULT_STALENESS_BAND_OPACITY } from "./stalenessBands"

describe("resolveStaleness — binary mode", () => {
  it("is fresh with no config", () => {
    expect(resolveStaleness(undefined, 10_000)).toEqual({ alpha: 1, band: "fresh", isStale: false })
  })

  it("is fresh before the threshold", () => {
    const r = resolveStaleness({ threshold: 5000 }, 3000)
    expect(r.isStale).toBe(false)
    expect(r.alpha).toBe(1)
  })

  it("is stale past the threshold with dimOpacity", () => {
    const r = resolveStaleness({ threshold: 5000, dimOpacity: 0.4 }, 6000)
    expect(r.isStale).toBe(true)
    expect(r.alpha).toBe(0.4)
    expect(r.band).toBe("stale")
  })

  it("treats no idle (idleMs<=0) as fresh", () => {
    expect(resolveStaleness({ threshold: 5000 }, 0).isStale).toBe(false)
  })
})

describe("resolveStaleness — graded mode", () => {
  const cfg = { threshold: 5000, graded: true as const }

  it("ramps through the bands as idle grows", () => {
    expect(resolveStaleness(cfg, 1000).band).toBe("fresh") // < 1×
    expect(resolveStaleness(cfg, 6000).band).toBe("aging") // 1×–1.5×
    expect(resolveStaleness(cfg, 10_000).band).toBe("stale") // 1.5×–3×
    expect(resolveStaleness(cfg, 20_000).band).toBe("expired") // > 3×
  })

  it("applies the default per-band opacities", () => {
    expect(resolveStaleness(cfg, 1000).alpha).toBe(DEFAULT_STALENESS_BAND_OPACITY.fresh)
    expect(resolveStaleness(cfg, 6000).alpha).toBe(DEFAULT_STALENESS_BAND_OPACITY.aging)
    expect(resolveStaleness(cfg, 10_000).alpha).toBe(DEFAULT_STALENESS_BAND_OPACITY.stale)
    expect(resolveStaleness(cfg, 20_000).alpha).toBe(DEFAULT_STALENESS_BAND_OPACITY.expired)
  })

  it("marks any non-fresh band as stale for the badge", () => {
    expect(resolveStaleness(cfg, 1000).isStale).toBe(false)
    expect(resolveStaleness(cfg, 6000).isStale).toBe(true)
  })

  it("honors opacity overrides", () => {
    const r = resolveStaleness(
      { threshold: 5000, graded: { opacities: { aging: 0.9 } } },
      6000
    )
    expect(r.band).toBe("aging")
    expect(r.alpha).toBe(0.9)
  })

  it("honors threshold-multiple overrides", () => {
    // Push the fresh edge out to 2× (10s); 6s now stays fresh instead of aging.
    expect(
      resolveStaleness({ threshold: 5000, graded: { thresholds: { fresh: 2 } } }, 6000).band
    ).toBe("fresh")
    // Default schedule: 6s would be aging.
    expect(resolveStaleness({ threshold: 5000, graded: true }, 6000).band).toBe("aging")
  })
})
