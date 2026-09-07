// @vitest-environment node
import { build } from "esbuild"
import { readFile, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { pinnedStorySources } from "../lib/pinned-story-sources"
import { defaultState as originalPlaneState } from "../plane-day/v1/state"
import { renderDayHTML } from "../plane-day/v1/exports"
import { renderReceiptHTML } from "../grocery-receipt/v1/exports"
import { defaultState as livePlaneState } from "../../docs/src/pages/examples/plane-day/state"
import { buildNotePacket, importNotePacket } from "../../docs/src/pages/examples/plane-day/packet"
import { prepareBasket } from "../../docs/src/pages/examples/grocery-receipt/prepare"

const plane = resolve("docs/public/stories/plane-day/ha-2025-07-74309a3a734d-v1")
const grocery = resolve("docs/public/stories/grocery-bill/e01-bls-2026-09-05-66f1d260")

describe("original story editions remain reproducible", () => {
  it.each([
    { story: "plane-day", directory: plane, files: ["state.ts", "exports.ts"] },
    { story: "grocery-receipt", directory: grocery, files: ["exports.ts"] }
  ])("rebuilds the original $story adapter byte for byte", async ({ story, directory, files }) => {
    const adapter = await build({
      entryPoints: [resolve("docs/src/pages/examples", story, "portable.ts")],
      bundle: true,
      platform: "neutral",
      format: "esm",
      write: false,
      external: ["semiotic/artifact"],
      plugins: [pinnedStorySources(story, files)]
    })
    expect(adapter.outputFiles[0].text).toBe(await readFile(join(directory, "adapter.mjs"), "utf8"))
  })

  it("retains all original plane packets and HTML while the live/v2 default uses time-space", async () => {
    const snapshot = JSON.parse(await readFile(join(plane, "snapshot.json"), "utf8"))
    const saved = JSON.parse(await readFile(join(plane, "default.packet.json"), "utf8"))
    expect(originalPlaneState(snapshot)).toEqual(saved.state)
    expect(originalPlaneState(snapshot).view).toBe("timeline")
    const current = JSON.parse(await readFile(join(plane, "../reading-v2/default.packet.json"), "utf8"))
    expect(livePlaneState(snapshot)).toEqual(current.state)
    expect(current.state.view).toBe("time-space")
    for (const file of (await readdir(plane)).filter((file) => file.endsWith(".packet.json"))) {
      const packet = JSON.parse(await readFile(join(plane, file), "utf8"))
      const restored = importNotePacket(packet, snapshot)
      expect(restored.issue).toBeNull()
      expect(buildNotePacket(snapshot, restored.day!, restored.state)).toEqual(packet)
      expect(renderDayHTML(snapshot, restored.day!, restored.state)).toBe(
        await readFile(join(plane, file.replace(".packet.json", ".html")), "utf8")
      )
    }
  })

  it("reproduces every original grocery HTML selection", async () => {
    const snapshot = JSON.parse(await readFile(join(grocery, "snapshot.json"), "utf8"))
    for (const file of (await readdir(grocery)).filter((file) => file.endsWith(".packet.json"))) {
      const packet = JSON.parse(await readFile(join(grocery, file), "utf8"))
      expect(renderReceiptHTML(prepareBasket(snapshot, packet.state), snapshot)).toBe(
        await readFile(join(grocery, file.replace(".packet.json", ".html")), "utf8")
      )
    }
  })
})
