import { describe, expect, it } from "vitest"
import type {
  ChartCapability,
  ChartDataProfile,
} from "../../ai/chartCapabilityTypes"
import { suggestCharts } from "../../ai/suggestCharts"
import { profileData } from "../../ai/profileData"
import {
  bindPortableCapability,
  type BoundPortableChartCapability,
} from "./capabilityBinding"
import { attachIDID, readIDID } from "./vegaLite"

const rows = [
  { category: "North", value: 12 },
  { category: "South", value: 8 },
  { category: "West", value: 17 },
]

function hostCapability(
  fits: ChartCapability["fits"] = () => null,
): ChartCapability {
  return {
    component: "PortableBars",
    family: "categorical",
    importPath: "semiotic/ordinal",
    rubric: { familiarity: 5, accuracy: 5, precision: 4 },
    fits,
    intentScores: {
      "compare-categories": 5,
      distribution: 3,
    },
    variants: [{
      key: "host-only",
      label: "Host only",
      props: { sort: "desc" },
    }],
    caveats: (profile) =>
      profile.rowCount < 5 ? ["Host needs more rows for a stable read."] : [],
    buildProps: (profile, variant) => ({
      data: profile.data,
      categoryAccessor: profile.primary.category,
      valueAccessor: profile.primary.y,
      ...(variant?.props ?? {}),
    }),
  }
}

const portable = {
  specVersion: "0.1",
  component: "PortableBars",
  family: "ordinal",
  importPath: "another-library/bar",
  rubric: { familiarity: 2, accuracy: 4, precision: 3 },
  intentScores: {
    "compare-categories": 2,
    rank: 5,
  },
  variants: [{
    key: "portable-order",
    label: "Portable order",
    props: { sort: false },
    intentDeltas: { rank: 1 },
  }],
  caveats: ["Portable policy caveat."],
  tags: ["external"],
}

function expectBound(
  result: ReturnType<typeof bindPortableCapability>,
): asserts result is typeof result & {
  capability: BoundPortableChartCapability
} {
  expect(result.status).toBe("success")
  expect(result.capability).toBeDefined()
}

describe("bindPortableCapability", () => {
  it("overlays portable scoring policy while retaining host execution", () => {
    const host = hostCapability()
    const result = bindPortableCapability(portable, host)
    expectBound(result)

    const bound = result.capability
    expect(bound.family).toBe(host.family)
    expect(bound.importPath).toBe(host.importPath)
    expect(bound.rubric).toEqual(portable.rubric)
    expect(bound.intentScores).toEqual(portable.intentScores)
    expect(bound.variants?.map((variant) => variant.key)).toEqual([
      "portable-order",
    ])
    expect(bound.portableDescriptor).toBe(portable)

    const profile = profileData(rows)
    expect(bound.fits(profile)).toBeNull()
    expect(bound.buildProps(profile, bound.variants?.[0])).toMatchObject({
      data: rows,
      sort: false,
    })
    expect(bound.caveats?.(profile)).toEqual([
      "Host needs more rows for a stable read.",
      "Portable policy caveat.",
    ])
  })

  it("retains host intent scores when the portable descriptor omits them", () => {
    const host = hostCapability()
    const { intentScores: _intentScores, ...withoutIntentScores } = portable
    const result = bindPortableCapability(withoutIntentScores, host)
    expectBound(result)

    expect(result.capability.intentScores).toEqual(host.intentScores)
    expect(result.capability.intentScores).not.toBe(host.intentScores)
  })

  it("routes carried scores through suggestCharts without bypassing host fit", () => {
    const enriched = attachIDID(
      { mark: "bar", data: { values: rows } },
      { capability: portable },
    )
    const carried = readIDID(enriched)
    const accepted = bindPortableCapability(
      carried?.capability,
      hostCapability(),
    )
    expectBound(accepted)
    expect(accepted.capability.portableDescriptor).toBe(
      carried?.capability,
    )

    const suggestions = suggestCharts(rows, {
      capabilities: [accepted.capability],
      intent: "compare-categories",
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].component).toBe("PortableBars")
    expect(suggestions[0].intentScores["compare-categories"]).toBe(2)
    expect(suggestions[0].rubric).toMatchObject(portable.rubric)

    const rejectingHost = hostCapability(
      (_profile: ChartDataProfile) => "host requires an authored domain mapping",
    )
    const rejected = bindPortableCapability(
      { ...portable, intentScores: { "compare-categories": 5 } },
      rejectingHost,
    )
    expectBound(rejected)
    expect(suggestCharts(rows, {
      capabilities: [rejected.capability],
      intent: "compare-categories",
    })).toEqual([])
  })

  it("refuses invalid, unresolved, and mismatched descriptors", () => {
    const invalid = bindPortableCapability(
      { component: "PortableBars" },
      hostCapability(),
    )
    expect(invalid.status).toBe("refused")
    expect(invalid.capability).toBeUndefined()
    expect(invalid.diagnostics[0]?.code).toBe(
      "INVALID_PORTABLE_CAPABILITY",
    )

    const unresolved = bindPortableCapability(portable, undefined)
    expect(unresolved.status).toBe("refused")
    expect(unresolved.diagnostics[0]?.code).toBe(
      "HOST_CAPABILITY_NOT_FOUND",
    )

    const mismatched = bindPortableCapability(
      portable,
      { ...hostCapability(), component: "AnotherChart" },
    )
    expect(mismatched.status).toBe("refused")
    expect(mismatched.diagnostics[0]?.code).toBe(
      "CAPABILITY_COMPONENT_MISMATCH",
    )
  })
})
