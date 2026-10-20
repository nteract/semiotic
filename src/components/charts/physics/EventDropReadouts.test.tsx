import * as React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi
} from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { EventDropChart } from "./EventDropChart"
import type { EventDropChartHandle } from "./useEventDropHandle"
import { buildEventDropPhysics } from "./eventDropPhysics"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { eventDropBodyStyle } from "./eventDropStyle"

const sources = [
  { id: "a", label: "Producer A", mark: "circle" as const, color: "#123456" },
  { id: "b", label: "Producer B", mark: "triangle" as const }
]
const rows = [
  { id: "one", time: 2, arrivalTime: 0, source: "a" },
  { id: "two", time: 20, arrivalTime: 1, source: "b" },
  { id: "late", time: 4, arrivalTime: 2, source: "a" }
]

describe("EventDrop sources, ledger and clock", () => {
  let cleanup: () => void
  beforeEach(() => {
    cleanup = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanup())

  it("infers the full handle for object and callback refs", () => {
    expectTypeOf<
      React.ComponentRef<typeof EventDropChart>
    >().toEqualTypeOf<EventDropChartHandle>()
    const ref = React.createRef<React.ComponentRef<typeof EventDropChart>>()
    const { unmount } = render(<EventDropChart ref={ref} data={rows} paused />)
    expect(ref.current!.getLedger()).toHaveLength(2)
    expect(ref.current!.getClock().paused).toBe(true)
    act(() => ref.current!.setTimeScale(2))
    expect(ref.current!.getClock().timeScale).toBe(2)
    unmount()
    const received = vi.fn()
    render(
      <EventDropChart
        data={rows}
        paused
        ref={(handle) => {
          expectTypeOf(handle).toEqualTypeOf<EventDropChartHandle | null>()
          if (handle) {
            received(handle.getLedger(), handle.getClock())
            handle.setTimeScale(2)
          }
        }}
      />
    )
    expect(received).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ paused: true })
    )
  })

  it.each([
    { frameProps: { background: "#123456" }, expected: "#123456" },
    {
      background: "#abcdef",
      frameProps: { background: "#123456" },
      expected: "#abcdef"
    },
    {
      background: "#abcdef",
      frameProps: { backgroundGraphicsBackdrop: "#654321" },
      expected: "#654321"
    }
  ])(
    "preserves background precedence through both SVG entry points: $expected",
    ({ expected, ...props }) => {
      const config = { data: rows, ...props }
      for (const markup of [
        renderToStaticMarkup(<EventDropChart {...config} />),
        renderChartWithEvidence("EventDropChart", config).svg
      ]) {
        expect(
          markup.match(
            /<rect[^>]*class="stream-frame-background__backdrop"[^>]*>/
          )?.[0]
        ).toContain(`fill="${expected}"`)
      }
    }
  )

  it("exposes source accounting and emits each lifecycle edge once across rerenders", () => {
    const ref = React.createRef<EventDropChartHandle>()
    const onObservation = vi.fn()
    const onWatermarkChange = vi.fn()
    const onLedgerChange = vi.fn()
    const props = {
      sources,
      windows: { size: 10 },
      watermark: { delay: 5 },
      onObservation,
      onWatermarkChange,
      onLedgerChange,
      paused: true
    }
    const { rerender } = render(
      <EventDropChart ref={ref} data={rows} {...props} />
    )
    const store = ref.current!.getStore()
    const saved = ref.current!
    expect(saved.getWatermark()).toBe(15)
    expect(saved.getLedger().map((row) => [row.accepted, row.late])).toEqual([
      [1, 1],
      [1, 0]
    ])
    expect(saved.getSourceStats("a")).toMatchObject({
      emitted: 2,
      accepted: 1,
      late: 1
    })
    expect(onWatermarkChange).toHaveBeenCalledWith(15, -Infinity)
    const closes = () =>
      onObservation.mock.calls.filter(
        ([event]) => event.type === "physics-window-close"
      )
    expect(closes()).toHaveLength(1)
    expect(closes()[0][0]).toMatchObject({
      windowId: "0-10",
      accepted: 1,
      late: 0
    })
    rerender(<EventDropChart ref={ref} data={rows.slice()} {...props} />)
    expect(ref.current!.getStore()).toBe(store)
    expect(closes()).toHaveLength(1)
    expect(onWatermarkChange).toHaveBeenCalledTimes(1)
    act(() => saved.push({ id: "new", time: 40, arrivalTime: 3, source: "b" }))
    expect(saved.getWatermark()).toBe(35)
    expect(
      saved.getLedger().reduce((sum, row) => sum + row.accepted + row.late, 0)
    ).toBe(4)
    expect(closes()).toHaveLength(2)
  })

  it("keeps empty-data authority and source rail buttons keyboard reachable", () => {
    const ref = React.createRef<EventDropChartHandle>()
    const click = vi.fn()
    const { getByRole, rerender } = render(
      <EventDropChart
        ref={ref}
        sources={sources}
        onSourceClick={click}
        paused
      />
    )
    fireEvent.keyDown(getByRole("button", { name: "Producer B on" }), {
      key: "Enter"
    })
    fireEvent.keyDown(getByRole("button", { name: "Producer A on" }), {
      key: " "
    })
    expect(click.mock.calls.map(([source]) => source.id)).toEqual(["b", "a"])
    const handle = ref.current!
    rerender(<EventDropChart ref={ref} data={[]} sources={sources} />)
    act(() => handle.push(rows[0]))
    expect(handle.getData()).toEqual([])
    expect(handle.getLedger()).toEqual([])
  })

  it("paces milliseconds on the seconds kernel and changes speed without replacing bodies", () => {
    const options = {
      data: [
        { time: 1, arrivalTime: 0 },
        { time: 2501, arrivalTime: 2500 }
      ],
      timeAccessor: "time" as const,
      arrivalAccessor: "arrivalTime" as const,
      windows: { size: 2500 },
      watermark: { delay: 10000 },
      ballRadius: 7,
      seed: 1,
      size: [500, 300] as [number, number],
      timeUnit: "ms" as const
    }
    const layout = buildEventDropPhysics(options)
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    expect(store.snapshot().queue.map((spawn) => spawn.spawnAt)).toEqual([
      0, 2.5
    ])
    const ref = React.createRef<EventDropChartHandle>()
    render(<EventDropChart ref={ref} {...options} paused />)
    const before = ref.current!.getStore()!.snapshot()
    act(() => ref.current!.setTimeScale(4))
    const after = ref.current!.getStore()!.snapshot()
    expect(after.world.bodies).toEqual(before.world.bodies)
    expect(after.queue).toEqual(before.queue)
    expect(after.config.timeScale).toBe(4)
    expect(ref.current!.getClock()).toMatchObject({
      paused: true,
      timeScale: 4,
      simTime: 0
    })
  })

  it("renders the source rail and ledger evidence through both server entry points", () => {
    const config = {
      data: rows,
      sources,
      windows: { size: 10 },
      watermark: { delay: 5 },
      title: "Producers"
    }
    const html = renderToStaticMarkup(<EventDropChart {...config} />)
    expect(html).toContain("Producer B")
    expect(html).toContain('data-testid="event-drop-source-rail"')
    const { svg, evidence } = renderChartWithEvidence("EventDropChart", config)
    expect(svg).toContain("Producer B")
    expect(evidence).toMatchObject({
      markCount: 3,
      watermarkValue: 15,
      lateCount: 1,
      closedWindows: 1
    })
  })

  it("lets style rules override source defaults", () => {
    const style = eventDropBodyStyle(sources, undefined, {
      styleRules: [{ style: { fill: "#abcdef", mark: "hexagon" } }]
    })({ datum: { source: "a" } })
    expect(style).toMatchObject({ fill: "#abcdef", mark: "hexagon" })
  })

  it("preserves frame palette and mark overrides in serialized SVG", () => {
    const { svg } = renderChartWithEvidence("EventDropChart", {
      data: rows,
      frameProps: {
        theme: { background: "#102030", primary: "#abcdef" },
        bodyStyle: { mark: "hexagon", fill: "#abcdef" }
      }
    })
    expect(svg).toContain("--semiotic-physics-background:#102030")
    expect(
      svg.indexOf('data-testid="event-drop-window-background"')
    ).toBeLessThan(svg.indexOf('-data-area"'))
    expect(svg).toContain("--semiotic-physics-primary:#abcdef")
    expect(svg).toContain('fill="#abcdef"')
    expect(svg).toContain("<path")
  })
})
