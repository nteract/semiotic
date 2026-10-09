import { rasterizeSVG } from "./rasterizeSVG"
import { encodeSvgFramesToGif } from "./encodeSvgFramesToGif"

const { loadError } = vi.hoisted(() => ({ loadError: new Error("native binary has the wrong architecture") }))
vi.mock("sharp", () => { throw loadError })

describe("optional image dependency failures", () => {
  it.each([
    ["raster", () => rasterizeSVG("<svg />", 100, 100, {})],
    ["GIF", () => encodeSvgFramesToGif(["<svg />"], 100, 100)]
  ] as const)("preserves the underlying %s loader error", async (_format, render) => {
    await expect(render()).rejects.toMatchObject({
      message: expect.stringContaining("sharp"),
      cause: expect.objectContaining({ cause: loadError })
    })
  })
})
