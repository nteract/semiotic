import { describe, expect, it } from "vitest"
import {
  auditAccessibility,
  type AuditAccessibilityOptions
} from "./auditAccessibility"
import { auditReceivability } from "./auditReceivability"
import type { Datum } from "./datumTypes"
import { getCapabilities } from "../../ai/chartCapabilities"
import {
  receivabilityBias,
  receivabilityBiasFromFindings,
  type ReceptionModality
} from "../../ai/audienceProfile"
import { suggestCharts } from "../../ai/suggestCharts"

const receivabilityIds = new Set([
  "perceivable.content-only-visual",
  "perceivable.color-alone",
  "compromising.table",
  "compromising.navigable-structure",
  "assistive.data-density",
  "assistive.human-readable-numbers",
  "assistive.skippable-navigation"
])
const modalities: ReceptionModality[] = [
  "visual",
  "screen-reader",
  "sonified",
  "agent"
]
const data = Array.from({ length: 8 }, (_, i) => ({
  category: `C${i}`,
  value: 100_000 + i
}))
const fixtures: Array<[string, Datum, AuditAccessibilityOptions?]> = [
  ["defaults", {}],
  [
    "data table disabled",
    { data, accessibleTable: false, colorBy: "category" }
  ],
  [
    "text alternative",
    {
      data,
      accessibleTable: false,
      description: "Category totals",
      summary: "Eight categories have similar totals."
    }
  ],
  [
    "direct labels",
    { data, colorBy: "category", directLabel: true, valueFormat: String }
  ],
  [
    "authored texture",
    {
      data,
      colorBy: "category",
      styleRules: [{ style: { fill: { type: "hatch" } } }]
    }
  ],
  [
    "explicit navigation",
    { data, colorBy: "category", showLabels: true },
    { navigable: true }
  ],
  ["dense rows", { data: Array.from({ length: 5001 }, () => ({ value: 1 })) }],
  ["dense nodes", { nodes: Array.from({ length: 201 }, (_, id) => ({ id })) }]
]

describe("receivability audit shares the public audit's exact findings", () => {
  for (const component of [
    ...getCapabilities().map((capability) => capability.component),
    "UnknownChart"
  ]) {
    it.each(fixtures)(`${component}: %s`, (_label, props, options) => {
      const full = auditAccessibility(component, props, options)
      const focused = auditReceivability(component, props, options)
      expect(focused).toEqual(
        full.findings.filter(({ id }) => receivabilityIds.has(id))
      )
      for (const modality of modalities) {
        expect(receivabilityBiasFromFindings(focused, modality)).toEqual(
          receivabilityBias(full, modality)
        )
      }
    })
  }

  it.each(modalities)(
    "preserves complete recommendation scores and caveats for %s",
    (modality) => {
      const visual = suggestCharts(data, {
        minScore: -Infinity,
        maxResults: Infinity,
        includeVariants: false,
        audience: { receptionModality: "visual" }
      })
      const received = suggestCharts(data, {
        minScore: -Infinity,
        maxResults: Infinity,
        includeVariants: false,
        audience: { receptionModality: modality }
      })
      expect(received).toHaveLength(visual.length)
      for (const candidate of received) {
        const original = visual.find(
          ({ component, variant }) =>
            component === candidate.component && variant === candidate.variant
        )!
        expect(original).toBeDefined()
        const signal = receivabilityBias(
          auditAccessibility(candidate.component, candidate.props),
          modality
        )
        expect(candidate.score).toBeCloseTo(original.score + signal.delta)
        expect(candidate.caveats).toEqual([
          ...original.caveats,
          ...signal.caveats.slice(0, 3)
        ])
        expect(
          candidate.reasons.filter((reason) => reason !== signal.reason)
        ).toEqual(original.reasons)
        if (signal.reason)
          expect(
            candidate.reasons.filter((reason) => reason === signal.reason)
          ).toEqual([signal.reason])
      }
    }
  )
})
