import { afterEach, expect, it, vi } from "vitest"
import { fetchOpenMeteoExampleData } from "./openMeteoExampleData"
import { dateFromDay, END_DAY, SNAPSHOT_END, SNAPSHOT_TODAY, TODAY_DAY } from "./weatherSnapshot"

afterEach(() => vi.unstubAllGlobals())

it("aligns the default API window with the day shown by both climate demos", async () => {
  const fetch = vi.fn(async (_url: string) => ({
    ok: true,
    json: async () => ({ daily: { time: [SNAPSHOT_TODAY], temperature_2m_mean: [68] } }),
  }))
  vi.stubGlobal("fetch", fetch)
  const { climateRows, weather } = await fetchOpenMeteoExampleData({ lat: 40.71, lon: -74.01 })
  const isoDate = (date: Date) => date.toISOString().slice(0, 10)
  const archive = fetch.mock.calls.map(([url]) => new URL(url)).find(url => url.searchParams.has("start_date"))
  expect(archive?.searchParams.get("end_date")).toBe(isoDate(dateFromDay(TODAY_DAY - 6)))
  expect(isoDate(dateFromDay(TODAY_DAY))).toBe(SNAPSHOT_TODAY)
  expect(climateRows[TODAY_DAY]).toMatchObject({ actual: 20, day: weather.rows[TODAY_DAY].day })
  expect(climateRows).toHaveLength(END_DAY + 1)
  expect(isoDate(climateRows[END_DAY].date)).toBe(SNAPSHOT_END)
})
