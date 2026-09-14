// @vitest-environment node
import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { normalizePreviewSvg } from "./generate-example-og-cards.mjs"

describe("example social previews", () => {
  it.each([
    ["percentage dimensions", 'style="width:100%;height:100%;display:block"'],
    ["gallery aspect ratio", 'style="width:100%;aspect-ratio:2.5 / 1"'],
    ["fixed dimensions", 'width="242" height="96" preserveAspectRatio="none"'],
    ["viewBox alone", ""]
  ])(
    "scales %s artwork into the entire export panel",
    async (_, attributes) => {
      const svg = normalizePreviewSvg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 242 96" ${attributes}>
        <rect width="100%" height="100%" fill="var(--surface-1)" />
        <rect x="200" y="60" width="32" height="30" fill="#a53f30" />
      </svg>`
      )
      const { data, info } = await sharp(Buffer.from(svg))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      expect([info.width, info.height]).toEqual([500, 200])
      // The mark in the lower right must travel with the resized artwork,
      // rather than remain in a 242 × 96 corner of a larger empty panel.
      const offset = (160 * info.width + 450) * info.channels
      expect([...data.subarray(offset, offset + 4)]).toEqual([165, 63, 48, 255])
      const background = (80 * info.width + 100) * info.channels
      expect([...data.subarray(background, background + 4)]).toEqual([
        248, 250, 252, 255
      ])
    }
  )
})
