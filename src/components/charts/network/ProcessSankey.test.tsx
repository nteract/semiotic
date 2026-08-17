import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamNetworkFrameHandle } from "../../stream/networkTypes"
import { describe, it, expect, vi, beforeEach } from "vitest"
import React, { useRef, useEffect } from "react"
import { fireEvent, render } from "@testing-library/react"
import { ProcessSankey } from "./ProcessSankey"
import { LinkedCharts, useSelection } from "../../LinkedCharts"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { TooltipProvider } from "../../store/TooltipStore"
import type { Datum } from "../shared/datumTypes"

// Mock the inner StreamNetworkFrame so we can capture the layoutConfig
// the HOC produces — keeps these tests focused on the HOC's own
// pre-compute / push-API surface, separate from the algorithm tests.
let lastFrameProps: CapturedNetworkFrameProps | null = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamNetworkFrameHandle>, CapturedNetworkFrameProps>((props, _ref) => {
      lastFrameProps = props
      return <div className="stream-network-frame" data-testid="frame"><svg /></div>
    }),
  }
})

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime()
const DOMAIN: [number, number] = [D(2026, 1, 1), D(2026, 6, 30)]

const sampleNodes = [
  { id: "Alice", category: "Person" },
  { id: "Eng",   category: "Team" },
]
const sampleEdges = [
  { id: "alice-eng", source: "Alice", target: "Eng", value: 8, startTime: D(2026, 1, 20), endTime: D(2026, 2, 10) },
]

function maximumPathY(pathD: string): number {
  const pairs = [...pathD.matchAll(
    /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?),(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi,
  )]
  return Math.max(...pairs.map((pair) => Number(pair[2])))
}

describe("ProcessSankey HOC", () => {
  beforeEach(() => {
    lastFrameProps = null
  })

  it("forwards bands + ribbons through layoutConfig to the frame", () => {
    render(
      <TooltipProvider>
        <ProcessSankey nodes={sampleNodes} edges={sampleEdges} domain={DOMAIN} />
      </TooltipProvider>,
    )
    expect(lastFrameProps).not.toBeNull()
    if (!lastFrameProps) throw new Error("Expected StreamNetworkFrame to render")
    expect(lastFrameProps.layoutConfig.bands).toHaveLength(sampleNodes.length)
    expect(lastFrameProps.layoutConfig.ribbons).toHaveLength(sampleEdges.length)
    // Each band carries its source datum + a derived label position
    // (used by the SVG label overlay).
    const alice = lastFrameProps.layoutConfig.bands.find((band) => band.id === "Alice")!
    expect(alice.rawDatum).toMatchObject({ id: "Alice", category: "Person" })
    expect(typeof alice.labelX).toBe("number")
    expect(typeof alice.labelY).toBe("number")
  })

  it("uses an explicit category map for both node bands and source ribbons", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={[
            { id: "Alice", family: "person" },
            { id: "Eng", family: "team" },
          ]}
          edges={sampleEdges}
          domain={DOMAIN}
          colorBy="family"
          colorScheme={{ person: "#ff0000", team: "#0000ff" }}
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.layoutConfig.bands.map((band) => band.fill)).toEqual(["#ff0000", "#0000ff"])
    expect(lastFrameProps?.layoutConfig.ribbons.map((ribbon) => ribbon.fill)).toEqual(["#ff0000"])
  })

  it.each([
    ["right", 140], ["left", 140], ["top", 50], ["bottom", 80],
  ] as const)("grows a small explicit %s margin for its chart-owned legend", (position, minimum) => {
    render(
      <TooltipProvider>
        <ProcessSankey nodes={sampleNodes} edges={sampleEdges} domain={DOMAIN}
          colorBy="category" legendPosition={position} margin={{ [position]: 30 }} />
      </TooltipProvider>,
    )
    expect(lastFrameProps?.margin[position]).toBe(minimum)
  })

  it("uses frameProps legendPosition while reserving its chart-owned legend", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          domain={DOMAIN}
          colorBy="category"
          frameProps={{ legendPosition: "left" }}
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.legendPosition).toBe("left")
    expect(lastFrameProps?.margin.left).toBe(140)
    expect((lastFrameProps as unknown as Record<string, unknown>)?.__legendMarginReservedFor)
      .toBe(lastFrameProps?.legend)
  })

  it("forwards HatchFill node style rules to the canvas band scene", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          domain={DOMAIN}
          styleRules={[{
            style: () => ({
              fill: {
                type: "hatch",
                background: "#33b1ff",
                stroke: "#a56eff",
              },
            }),
          }]}
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.layoutConfig.bands[0]?.hatchFill).toMatchObject({
      type: "hatch",
      background: "#33b1ff",
      stroke: "#a56eff",
    })
  })

  it("forwards a named selection into the custom Sankey scene", () => {
    function LensWriter() {
      const lens = useSelection({ name: "process-sankey-lens", fields: ["claimLens"] })
      return (
        <button
          type="button"
          data-testid="activate-lens"
          onClick={() => lens.selectPoints({ claimLens: ["economic"] })}
        >
          Activate economic lens
        </button>
      )
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <TooltipProvider>
          <LensWriter />
          <ProcessSankey
            nodes={sampleNodes}
            edges={sampleEdges.map((edge) => ({ ...edge, claimLens: "economic" }))}
            domain={DOMAIN}
            selection={{ name: "process-sankey-lens" }}
          />
        </TooltipProvider>
      </LinkedCharts>,
    )

    fireEvent.click(getByTestId("activate-lens"))
    expect(lastFrameProps?.layoutSelection?.isActive).toBe(true)
    expect(lastFrameProps?.layoutSelection?.predicate({ claimLens: "economic" })).toBe(true)
    expect(lastFrameProps?.layoutSelection?.predicate({ claimLens: "cultural" })).toBe(false)
  })

  it("projects time top-to-bottom in vertical orientation", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          domain={DOMAIN}
          orientation="vertical"
          width={600}
          height={600}
          margin={0}
        />
      </TooltipProvider>,
    )
    const ribbon = lastFrameProps?.layoutConfig.ribbons[0]
    const points = ribbon?.bezier?.points
    expect(points).toHaveLength(4)
    expect(points?.[0].y).toBeLessThan(points?.[3].y ?? 0)
    expect(lastFrameProps?.layoutConfig.bands.every((item) => item.labelAnchor === "middle")).toBe(true)
  })

  it("borrows proven feeder runway without changing authored event timing", () => {
    const nodes = [
      { id: "Feeder", xExtent: [0, 100] },
      { id: "Main", xExtent: [0, 100] },
    ]
    const edge = {
      id: "feeder-main",
      source: "Feeder",
      target: "Main",
      value: 1,
      startTime: 96,
      endTime: 100,
    }
    const { rerender } = render(
      <TooltipProvider>
        <ProcessSankey
          nodes={nodes}
          edges={[edge]}
          domain={[0, 100]}
          orientation="vertical"
          packing="off"
          laneOrder="insertion"
          width={600}
          height={600}
          margin={0}
        />
      </TooltipProvider>,
    )

    const exactRibbon = lastFrameProps?.layoutConfig.ribbons[0]
    const exactSourceTime = exactRibbon?.bezier?.points?.[0].y
    const exactTargetTime = exactRibbon?.bezier?.points?.[3].y

    rerender(
      <TooltipProvider>
        <ProcessSankey
          nodes={nodes}
          edges={[edge]}
          domain={[0, 100]}
          orientation="vertical"
          packing="off"
          laneOrder="insertion"
          ribbonMinRun="auto"
          width={600}
          height={600}
          margin={0}
        />
      </TooltipProvider>,
    )

    const smoothedRibbon = lastFrameProps?.layoutConfig.ribbons[0]
    const smoothedPoints = smoothedRibbon?.bezier?.points
    expect(smoothedPoints?.[0].y).toBeLessThan(exactSourceTime ?? 0)
    expect(smoothedPoints?.[0].y).toBeGreaterThanOrEqual(0)
    expect(smoothedPoints?.[3].y).toBe(exactTargetTime)
    expect(smoothedRibbon?.rawDatum).toMatchObject({ startTime: 96, endTime: 100 })
    const feederBand = lastFrameProps?.layoutConfig.bands.find((band) => band.id === "Feeder")
    expect(maximumPathY(feederBand?.pathD ?? "")).toBe(smoothedPoints?.[0].y)
    const renderedEdges = lastFrameProps?.edges
    expect(Array.isArray(renderedEdges) ? renderedEdges[0]?.bezier : undefined)
      .toEqual(smoothedRibbon?.bezier)
  })

  it("reserves vertical margin only for chrome that is rendered", () => {
    const { rerender } = render(
      <TooltipProvider>
        <ProcessSankey nodes={sampleNodes} edges={sampleEdges} domain={DOMAIN} />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.margin).toMatchObject({ top: 8, bottom: 8 })

    rerender(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          domain={DOMAIN}
          axisTicks={[{ date: DOMAIN[0], label: "Start" }]}
          showQualityReadout
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.margin).toMatchObject({ top: 24, bottom: 28 })
  })

  it("keeps explicit vertical margins authoritative", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          domain={DOMAIN}
          axisTicks={[{ date: DOMAIN[0], label: "Start" }]}
          showQualityReadout
          margin={{ top: 3, bottom: 5 }}
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.margin).toMatchObject({ top: 3, bottom: 5 })
  })

  it("resolves visible lane labels independently from stable node ids", () => {
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={[
            { id: "LUNAR_ORBIT", label: "Lunar orbit" },
            { id: "LM_LIFEBOAT", label: "LM lifeboat" },
          ]}
          edges={[
            {
              id: "diversion",
              source: "LUNAR_ORBIT",
              target: "LM_LIFEBOAT",
              value: 3,
              startTime: D(2026, 1, 20),
              endTime: D(2026, 2, 10),
            },
          ]}
          domain={DOMAIN}
          nodeLabel="label"
        />
      </TooltipProvider>,
    )

    expect(lastFrameProps?.layoutConfig.bands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "LUNAR_ORBIT", labelText: "Lunar orbit" }),
        expect.objectContaining({ id: "LM_LIFEBOAT", labelText: "LM lifeboat" }),
      ]),
    )
  })

  it("resolves groupBy and emits same-group ribbons as one contiguous block", () => {
    const nodes = ["A", "B", "C", "D", "E"].flatMap((prefix) => [
      { id: `${prefix}-before`, bond: ["A", "C", "E"].includes(prefix) ? "united-states" : undefined, xExtent: [0, 2] },
      { id: `${prefix}-after`, bond: ["A", "C", "E"].includes(prefix) ? "united-states" : undefined, xExtent: [8, 10] },
    ])
    const edges = ["A", "B", "C", "D", "E"].map((prefix) => ({
      id: prefix,
      source: `${prefix}-before`,
      target: `${prefix}-after`,
      value: 1,
      startTime: 2,
      endTime: 8,
    }))

    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={nodes}
          edges={edges}
          domain={[0, 10]}
          groupBy="bond"
          laneOrder="insertion"
          lifetimeMode="full"
          margin={0}
        />
      </TooltipProvider>,
    )

    const starts = new Map(lastFrameProps?.layoutConfig.ribbons.map((ribbon) => [
      ribbon.id,
      ribbon.bezier?.points[0].y ?? NaN,
    ]))
    const grouped = [starts.get("A")!, starts.get("C")!, starts.get("E")!]
      .sort((a, b) => a - b)
    for (const id of ["B", "D"]) {
      const position = starts.get(id)!
      expect(position < grouped[0] || position > grouped.at(-1)!).toBe(true)
    }
  })

  it("renders an inline error block when domain is malformed (validation gate)", () => {
    const { container } = render(
      <TooltipProvider>
        <ProcessSankey
          nodes={sampleNodes}
          edges={sampleEdges}
          // Inverted domain: should fail the new validation rule.
          domain={[D(2026, 6, 30), D(2026, 1, 1)]}
        />
      </TooltipProvider>,
    )
    // The HOC renders a standalone <svg> (NOT the frame mock) when
    // validation fails — so the frame mock shouldn't have been called
    // at all and the SVG should contain the failure copy.
    expect(lastFrameProps).toBeNull()
    expect(container.textContent).toMatch(/data invalid/i)
    expect(container.textContent).toMatch(/start <= end/)
  })

  // Regression test for the async-setState bug Copilot caught: the
  // earlier `remove`/`update` implementations pushed into a local
  // `removed`/`previous` array from inside the setState updater
  // callback, which fires asynchronously — by the time the imperative
  // method returned, the array was still empty. Synchronous derivation
  // against the closure's view of `pushedEdges` fixes it.
  it("remove() returns the removed records synchronously", () => {
    let capturedRemoved: Datum[] = []
    function Harness() {
      const ref = useRef<RealtimeFrameHandle>(null)
      useEffect(() => {
        if (!ref.current) return
        // Seed two edges via push-mode (omit `edges` from props).
        ref.current.push({ id: "e1", source: "A", target: "B", value: 1, startTime: 0, endTime: 1 })
        ref.current.push({ id: "e2", source: "A", target: "B", value: 2, startTime: 0, endTime: 1 })
        // Then remove one. The return value should reflect what was
        // actually pulled out — synchronous, not deferred to commit.
        capturedRemoved = ref.current.remove("e1")
      }, [])
      return (
        <ProcessSankey ref={ref}
          nodes={[{ id: "A" }, { id: "B" }]}
          domain={DOMAIN}
        />
      )
    }
    render(<TooltipProvider><Harness /></TooltipProvider>)
    expect(capturedRemoved).toHaveLength(1)
    expect(capturedRemoved[0]).toMatchObject({ id: "e1" })
  })

  it("update() returns the previous records synchronously", () => {
    let capturedPrevious: Datum[] = []
    function Harness() {
      const ref = useRef<RealtimeFrameHandle>(null)
      useEffect(() => {
        if (!ref.current) return
        ref.current.push({ id: "e1", source: "A", target: "B", value: 1, startTime: 0, endTime: 1 })
        capturedPrevious = ref.current.update("e1", (e) => ({ ...e, value: 99 }))
      }, [])
      return (
        <ProcessSankey ref={ref}
          nodes={[{ id: "A" }, { id: "B" }]}
          domain={DOMAIN}
        />
      )
    }
    render(<TooltipProvider><Harness /></TooltipProvider>)
    expect(capturedPrevious).toHaveLength(1)
    expect(capturedPrevious[0]).toMatchObject({ id: "e1", value: 1 })
  })
})
