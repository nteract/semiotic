import React from "react"
import { act, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { ThemeProvider, useTheme, DARK_THEME, HIGH_CONTRAST_THEME, LIGHT_THEME } from "./ThemeProvider"
import type { SemioticTheme } from "./ThemeProvider"

function ThemeProbe({
  seen
}: {
  seen: SemioticTheme[]
}) {
  const theme = useTheme()
  seen.push(theme)
  return <span data-testid="theme-mode">{theme.mode}</span>
}

function installForcedColorsMock(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const original = window.matchMedia
  const media = "(forced-colors: active)"

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
    }))
  })

  return {
    setMatches(next: boolean) {
      matches = next
      for (const listener of listeners) {
        listener({ matches: next, media } as MediaQueryListEvent)
      }
    },
    restore() {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: original,
      })
    }
  }
}

describe("ThemeProvider", () => {
  it("initializes the store with the requested preset before children render", () => {
    const seen: SemioticTheme[] = []

    render(
      <ThemeProvider theme="dark">
        <ThemeProbe seen={seen} />
      </ThemeProvider>
    )

    expect(seen[0]).toBe(DARK_THEME)
    expect(seen.map(theme => theme.mode)).toEqual(["dark"])
  })

  it("emits CSS variables from the initial theme", () => {
    const { container } = render(
      <ThemeProvider theme="dark">
        <div>chart</div>
      </ThemeProvider>
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.getPropertyValue("--semiotic-bg")).toBe(DARK_THEME.colors.background)
    expect(wrapper.style.getPropertyValue("--semiotic-text")).toBe(DARK_THEME.colors.text)
  })

  it("initializes partial object themes against their mode base", () => {
    const seen: SemioticTheme[] = []

    render(
      <ThemeProvider
        theme={{
          mode: "dark",
          colors: { categorical: ["#111111", "#222222"] },
        }}
      >
        <ThemeProbe seen={seen} />
      </ThemeProvider>
    )

    expect(seen[0].mode).toBe("dark")
    expect(seen[0].colors.background).toBe(DARK_THEME.colors.background)
    expect(seen[0].colors.categorical).toEqual(["#111111", "#222222"])
  })

  it("still responds to theme prop changes after mount", () => {
    const seen: SemioticTheme[] = []
    const { rerender } = render(
      <ThemeProvider theme="light">
        <ThemeProbe seen={seen} />
      </ThemeProvider>
    )

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("light")

    rerender(
      <ThemeProvider theme="dark">
        <ThemeProbe seen={seen} />
      </ThemeProvider>
    )

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark")
    expect(seen.at(-1)).toBe(DARK_THEME)
  })

  it("initializes from forced-colors and restores light when forced-colors exits", () => {
    const forcedColors = installForcedColorsMock(true)
    const seen: SemioticTheme[] = []

    try {
      render(
        <ThemeProvider>
          <ThemeProbe seen={seen} />
        </ThemeProvider>
      )

      expect(seen[0]).toBe(HIGH_CONTRAST_THEME)

      act(() => {
        forcedColors.setMatches(false)
      })

      expect(seen.at(-1)).toBe(LIGHT_THEME)
    } finally {
      forcedColors.restore()
    }
  })
})
