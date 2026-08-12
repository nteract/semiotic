import * as React from "react"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useStalenessCheck } from "./useStalenessCheck"

function Harness({ now, scheduleRender }: {
  now: () => number
  scheduleRender: () => void
}) {
  const storeRef = React.useRef({ lastIngestTime: 100 })
  const dirtyRef = React.useRef(false)
  const [isStale, setIsStale] = React.useState(false)
  useStalenessCheck(
    { threshold: 500 },
    storeRef,
    dirtyRef,
    scheduleRender,
    now,
    isStale,
    setIsStale
  )
  return <span>{isStale ? "stale" : "fresh"}</span>
}

describe("useStalenessCheck", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses the frame's injected logical clock", () => {
    vi.useFakeTimers()
    let logicalNow = 200
    const scheduleRender = vi.fn()
    render(<Harness now={() => logicalNow} scheduleRender={scheduleRender} />)

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText("fresh")).toBeTruthy()

    logicalNow = 700
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText("stale")).toBeTruthy()
    expect(scheduleRender).toHaveBeenCalledTimes(1)
  })
})
