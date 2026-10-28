import * as React from "react"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { IngestActivity } from "./IngestActivity"
import { useStalenessCheck } from "./useStalenessCheck"

function Harness({ now, scheduleRender }: {
  now: () => number
  scheduleRender: () => void
}) {
  const storeRef = React.useRef({ activity: new IngestActivity(() => now() - 100) })
  React.useEffect(() => storeRef.current.activity.touch(), [])
  const dirtyRef = React.useRef(false)
  const [isStale, setIsStale] = React.useState(false)
  useStalenessCheck(
    { threshold: 500 },
    storeRef,
    dirtyRef,
    scheduleRender,
    isStale,
    setIsStale
  )
  return <span>{isStale ? "stale" : "fresh"}</span>
}

describe("useStalenessCheck", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses the frame's injected freshness clock", () => {
    vi.useFakeTimers()
    let logicalNow = 200
    const scheduleRender = vi.fn()
    render(<Harness now={() => logicalNow} scheduleRender={scheduleRender} />)

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText("fresh")).toBeTruthy()

    logicalNow = 800
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText("stale")).toBeTruthy()
    expect(scheduleRender).toHaveBeenCalledTimes(1)
  })
})
