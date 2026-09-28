import { describe, expect, it } from "vitest"
import { observationDatum } from "./chartSelectionUtils"
import { attachSelectionProvenance, getSourceRows } from "../../store/selectionProvenance"

describe("observationDatum", () => {
  const rows = [{ time: 2 }, { time: 7 }]

  it("keeps aggregate source rows when it adds the hover xValue", () => {
    const bin = attachSelectionProvenance({ binStart: 0, binEnd: 10, total: 2 }, rows)
    const datum = observationDatum({ data: bin, xValue: 5, x: 40, y: 10 })
    expect(datum).toEqual({ binStart: 0, binEnd: 10, total: 2, xValue: 5 })
    expect(datum).not.toBe(bin)
    expect(getSourceRows(datum)).toEqual(rows)
  })

  it("returns the datum itself when there is no xValue to add", () => {
    const bin = attachSelectionProvenance({ binStart: 0, binEnd: 10, total: 2 }, rows)
    expect(observationDatum({ data: bin, x: 40, y: 10 })).toBe(bin)
  })
})
