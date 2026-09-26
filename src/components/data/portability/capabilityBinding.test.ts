import { describe, expect, it, vi } from "vitest"
import type {
  ChartCapability,
  ChartDataProfile
} from "../../ai/chartCapabilityTypes"
import { suggestCharts } from "../../ai/suggestCharts"
import { profileData } from "../../ai/profileData"
import {
  unstable_bindPortableCapability as bindPortableCapability,
  type UnstableBoundPortableChartCapability as BoundPortableChartCapability
} from "semiotic/experimental"
import { attachIDID, readIDID } from "./vegaLite"

const rows = [
  { category: "North", value: 12 },
  { category: "South", value: 8 },
  { category: "West", value: 17 }
]

function hostCapability(
  fits: ChartCapability["fits"] = () => null
): ChartCapability {
  return {
    component: "PortableBars",
    family: "categorical",
    importPath: "semiotic/ordinal",
    rubric: { familiarity: 5, accuracy: 5, precision: 4 },
    fits,
    intentScores: {
      "compare-categories": 5,
      distribution: 3
    },
    variants: [
      {
        key: "host-only",
        label: "Host only",
        props: { sort: "desc" }
      }
    ],
    caveats: (profile) =>
      profile.rowCount < 5 ? ["Host needs more rows for a stable read."] : [],
    buildProps: (profile, variant) => ({
      data: profile.data,
      categoryAccessor: profile.primary.category,
      valueAccessor: profile.primary.y,
      ...(variant?.props ?? {})
    })
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
    rank: 5
  },
  variants: [
    {
      key: "portable-order",
      label: "Portable order",
      props: { sort: false },
      intentDeltas: { rank: 1 }
    }
  ],
  caveats: ["Portable policy caveat."],
  tags: ["external"]
}

function expectBound(
  result: ReturnType<typeof bindPortableCapability>
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
      "portable-order"
    ])
    expect(bound.portableDescriptor).toEqual(portable)
    expect(bound.portableDescriptor).not.toBe(portable)

    const profile = profileData(rows)
    expect(bound.fits(profile)).toBeNull()
    expect(bound.buildProps(profile, bound.variants?.[0])).toMatchObject({
      data: rows,
      sort: false
    })
    expect(bound.caveats?.(profile)).toEqual([
      "Host needs more rows for a stable read.",
      "Portable policy caveat."
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

  it("retains executable host variants and their recommendation behavior when variants are omitted", () => {
    const host = hostCapability()
    const accessor = (row: { category: string }) => row.category
    host.variants![0].component = "SortedBars"
    host.variants![0].props.categoryAccessor = accessor
    const result = bindPortableCapability(
      { component: portable.component, rubric: portable.rubric },
      host
    )
    expectBound(result)
    expect(result.capability.variants).toEqual(host.variants)
    const suggestions = suggestCharts(rows, {
      capabilities: [result.capability],
      intent: "compare-categories"
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      component: "SortedBars",
      variant: { key: "host-only" },
      props: { sort: "desc", categoryAccessor: accessor }
    })
  })

  it("honors explicitly empty scoring and variants instead of inheriting host policy", () => {
    const result = bindPortableCapability(
      { ...portable, variants: [], intentScores: {} },
      hostCapability()
    )
    expectBound(result)
    expect(result.capability.variants).toEqual([])
    expect(result.capability.intentScores).toEqual({})
  })

  it("snapshots nested portable policy so source edits cannot change the bound result", () => {
    const descriptor = {
      ...structuredClone(portable),
      variants: [{ ...portable.variants[0], props: { margin: { left: 24 } } }],
      mobile: {
        breakpoints: [400],
        interaction: { alternatives: ["keyboard"] }
      }
    }
    const snapshot = structuredClone(descriptor)
    const result = bindPortableCapability(descriptor, hostCapability())
    expectBound(result)
    descriptor.rubric.familiarity = 5
    descriptor.variants[0].props.margin.left = 99
    descriptor.mobile.breakpoints.push(800)
    descriptor.mobile.interaction.alternatives.push("touch")
    expect(result.capability.portableDescriptor).toEqual(snapshot)
    expect(result.capability.variants![0].props.margin).toEqual({ left: 24 })
    expect(result.capability.mobile?.breakpoints).toEqual([400])
  })

  it("snapshots JSON metadata on hosts without structuredClone", () => {
    vi.stubGlobal("structuredClone", undefined)
    try {
      const descriptor = {
        ...portable,
        variants: [
          { key: "custom", label: "Custom", props: { margin: { left: 24 } } }
        ]
      }
      const result = bindPortableCapability(descriptor, hostCapability())
      expectBound(result)
      descriptor.variants[0].props.margin.left = 99
      expect(result.capability.variants![0].props.margin).toEqual({ left: 24 })
      expect(
        result.capability.portableDescriptor.variants![0].props!.margin
      ).toEqual({ left: 24 })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each([true, false])(
    "refuses executable portable props with native cloning %s",
    (nativeClone) => {
      if (!nativeClone) vi.stubGlobal("structuredClone", undefined)
      try {
        const descriptor = {
          ...portable,
          variants: [
            { key: "custom", label: "Custom", props: { accessor: () => 1 } }
          ]
        }
        const result = bindPortableCapability(descriptor, hostCapability())
        expect(result.status).toBe("refused")
        expect(result.capability).toBeUndefined()
        expect(result.diagnostics[0].code).toBe("INVALID_PORTABLE_CAPABILITY")
      } finally {
        vi.unstubAllGlobals()
      }
    }
  )

  it.each([
    null,
    {},
    { ...portable, variants: null },
    { ...portable, variants: [null] }
  ])(
    "refuses malformed descriptors without returning a partial capability",
    (descriptor) => {
      const result = bindPortableCapability(descriptor, hostCapability())
      expect(result.status).toBe("refused")
      expect(result.capability).toBeUndefined()
      expect(result.diagnostics[0].code).toBe("INVALID_PORTABLE_CAPABILITY")
    }
  )

  it("routes carried scores through suggestCharts without bypassing host fit", () => {
    const enriched = attachIDID(
      { mark: "bar", data: { values: rows } },
      { capability: portable }
    )
    const carried = readIDID(enriched)
    const accepted = bindPortableCapability(
      carried?.capability,
      hostCapability()
    )
    expectBound(accepted)
    expect(accepted.capability.portableDescriptor).toEqual(carried?.capability)

    const suggestions = suggestCharts(rows, {
      capabilities: [accepted.capability],
      intent: "compare-categories"
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].component).toBe("PortableBars")
    expect(suggestions[0].intentScores["compare-categories"]).toBe(2)
    expect(suggestions[0].rubric).toMatchObject(portable.rubric)

    const rejectingHost = hostCapability(
      (_profile: ChartDataProfile) => "host requires an authored domain mapping"
    )
    const rejected = bindPortableCapability(
      { ...portable, intentScores: { "compare-categories": 5 } },
      rejectingHost
    )
    expectBound(rejected)
    expect(
      suggestCharts(rows, {
        capabilities: [rejected.capability],
        intent: "compare-categories"
      })
    ).toEqual([])
  })

  it("refuses invalid, unresolved, and mismatched descriptors", () => {
    const invalid = bindPortableCapability(
      { component: "PortableBars" },
      hostCapability()
    )
    expect(invalid.status).toBe("refused")
    expect(invalid.capability).toBeUndefined()
    expect(invalid.diagnostics[0]?.code).toBe("INVALID_PORTABLE_CAPABILITY")

    const unresolved = bindPortableCapability(portable, undefined)
    expect(unresolved.status).toBe("refused")
    expect(unresolved.diagnostics[0]?.code).toBe("HOST_CAPABILITY_NOT_FOUND")

    const mismatched = bindPortableCapability(portable, {
      ...hostCapability(),
      component: "AnotherChart"
    })
    expect(mismatched.status).toBe("refused")
    expect(mismatched.diagnostics[0]?.code).toBe(
      "CAPABILITY_COMPONENT_MISMATCH"
    )
  })
})
