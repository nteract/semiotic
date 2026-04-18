import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { ThemeProvider } from "../../ThemeProvider"
import { useResolvedSelection } from "./useResolvedSelection"
import { wrapStyleWithSelection, type SelectionHookResult } from "./selectionUtils"

const activeHook: SelectionHookResult = {
  isActive: true,
  predicate: (d) => d.category === "A",
}

describe("useResolvedSelection", () => {
  it("returns undefined when neither selection nor theme supply opacity", () => {
    // light theme defaults provide selectionOpacity, so use a theme that
    // explicitly clears it for this case
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { selectionOpacity: undefined } as any }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(() => useResolvedSelection(undefined), { wrapper })
    expect(result.current).toBeUndefined()
  })

  it("picks up the theme's colors.selectionOpacity as default unselectedOpacity", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { selectionOpacity: 0.3 } as any }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useResolvedSelection({ name: "mySelection" }),
      { wrapper },
    )
    expect(result.current?.unselectedOpacity).toBe(0.3)
    expect(result.current?.name).toBe("mySelection")
  })

  it("per-chart selection.unselectedOpacity overrides the theme", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { selectionOpacity: 0.3 } as any }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useResolvedSelection({ name: "mySelection", unselectedOpacity: 0.8 }),
      { wrapper },
    )
    expect(result.current?.unselectedOpacity).toBe(0.8)
  })

  it("flows the theme value through wrapStyleWithSelection dimming", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { selectionOpacity: 0.1 } as any }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useResolvedSelection({ name: "mySelection" }),
      { wrapper },
    )
    const styled = wrapStyleWithSelection(
      () => ({ fill: "red" }),
      activeHook,
      result.current,
    )({ category: "B" })
    expect(styled.opacity).toBe(0.1)
    expect(styled.fillOpacity).toBe(0.1)
    expect(styled.strokeOpacity).toBe(0.1)
  })

  it("preserves unselectedStyle and selectedStyle from the selection config", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider theme={{ colors: { selectionOpacity: 0.3 } as any }}>
        {children}
      </ThemeProvider>
    )
    const { result } = renderHook(
      () => useResolvedSelection({
        name: "mySelection",
        unselectedStyle: { filter: "grayscale(100%)" },
        selectedStyle: { stroke: "gold" },
      }),
      { wrapper },
    )
    expect(result.current?.unselectedStyle).toEqual({ filter: "grayscale(100%)" })
    expect(result.current?.selectedStyle).toEqual({ stroke: "gold" })
  })
})
