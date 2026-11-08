import React from "react"
import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import ParisIsometricLandmarksExamplePage from "./ParisIsometricLandmarksExamplePage"
import { fetchDbpediaLandmarks } from "./dbpediaParisLandmarks"
import { CITY_LANDMARKS } from "./data/cityLandmarks"

vi.mock("./dbpediaParisLandmarks", () => ({ fetchDbpediaLandmarks: vi.fn() }))
vi.mock("./ExamplePageLayout", () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock("semiotic/geo", () => ({ GeoCustomChart: vi.fn(() => null) }))
afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

it("settles the DBpedia deadline without depending on fetch rejection", async () => {
  vi.useFakeTimers()
  const response = Promise.withResolvers()
  vi.mocked(fetchDbpediaLandmarks).mockReturnValue(response.promise)
  const { unmount } = render(<ParisIsometricLandmarksExamplePage />)
  await act(async () => vi.advanceTimersByTimeAsync(9000))
  expect(screen.getByText(/DBpedia exceeded the response budget/)).toBeTruthy()
  await act(async () => {
    response.resolve(CITY_LANDMARKS.paris.fixture)
    await response.promise
  })
  expect(screen.getByText(/DBpedia exceeded the response budget/)).toBeTruthy()
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
