import * as React from "react"
import {
  act,
  render,
  renderHook,
  screen,
  waitFor
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChartErrorBoundary } from "../ChartErrorBoundary"
import { resolveReferenceGeography } from "./referenceGeography"
import { useReferenceAreas, type AreasProp } from "./useReferenceAreas"

vi.mock("./referenceGeography", async (original) => ({
  ...(await original<typeof import("./referenceGeography")>()),
  resolveReferenceGeography: vi.fn()
}))

afterEach(() => vi.restoreAllMocks())

describe("reference geography ownership", () => {
  it("never commits the previous reference under a new geography prop", async () => {
    const countries: GeoJSON.Feature[] = []
    const land = Promise.withResolvers<GeoJSON.Feature[]>()
    vi.mocked(resolveReferenceGeography)
      .mockResolvedValueOnce(countries)
      .mockReturnValueOnce(land.promise)
    const committed = vi.fn()
    const { result, rerender } = renderHook(
      ({ areas }: { areas: AreasProp | undefined }) => {
        const features = useReferenceAreas(areas)
        React.useLayoutEffect(() => {
          committed(areas, features)
        })
        return features
      },
      { initialProps: { areas: "world-110m" as AreasProp | undefined } }
    )
    await waitFor(() => expect(result.current).toBe(countries))
    committed.mockClear()
    rerender({ areas: "land-110m" })
    expect(committed).not.toHaveBeenCalledWith("land-110m", countries)
    expect(result.current).toBeNull()
    rerender({ areas: undefined })
    await act(async () => {
      land.resolve([])
      await land.promise
    })
    expect(result.current).toBeNull()
  })

  it("routes a failed optional geography import through the chart error boundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("Install the optional peer dependency world-atlas")
    vi.mocked(resolveReferenceGeography).mockRejectedValueOnce(error)
    const onError = vi.fn()
    function MapAreas() {
      useReferenceAreas("world-110m")
      return <div>Loading geography</div>
    }
    render(
      <ChartErrorBoundary onError={onError}>
        <MapAreas />
      </ChartErrorBoundary>
    )
    await screen.findByText(error.message)
    expect(onError).toHaveBeenCalledWith(error, expect.anything())
  })
})
