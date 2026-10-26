import React, { memo } from "react"
import { act, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  ThemeProvider,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME
} from "./ThemeProvider"
import { useThemeSelector } from "./store/ThemeStore"
import type { SemioticTheme, SemioticThemeUpdate } from "./store/themeCore"

describe("ThemeProvider input reconciliation", () => {
  it("recomputes removed fields even when their previous override was undefined", () => {
    let current!: SemioticTheme
    function Probe() {
      current = useTheme()
      return null
    }
    const tree = (colors: SemioticThemeUpdate["colors"]) => (
      <ThemeProvider theme={{ colors: { cellBorder: "#123456" } }}>
        <ThemeProvider theme={{ colors }}>
          <Probe />
        </ThemeProvider>
      </ThemeProvider>
    )
    const { rerender } = render(tree({ cellBorder: undefined }))
    rerender(tree({}))
    expect(current.colors.cellBorder).toBe("#123456")
  })
  it("removes old overrides and matches a fresh mount of the current prop", () => {
    let current!: SemioticTheme
    function Probe() {
      current = useTheme()
      return null
    }
    const first = {
      colors: { primary: "red", background: "black" },
      tooltip: { fontSize: "18px" }
    }
    const second = { colors: { text: "blue" } }
    const { rerender, container } = render(
      <ThemeProvider theme={first}>
        <Probe />
      </ThemeProvider>
    )
    rerender(
      <ThemeProvider theme={second}>
        <Probe />
      </ThemeProvider>
    )
    const updated = current
    const styles = container.firstElementChild?.getAttribute("style")
    const fresh = render(
      <ThemeProvider theme={second}>
        <Probe />
      </ThemeProvider>
    )
    expect(updated).toEqual(current)
    expect(styles).toBe(
      fresh.container.firstElementChild?.getAttribute("style")
    )
    expect(updated.colors.primary).toBe(LIGHT_THEME.colors.primary)
    expect(updated.tooltip).toBeUndefined()
  })

  it("resets an omitted preset to the default without remounting children", () => {
    let current!: SemioticTheme
    let mounts = 0
    function Probe() {
      current = useTheme()
      React.useEffect(() => {
        mounts++
      }, [])
      return null
    }
    const { rerender } = render(
      <ThemeProvider theme="tufte">
        <Probe />
      </ThemeProvider>
    )
    rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(current).toEqual(LIGHT_THEME)
    expect(mounts).toBe(1)
  })

  it("inherits nested partial and omitted themes, including parent updates", () => {
    const seen: Record<string, SemioticTheme> = {}
    function Probe({ name }: { name: string }) {
      seen[name] = useTheme()
      return null
    }
    const tree = (
      outer: "dark" | "high-contrast",
      inner?: SemioticThemeUpdate
    ) => (
      <ThemeProvider theme={outer}>
        <Probe name="parent" />
        <ThemeProvider theme={inner}>
          <Probe name="child" />
        </ThemeProvider>
      </ThemeProvider>
    )
    const { rerender } = render(tree("dark", { typography: { labelSize: 22 } }))
    expect(seen.child.mode).toBe("dark")
    expect(seen.child.colors).toEqual(DARK_THEME.colors)
    expect(seen.child.typography.labelSize).toBe(22)
    expect(seen.parent.typography.labelSize).toBe(
      DARK_THEME.typography.labelSize
    )
    rerender(tree("high-contrast", { tooltip: { fontSize: "20px" } }))
    expect(seen.child.colors).toEqual(HIGH_CONTRAST_THEME.colors)
    expect(seen.child.tooltip).toEqual({
      ...HIGH_CONTRAST_THEME.tooltip,
      fontSize: "20px"
    })
    expect(seen.child.typography.labelSize).toBe(
      HIGH_CONTRAST_THEME.typography.labelSize
    )
    rerender(tree("dark"))
    expect(seen.child).toEqual(DARK_THEME)
    expect(seen.child).not.toBe(seen.parent)
  })

  it("does not notify memoized consumers for equivalent inline props", () => {
    const seen: SemioticTheme[] = []
    const Probe = memo(function Probe() {
      seen.push(useTheme())
      return null
    })
    const tree = () => (
      <ThemeProvider
        theme={{
          colors: { categorical: ["red", "blue"] },
          tooltip: { fontSize: "16px" }
        }}
      >
        <Probe />
      </ThemeProvider>
    )
    const { rerender } = render(tree())
    const initialRenders = seen.length
    for (let i = 0; i < 3; i++) rerender(tree())
    expect(seen).toHaveLength(initialRenders)
  })

  it("merges imperative tooltip/accessibility updates and skips equal updates", () => {
    let update!: ReturnType<
      typeof useThemeSelector<(theme: SemioticThemeUpdate) => void>
    >
    const seen: SemioticTheme[] = []
    function Probe() {
      update = useThemeSelector((state) => state.setTheme)
      seen.push(useTheme())
      return null
    }
    render(
      <ThemeProvider theme="high-contrast">
        <Probe />
      </ThemeProvider>
    )
    act(() =>
      update({
        tooltip: { fontSize: "16px" },
        accessibility: { colorBlindSafe: true }
      })
    )
    act(() => update({ accessibility: { highContrast: true } }))
    expect(seen.at(-1)?.tooltip).toEqual({
      ...HIGH_CONTRAST_THEME.tooltip,
      fontSize: "16px"
    })
    expect(seen.at(-1)?.accessibility).toEqual({
      colorBlindSafe: true,
      highContrast: true
    })
    const count = seen.length
    act(() => update({ accessibility: { highContrast: true } }))
    expect(seen).toHaveLength(count)
  })

  it("inherits the parent theme on the server's first render", () => {
    function Probe() {
      const theme = useTheme()
      return (
        <span>{`${theme.mode}:${theme.colors.background}:${theme.typography.labelSize}`}</span>
      )
    }
    expect(
      renderToString(
        <ThemeProvider theme="dark">
          <ThemeProvider theme={{ typography: { labelSize: 22 } }}>
            <Probe />
          </ThemeProvider>
        </ThemeProvider>
      )
    ).toContain(`dark:${DARK_THEME.colors.background}:22`)
  })

  it("keeps nested auto palettes responsive and removes obsolete overrides", () => {
    let dark = true
    const listeners = new Set<() => void>()
    const previous = window.matchMedia
    window.matchMedia = vi.fn(
      () =>
        ({
          get matches() {
            return dark
          },
          addEventListener: (_event: string, fn: () => void) => {
            listeners.add(fn)
          },
          removeEventListener: (_event: string, fn: () => void) => {
            listeners.delete(fn)
          }
        }) as unknown as MediaQueryList
    )
    let seen!: SemioticTheme
    function Probe() {
      seen = useTheme()
      return null
    }
    const tree = (override: SemioticThemeUpdate) => (
      <ThemeProvider theme={{ mode: "auto", colors: { primary: "red" } }}>
        <ThemeProvider theme={override}>
          <Probe />
        </ThemeProvider>
      </ThemeProvider>
    )
    try {
      const view = render(
        tree({ colors: { background: "black" }, tooltip: { fontSize: "20px" } })
      )
      expect(seen.colors.background).toBe("black")
      view.rerender(tree({ typography: { labelSize: 22 } }))
      expect(seen.colors.background).toBe(DARK_THEME.colors.background)
      expect(seen.colors.primary).toBe("red")
      expect(seen.tooltip).toBeUndefined()
      const styles = view.container.querySelectorAll("style")
      expect(styles).toHaveLength(2)
      expect(styles[1].textContent).toContain("prefers-color-scheme:dark")
      expect(styles[1].textContent).toContain(
        `--semiotic-bg:${DARK_THEME.colors.background}`
      )
      act(() => {
        dark = false
        for (const fn of [...listeners]) fn()
      })
      expect(seen.colors.background).toBe(LIGHT_THEME.colors.background)
      expect(seen.typography.labelSize).toBe(22)
      view.unmount()
      expect(listeners.size).toBe(0)
    } finally {
      window.matchMedia = previous
    }
  })

  it("preserves imperative changes across equivalent prop renders and replaces them on a new prop", () => {
    let update!: (theme: SemioticThemeUpdate) => void
    let seen!: SemioticTheme
    function Probe() {
      update = useThemeSelector((state) => state.setTheme)
      seen = useTheme()
      return null
    }
    const tree = (color: string) => (
      <ThemeProvider theme={{ colors: { primary: color } }}>
        <Probe />
      </ThemeProvider>
    )
    const { rerender } = render(tree("red"))
    act(() => update({ typography: { labelSize: 23 } }))
    rerender(tree("red"))
    expect(seen.typography.labelSize).toBe(23)
    rerender(tree("blue"))
    expect(seen.colors.primary).toBe("blue")
    expect(seen.typography.labelSize).toBe(LIGHT_THEME.typography.labelSize)
  })

  it("restores the current theme when forced colors resume after an explicit preset", () => {
    let active = false
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const previous = window.matchMedia
    window.matchMedia = vi.fn(() => ({
      get matches() {
        return active
      },
      addEventListener: (
        _: string,
        listener: (event: MediaQueryListEvent) => void
      ) => listeners.add(listener),
      removeEventListener: (
        _: string,
        listener: (event: MediaQueryListEvent) => void
      ) => listeners.delete(listener)
    })) as unknown as typeof window.matchMedia
    let update!: (theme: SemioticThemeUpdate) => void
    let seen!: SemioticTheme
    function Probe() {
      seen = useTheme()
      update = useThemeSelector((state) => state.setTheme)
      return null
    }
    const tree = (theme?: "dark") => (
      <ThemeProvider theme={theme}>
        <Probe />
      </ThemeProvider>
    )
    const force = (matches: boolean) =>
      act(() => {
        active = matches
        for (const listener of listeners)
          listener({ matches } as MediaQueryListEvent)
      })
    try {
      const view = render(tree())
      force(true)
      expect(seen).toEqual(HIGH_CONTRAST_THEME)
      view.rerender(tree("dark"))
      expect(listeners.size).toBe(0)
      force(false)
      view.rerender(tree())
      act(() => update({ typography: { labelSize: 23 } }))
      force(true)
      expect(seen).toEqual(HIGH_CONTRAST_THEME)
      force(false)
      expect(seen.typography.labelSize).toBe(23)
      view.unmount()
      expect(listeners.size).toBe(0)
    } finally {
      window.matchMedia = previous
    }
  })
})
