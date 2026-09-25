// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { ProcessSankeyCapability } from "../charts/network/ProcessSankey.capability"
import { profileData } from "../ai/profileData"

const nodes = [
  { id: "a", xExtent: [12, 20] },
  { id: "b", xExtent: [12, 20] }
]
const edges = [
  { source: "a", target: "b", value: 4, startTime: 14, endTime: 18 }
]

describe("ProcessSankey server time contract", () => {
  it("produces the same scene for numeric strings as numeric values", () => {
    const numeric = renderChartWithEvidence("ProcessSankey", {
      nodes,
      edges,
      domain: [12, 20],
      width: 500,
      height: 300
    })
    const strings = renderChartWithEvidence("ProcessSankey", {
      nodes: nodes.map((node) => ({
        ...node,
        xExtent: node.xExtent.map(String)
      })),
      edges: edges.map((edge) => ({
        ...edge,
        startTime: String(edge.startTime),
        endTime: String(edge.endTime)
      })),
      domain: ["12", "20"],
      width: 500,
      height: 300
    })
    expect(strings.svg).toBe(numeric.svg)
    expect(strings.evidence.markCount).toBe(5)
    expect(strings.svg).toContain(">14</text>")
    expect(strings.svg).not.toMatch(/NaN|Infinity/)
  })

  it.each(["horizontal", "vertical"] as const)(
    "formats numeric and ISO ticks with the correct callback values in %s orientation",
    (orientation) => {
      const numeric = vi.fn((time: number | Date) => `step ${time}`)
      const result = renderChartWithEvidence("ProcessSankey", {
        nodes,
        edges,
        domain: [12, 20],
        orientation,
        timeFormat: numeric
      })
      expect(result.svg).toContain("step 14")
      expect(
        numeric.mock.calls.every(([time]) => typeof time === "number")
      ).toBe(true)
      const date = vi.fn((time: number | Date) => (time as Date).toISOString())
      const dated = renderChartWithEvidence("ProcessSankey", {
        edges: [
          {
            ...edges[0],
            startTime: "2026-01-01T12:00",
            endTime: "2026-01-01T18:00"
          }
        ],
        domain: ["2026-01-01", "2026-01-02"],
        orientation,
        timeFormat: date
      })
      expect(dated.svg).toContain("2026-01-01T15:00:00.000Z")
      expect(date.mock.calls.every(([time]) => time instanceof Date)).toBe(true)
      expect(dated.evidence.markCount).toBe(5)
    }
  )

  it("normalizes timezone-free ISO input to the same geometry as explicit UTC and rejects ambiguous dates", () => {
    const props = {
      edges: [
        {
          ...edges[0],
          startTime: "2026-01-01T12:00",
          endTime: "2026-01-01T18:00"
        }
      ],
      domain: ["2026-01-01", "2026-01-02"]
    }
    const local = renderChartWithEvidence("ProcessSankey", props)
    const utc = renderChartWithEvidence("ProcessSankey", {
      ...props,
      edges: props.edges.map((edge) => ({
        ...edge,
        startTime: `${edge.startTime}Z`,
        endTime: `${edge.endTime}Z`
      }))
    })
    expect(local.svg).toBe(utc.svg)
    expect(() =>
      renderChartWithEvidence("ProcessSankey", {
        ...props,
        domain: ["01/01/2026", "01/02/2026"]
      })
    ).toThrow(/invalid|domain/i)
  })

  it("builds runnable suggestions without converting numeric strings to calendar dates", () => {
    const props = ProcessSankeyCapability.buildProps(
      profileData([], {
        rawInput: {
          nodes,
          edges: edges.map((edge) => ({
            ...edge,
            startTime: String(edge.startTime),
            endTime: String(edge.endTime)
          }))
        }
      })
    )
    expect(props.domain).toEqual([14, 18])
    const dates = ProcessSankeyCapability.buildProps(
      profileData([], {
        rawInput: {
          nodes: [{ id: "a" }, { id: "b" }],
          edges: [
            {
              ...edges[0],
              startTime: "2026-01-01T12:00",
              endTime: "2026-01-01T18:00"
            }
          ]
        }
      })
    )
    expect(dates.domain).toEqual([
      "2026-01-01T12:00:00.000Z",
      "2026-01-01T18:00:00.000Z"
    ])
  })
})
