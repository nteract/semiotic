import { describe, it, expect, vi, beforeEach } from "vitest"
import React, { useRef, useEffect } from "react"
import { render } from "@testing-library/react"
import { ProcessSankey } from "./ProcessSankey"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock the inner StreamNetworkFrame so we can capture the layoutConfig
// the HOC produces — keeps these tests focused on the HOC's own
// pre-compute / push-API surface, separate from the algorithm tests.
let lastFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
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
    expect(lastFrameProps.layoutConfig.bands).toHaveLength(sampleNodes.length)
    expect(lastFrameProps.layoutConfig.ribbons).toHaveLength(sampleEdges.length)
    // Each band carries its source datum + a derived label position
    // (used by the SVG label overlay).
    const alice = lastFrameProps.layoutConfig.bands.find((b: any) => b.id === "Alice")
    expect(alice.rawDatum).toMatchObject({ id: "Alice", category: "Person" })
    expect(typeof alice.labelX).toBe("number")
    expect(typeof alice.labelY).toBe("number")
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
    let capturedRemoved: any[] = []
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
    let capturedPrevious: any[] = []
    function Harness() {
      const ref = useRef<RealtimeFrameHandle>(null)
      useEffect(() => {
        if (!ref.current) return
        ref.current.push({ id: "e1", source: "A", target: "B", value: 1, startTime: 0, endTime: 1 })
        capturedPrevious = ref.current.update("e1", (e: any) => ({ ...e, value: 99 }))
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
