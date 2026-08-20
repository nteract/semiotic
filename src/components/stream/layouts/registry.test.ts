import { getLayoutPlugin, registerLayoutPlugin } from "./registry"
import { sankeyLayoutPlugin } from "./sankeyLayoutPlugin"
import { forceLayoutPlugin } from "./forceLayoutPlugin"

describe("network layout registry", () => {
  it("registers sankey without requiring the force plugin module graph at the lookup site", () => {
    registerLayoutPlugin("sankey", sankeyLayoutPlugin)
    expect(getLayoutPlugin("sankey")).toBe(sankeyLayoutPlugin)
  })

  it("keeps force as a separately registered plugin", () => {
    registerLayoutPlugin("force", forceLayoutPlugin)
    expect(getLayoutPlugin("force")).toBe(forceLayoutPlugin)
  })
})
