import * as React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamGeoFrame from "./StreamGeoFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const EMPTY_AREAS: [] = []

describe("StreamGeoFrame function graphics concurrency", () => {
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  it("keeps the committed scale subscriber live when a static render attempt suspends", async () => {
    const scheduler = createFrameScheduler()
    const suspended = new Promise<void>(() => {})
    const staticAttemptRender = vi.fn()
    const foregroundGraphics = vi.fn(({ scales }) => (
      <text data-testid="committed-scale">
        {scales?.projection.scale().toFixed(2) ?? "pending"}
      </text>
    ))

    function StaticAttempt() {
      staticAttemptRender()
      return <text data-testid="static-attempt">static</text>
    }

    function SuspendAttempt({ active }: { active: boolean }) {
      if (active) throw suspended
      return null
    }

    function Harness() {
      const [attemptStatic, setAttemptStatic] = React.useState(false)
      const [suspendAttempt, setSuspendAttempt] = React.useState(false)

      return (
        <>
          <button
            type="button"
            onClick={() => {
              React.startTransition(() => {
                setAttemptStatic(true)
                setSuspendAttempt(true)
              })
            }}
          >
            Attempt static graphics
          </button>
          <React.Suspense fallback={<span data-testid="fallback" />}>
            <StreamGeoFrame
              projection="orthographic"
              areas={EMPTY_AREAS}
              size={[300, 200]}
              zoomable
              accessibleTable={false}
              frameScheduler={scheduler.scheduler}
              foregroundGraphics={
                attemptStatic
                  ? <StaticAttempt />
                  : foregroundGraphics
              }
            />
            <SuspendAttempt active={suspendAttempt} />
          </React.Suspense>
        </>
      )
    }

    const { container, getByRole, getByTestId, queryByTestId } = render(
      <Harness />
    )
    act(() => scheduler.flush())
    const initialScale = getByTestId("committed-scale").textContent
    expect(initialScale).not.toBe("pending")

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Attempt static graphics" }))
    })
    expect(staticAttemptRender).toHaveBeenCalled()
    expect(queryByTestId("fallback")).toBeNull()
    expect(queryByTestId("static-attempt")).toBeNull()

    const frame = container.querySelector<HTMLElement>(".stream-geo-frame")!
    act(() => {
      fireEvent.wheel(frame, { deltaY: -1 })
      scheduler.flush()
    })

    expect(getByTestId("committed-scale").textContent).not.toBe(initialScale)
  })
})
