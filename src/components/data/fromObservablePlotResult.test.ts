import { describe, expect, it, vi } from "vitest"
import {
  fromObservablePlot,
  fromObservablePlotResult
} from "./fromObservablePlot"
import type { ObservablePlotSpec } from "./fromObservablePlot"

const base: ObservablePlotSpec = {
  marks: [
    {
      type: "dot",
      data: [{ x: 1, y: 2 }],
      options: { x: "x", y: "y", fill: "steelblue" }
    }
  ]
}

describe("strict Plot results", () => {
  it("returns a faithful config with constant paints", () => {
    const result = fromObservablePlotResult(base)
    expect(result.status).toBe("success")
    expect(result.config?.props).toMatchObject({
      xAccessor: "x",
      yAccessor: "y",
      color: "steelblue"
    })
    expect(result.diagnostics).toEqual([])
  })

  it.each([
    null,
    { marks: [{}] },
    { marks: [null] },
    { marks: "line" },
    { marks: [{ type: "dot", options: null }] },
    { marks: [{ type: "dot", data: [1] }] }
  ])("safely refuses malformed %j", (input) => {
    const spec = input as ObservablePlotSpec
    expect(fromObservablePlotResult(spec).status).toBe("refused")
    expect(fromObservablePlotResult(spec, { mode: "lossy" }).status).toBe(
      "refused"
    )
    expect(() => fromObservablePlot(spec)).not.toThrow()
  })

  it.each([
    { marks: [{ type: "vector" }] },
    { marks: [] },
    { ...base, fx: "g" },
    { ...base, y: { type: "pow" } },
    { ...base, x: { domain: [0, 10] } },
    {
      marks: [{ type: "barY", options: { x: "x", y: "y" } }],
      y: { type: "log" }
    },
    { marks: [{ type: "rectY", options: { x: "x", transform: {} } }] },
    { marks: [{ type: "dot", options: { x: () => 1, y: "y" } }] }
  ])(
    "reports ignored semantics and only translates with opt-in: %j",
    (input) => {
      const result = fromObservablePlotResult(input)
      expect(result.status).toBe("refused")
      expect(result.config).toBeUndefined()
      expect(result.lossReport.length).toBeGreaterThan(0)
      const lossy = fromObservablePlotResult(input, { mode: "lossy" })
      expect(lossy.status).toBe("lossy")
      expect(lossy.config).toBeDefined()
      expect(lossy.diagnostics.every((d) => d.severity === "warning")).toBe(
        true
      )
    }
  )

  it("refuses sparse marks and data in both modes", () => {
    for (const spec of [{ marks: new Array(1) }, { ...base, data: new Array(1) }, { marks: [{ type: "dot", data: new Array(1) }] }]) {
      expect(fromObservablePlotResult(spec).status).toBe("refused")
      expect(fromObservablePlotResult(spec, { mode: "lossy" }).status).toBe("refused")
    }
  })

  it("is quiet and reproducible when supplied an authored timestamp", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const options = {
        mode: "lossy" as const,
        createdAt: "2024-01-01T00:00:00Z"
      }
      expect(fromObservablePlotResult({ marks: [] }, options)).toEqual(
        fromObservablePlotResult({ marks: [] }, options)
      )
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})

it.each(["accent", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "tableau10"])("refuses approximated Plot palette %s", scheme => {
  const result = fromObservablePlotResult({ ...base, color: { scheme } })
  expect(result.status).toBe("refused")
  expect(result.lossReport).toContainEqual(expect.objectContaining({ path: "/color/scheme" }))
})
