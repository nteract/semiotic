import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import {
  CustomLayoutSelectionProvider,
  useCustomLayoutSelection,
  wrapWithCustomLayoutSelection,
} from "./customLayoutSelection"
import type { Datum } from "../charts/shared/datumTypes"

function Probe() {
  const { isActive, predicate } = useCustomLayoutSelection()
  return (
    <div
      data-testid="probe"
      data-active={String(isActive)}
      data-a={String(predicate({ id: "a" } as Datum))}
    />
  )
}

describe("useCustomLayoutSelection", () => {
  it("returns an inactive, everything-lit selection with no provider", () => {
    const { getByTestId } = render(<Probe />)
    const el = getByTestId("probe")
    expect(el.getAttribute("data-active")).toBe("false")
    expect(el.getAttribute("data-a")).toBe("true")
  })

  it("reflects the provided selection inside the provider", () => {
    const { getByTestId } = render(
      <CustomLayoutSelectionProvider value={{ isActive: true, predicate: (d) => d.id === "a" }}>
        <Probe />
      </CustomLayoutSelectionProvider>
    )
    const el = getByTestId("probe")
    expect(el.getAttribute("data-active")).toBe("true")
    expect(el.getAttribute("data-a")).toBe("true")
  })

  it("treats a null provider value as inactive", () => {
    const { getByTestId } = render(
      <CustomLayoutSelectionProvider value={null}>
        <Probe />
      </CustomLayoutSelectionProvider>
    )
    expect(getByTestId("probe").getAttribute("data-active")).toBe("false")
  })

  it("wrapWithCustomLayoutSelection wraps a node but passes null through", () => {
    expect(wrapWithCustomLayoutSelection(null, { isActive: true, predicate: () => true })).toBeNull()
    const wrapped = wrapWithCustomLayoutSelection(<Probe />, { isActive: true, predicate: () => true })
    const { getByTestId } = render(<>{wrapped}</>)
    expect(getByTestId("probe").getAttribute("data-active")).toBe("true")
  })
})
