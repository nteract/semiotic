import { describe, expect, it } from "vitest"
import {
  classifyReserve,
  demandForecastRows,
  formatMw,
  formatReservePct,
  gridEventAnnotations,
  GRID_FUEL_KEYS,
  reserveAnnotationBands,
  reserveClasses,
  reserveMarginPct,
  reserveSeries,
  stackFuelSeries,
  summarizeOperatingPoint,
  thresholdBandsForReserve,
  tightestHours,
  type GridHour,
} from "./gridObservatory"
import { isHatchFill } from "../charts/shared/hatchFill"
import { resolveStyleRules } from "../charts/shared/styleRules"

const SAMPLE: GridHour[] = [
  {
    t: 1_700_000_000_000,
    ba: "ERCO",
    demandMw: 50_000,
    forecastMw: 48_000,
    netGenMw: 52_000,
    interchangeMw: -500,
    fuels: {
      naturalGas: 20_000,
      wind: 15_000,
      coal: 8_000,
      nuclear: 5_000,
      solar: 3_000,
      hydro: 500,
      other: 500,
    },
  },
  {
    t: 1_700_003_600_000,
    ba: "ERCO",
    demandMw: 55_000,
    forecastMw: 53_000,
    netGenMw: 54_000,
    interchangeMw: 200,
    fuels: {
      naturalGas: 28_000,
      wind: 8_000,
      coal: 10_000,
      nuclear: 5_000,
      solar: 2_000,
      other: 1_000,
    },
  },
  {
    t: 1_700_007_200_000,
    ba: "ERCO",
    demandMw: 60_000,
    forecastMw: 58_000,
    netGenMw: 58_500,
    fuels: {
      naturalGas: 32_000,
      coal: 12_000,
      nuclear: 5_000,
      wind: 6_000,
      solar: 2_500,
      other: 1_000,
    },
  },
]

describe("stackFuelSeries", () => {
  it("emits long-form rows with stable fuel keys and omits zeros by default", () => {
    const rows = stackFuelSeries(SAMPLE)
    expect(rows.every((r) => GRID_FUEL_KEYS.includes(r.fuel))).toBe(true)
    expect(rows.some((r) => r.fuel === "hydro" && r.t === SAMPLE[1].t)).toBe(false)
    const firstGas = rows.find((r) => r.t === SAMPLE[0].t && r.fuel === "naturalGas")
    expect(firstGas?.mw).toBe(20_000)
    expect(firstGas?.fuelLabel).toBe("Natural gas")
  })

  it("can include zero fuels when asked", () => {
    const rows = stackFuelSeries([SAMPLE[1]], { includeZero: true })
    expect(rows.filter((r) => r.t === SAMPLE[1].t)).toHaveLength(GRID_FUEL_KEYS.length)
  })
})

describe("demandForecastRows", () => {
  it("pairs demand (a) with forecast (b) and skips missing forecasts", () => {
    const rows = demandForecastRows([
      ...SAMPLE,
      { ...SAMPLE[0], t: 99, forecastMw: undefined },
    ])
    expect(rows).toHaveLength(3)
    expect(rows[0].a).toBe(50_000)
    expect(rows[0].b).toBe(48_000)
    expect(rows[0].errorMw).toBe(2_000)
  })
})

describe("reserveMarginPct", () => {
  it("computes (supply - demand) / demand * 100 with import boost", () => {
    // gen 52k + import 500 = 52500; demand 50k → 5%
    expect(
      reserveMarginPct({ demand: 50_000, capacityOrNetGen: 52_000, interchange: -500 }),
    ).toBeCloseTo(5, 5)
  })

  it("returns negative when demand exceeds supply", () => {
    expect(reserveMarginPct({ demand: 60_000, capacityOrNetGen: 58_500 })).toBeCloseTo(
      ((58_500 - 60_000) / 60_000) * 100,
      5,
    )
  })

  it("returns 0 for non-positive demand", () => {
    expect(reserveMarginPct({ demand: 0, capacityOrNetGen: 10 })).toBe(0)
  })
})

describe("reserveSeries + tightestHours", () => {
  it("maps hours to snapshots and ranks the tightest first", () => {
    const series = reserveSeries(SAMPLE)
    expect(series).toHaveLength(3)
    // Net load is demand minus wind and solar.
    expect(series[0].netLoadMw).toBe(50_000 - 15_000 - 3_000)
    const tight = tightestHours(series, 2)
    expect(tight[0].t).toBe(SAMPLE[2].t)
    expect(tight[0].reserveMarginPct).toBeLessThan(tight[1].reserveMarginPct)
  })
})

describe("thresholdBandsForReserve", () => {
  it("emits cascade-ordered styleRules with hatch on the tight band", () => {
    const rules = thresholdBandsForReserve()
    expect(rules.map((r) => r.id)).toEqual([
      "reserve-comfortable",
      "reserve-moderate",
      "reserve-watch",
      "reserve-tight",
    ])
    const tightStyle = rules[3].style
    expect(typeof tightStyle).toBe("object")
    if (typeof tightStyle === "object" && tightStyle && "fill" in tightStyle) {
      expect(isHatchFill(tightStyle.fill)).toBe(true)
    }

    const resolvedTight = resolveStyleRules({ reserveMarginPct: 3 }, rules, { value: 3 })
    expect(isHatchFill(resolvedTight.fill)).toBe(true)

    const resolvedOk = resolveStyleRules({ reserveMarginPct: 25 }, rules, { value: 25 })
    expect(resolvedOk.fill).toBe("var(--semiotic-success, #16a34a)")
  })

  it("supports a named field for XY / bar contexts", () => {
    const rules = thresholdBandsForReserve({}, { field: "reserveMarginPct" })
    // 8% is in the watch band (default 5–12); ctx.value is ignored when field is set.
    const resolved = resolveStyleRules({ reserveMarginPct: 8 }, rules, { value: 999 })
    expect(resolved.fill).toBe("var(--semiotic-warning, #d97706)")
  })
})

describe("reserveAnnotationBands", () => {
  it("returns secondary y-bands for each class", () => {
    const bands = reserveAnnotationBands({ tight: 5, watch: 12, comfortable: 20 })
    expect(bands.map((b) => [b.label, b.y0, b.y1])).toEqual([
      ["Tight", -50, 5],
      ["Watch", 5, 12],
      ["Moderate", 12, 20],
      ["Comfortable", 20, 50],
    ])
    expect(bands.every((b) => b.type === "band" && b.emphasis === "secondary")).toBe(true)
  })

  it("spans the outer bands to the value extent, reaching the levels", () => {
    const bands = reserveAnnotationBands({}, { extent: [-12, 34] })
    expect([bands[0].y0, bands.at(-1)?.y1]).toEqual([-12, 34])
    const narrow = reserveAnnotationBands({}, { extent: [8, 15] })
    expect([narrow[0].y0, narrow.at(-1)?.y1]).toEqual([5, 20])
  })
})

describe("reserve classification", () => {
  const levels = { tight: 5, watch: 12, comfortable: 20 }
  const rules = thresholdBandsForReserve(levels, { field: "reserveMarginPct" })
  const bands = reserveAnnotationBands(levels)
  const ruleLabel = (value: number) => {
    const style = resolveStyleRules({ reserveMarginPct: value }, rules, { value })
    return rules.find((r) => r.style === style || (typeof r.style === "object" && r.style?.fill === style.fill))?.id
  }
  const bandLabel = (value: number) =>
    bands.find((b, i) => value >= b.y0 && (value < b.y1 || i === bands.length - 1))?.label

  it("gives a mark's style rule and the band behind it the same class", () => {
    for (const value of [-10, 3, 4.99, 5, 8, 11.99, 12, 15, 19.99, 20, 25, 50]) {
      const cls = classifyReserve(value, levels)
      expect(ruleLabel(value), `rule at ${value}`).toBe(`reserve-${cls?.id}`)
      expect(bandLabel(value), `band at ${value}`).toBe(cls?.name)
    }
    expect(classifyReserve(8, levels)?.id).toBe("watch")
    expect(classifyReserve(Number.NaN, levels)).toBeNull()
  })

  it("raises crossed levels and drops empty classes", () => {
    expect(reserveClasses({ tight: 10, watch: 4, comfortable: 30 }).map((c) => [c.id, c.min, c.max])).toEqual([
      ["tight", undefined, 10],
      ["moderate", 10, 30],
      ["comfortable", 30, undefined],
    ])
  })
})

describe("summarizeOperatingPoint", () => {
  it("picks the last hour ≤ now and reports top fuel share", () => {
    const summary = summarizeOperatingPoint(SAMPLE, SAMPLE[1].t)
    expect(summary?.t).toBe(SAMPLE[1].t)
    expect(summary?.topFuel).toBe("naturalGas")
    expect(summary?.topFuelShare).toBeCloseTo(28_000 / 54_000, 5)
    expect(summary?.forecastErrorMw).toBe(2_000)
  })

  it("returns null for empty input", () => {
    expect(summarizeOperatingPoint([])).toBeNull()
  })
})

describe("gridEventAnnotations", () => {
  it("stamps provenance and lifecycle for applyAnnotationLifecycle", () => {
    const anns = gridEventAnnotations(
      [
        {
          id: "heat-1",
          start: 1_700_000_000_000,
          end: 1_700_100_000_000,
          label: "Heat crest",
          kind: "heat-wave",
          note: "Demand peak window",
        },
      ],
      { author: "scenario", source: "fixture" },
    )
    expect(anns).toHaveLength(1)
    expect(anns[0].type).toBe("x-band")
    expect(anns[0].x0).toBe(1_700_000_000_000)
    expect((anns[0].provenance as { stableId: string }).stableId).toBe("heat-1")
    expect((anns[0].lifecycle as { status: string }).status).toBe("accepted")
    expect((anns[0].lifecycle as { ttlHint: string }).ttlHint).toBe("P14D")
    expect(anns[0].provenance).not.toHaveProperty("confidence")
  })

  it("stamps a caller-supplied provenance confidence", () => {
    const [ann] = gridEventAnnotations(
      [{ id: "e", start: 0, end: 1, label: "E" }],
      { confidence: 0.6 },
    )
    expect((ann.provenance as { confidence: number }).confidence).toBe(0.6)
  })
})

describe("format helpers", () => {
  it("formats MW and reserve percent", () => {
    expect(formatMw(12345)).toMatch(/12[,.]?345 MW/)
    expect(formatReservePct(5.25)).toBe("+5.3%")
    expect(formatReservePct(-2.1)).toBe("-2.1%")
    expect(formatMw(Number.NaN)).toBe("—")
  })
})
