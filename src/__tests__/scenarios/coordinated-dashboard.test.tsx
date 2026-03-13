/**
 * Scenario tests: Coordinated views across multiple charts.
 *
 * These tests verify that LinkedCharts, CategoryColorProvider, selection hooks,
 * and legend interactions compose correctly when multiple charts interact —
 * the kind of multi-component integration that unit tests on individual
 * components don't cover.
 */
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import { renderHook } from "@testing-library/react"
import {
  LinkedCharts,
  useSelection,
  useLinkedHover,
  useBrushSelection,
  useFilteredData,
} from "../../components/LinkedCharts"
import { CategoryColorProvider, useCategoryColors } from "../../components/CategoryColors"
import { ChartGrid } from "../../components/ChartGrid"

// ── Helpers ─────────────────────────────────────────────────────────────

/** A hook consumer that exposes selection state for assertions */
function SelectionProbe({
  name,
  probeRef,
}: {
  name: string
  probeRef: React.MutableRefObject<{
    isActive: boolean
    predicate: (d: Record<string, any>) => boolean
  }>
}) {
  const { isActive, predicate } = useSelection({ name })
  probeRef.current = { isActive, predicate }
  return null
}

/** A hook consumer that produces selections on demand */
function SelectionEmitter({
  name,
  emitRef,
}: {
  name: string
  emitRef: React.MutableRefObject<{
    selectPoints: (fields: Record<string, any[]>) => void
    clear: () => void
  }>
}) {
  const { selectPoints, clear } = useSelection({ name })
  emitRef.current = { selectPoints, clear }
  return null
}

/** A hook consumer that produces hover events */
function HoverEmitter({
  name,
  fields,
  emitRef,
}: {
  name: string
  fields: string[]
  emitRef: React.MutableRefObject<{
    onHover: (datum: Record<string, any> | null) => void
  }>
}) {
  const { onHover } = useLinkedHover({ name, fields })
  emitRef.current = { onHover }
  return null
}

/** Reads useCategoryColors and exposes the color record */
function ColorProbe({
  probeRef,
}: {
  probeRef: React.MutableRefObject<Record<string, string> | null>
}) {
  const colors = useCategoryColors()
  probeRef.current = colors
  return null
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Coordinated Dashboard Scenarios", () => {
  // 1. Three producers/consumers sharing a selection
  it("selection propagates from one producer to two independent consumers", () => {
    const emitRef = { current: null as any }
    const probe1Ref = { current: null as any }
    const probe2Ref = { current: null as any }

    render(
      <LinkedCharts>
        <SelectionEmitter name="hl" emitRef={emitRef} />
        <SelectionProbe name="hl" probeRef={probe1Ref} />
        <SelectionProbe name="hl" probeRef={probe2Ref} />
      </LinkedCharts>
    )

    expect(probe1Ref.current.isActive).toBe(false)
    expect(probe2Ref.current.isActive).toBe(false)

    act(() => {
      emitRef.current.selectPoints({ region: ["North", "South"] })
    })

    expect(probe1Ref.current.isActive).toBe(true)
    expect(probe2Ref.current.isActive).toBe(true)
    expect(probe1Ref.current.predicate({ region: "North" })).toBe(true)
    expect(probe2Ref.current.predicate({ region: "East" })).toBe(false)
  })

  // 2. Independent selection names don't interfere
  it("two selection names in the same LinkedCharts are independent", () => {
    const emitA = { current: null as any }
    const probeA = { current: null as any }
    const emitB = { current: null as any }
    const probeB = { current: null as any }

    render(
      <LinkedCharts>
        <SelectionEmitter name="sel-a" emitRef={emitA} />
        <SelectionProbe name="sel-a" probeRef={probeA} />
        <SelectionEmitter name="sel-b" emitRef={emitB} />
        <SelectionProbe name="sel-b" probeRef={probeB} />
      </LinkedCharts>
    )

    act(() => {
      emitA.current.selectPoints({ cat: ["X"] })
    })

    expect(probeA.current.isActive).toBe(true)
    expect(probeB.current.isActive).toBe(false) // sel-b unaffected
  })

  // 3. Two separate LinkedCharts don't share state
  it("sibling LinkedCharts instances are isolated", () => {
    const emit1 = { current: null as any }
    const probe1 = { current: null as any }
    const probe2 = { current: null as any }

    render(
      <div>
        <LinkedCharts>
          <SelectionEmitter name="hl" emitRef={emit1} />
          <SelectionProbe name="hl" probeRef={probe1} />
        </LinkedCharts>
        <LinkedCharts>
          <SelectionProbe name="hl" probeRef={probe2} />
        </LinkedCharts>
      </div>
    )

    act(() => {
      emit1.current.selectPoints({ cat: ["A"] })
    })

    expect(probe1.current.isActive).toBe(true)
    expect(probe2.current.isActive).toBe(false) // different provider
  })

  // 4. LinkedHover → selection → predicate pipeline
  it("hover datum flows through linkedHover to selection predicate", () => {
    const hoverRef = { current: null as any }
    const probeRef = { current: null as any }

    render(
      <LinkedCharts>
        <HoverEmitter name="hl" fields={["region"]} emitRef={hoverRef} />
        <SelectionProbe name="hl" probeRef={probeRef} />
      </LinkedCharts>
    )

    expect(probeRef.current.isActive).toBe(false)

    act(() => {
      hoverRef.current.onHover({ region: "West", value: 42 })
    })

    expect(probeRef.current.isActive).toBe(true)
    expect(probeRef.current.predicate({ region: "West" })).toBe(true)
    expect(probeRef.current.predicate({ region: "East" })).toBe(false)

    // Hover out clears
    act(() => {
      hoverRef.current.onHover(null)
    })
    expect(probeRef.current.isActive).toBe(false)
  })

  // 5. Clearing one selection doesn't affect another name
  it("clearing selection A does not affect selection B", () => {
    const emitA = { current: null as any }
    const probeA = { current: null as any }
    const emitB = { current: null as any }
    const probeB = { current: null as any }

    render(
      <LinkedCharts>
        <SelectionEmitter name="a" emitRef={emitA} />
        <SelectionProbe name="a" probeRef={probeA} />
        <SelectionEmitter name="b" emitRef={emitB} />
        <SelectionProbe name="b" probeRef={probeB} />
      </LinkedCharts>
    )

    act(() => {
      emitA.current.selectPoints({ x: ["1"] })
      emitB.current.selectPoints({ y: ["2"] })
    })

    expect(probeA.current.isActive).toBe(true)
    expect(probeB.current.isActive).toBe(true)

    act(() => {
      emitA.current.clear()
    })

    expect(probeA.current.isActive).toBe(false)
    expect(probeB.current.isActive).toBe(true) // still active
  })

  // 6. CategoryColorProvider produces consistent colors for the same categories
  it("CategoryColorProvider assigns deterministic colors from a scheme", () => {
    const probe1 = { current: null as any }
    const probe2 = { current: null as any }

    render(
      <CategoryColorProvider categories={["A", "B", "C"]} colorScheme="category10">
        <ColorProbe probeRef={probe1} />
        <ColorProbe probeRef={probe2} />
      </CategoryColorProvider>
    )

    expect(probe1.current).not.toBeNull()
    expect(probe2.current).not.toBeNull()

    // Both probes see the same color record
    const colorA = probe1.current!["A"]
    const colorB = probe1.current!["B"]
    const colorC = probe1.current!["C"]

    expect(colorA).toBeTruthy()
    expect(colorB).toBeTruthy()
    expect(colorC).toBeTruthy()
    expect(colorA).not.toBe(colorB) // distinct categories get distinct colors
    expect(colorA).not.toBe(colorC)

    // Second probe gets identical colors
    expect(probe2.current!["A"]).toBe(colorA)
    expect(probe2.current!["B"]).toBe(colorB)
  })

  // 7. Explicit color map overrides scheme
  it("explicit color map in CategoryColorProvider overrides defaults", () => {
    const probeRef = { current: null as any }
    const explicitColors = { Revenue: "#ff0000", Cost: "#00ff00" }

    render(
      <CategoryColorProvider colors={explicitColors}>
        <ColorProbe probeRef={probeRef} />
      </CategoryColorProvider>
    )

    expect(probeRef.current!["Revenue"]).toBe("#ff0000")
    expect(probeRef.current!["Cost"]).toBe("#00ff00")
  })

  // 8. useCategoryColors returns null outside provider
  it("useCategoryColors returns null when no provider is present", () => {
    const probeRef = { current: null as any }
    render(<ColorProbe probeRef={probeRef} />)
    expect(probeRef.current).toBeNull()
  })

  // 9. Full dashboard composition: LinkedCharts + CategoryColorProvider + ChartGrid
  it("LinkedCharts + CategoryColorProvider + ChartGrid compose without errors", () => {
    const probeRef = { current: null as any }
    const colorRef = { current: null as any }

    const { container } = render(
      <CategoryColorProvider categories={["North", "South"]}>
        <LinkedCharts>
          <ChartGrid columns={2}>
            <div data-testid="chart1">Chart 1</div>
            <div data-testid="chart2">Chart 2</div>
          </ChartGrid>
          <SelectionProbe name="hl" probeRef={probeRef} />
          <ColorProbe probeRef={colorRef} />
        </LinkedCharts>
      </CategoryColorProvider>
    )

    // Grid renders
    expect(container.querySelector(".semiotic-chart-grid")).toBeTruthy()
    // Colors available
    expect(colorRef.current!["North"]).toBeTruthy()
    // Selection works
    expect(probeRef.current.isActive).toBe(false)
  })

  // 10. Selection with multi-field predicate (both fields must match)
  it("point selection with multiple fields requires all fields to match", () => {
    const emitRef = { current: null as any }
    const probeRef = { current: null as any }

    render(
      <LinkedCharts>
        <SelectionEmitter name="test" emitRef={emitRef} />
        <SelectionProbe name="test" probeRef={probeRef} />
      </LinkedCharts>
    )

    act(() => {
      emitRef.current.selectPoints({
        region: ["North"],
        product: ["Widget"],
      })
    })

    expect(probeRef.current.isActive).toBe(true)
    // Both fields match
    expect(probeRef.current.predicate({ region: "North", product: "Widget" })).toBe(true)
    // One field doesn't match
    expect(probeRef.current.predicate({ region: "North", product: "Gadget" })).toBe(false)
    expect(probeRef.current.predicate({ region: "South", product: "Widget" })).toBe(false)
  })

  // 11. useFilteredData applies selection predicate to data array
  it("useFilteredData returns only matching data when selection is active", () => {
    const data = [
      { region: "North", value: 10 },
      { region: "South", value: 20 },
      { region: "North", value: 30 },
      { region: "East", value: 40 },
    ]

    let filtered: typeof data = []
    const emitRef = { current: null as any }

    function FilterConsumer() {
      filtered = useFilteredData(data, "hl")
      return null
    }

    render(
      <LinkedCharts>
        <SelectionEmitter name="hl" emitRef={emitRef} />
        <FilterConsumer />
      </LinkedCharts>
    )

    // No selection → all data passes through
    expect(filtered).toHaveLength(4)

    act(() => {
      emitRef.current.selectPoints({ region: ["North"] })
    })

    // Only North rows
    expect(filtered).toHaveLength(2)
    expect(filtered.every((d) => d.region === "North")).toBe(true)
  })

  // 12. LinkedCharts legend + selection + CategoryColorProvider full integration
  it("legend hover in LinkedCharts activates selection consumed by chart hooks", () => {
    const probeRef = { current: null as any }

    const { container } = render(
      <CategoryColorProvider colors={{ Alpha: "#f00", Beta: "#0f0", Gamma: "#00f" }}>
        <LinkedCharts
          showLegend
          legendInteraction="highlight"
          legendSelectionName="dash-hl"
          legendField="category"
        >
          <SelectionProbe name="dash-hl" probeRef={probeRef} />
        </LinkedCharts>
      </CategoryColorProvider>
    )

    expect(probeRef.current.isActive).toBe(false)

    // Find legend items and hover
    const legendItems = container.querySelectorAll(".legend-item g")
    expect(legendItems.length).toBe(3) // Alpha, Beta, Gamma

    act(() => {
      fireEvent.mouseEnter(legendItems[0]) // hover Alpha
    })

    expect(probeRef.current.isActive).toBe(true)
    expect(probeRef.current.predicate({ category: "Alpha" })).toBe(true)
    expect(probeRef.current.predicate({ category: "Beta" })).toBe(false)

    act(() => {
      fireEvent.mouseLeave(legendItems[0])
    })

    expect(probeRef.current.isActive).toBe(false)
  })
})
