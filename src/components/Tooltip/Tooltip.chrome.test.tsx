import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
  markTooltipChrome,
  normalizeTooltip,
  resolveTooltipContent,
  resolveMultiCapableTooltip,
  type TooltipContentFn
} from "./Tooltip"
import { FlippingTooltip } from "./FlippingTooltip"

afterEach(cleanup)

const position = {
  x: 50,
  y: 50,
  containerWidth: 400,
  containerHeight: 300,
  margin: { left: 0, top: 0, right: 0, bottom: 0 }
}
const ChartTooltip = markTooltipChrome(function ChartTooltip({
  label
}: {
  label: string
}) {
  const id = React.useId()
  return (
    <TooltipRoot id={id} style={{ background: "navy" }}>
      {label}
    </TooltipRoot>
  )
})
// Neither wrapper needs to know about Semiotic's ownership protocol.
const Inner = ({ label }: { label: string }) => <ChartTooltip label={label} />
const Outer = ({ label }: { label: string }) => <Inner label={label} />

function renderTooltip(renderer: TooltipContentFn) {
  return render(
    <FlippingTooltip
      {...position}
      contentOwnsChrome={hasOwnTooltipChrome(renderer)}
    >
      {renderer({ label: "Revenue: $42" })}
    </FlippingTooltip>
  )
}

describe("renderer chrome ownership", () => {
  it("marks the original renderer without executing it", () => {
    const renderer = vi.fn(() => <Outer label="Owned" />)
    expect(markTooltipChrome(renderer)).toBe(renderer)
    expect(hasOwnTooltipChrome(renderer)).toBe(true)
    expect(renderer).not.toHaveBeenCalled()
    expect(hasOwnTooltipChrome(<Outer label="Owned" />)).toBe(false)
  })

  it.each(["frame", "chart", "multi", "single hover", "multi hover"])(
    "keeps one surface through nested wrappers for %s callbacks",
    (path) => {
      const renderer = markTooltipChrome((datum: Record<string, unknown>) => (
        <Outer label={String(datum.label)} />
      ))
      let resolved: TooltipContentFn
      if (path === "chart" || path === "multi") {
        const normalized = normalizeTooltip(
          path === "multi" ? { mode: "multi", content: renderer } : renderer
        )
        if (typeof normalized !== "function")
          throw new Error("Expected renderer")
        resolved = normalized
      } else if (path === "single hover" || path === "multi hover") {
        const resolve =
          path === "single hover"
            ? resolveTooltipContent
            : resolveMultiCapableTooltip
        resolved = resolve({
          tooltip: renderer,
          customFunctionContext: "hover",
          defaultTooltipContent: () => "default"
        }).tooltipContent
      } else {
        resolved = renderer as TooltipContentFn
      }
      expect(hasOwnTooltipChrome(resolved)).toBe(true)
      const view = renderTooltip(resolved)
      expect(view.container.textContent).toBe("Revenue: $42")
      expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(
        1
      )
      const wrapper = view.container.firstChild as HTMLElement
      expect(wrapper.style.background).toBe("")
      expect(
        view.container.querySelector<HTMLElement>(".semiotic-tooltip")!.style
          .background
      ).toBe("navy")
    }
  )

  it.each(["frame", "chart"])(
    "retains fallback chrome for an unmarked plain %s renderer",
    (path) => {
      const renderer: TooltipContentFn = (d) => d.label
      const normalized =
        path === "chart" ? normalizeTooltip(renderer) : renderer
      if (typeof normalized !== "function") throw new Error("Expected renderer")
      const view = renderTooltip(normalized)
      expect(view.container.textContent).toBe("Revenue: $42")
      expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(
        1
      )
      expect(
        view.container.querySelector<HTMLElement>(".semiotic-tooltip")!.style
          .background
      ).toContain("--semiotic-tooltip-bg")
    }
  )
})

describe("rendered root chrome ownership", () => {
  // Paints its surface from a class, as a styled-components tooltip does, and
  // declares it on its rendered root. Nothing above it is marked.
  const ClassSurface = ({ label }: { label: string }) => (
    <div className="consumer-surface" data-semiotic-tooltip-chrome>
      {label}
    </div>
  )
  const Wrapper = ({ label }: { label: string }) => (
    <ClassSurface label={label} />
  )
  const OuterWrapper = ({ label }: { label: string }) => (
    <Wrapper label={label} />
  )

  function expectNoSemioticSurface(container: HTMLElement) {
    expect(container.querySelectorAll(".semiotic-tooltip")).toHaveLength(0)
    for (const element of container.querySelectorAll<HTMLElement>("*")) {
      if (element.classList.contains("consumer-surface")) continue
      expect(element.style.background).toBe("")
      expect(element.style.padding).toBe("")
      expect(element.style.boxShadow).toBe("")
    }
    expect(container.querySelectorAll(".consumer-surface")).toHaveLength(1)
  }

  it.each(["frame", "chart", "multi", "single hover", "multi hover"])(
    "keeps one surface for an unmarked %s renderer whose wrappers render a marked root",
    (path) => {
      const renderer = (datum: Record<string, unknown>) => (
        <OuterWrapper label={String(datum.label)} />
      )
      let resolved: TooltipContentFn
      if (path === "chart" || path === "multi") {
        const normalized = normalizeTooltip(
          path === "multi" ? { mode: "multi", content: renderer } : renderer
        )
        if (typeof normalized !== "function")
          throw new Error("Expected renderer")
        resolved = normalized
      } else if (path === "single hover" || path === "multi hover") {
        const resolve =
          path === "single hover"
            ? resolveTooltipContent
            : resolveMultiCapableTooltip
        resolved = resolve({
          tooltip: renderer,
          customFunctionContext: "hover",
          defaultTooltipContent: () => "default"
        }).tooltipContent
      } else {
        resolved = renderer
      }
      expect(hasOwnTooltipChrome(resolved)).toBe(false)
      const view = renderTooltip(resolved)
      expect(view.container.textContent).toBe("Revenue: $42")
      expectNoSemioticSurface(view.container)
    }
  )

  it("restores fallback chrome when the next hover renders plain content", () => {
    const renderer = normalizeTooltip((d: Record<string, unknown>) =>
      d.owned ? <Wrapper label="Owned" /> : <span>Plain</span>
    ) as TooltipContentFn
    const show = (owned: boolean) => (
      <FlippingTooltip {...position}>{renderer({ owned })}</FlippingTooltip>
    )
    const view = render(show(true))
    expectNoSemioticSurface(view.container)

    view.rerender(show(false))
    const surface =
      view.container.querySelector<HTMLElement>(".semiotic-tooltip")
    expect(surface?.style.background).toContain("--semiotic-tooltip-bg")
    expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)

    view.rerender(show(true))
    expectNoSemioticSurface(view.container)
  })

  it.each([
    {
      name: "a second element",
      content: (
        <>
          <Wrapper label="Owned" />
          <span>extra</span>
        </>
      )
    },
    {
      name: "text beside the root",
      content: (
        <>
          Total <Wrapper label="Owned" />
        </>
      )
    },
    {
      name: "a false marker",
      content: (
        <div className="consumer-surface" data-semiotic-tooltip-chrome="false">
          Owned
        </div>
      )
    }
  ])("keeps fallback chrome for $name", ({ content }) => {
    for (const resolved of [
      normalizeTooltip(() => content) as TooltipContentFn,
      (() => content) as TooltipContentFn
    ]) {
      const view = renderTooltip(resolved)
      const surfaces =
        view.container.querySelectorAll<HTMLElement>(".semiotic-tooltip")
      expect(surfaces).toHaveLength(1)
      expect(surfaces[0].style.background).toContain("--semiotic-tooltip-bg")
      view.unmount()
    }
  })

  it("lets an explicit chart chrome policy override a marked root", () => {
    const renderer = normalizeTooltip({
      content: () => <Wrapper label="Owned" />,
      chrome: "default"
    }) as TooltipContentFn
    const view = renderTooltip(renderer)
    const surface =
      view.container.querySelector<HTMLElement>(".semiotic-tooltip")
    expect(surface?.style.background).toContain("--semiotic-tooltip-bg")
  })

  it("leaves one box when an unmarked wrapper renders a TooltipRoot", () => {
    const Card = ({ label }: { label: string }) => (
      <TooltipRoot style={{ background: "navy" }}>{label}</TooltipRoot>
    )
    const renderer = normalizeTooltip(() => (
      <Card label="Owned" />
    )) as TooltipContentFn
    const view = renderTooltip(renderer)
    const surfaces =
      view.container.querySelectorAll<HTMLElement>(".semiotic-tooltip")
    expect(surfaces).toHaveLength(1)
    expect(surfaces[0].style.background).toBe("navy")
    expect(surfaces[0].parentElement?.style.background).toBe("")
    expect(surfaces[0].parentElement?.style.padding).toBe("")
  })

  it("paints no box around an unmarked wrapper that renders nothing", () => {
    const Locked = () => null
    for (const resolved of [
      normalizeTooltip(() => <Locked />) as TooltipContentFn,
      (() => <Locked />) as TooltipContentFn
    ]) {
      const view = renderTooltip(resolved)
      expect(view.container.textContent).toBe("")
      expect(view.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(
        0
      )
      for (const element of view.container.querySelectorAll<HTMLElement>("*")) {
        expect(element.style.background).toBe("")
        expect(element.style.padding).toBe("")
      }
      view.unmount()
    }
  })

  it("follows a nested component that changes its own output", async () => {
    let setOwned: (owned: boolean) => void = () => {}
    const SelfUpdating = () => {
      const [owned, set] = React.useState(true)
      setOwned = set
      return owned ? <ClassSurface label="Owned" /> : <span>Plain</span>
    }
    const renderer = normalizeTooltip(() => (
      <SelfUpdating />
    )) as TooltipContentFn
    // The renderer runs once; only SelfUpdating re-renders below.
    const view = render(
      <FlippingTooltip {...position}>{renderer({})}</FlippingTooltip>
    )
    expectNoSemioticSurface(view.container)

    await act(async () => setOwned(false))
    const surface =
      view.container.querySelector<HTMLElement>(".semiotic-tooltip")
    expect(surface?.style.background).toContain("--semiotic-tooltip-bg")

    await act(async () => setOwned(true))
    expectNoSemioticSurface(view.container)
  })

  it("forwards a consumer ref to the TooltipRoot element", () => {
    // TooltipRootProps declares no `ref`; React 19 still passes one through
    // from an untyped caller, and the root keeps forwarding it.
    const UntypedRoot = TooltipRoot as React.ComponentType<
      React.ComponentProps<typeof TooltipRoot> & {
        ref?: React.Ref<HTMLDivElement>
      }
    >
    const ref = React.createRef<HTMLDivElement>()
    render(<UntypedRoot ref={ref}>Owned</UntypedRoot>)
    expect(ref.current?.classList.contains("semiotic-tooltip")).toBe(true)
  })
})
