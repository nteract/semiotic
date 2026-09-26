import { describe, expect, it } from "vitest"
import { bin } from "semiotic/data"

describe("public numeric bins", () => {
  it.each([
    { domain: [0.1, 0.9] as [number, number], bins: 8, edge: 0.3, index: 2 },
    { domain: [1, 2] as [number, number], bins: 10, edge: 1.2, index: 2 },
    { domain: [-1, 1] as [number, number], bins: 10, edge: 0.6, index: 8 },
    { domain: [0, 0.3] as [number, number], bins: 3, edge: 0.1, index: 1 },
    {
      domain: [0, 1e-308] as [number, number],
      bins: 10,
      edge: 3e-309,
      index: 3
    }
  ])(
    "preserves decimal edges for offset, signed, and tiny domains: $domain",
    ({ domain, bins, edge, index }) => {
      const below =
        edge - Math.max(Number.MIN_VALUE, Math.abs(edge) * Number.EPSILON)
      const result = bin([{ v: edge }, { v: below }], {
        field: "v",
        bins,
        domain
      })
      expect(result[index].x0).toBe(edge)
      expect(result[index].value).toBe(1)
      expect(result[index - 1].value).toBe(1)
    }
  )

  it("assigns decimal boundaries to the bin starting at that boundary", () => {
    const result = bin(
      [0, 0.3, 0.6, 1].map((v) => ({ v })),
      {
        field: "v",
        bins: 10,
        domain: [0, 1]
      }
    )
    expect(result.map((row) => row.value)).toEqual([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ])
    expect(result[3]).toMatchObject({ x0: 0.3, x1: 0.4 })
  })

  it("returns distinct labels and contiguous numeric bounds for very small bins", () => {
    const result = bin(
      [0, 0.00025, 0.0005, 0.00075, 0.001].map((v) => ({ v })),
      {
        field: "v",
        bins: 4,
        domain: [0, 0.001]
      }
    )
    expect(new Set(result.map((row) => row.category)).size).toBe(4)
    expect(result.map((row) => row.value)).toEqual([1, 1, 1, 2])
    expect(result.map((row) => [row.x0, row.x1])).toEqual([
      [0, 0.00025],
      [0.00025, 0.0005],
      [0.0005, 0.00075],
      [0.00075, 0.001]
    ])
  })

  it("distinguishes negative signs from the range separator", () => {
    const result = bin([{ v: -10 }, { v: -5 }, { v: 0 }], {
      field: "v",
      bins: 2
    })
    expect(result.map((row) => row.category)).toEqual(["-10 – -5", "-5 – 0"])
    expect(result.map((row) => row.value)).toEqual([1, 2])
  })

  it.each([0, -1, 2.5, NaN, Infinity, 100001])(
    "rejects invalid bin count %s before allocating, including for empty data",
    (bins) => {
      for (const data of [[], [{ v: 1 }]]) {
        expect(() => bin(data, { field: "v", bins })).toThrow(/bins.*integer/i)
      }
    }
  )

  it.each<[number, number]>([
    [1, 0],
    [NaN, 1],
    [0, Infinity]
  ])("rejects an invalid domain [%s, %s]", (lo, hi) => {
    expect(() => bin([{ v: 0 }], { field: "v", domain: [lo, hi] })).toThrow(
      /domain/i
    )
  })

  it("ignores missing, coercible nonnumeric and nonfinite observations", () => {
    const values = [
      null,
      undefined,
      false,
      true,
      [],
      [1],
      {},
      "",
      " ",
      NaN,
      Infinity,
      -Infinity,
      "Infinity",
      Symbol("value"),
      0,
      "1",
      new Date(2)
    ]
    const result = bin(
      values.map((v) => ({ v })),
      { field: "v", bins: 2, domain: [0, 2] }
    )
    expect(result.map((row) => row.value)).toEqual([1, 2])
    expect(bin([{ v: Infinity }], { field: "v" })).toEqual([])
  })

  it("rejects malformed runtime domains, including sparse arrays", () => {
    for (const domain of [
      null,
      "0,1",
      [],
      [0],
      [0, 1, 2],
      new Array(2),
      ["0", 1]
    ]) {
      expect(() =>
        bin([{ v: 0 }], {
          field: "v",
          domain: domain as [number, number]
        })
      ).toThrow(/domain/i)
    }
  })

  it("retains full-precision bounds when decimal rescaling would lose precision", () => {
    const min = 1
    const middle = 1 + 2 * Number.EPSILON
    const max = 1 + 4 * Number.EPSILON
    const result = bin(
      [min, middle, max].map((v) => ({ v })),
      { field: "v", bins: 2 }
    )
    expect(result.map((row) => [row.x0, row.x1])).toEqual([
      [min, middle],
      [middle, max]
    ])
    expect(result.map((row) => row.value)).toEqual([1, 2])
  })

  it("keeps large finite domains finite and rejects unrepresentable bin widths", () => {
    const result = bin([{ v: -1e308 }, { v: 0 }, { v: 1e308 }], {
      field: "v",
      bins: 2
    })
    expect(result.map((row) => [row.x0, row.x1])).toEqual([
      [-1e308, 0],
      [0, 1e308]
    ])
    expect(result.map((row) => row.value)).toEqual([1, 2])
    expect(() =>
      bin([{ v: 1 }], { field: "v", bins: 10, domain: [1, 1 + Number.EPSILON] })
    ).toThrow(/narrow/i)
  })

  it("preserves the inclusive endpoints and zero-width-domain contract", () => {
    expect(
      bin([{ v: 4 }, { v: 5 }, { v: 6 }], { field: "v", domain: [5, 5] })
    ).toEqual([{ category: "5-5", value: 1, x0: 5, x1: 5 }])
  })
})
