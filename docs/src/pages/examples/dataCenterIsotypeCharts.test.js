import { describe, expect, it } from "vitest"
import {
  ARROW_UNIT_BGAL,
  ARROW_UNIT_TWH,
  SECTION_PLACEMENT,
  arrowUnits,
} from "./dataCenterIsotypeCharts.jsx"
import { DATA_CENTER_SITES, MAP_SECTIONS } from "./data/dataCenterIsotypeData"

describe("data-center ISOTYPE chart placement and arrow units", () => {
  it("hand-places every site on a real relief section", () => {
    const sectionIds = new Set(MAP_SECTIONS.map((section) => section.id))
    for (const site of DATA_CENTER_SITES) {
      const placement = SECTION_PLACEMENT[site.id]
      expect(placement, `placement for ${site.id}`).toBeDefined()
      expect(sectionIds.has(placement.section)).toBe(true)
    }
  })

  it("keeps placed sites within roughly two degrees of their section parallel", () => {
    const byId = new Map(MAP_SECTIONS.map((section) => [section.id, section]))
    for (const site of DATA_CENTER_SITES) {
      const section = byId.get(SECTION_PLACEMENT[site.id].section)
      expect(Math.abs(section.latitude - site.lat)).toBeLessThanOrEqual(2.2)
    }
  })

  it("turns the national account into countable arrows without slivers", () => {
    const electricity = arrowUnits(176, ARROW_UNIT_TWH)
    expect(electricity).toHaveLength(7)
    expect(electricity.every((unit) => unit.fraction === 1)).toBe(true)

    const indirect = arrowUnits(211, ARROW_UNIT_BGAL)
    expect(indirect).toHaveLength(9)
    expect(indirect[8].fraction).toBeCloseTo(0.44)

    const direct = arrowUnits(17, ARROW_UNIT_BGAL)
    expect(direct).toHaveLength(1)
    expect(direct[0].fraction).toBeCloseTo(0.68)
  })
})
