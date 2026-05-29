import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React, { useRef, useEffect } from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { BigNumber } from "./BigNumber"
import type { BigNumberHandle } from "./types"
import {
  buildFormatter,
  formatSignedDelta,
  formatDeltaPercent,
  formatDuration,
} from "./formatting"
import { resolveThreshold, colorForLevel, buildSparklinePath } from "./thresholdSparkline"

describe("BigNumber — render basics", () => {
  it("renders the focal value formatted as a plain number", () => {
    render(<BigNumber value={1234567} />)
    expect(screen.getByText("1,234,567")).toBeInTheDocument()
  })

  it("applies prefix and suffix decorators", () => {
    render(<BigNumber value={42} prefix="+" suffix="%" />)
    expect(screen.getByText("+42%")).toBeInTheDocument()
  })

  it("renders the label and caption", () => {
    render(<BigNumber value={10} label="Q3 Revenue" caption="YTD" />)
    expect(screen.getByText("Q3 Revenue")).toBeInTheDocument()
    expect(screen.getByText("YTD")).toBeInTheDocument()
  })

  it("renders an empty-state placeholder for NaN value", () => {
    render(<BigNumber value={Number.NaN} label="empty" />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("respects loading prop and renders a busy region", () => {
    render(<BigNumber value={10} loading />)
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
  })
})

describe("BigNumber — formatting cascade", () => {
  it("formats as currency with locale + currency", () => {
    render(<BigNumber value={1284900} format="currency" currency="USD" />)
    // en-US USD with default precision 2.
    expect(screen.getByText("$1,284,900.00")).toBeInTheDocument()
  })

  it("formats as compact notation", () => {
    render(<BigNumber value={1500} format="compact" />)
    // Intl compact: 1.5K (locale en-US default)
    expect(screen.getByText("1.5K")).toBeInTheDocument()
  })

  it("formats as percent with multiplier", () => {
    render(<BigNumber value={0.825} format="percent" precision={1} />)
    expect(screen.getByText("82.5%")).toBeInTheDocument()
  })

  it("accepts a custom formatter function", () => {
    render(<BigNumber value={3} format={(v) => `★ ${v.toFixed(0)}`} />)
    expect(screen.getByText("★ 3")).toBeInTheDocument()
  })
})

describe("BigNumber — thresholds", () => {
  const thresholds = [
    { at: -Infinity, level: "danger" as const, label: "low" },
    { at: 50, level: "warning" as const, label: "mid" },
    { at: 80, level: "success" as const, label: "ok" },
  ]

  it("resolves the highest-bound threshold that is ≤ value", () => {
    expect(resolveThreshold(40, thresholds)?.level).toBe("danger")
    expect(resolveThreshold(50, thresholds)?.level).toBe("warning")
    expect(resolveThreshold(79, thresholds)?.level).toBe("warning")
    expect(resolveThreshold(80, thresholds)?.level).toBe("success")
    expect(resolveThreshold(120, thresholds)?.level).toBe("success")
  })

  it("returns null when no threshold matches", () => {
    expect(resolveThreshold(10, [{ at: 50, level: "warning" }])).toBeNull()
  })

  it("applies the success semantic colour on the value text", () => {
    const { container } = render(<BigNumber value={90} thresholds={thresholds} />)
    const root = container.querySelector("[data-chart='BigNumber']")
    expect(root?.getAttribute("data-level")).toBe("success")
  })

  it("colorForLevel falls through to var(--semiotic-text) for neutral", () => {
    expect(colorForLevel("neutral")).toMatch(/--semiotic-text/)
    expect(colorForLevel("success")).toMatch(/--semiotic-success/)
    expect(colorForLevel("danger", "#ff0000")).toBe("#ff0000")
  })
})

describe("BigNumber — comparison + delta + sentiment", () => {
  it("derives the delta from comparison.value and renders with + sign", () => {
    render(
      <BigNumber
        value={120}
        comparison={{ value: 100, label: "vs last quarter" }}
      />
    )
    // Standalone delta span has exact text "+20"; percent span has "(+20%)".
    expect(screen.getByText("+20")).toBeInTheDocument()
    expect(screen.getByText("(+20%)")).toBeInTheDocument()
    expect(screen.getByText("vs last quarter")).toBeInTheDocument()
  })

  it("respects explicit delta override", () => {
    render(<BigNumber value={120} comparison={{ value: 100 }} delta={-5} />)
    expect(screen.getByText(/−5/)).toBeInTheDocument()
  })

  it("infers positive sentiment for higher-is-better delta", () => {
    const { container } = render(
      <BigNumber value={120} comparison={{ value: 100 }} direction="higher-is-better" />
    )
    expect(container.querySelector("[data-sentiment='positive']")).toBeTruthy()
  })

  it("infers negative sentiment when direction is lower-is-better and value is up", () => {
    const { container } = render(
      <BigNumber value={120} comparison={{ value: 100 }} direction="lower-is-better" />
    )
    expect(container.querySelector("[data-sentiment='negative']")).toBeTruthy()
  })

  it("forces sentiment via prop override", () => {
    const { container } = render(
      <BigNumber value={120} comparison={{ value: 100 }} sentiment="neutral" />
    )
    expect(container.querySelector("[data-sentiment='neutral']")).toBeTruthy()
  })

  it("formatSignedDelta keeps zero unsigned", () => {
    const f = (n: number) => String(n)
    expect(formatSignedDelta(0, f)).toBe("0")
    expect(formatSignedDelta(5, f)).toBe("+5")
    expect(formatSignedDelta(-5, f)).toBe("−5")
  })

  it("formatDeltaPercent returns null when from is 0", () => {
    expect(formatDeltaPercent(0, 100)).toBeNull()
  })
})

describe("BigNumber — target", () => {
  it("renders a percent-of-target string", () => {
    render(
      <BigNumber
        value={750}
        target={{ value: 1000, label: "of Q3 plan" }}
      />
    )
    expect(screen.getByText(/75%/)).toBeInTheDocument()
    expect(screen.getByText(/of Q3 plan/)).toBeInTheDocument()
  })
})

describe("BigNumber — chart slots (no built-in renderer)", () => {
  it("renders trendSlot content beneath the value when provided", () => {
    const { container } = render(
      <BigNumber
        value={100}
        trendSlot={
          <svg data-testid="user-trend" width={120} height={24} role="img">
            <path d="M0,12 L120,4" />
          </svg>
        }
      />
    )
    const trend = container.querySelector(".semiotic-bignumber__trend")
    expect(trend).not.toBeNull()
    expect(trend?.querySelector("[data-testid='user-trend']")).not.toBeNull()
  })

  it("does not render any chart of its own when trendSlot is absent", () => {
    const { container } = render(<BigNumber value={100} />)
    // No trend, no chart, no SVG anywhere from BigNumber itself.
    expect(container.querySelector(".semiotic-bignumber__trend")).toBeNull()
    expect(container.querySelector(".semiotic-bignumber__chart")).toBeNull()
    expect(container.querySelector("svg")).toBeNull()
  })

  it("anchors chartSlot in the top-right corner at sparkline scale", () => {
    const { container } = render(
      <BigNumber
        value={5000}
        label="Revenue mix"
        chartSlot={
          <svg data-testid="user-donut" width={44} height={44}>
            <circle cx={22} cy={22} r={18} />
          </svg>
        }
      />
    )
    const chartRegion = container.querySelector(
      ".semiotic-bignumber__chart"
    ) as HTMLElement
    expect(chartRegion).not.toBeNull()
    // Absolute-positioned in top-right, square reservation
    expect(chartRegion.style.position).toBe("absolute")
    expect(chartRegion.style.width).toBe("44px")
    expect(chartRegion.style.height).toBe("44px")
    expect(chartRegion.querySelector("[data-testid='user-donut']")).not.toBeNull()
    // Card itself is `position: relative` so the absolute anchor lands on it.
    const root = container.querySelector(".semiotic-bignumber") as HTMLElement
    expect(root.style.position).toBe("relative")
  })

  it("composes chartSlot (square) + trendSlot (wide) together", () => {
    const { container } = render(
      <BigNumber
        value={5000}
        chartSlot={<span data-testid="square">square</span>}
        trendSlot={<span data-testid="wide">wide</span>}
      />
    )
    // Square chart anchored top-right, wide trend below the text content.
    const square = container.querySelector(".semiotic-bignumber__chart")
    expect(square?.querySelector("[data-testid='square']")).not.toBeNull()
    const trend = container.querySelector(".semiotic-bignumber__trend")
    expect(trend?.querySelector("[data-testid='wide']")).not.toBeNull()
  })

  it("function-form slot receives the resolved theming context", () => {
    const seen = { color: "", level: "", sentiment: "", pushBufferLen: -1 }
    render(
      <BigNumber
        value={120}
        comparison={{ value: 100 }}
        thresholds={[
          { at: -Infinity, level: "danger" },
          { at: 100, level: "success" },
        ]}
        trendSlot={(ctx) => {
          seen.color = ctx.color
          seen.level = ctx.level
          seen.sentiment = ctx.sentiment
          seen.pushBufferLen = ctx.pushBuffer.length
          return <span data-testid="ctx-marker" />
        }}
      />
    )
    expect(seen.color).toMatch(/--semiotic-success/)
    expect(seen.level).toBe("success")
    expect(seen.sentiment).toBe("positive")
    expect(seen.pushBufferLen).toBe(0)
  })

  it("suppresses both slots in thumbnail / inline modes", () => {
    const slotMarker = <span data-testid="should-not-render" />
    const { container: thumb } = render(
      <BigNumber value={1} mode="thumbnail" trendSlot={slotMarker} chartSlot={slotMarker} />
    )
    expect(thumb.querySelector("[data-testid='should-not-render']")).toBeNull()
    const { container: inline } = render(
      <BigNumber value={1} mode="inline" trendSlot={slotMarker} chartSlot={slotMarker} />
    )
    expect(inline.querySelector("[data-testid='should-not-render']")).toBeNull()
  })

  it("buildSparklinePath helper stays exported for custom-slot consumers", () => {
    // The helper is no longer used internally but ships for users who
    // want minimal SVG rendering inside their own trendSlot.
    const r = buildSparklinePath([1, 2, 3, 4], { width: 80, height: 20 })
    expect(r.points.length).toBe(4)
    expect(r.line).toMatch(/^M/)
  })
})

describe("BigNumber — push API", () => {
  function Harness({ onReady }: { onReady: (h: BigNumberHandle) => void }) {
    const ref = useRef<BigNumberHandle>(null)
    useEffect(() => {
      if (ref.current) onReady(ref.current)
    }, [onReady])
    return <BigNumber ref={ref} value={0} label="live" windowSize={3} />
  }

  it("push updates the displayed value", () => {
    let handle: BigNumberHandle | null = null
    render(<Harness onReady={(h) => (handle = h)} />)
    expect(handle).toBeTruthy()
    act(() => {
      handle!.push(42)
    })
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(handle!.getValue()).toBe(42)
  })

  it("pushMany honours windowSize as a cap", () => {
    let handle: BigNumberHandle | null = null
    render(<Harness onReady={(h) => (handle = h)} />)
    act(() => {
      handle!.pushMany([1, 2, 3, 4, 5])
    })
    expect(handle!.getData().length).toBe(3)
    expect(handle!.getValue()).toBe(5)
  })

  it("clear resets the buffer and falls back to prop value", () => {
    let handle: BigNumberHandle | null = null
    render(<Harness onReady={(h) => (handle = h)} />)
    act(() => {
      handle!.push(99)
    })
    act(() => {
      handle!.clear()
    })
    expect(handle!.getData()).toEqual([])
    expect(screen.getByText("0")).toBeInTheDocument()
  })
})

describe("BigNumber — staleness", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("dims the card after the staleness threshold elapses without a push", () => {
    function Harness() {
      const ref = useRef<BigNumberHandle>(null)
      useEffect(() => {
        ref.current?.push({ value: 1, time: Date.now() })
      }, [])
      return <BigNumber ref={ref} value={0} stalenessThreshold={500} />
    }
    const { container } = render(<Harness />)
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(container.querySelector("[data-stale='true']")).toBeTruthy()
  })
})

describe("BigNumber — accessibility", () => {
  it("renders a full ARIA sentence including label + delta + target", () => {
    const { container } = render(
      <BigNumber
        value={120}
        label="Active users"
        comparison={{ value: 100, label: "vs last week" }}
        target={{ value: 200, label: "weekly goal" }}
      />
    )
    const root = container.querySelector("[data-chart='BigNumber']")
    const aria = root?.getAttribute("aria-label") ?? ""
    expect(aria).toContain("Active users:")
    expect(aria).toContain("120")
    expect(aria).toContain("up")
    expect(aria).toContain("vs last week")
    expect(aria).toContain("of weekly goal")
  })

  it("ARIA direction word follows the delta sign, not sentiment (lower-is-better)", () => {
    // Latency went DOWN (good under lower-is-better) — sentiment is
    // positive but the screen reader sentence should still report
    // "down 60 ms" (factual direction), not "up 60 ms".
    const { container } = render(
      <BigNumber
        value={340}
        label="P99 latency"
        suffix=" ms"
        comparison={{ value: 400, label: "vs last week", direction: "lower-is-better" }}
      />
    )
    const aria = container
      .querySelector("[data-chart='BigNumber']")
      ?.getAttribute("aria-label") ?? ""
    expect(aria).toContain("down")
    expect(aria).not.toContain("up")
    // Sentiment-positive (good) coloring still applies — direction word
    // and visual sentiment are independent concerns.
    expect(
      container.querySelector("[data-sentiment='positive']")
    ).not.toBeNull()
  })

  it("uses description prop as the ARIA override when provided", () => {
    const { container } = render(
      <BigNumber value={1} description="custom description for this card" />
    )
    expect(container.querySelector("[data-chart='BigNumber']")?.getAttribute("aria-label"))
      .toBe("custom description for this card")
  })
})

describe("BigNumber — layout modes", () => {
  it("renders header in tile mode", () => {
    const { container } = render(<BigNumber value={1} label="x" mode="tile" />)
    expect(container.querySelector("[data-mode='tile']")).toBeTruthy()
  })

  it("suppresses header chrome in thumbnail mode", () => {
    render(<BigNumber value={1} label="hidden" mode="thumbnail" />)
    expect(screen.queryByText("hidden")).toBeNull()
  })

  it("falls back to tile defaults for an unknown mode (e.g. a generic ChartMode bleed-through)", () => {
    // A suggestion engine that spreads runnable props from a different
    // chart family can land BaseChartProps' "primary" / "context" /
    // "sparkline" mode strings on BigNumber. The component should not
    // crash with `Cannot read properties of undefined (reading 'align')`.
    const { container } = render(
      // @ts-expect-error — exercising the runtime fallback explicitly
      <BigNumber value={42} mode="primary" />
    )
    const root = container.querySelector("[data-chart='BigNumber']") as HTMLElement
    expect(root).not.toBeNull()
    // No crash; data-mode reflects what was passed (we don't rewrite the
    // attribute, only resolve defaults defensively).
    expect(root.getAttribute("data-mode")).toBe("primary")
  })

  it("uses inline-flex layout in inline mode", () => {
    const { container } = render(
      <BigNumber value={5} mode="inline" comparison={{ value: 4 }} />
    )
    const root = container.querySelector("[data-mode='inline']") as HTMLElement
    expect(root?.style.display).toBe("inline-flex")
  })
})

describe("BigNumber — semantic CSS classes", () => {
  it("emits semiotic-bignumber root + modifier classes", () => {
    const { container } = render(
      <BigNumber
        value={90}
        comparison={{ value: 80 }}
        mode="tile"
        thresholds={[
          { at: -Infinity, level: "danger" },
          { at: 50, level: "warning" },
          { at: 80, level: "success" },
        ]}
      />
    )
    const root = container.querySelector(".semiotic-bignumber") as HTMLElement
    expect(root.classList.contains("semiotic-bignumber--mode-tile")).toBe(true)
    expect(root.classList.contains("semiotic-bignumber--level-success")).toBe(true)
    expect(root.classList.contains("semiotic-bignumber--sentiment-positive")).toBe(true)
  })

  it("tags the delta row with up/down/flat modifier classes", () => {
    const { container: up } = render(
      <BigNumber value={120} comparison={{ value: 100 }} />
    )
    expect(up.querySelector(".semiotic-bignumber__delta-row--up")).not.toBeNull()
    expect(up.querySelector(".semiotic-bignumber__arrow--up")).not.toBeNull()

    const { container: down } = render(
      <BigNumber value={80} comparison={{ value: 100 }} />
    )
    expect(down.querySelector(".semiotic-bignumber__delta-row--down")).not.toBeNull()
    expect(down.querySelector(".semiotic-bignumber__arrow--down")).not.toBeNull()

    const { container: flat } = render(
      <BigNumber value={100} comparison={{ value: 100 }} />
    )
    expect(flat.querySelector(".semiotic-bignumber__delta-row--flat")).not.toBeNull()
  })

  it("composes user className with semiotic-bignumber root class", () => {
    const { container } = render(<BigNumber value={1} className="my-kpi" />)
    const root = container.querySelector(".semiotic-bignumber") as HTMLElement
    expect(root.classList.contains("my-kpi")).toBe(true)
  })
})

describe("BigNumber — events", () => {
  it("fires onClick with the resolved datum + click coords", () => {
    const onClick = vi.fn()
    const { container } = render(<BigNumber value={10} onClick={onClick} />)
    const root = container.querySelector("[data-chart='BigNumber']") as HTMLElement
    fireEvent.click(root, { clientX: 30, clientY: 20 })
    expect(onClick).toHaveBeenCalledTimes(1)
    const [datum] = onClick.mock.calls[0]
    expect(datum.value).toBe(10)
    expect(datum.level).toBe("neutral")
  })

  it("emits a click observation when onObservation is set", () => {
    const onObservation = vi.fn()
    const { container } = render(
      <BigNumber value={10} onObservation={onObservation} chartId="kpi-1" />
    )
    fireEvent.click(container.querySelector("[data-chart='BigNumber']") as HTMLElement)
    expect(onObservation).toHaveBeenCalledTimes(1)
    const [obs] = onObservation.mock.calls[0]
    expect(obs.type).toBe("click")
    expect(obs.chartType).toBe("BigNumber")
    expect(obs.chartId).toBe("kpi-1")
  })
})

describe("BigNumber — slot overrides", () => {
  it("replaces the value slot via a callable slot", () => {
    render(
      <BigNumber
        value={10}
        valueSlot={(ctx) => <em data-testid="custom">{ctx.formattedValue}!!</em>}
      />
    )
    expect(screen.getByTestId("custom")).toHaveTextContent("10!!")
  })

  it("replaces the header slot via a node", () => {
    render(<BigNumber value={10} headerSlot={<span data-testid="hdr">hi</span>} />)
    expect(screen.getByTestId("hdr")).toBeInTheDocument()
  })
})

describe("formatting helpers", () => {
  it("formatDuration handles ms → seconds → minutes → hours", () => {
    expect(formatDuration(500)).toBe("500ms")
    expect(formatDuration(2500)).toBe("2.5s")
    expect(formatDuration(125_000)).toBe("2m 5s")
    expect(formatDuration(3_700_000)).toBe("1h 2m")
  })

  it("buildFormatter returns a pass-through for function input", () => {
    const f = buildFormatter((v) => `~${v}`)
    expect(f(7)).toBe("~7")
  })
})
