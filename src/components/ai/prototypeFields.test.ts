import { describe, expect, it } from "vitest"
import { normalizeProfileFieldRoles } from "./fieldRoles"
import { profileData } from "./profileData"
import { repairChartConfig } from "./repairChartConfig"
import { suggestCharts } from "./suggestCharts"
import {
  annotationPhrase,
  communicativeActForIntent,
  describeChart
} from "./describeChart"
import { buildNavigationTree } from "./navigationTree"

const prototypeFields = Object.getOwnPropertyNames(Object.prototype)

describe("AI profiling with prototype-named columns", () => {
  it.each(prototypeFields)(
    "uses description fallbacks for undeclared %s names",
    (name) => {
      expect(communicativeActForIntent(name)).toBeUndefined()
      expect(
        annotationPhrase({
          type: name,
          label: "Peak",
          provenance: { authorKind: "ai" }
        })
      ).toBe('an AI-suggested annotation labeled "Peak"')
      const description = describeChart(name, { data: [] })
      expect(description.levels.l1).toContain("chart")
      expect(description.text).not.toContain("[native code]")
      expect(() =>
        buildNavigationTree("BarChart", {
          data: [{ category: "A", value: 1 }],
          categoryAccessor: "category",
          valueAccessor: "value",
          annotations: [
            { type: name, label: "Peak", provenance: { authorKind: "ai" } }
          ]
        })
      ).not.toThrow()
    }
  )
  it.each(prototypeFields)(
    "profiles, suggests, and repairs the %s column",
    (field) => {
      const data = ["A", "B", "A"].map((category, index) => ({
        [field]: category,
        value: index + 1
      }))
      const options = { fieldRoles: { [field]: "category" as const } }
      const profile = profileData(data, options)
      expect(Object.hasOwn(profile.fields, field)).toBe(true)
      expect(profile.primary.category).toBe(field)
      expect(suggestCharts(data, options).length).toBeGreaterThan(0)
      expect(repairChartConfig("BarChart", data, options).status).toBe("ok")
    }
  )

  it.each(prototypeFields)(
    "excludes declared %s identifiers without inherited roles",
    (field) => {
      const data = ["A", "B", "A"].map((category, index) => ({
        category,
        [field]: index + 1,
        value: 10 + index
      }))
      const profile = profileData(data, { identifiers: [field] })
      expect(profile.identifiers).toEqual([field])
      expect(
        Object.values(profile.candidates)
          .flat()
          .map(({ field }) => field)
      ).not.toContain(field)
      expect(profile.primary.y).toBe("value")
    }
  )

  it("does not derive hints from Object.prototype or an inherited role map", () => {
    const roles = normalizeProfileFieldRoles(
      Object.create({ value: "ignore", category: "identifier" }),
      undefined
    )
    expect(Object.keys(roles)).toEqual([])
    const profile = profileData([{ constructor: "A", value: 1 }])
    expect(profile.primary.category).toBe("constructor")
    expect(profile.primary.y).toBe("value")
  })
})
