import * as React from "react"
import { Suspense } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LIGHT_THEME, ThemeProvider } from "../../ThemeProvider"
import { useRealtimeCategoryColors } from "./useRealtimeCategoryColors"

const NEVER_RESOLVES = new Promise<void>(() => undefined)
const TEST_PALETTE = ["#110000", "#220000", "#330000"]
const TEST_THEME = {
  ...LIGHT_THEME,
  colors: { ...LIGHT_THEME.colors, categorical: TEST_PALETTE }
}

function ColorProbe({
  categories,
  suspend = false,
  colors,
  resolve
}: {
  categories: string[]
  suspend?: boolean
  colors?: Record<string, string>
  resolve?: string[]
}) {
  const { colorMap, colorScale } = useRealtimeCategoryColors({
    enabled: true,
    categories,
    colors,
    domainKey: "category"
  })
  if (suspend) throw NEVER_RESOLVES
  const value = resolve
    ? Object.fromEntries(
        resolve.map((category) => [category, colorScale?.(category)])
      )
    : colorMap
  return <output data-testid="colors">{JSON.stringify(value)}</output>
}

function TestTree(props: React.ComponentProps<typeof ColorProbe>) {
  return (
    <ThemeProvider theme={TEST_THEME}>
      <Suspense fallback={<span data-testid="fallback" />}>
        <ColorProbe {...props} />
      </Suspense>
    </ThemeProvider>
  )
}

describe("useRealtimeCategoryColors", () => {
  it("reserves overridden categories before palette fallback in every mode", () => {
    const requested = ["overridden", "fallback"]
    const { rerender, unmount } = render(
      <TestTree
        categories={[]}
        colors={{ overridden: "#explicit" }}
        resolve={requested}
      />
    )
    expect(
      JSON.parse(screen.getByTestId("colors").textContent ?? "{}")
    ).toEqual({ overridden: "#explicit", fallback: TEST_PALETTE[1] })

    rerender(<TestTree categories={[]} resolve={requested} />)
    expect(
      JSON.parse(screen.getByTestId("colors").textContent ?? "{}")
    ).toEqual({
      overridden: TEST_PALETTE[0],
      fallback: TEST_PALETTE[1]
    })

    unmount()
    render(
      <TestTree
        categories={requested}
        colors={{ overridden: "#explicit" }}
        resolve={requested}
      />
    )
    expect(
      JSON.parse(screen.getByTestId("colors").textContent ?? "{}")
    ).toEqual({ overridden: "#explicit", fallback: TEST_PALETTE[1] })
  })

  it("does not reserve palette indexes from an abandoned render", () => {
    const { rerender } = render(<TestTree categories={["alpha"]} />)
    expect(
      JSON.parse(screen.getByTestId("colors").textContent ?? "{}")
    ).toEqual({ alpha: TEST_PALETTE[0] })

    rerender(<TestTree categories={["alpha", "speculative"]} suspend />)
    expect(screen.getByTestId("fallback")).toBeTruthy()

    rerender(<TestTree categories={["alpha", "committed"]} />)
    expect(
      JSON.parse(screen.getByTestId("colors").textContent ?? "{}")
    ).toEqual({
      alpha: TEST_PALETTE[0],
      committed: TEST_PALETTE[1]
    })
  })
})
