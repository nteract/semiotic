import React from "react"
import { act, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  ThemeProvider,
  useTheme,
  DARK_THEME,
  LIGHT_THEME
} from "./ThemeProvider"
import { useThemeSelector } from "./store/ThemeStore"
import type { SemioticTheme, SemioticThemeUpdate } from "./store/themeCore"

describe("ThemeProvider imperative and inherited updates", () => {
  it("compares nested aesthetic values and palette order without notifying for equal inputs", () => {
    const seen: SemioticTheme[] = []
    const Probe = React.memo(function Probe() {
      seen.push(useTheme())
      return null
    })
    const tree = (weight: number, categorical = ["red", "blue"]) => (
      <ThemeProvider
        theme={{
          colors: { categorical },
          aesthetics: { weights: { "palette-authorship": weight } }
        }}
      >
        <Probe />
      </ThemeProvider>
    )
    const view = render(tree(1))
    const count = seen.length
    view.rerender(tree(1))
    expect(seen).toHaveLength(count)
    view.rerender(tree(2))
    expect(seen.at(-1)?.aesthetics?.weights?.["palette-authorship"]).toBe(2)
    view.rerender(tree(2, ["blue", "red"]))
    expect(seen.at(-1)?.colors.categorical).toEqual(["blue", "red"])
    expect(view.container.firstElementChild?.getAttribute("style")).toContain(
      "--semiotic-category-1: blue"
    )
  })
  it.each(["dark", { mode: "auto" }] as const)(
    "keeps an explicit child theme independent of parent updates: %j",
    (theme) => {
      const updates: Record<string, (theme: SemioticThemeUpdate) => void> = {}
      const seen: Record<string, SemioticTheme> = {}
      function Probe({ name }: { name: string }) {
        updates[name] = useThemeSelector((state) => state.setTheme)
        seen[name] = useTheme()
        return null
      }
      render(
        <ThemeProvider theme="light">
          <Probe name="parent" />
          <ThemeProvider theme={theme}>
            <Probe name="child" />
          </ThemeProvider>
        </ThemeProvider>
      )
      act(() => updates.child({ typography: { labelSize: 23 } }))
      act(() => updates.parent({ colors: { primary: "blue" } }))
      expect(seen.child.typography.labelSize).toBe(23)
      expect(seen.child.colors.primary).not.toBe("blue")
    }
  )
  it("uses the automatic palette fallback for the first server render", () => {
    let seen!: SemioticTheme
    function Probe() {
      seen = useTheme()
      return null
    }
    const html = renderToString(
      <ThemeProvider
        theme={{ mode: "auto", colors: { categorical: undefined } }}
      >
        <Probe />
      </ThemeProvider>
    )
    expect(seen.colors.categorical).toEqual(LIGHT_THEME.colors.categorical)
    expect(html).toContain("prefers-color-scheme:dark")
    expect(html).not.toContain("undefined")
  })
  it.each([undefined, { typography: { labelSize: 22 } }])(
    "inherits live automatic parent values with child overrides %j",
    (child) => {
      let dark = false
      const listeners = new Set<() => void>()
      const previous = window.matchMedia
      window.matchMedia = vi.fn(() => ({
        get matches() {
          return dark
        },
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener)
      })) as unknown as typeof window.matchMedia
      const seen: Record<string, SemioticTheme> = {}
      let update!: (theme: SemioticThemeUpdate) => void
      function Probe({ name }: { name: string }) {
        seen[name] = useTheme()
        const setTheme = useThemeSelector((state) => state.setTheme)
        if (name === "parent") update = setTheme
        return null
      }
      try {
        const view = render(
          <ThemeProvider theme={{ mode: "auto", colors: { primary: "red" } }}>
            <Probe name="parent" />
            <ThemeProvider theme={child}>
              <Probe name="child" />
              <ThemeProvider>
                <Probe name="grandchild" />
              </ThemeProvider>
            </ThemeProvider>
          </ThemeProvider>
        )
        act(() =>
          update({
            colors: { primary: "blue" },
            typography: { fontFamily: "serif", labelSize: 23 }
          })
        )
        for (const name of ["parent", "child", "grandchild"]) {
          expect(seen[name].colors.primary).toBe("blue")
          expect(seen[name].typography.fontFamily).toBe("serif")
        }
        const labelSize = child?.typography.labelSize ?? 23
        expect(seen.child.typography.labelSize).toBe(labelSize)
        expect(seen.grandchild.typography.labelSize).toBe(labelSize)
        for (const wrapper of view.container.querySelectorAll<HTMLElement>(
          "[data-semiotic-auto]"
        )) {
          expect(wrapper.style.getPropertyValue("--semiotic-primary")).toBe(
            "blue"
          )
          expect(wrapper.style.getPropertyValue("--semiotic-font-family")).toBe(
            "serif"
          )
        }
        act(() => {
          dark = true
          for (const listener of [...listeners]) listener()
        })
        for (const name of ["child", "grandchild"]) {
          expect(seen[name].colors).toEqual(seen.parent.colors)
          expect(seen[name].colors.background).toBe(
            DARK_THEME.colors.background
          )
          expect(seen[name].typography.labelSize).toBe(
            child?.typography.labelSize ?? seen.parent.typography.labelSize
          )
        }
        view.unmount()
        expect(listeners.size).toBe(0)
      } finally {
        window.matchMedia = previous
      }
    }
  )

  it.each([false, true])(
    "clears imperative overrides when equal-resolving props change (nested: %s)",
    (nested) => {
      let update!: (theme: SemioticThemeUpdate) => void
      let seen!: SemioticTheme
      function Probe() {
        update = useThemeSelector((state) => state.setTheme)
        seen = useTheme()
        return null
      }
      const tree = (theme: SemioticThemeUpdate) => {
        const child = (
          <ThemeProvider theme={theme}>
            <Probe />
          </ThemeProvider>
        )
        return nested ? (
          <ThemeProvider theme="dark">{child}</ThemeProvider>
        ) : (
          child
        )
      }
      const view = render(tree({ typography: { labelSize: 12 } }))
      act(() => update({ typography: { labelSize: 23 } }))
      view.rerender(tree({ typography: { labelSize: 12 } }))
      expect(seen.typography.labelSize).toBe(23)
      view.rerender(tree({}))
      expect(seen.typography.labelSize).toBe(12)
      expect(
        view.container
          .querySelector<HTMLElement>("[data-semiotic-theme-mode]")!
          .style.getPropertyValue("--semiotic-axis-label-font-size")
      ).toBe("12px")
    }
  )
})
